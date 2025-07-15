from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
import json
from datetime import datetime
import asyncio

# Import our models and services
from models import (
    YugiohCard, CardType, Race, Attribute, CardResponse,
    User, UserCreate, UserLogin, Player, Deck, DeckCard, DeckResponse,
    GameState, GameResponse, Position, GameAction
)
from card_service import CardService
from game_engine import GameEngine

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Yu-Gi-Oh! The Duelists of the Roses API")
api_router = APIRouter(prefix="/api")

# Services
card_service = CardService(db)
game_engine = GameEngine(db)

# WebSocket connection manager for multiplayer
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.game_rooms: Dict[str, List[str]] = {}
    
    async def connect(self, websocket: WebSocket, player_id: str):
        await websocket.accept()
        self.active_connections[player_id] = websocket
    
    def disconnect(self, player_id: str):
        if player_id in self.active_connections:
            del self.active_connections[player_id]
    
    async def send_personal_message(self, message: dict, player_id: str):
        if player_id in self.active_connections:
            await self.active_connections[player_id].send_text(json.dumps(message))
    
    async def broadcast_to_game(self, message: dict, game_id: str):
        if game_id in self.game_rooms:
            for player_id in self.game_rooms[game_id]:
                await self.send_personal_message(message, player_id)

manager = ConnectionManager()

# Initialize card database on startup
@app.on_event("startup")
async def startup_event():
    await card_service.initialize_card_database()
    logging.info("Card database initialized")

# Cards API
@api_router.get("/cards", response_model=CardResponse)
async def get_cards(
    skip: int = 0,
    limit: int = 50,
    card_type: Optional[CardType] = None,
    race: Optional[Race] = None,
    attribute: Optional[Attribute] = None,
    search: Optional[str] = None
):
    """Get cards with filtering options"""
    try:
        cards = await card_service.get_cards(
            skip=skip, limit=limit, card_type=card_type,
            race=race, attribute=attribute, search=search
        )
        
        total = await db.yugioh_cards.count_documents({})
        
        return CardResponse(
            cards=cards,
            total=total,
            page=skip // limit + 1,
            per_page=limit
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cards/{card_id}", response_model=YugiohCard)
async def get_card(card_id: str):
    """Get a specific card by ID"""
    card = await card_service.get_card_by_id(card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card

@api_router.get("/cards/search/{query}")
async def search_cards(query: str, limit: int = 20):
    """Search cards by name"""
    cards = await card_service.search_cards(query, limit)
    return {"cards": cards}

@api_router.get("/cards/deck-leaders", response_model=List[YugiohCard])
async def get_deck_leaders():
    """Get all cards that can be deck leaders"""
    cards = await card_service.get_deck_leader_cards()
    return cards

# Player Management
@api_router.post("/players", response_model=Player)
async def create_player(user_data: UserCreate):
    """Create a new player"""
    try:
        # Check if username already exists
        existing_player = await db.players.find_one({"username": user_data.username})
        if existing_player:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Create player
        player = Player(
            username=user_data.username,
            email=user_data.email,
            deck_id="",  # Will be set when deck is created
            hand=[],
            experience=0,
            level=1,
            wins=0,
            losses=0
        )
        
        # Insert into database
        await db.players.insert_one(player.dict())
        
        return player
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/players/{player_id}", response_model=Player)
async def get_player(player_id: str):
    """Get player by ID"""
    player = await game_engine.get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player

@api_router.get("/players/{player_id}/stats")
async def get_player_stats(player_id: str):
    """Get player statistics"""
    player = await game_engine.get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    return {
        "wins": player.wins,
        "losses": player.losses,
        "win_rate": player.wins / (player.wins + player.losses) if (player.wins + player.losses) > 0 else 0,
        "level": player.level,
        "experience": player.experience
    }

# Deck Management
@api_router.post("/decks", response_model=Deck)
async def create_deck(deck_data: Dict[str, Any]):
    """Create a new deck"""
    try:
        deck = Deck(
            name=deck_data["name"],
            player_id=deck_data["player_id"],
            cards=deck_data.get("cards", []),
            deck_leader_id=deck_data["deck_leader_id"],
            max_cost=deck_data.get("max_cost", 2000)
        )
        
        # Calculate total cost
        total_cost = 0
        for deck_card in deck.cards:
            card = await card_service.get_card_by_id(deck_card.card_id)
            if card:
                total_cost += card.deck_cost * deck_card.quantity
        
        deck.total_cost = total_cost
        
        # Validate deck
        if total_cost > deck.max_cost:
            raise HTTPException(status_code=400, detail="Deck cost exceeds maximum")
        
        # Insert into database
        await db.decks.insert_one(deck.dict())
        
        return deck
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/decks/{deck_id}", response_model=DeckResponse)
async def get_deck(deck_id: str):
    """Get deck by ID"""
    deck_data = await db.decks.find_one({"id": deck_id})
    if not deck_data:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    deck = Deck(**deck_data)
    
    # Get card details
    cards = []
    total_cost = 0
    for deck_card in deck.cards:
        card = await card_service.get_card_by_id(deck_card.card_id)
        if card:
            cards.append(card)
            total_cost += card.deck_cost * deck_card.quantity
    
    # Validate deck
    is_valid = total_cost <= deck.max_cost and len(deck.cards) >= 30
    errors = []
    if total_cost > deck.max_cost:
        errors.append("Deck cost exceeds maximum")
    if len(deck.cards) < 30:
        errors.append("Deck must have at least 30 cards")
    
    return DeckResponse(
        deck=deck,
        cards=cards,
        total_cost=total_cost,
        is_valid=is_valid,
        errors=errors
    )

@api_router.put("/decks/{deck_id}")
async def update_deck(deck_id: str, deck_data: Dict[str, Any]):
    """Update deck"""
    try:
        # Get existing deck
        existing_deck = await db.decks.find_one({"id": deck_id})
        if not existing_deck:
            raise HTTPException(status_code=404, detail="Deck not found")
        
        # Update fields
        update_data = {
            "name": deck_data.get("name", existing_deck["name"]),
            "cards": deck_data.get("cards", existing_deck["cards"]),
            "deck_leader_id": deck_data.get("deck_leader_id", existing_deck["deck_leader_id"]),
            "updated_at": datetime.utcnow()
        }
        
        # Calculate new total cost
        total_cost = 0
        for deck_card in update_data["cards"]:
            card = await card_service.get_card_by_id(deck_card["card_id"])
            if card:
                total_cost += card.deck_cost * deck_card["quantity"]
        
        update_data["total_cost"] = total_cost
        
        # Update in database
        await db.decks.update_one(
            {"id": deck_id},
            {"$set": update_data}
        )
        
        return {"message": "Deck updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/players/{player_id}/decks")
async def get_player_decks(player_id: str):
    """Get all decks for a player"""
    decks = await db.decks.find({"player_id": player_id}).to_list(length=None)
    return {"decks": decks}

# Game Management
@api_router.post("/games", response_model=GameResponse)
async def create_game(game_data: Dict[str, Any]):
    """Create a new game"""
    try:
        player1_id = game_data["player1_id"]
        player2_id = game_data.get("player2_id", "ai")  # AI opponent if not specified
        is_multiplayer = game_data.get("is_multiplayer", False)
        
        # Create game
        game_state = await game_engine.create_game(player1_id, player2_id, is_multiplayer)
        
        # Get game state for player
        game_response = await game_engine.get_game_state_for_player(game_state.id, player1_id)
        
        return GameResponse(
            game_state=game_response["game_state"],
            player_hand=game_response["hand_cards"],
            available_actions=game_response["valid_actions"],
            message="Game created successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/games/{game_id}", response_model=GameResponse)
async def get_game(game_id: str, player_id: str):
    """Get game state"""
    game_response = await game_engine.get_game_state_for_player(game_id, player_id)
    if not game_response:
        raise HTTPException(status_code=404, detail="Game not found")
    
    return GameResponse(
        game_state=game_response["game_state"],
        player_hand=game_response["hand_cards"],
        available_actions=game_response["valid_actions"],
        message=""
    )

@api_router.post("/games/{game_id}/actions")
async def game_action(game_id: str, action_data: Dict[str, Any]):
    """Execute a game action"""
    try:
        player_id = action_data["player_id"]
        action_type = action_data["action_type"]
        
        result = {"success": False, "message": "Unknown action"}
        
        if action_type == "summon":
            card_id = action_data["card_id"]
            position = Position(**action_data["position"])
            success = await game_engine.summon_card(game_id, player_id, card_id, position)
            result = {"success": success, "message": "Card summoned" if success else "Failed to summon card"}
        
        elif action_type == "move":
            card_id = action_data["card_id"]
            position = Position(**action_data["position"])
            success = await game_engine.move_card(game_id, player_id, card_id, position)
            result = {"success": success, "message": "Card moved" if success else "Failed to move card"}
        
        elif action_type == "attack":
            attacker_id = action_data["attacker_id"]
            target_id = action_data["target_id"]
            result = await game_engine.attack_card(game_id, player_id, attacker_id, target_id)
        
        elif action_type == "end_turn":
            success = await game_engine.end_turn(game_id, player_id)
            result = {"success": success, "message": "Turn ended" if success else "Failed to end turn"}
        
        # Broadcast to multiplayer game if needed
        game_state = await game_engine.get_game(game_id)
        if game_state and game_state.is_multiplayer:
            await manager.broadcast_to_game({
                "type": "game_update",
                "game_id": game_id,
                "action": action_type,
                "result": result
            }, game_id)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket for multiplayer
@api_router.websocket("/ws/{player_id}")
async def websocket_endpoint(websocket: WebSocket, player_id: str):
    await manager.connect(websocket, player_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "join_game":
                game_id = message["game_id"]
                if game_id not in manager.game_rooms:
                    manager.game_rooms[game_id] = []
                manager.game_rooms[game_id].append(player_id)
                
                await manager.send_personal_message({
                    "type": "joined_game",
                    "game_id": game_id,
                    "message": "Successfully joined game"
                }, player_id)
            
            elif message["type"] == "game_action":
                # Handle game actions through WebSocket
                game_id = message["game_id"]
                action_data = message["action_data"]
                action_data["player_id"] = player_id
                
                # Execute action (similar to HTTP endpoint)
                # This would call the same game_engine methods
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(player_id)
        # Remove from game rooms
        for game_id, players in manager.game_rooms.items():
            if player_id in players:
                players.remove(player_id)

# AI System (Simple for now)
@api_router.post("/ai/move")
async def ai_move(game_data: Dict[str, Any]):
    """Generate AI move"""
    # Simple AI logic - can be enhanced later
    game_id = game_data["game_id"]
    ai_player_id = game_data["ai_player_id"]
    
    # Get game state
    game_state = await game_engine.get_game(game_id)
    if not game_state or game_state.current_turn != ai_player_id:
        return {"action": None, "message": "Not AI's turn"}
    
    # Simple AI strategy: summon if possible, then attack, then end turn
    valid_actions = await game_engine.get_valid_actions(game_id, ai_player_id)
    
    if "summon" in valid_actions:
        # Try to summon a card
        player = await game_engine.get_player(ai_player_id)
        if player and player.hand:
            # Find valid summon position
            for x in range(7):
                for y in range(7):
                    position = Position(x=x, y=y)
                    if await game_engine.summon_card(game_id, ai_player_id, player.hand[0], position):
                        return {"action": "summon", "card_id": player.hand[0], "position": position.dict()}
    
    if "attack" in valid_actions:
        # Try to attack
        game_state = await game_engine.get_game(game_id)
        for attacker in game_state.field.cards:
            if attacker.owner_id == ai_player_id and attacker.can_attack:
                for target in game_state.field.cards:
                    if target.owner_id != ai_player_id:
                        result = await game_engine.attack_card(game_id, ai_player_id, attacker.id, target.id)
                        if result["success"]:
                            return {"action": "attack", "attacker_id": attacker.id, "target_id": target.id}
    
    # End turn
    await game_engine.end_turn(game_id, ai_player_id)
    return {"action": "end_turn"}

# Health check
@api_router.get("/")
async def root():
    return {"message": "Yu-Gi-Oh! The Duelists of the Roses API is running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()