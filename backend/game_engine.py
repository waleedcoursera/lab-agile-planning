import asyncio
import random
from typing import List, Dict, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import (
    GameState, Player, FieldCard, Position, YugiohCard, 
    TerrainType, CardPosition, GamePhase, CardType, Race
)
from card_service import CardService
import logging

logger = logging.getLogger(__name__)

class GameEngine:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.card_service = CardService(db)
        self.games_collection = db.games
        self.players_collection = db.players
        
    async def create_game(self, player1_id: str, player2_id: str, is_multiplayer: bool = False) -> GameState:
        """Create a new game between two players"""
        # Get players
        player1 = await self.get_player(player1_id)
        player2 = await self.get_player(player2_id)
        
        if not player1 or not player2:
            raise ValueError("Players not found")
        
        # Initialize game state
        game_state = GameState(
            player1_id=player1_id,
            player2_id=player2_id,
            current_turn=player1_id,
            is_multiplayer=is_multiplayer
        )
        
        # Initialize field with random terrain
        game_state.field = self._generate_random_terrain()
        
        # Set initial deck leader positions
        game_state.field.cards.extend([
            FieldCard(
                card_id=player1.deck_leader_id,
                position=Position(x=1, y=3),  # Player 1 starts on left side
                owner_id=player1_id,
                is_deck_leader=True,
                current_attack=0,
                current_defense=0
            ),
            FieldCard(
                card_id=player2.deck_leader_id,
                position=Position(x=5, y=3),  # Player 2 starts on right side
                owner_id=player2_id,
                is_deck_leader=True,
                current_attack=0,
                current_defense=0
            )
        ])
        
        # Deal initial hands
        await self._deal_initial_hands(game_state)
        
        # Save game to database
        await self.games_collection.insert_one(game_state.dict())
        
        return game_state
    
    def _generate_random_terrain(self) -> 'GameField':
        """Generate a random 7x7 terrain field"""
        from models import GameField
        
        field = GameField()
        terrain_types = list(TerrainType)
        
        # Generate terrain with some logic - not completely random
        for row in range(7):
            for col in range(7):
                # Center area tends to be normal
                if 2 <= row <= 4 and 2 <= col <= 4:
                    field.terrain[row][col] = random.choice([
                        TerrainType.NORMAL, TerrainType.NORMAL, TerrainType.MEADOW
                    ])
                # Edges have more variety
                else:
                    field.terrain[row][col] = random.choice(terrain_types)
        
        return field
    
    async def _deal_initial_hands(self, game_state: GameState):
        """Deal initial hands to both players"""
        player1 = await self.get_player(game_state.player1_id)
        player2 = await self.get_player(game_state.player2_id)
        
        # Each player draws 5 cards initially
        player1.hand = await self._draw_cards(player1.deck_id, 5)
        player2.hand = await self._draw_cards(player2.deck_id, 5)
        
        # Update players in database
        await self.players_collection.update_one(
            {'id': player1.id}, {'$set': {'hand': player1.hand}}
        )
        await self.players_collection.update_one(
            {'id': player2.id}, {'$set': {'hand': player2.hand}}
        )
    
    async def _draw_cards(self, deck_id: str, count: int) -> List[str]:
        """Draw cards from deck"""
        deck = await self.db.decks.find_one({'id': deck_id})
        if not deck:
            return []
        
        # For now, randomly select cards from deck
        # In a real implementation, you'd track which cards have been drawn
        deck_cards = deck.get('cards', [])
        drawn_cards = []
        
        for _ in range(min(count, len(deck_cards))):
            if deck_cards:
                card = random.choice(deck_cards)
                drawn_cards.append(card['card_id'])
        
        return drawn_cards
    
    async def get_game(self, game_id: str) -> Optional[GameState]:
        """Get game state by ID"""
        game_data = await self.games_collection.find_one({'id': game_id})
        if game_data:
            return GameState(**game_data)
        return None
    
    async def get_player(self, player_id: str) -> Optional[Player]:
        """Get player by ID"""
        player_data = await self.players_collection.find_one({'id': player_id})
        if player_data:
            return Player(**player_data)
        return None
    
    async def summon_card(self, game_id: str, player_id: str, card_id: str, position: Position) -> bool:
        """Summon a card to the field"""
        game_state = await self.get_game(game_id)
        if not game_state or game_state.current_turn != player_id:
            return False
        
        # Check if position is valid for summoning
        if not self._is_valid_summon_position(game_state, player_id, position):
            return False
        
        # Get card details
        card = await self.card_service.get_card_by_id(card_id)
        if not card:
            return False
        
        # Create field card
        field_card = FieldCard(
            card_id=card_id,
            position=position,
            owner_id=player_id,
            current_attack=card.attack or 0,
            current_defense=card.defense or 0
        )
        
        # Apply terrain bonuses
        terrain = game_state.field.terrain[position.y][position.x]
        bonus = card.terrain_bonuses.get(terrain.value, 0)
        field_card.current_attack += bonus
        field_card.current_defense += bonus
        
        # Add to field
        game_state.field.cards.append(field_card)
        
        # Remove from hand
        player = await self.get_player(player_id)
        if card_id in player.hand:
            player.hand.remove(card_id)
            await self.players_collection.update_one(
                {'id': player_id}, {'$set': {'hand': player.hand}}
            )
        
        # Update game state
        await self.games_collection.update_one(
            {'id': game_id}, {'$set': game_state.dict()}
        )
        
        return True
    
    def _is_valid_summon_position(self, game_state: GameState, player_id: str, position: Position) -> bool:
        """Check if position is valid for summoning"""
        # Position must be empty
        for card in game_state.field.cards:
            if card.position == position:
                return False
        
        # Must be adjacent to player's deck leader or another card
        deck_leader = self._get_deck_leader(game_state, player_id)
        if not deck_leader:
            return False
        
        # Check if adjacent to deck leader
        if self._is_adjacent(position, deck_leader.position):
            return True
        
        # Check if adjacent to any player's card
        for card in game_state.field.cards:
            if card.owner_id == player_id and self._is_adjacent(position, card.position):
                return True
        
        return False
    
    def _get_deck_leader(self, game_state: GameState, player_id: str) -> Optional[FieldCard]:
        """Get player's deck leader"""
        for card in game_state.field.cards:
            if card.owner_id == player_id and card.is_deck_leader:
                return card
        return None
    
    def _is_adjacent(self, pos1: Position, pos2: Position) -> bool:
        """Check if two positions are adjacent"""
        return abs(pos1.x - pos2.x) <= 1 and abs(pos1.y - pos2.y) <= 1
    
    async def move_card(self, game_id: str, player_id: str, card_id: str, new_position: Position) -> bool:
        """Move a card to a new position"""
        game_state = await self.get_game(game_id)
        if not game_state or game_state.current_turn != player_id:
            return False
        
        # Find the card
        card = None
        for field_card in game_state.field.cards:
            if field_card.id == card_id and field_card.owner_id == player_id:
                card = field_card
                break
        
        if not card or not card.can_move:
            return False
        
        # Check if new position is valid
        if not self._is_valid_move(game_state, card, new_position):
            return False
        
        # Update position
        card.position = new_position
        card.can_move = False  # Can only move once per turn
        
        # Update game state
        await self.games_collection.update_one(
            {'id': game_id}, {'$set': game_state.dict()}
        )
        
        return True
    
    def _is_valid_move(self, game_state: GameState, card: FieldCard, new_position: Position) -> bool:
        """Check if move is valid"""
        # Position must be empty
        for field_card in game_state.field.cards:
            if field_card.position == new_position:
                return False
        
        # Must be within movement range (usually 1 square)
        if abs(card.position.x - new_position.x) > 1 or abs(card.position.y - new_position.y) > 1:
            return False
        
        # Check terrain restrictions
        terrain = game_state.field.terrain[new_position.y][new_position.x]
        if terrain == TerrainType.LABYRINTH:
            return False  # Most cards can't enter labyrinth
        
        if terrain == TerrainType.CRUSH:
            # Check if card will be destroyed
            card_data = await self.card_service.get_card_by_id(card.card_id)
            if card_data and card_data.attack and card_data.attack >= 1500:
                return False  # Card would be destroyed
        
        return True
    
    async def attack_card(self, game_id: str, player_id: str, attacker_id: str, target_id: str) -> Dict:
        """Execute an attack between two cards"""
        game_state = await self.get_game(game_id)
        if not game_state or game_state.current_turn != player_id:
            return {'success': False, 'message': 'Not your turn'}
        
        # Find attacker and target
        attacker = None
        target = None
        
        for card in game_state.field.cards:
            if card.id == attacker_id and card.owner_id == player_id:
                attacker = card
            elif card.id == target_id and card.owner_id != player_id:
                target = card
        
        if not attacker or not target:
            return {'success': False, 'message': 'Cards not found'}
        
        if not attacker.can_attack:
            return {'success': False, 'message': 'Card cannot attack'}
        
        # Check if cards are adjacent
        if not self._is_adjacent(attacker.position, target.position):
            return {'success': False, 'message': 'Cards must be adjacent to attack'}
        
        # Calculate battle result
        battle_result = self._calculate_battle(attacker, target)
        
        # Apply battle result
        damage = 0
        if battle_result['winner'] == 'attacker':
            # Remove target from field
            game_state.field.cards.remove(target)
            if target.is_deck_leader:
                # Direct damage to opponent
                damage = battle_result['damage']
                if target.owner_id == game_state.player1_id:
                    game_state.player1_lp -= damage
                else:
                    game_state.player2_lp -= damage
        elif battle_result['winner'] == 'target':
            # Remove attacker from field
            game_state.field.cards.remove(attacker)
            if attacker.is_deck_leader:
                # Direct damage to current player
                damage = battle_result['damage']
                if attacker.owner_id == game_state.player1_id:
                    game_state.player1_lp -= damage
                else:
                    game_state.player2_lp -= damage
        
        # Mark attacker as having attacked
        if attacker in game_state.field.cards:
            attacker.can_attack = False
        
        # Check win condition
        if game_state.player1_lp <= 0:
            game_state.status = 'player2_wins'
        elif game_state.player2_lp <= 0:
            game_state.status = 'player1_wins'
        
        # Update game state
        await self.games_collection.update_one(
            {'id': game_id}, {'$set': game_state.dict()}
        )
        
        return {
            'success': True,
            'battle_result': battle_result,
            'damage': damage,
            'game_status': game_state.status
        }
    
    def _calculate_battle(self, attacker: FieldCard, target: FieldCard) -> Dict:
        """Calculate battle result between two cards"""
        att_power = attacker.current_attack
        def_power = target.current_defense
        
        if att_power > def_power:
            return {
                'winner': 'attacker',
                'damage': att_power - def_power,
                'message': f'Attacker wins with {att_power - def_power} damage'
            }
        elif def_power > att_power:
            return {
                'winner': 'target',
                'damage': def_power - att_power,
                'message': f'Defender wins with {def_power - att_power} damage'
            }
        else:
            return {
                'winner': 'draw',
                'damage': 0,
                'message': 'Both cards destroyed'
            }
    
    async def end_turn(self, game_id: str, player_id: str) -> bool:
        """End current player's turn"""
        game_state = await self.get_game(game_id)
        if not game_state or game_state.current_turn != player_id:
            return False
        
        # Switch to next player
        game_state.current_turn = (
            game_state.player2_id if game_state.current_turn == game_state.player1_id
            else game_state.player1_id
        )
        
        # Reset card abilities for new turn
        for card in game_state.field.cards:
            if card.owner_id == game_state.current_turn:
                card.can_attack = True
                card.can_move = True
                card.turns_on_field += 1
        
        # Draw a card for new turn
        new_turn_player = await self.get_player(game_state.current_turn)
        if new_turn_player:
            new_cards = await self._draw_cards(new_turn_player.deck_id, 1)
            if new_cards:
                new_turn_player.hand.extend(new_cards)
                await self.players_collection.update_one(
                    {'id': new_turn_player.id}, {'$set': {'hand': new_turn_player.hand}}
                )
        
        # Increment turn counter
        game_state.turn_number += 1
        
        # Check for 99 turn limit
        if game_state.turn_number >= 99:
            # Game ends, winner is player with higher LP
            if game_state.player1_lp > game_state.player2_lp:
                game_state.status = 'player1_wins'
            elif game_state.player2_lp > game_state.player1_lp:
                game_state.status = 'player2_wins'
            else:
                game_state.status = 'draw'
        
        # Update game state
        await self.games_collection.update_one(
            {'id': game_id}, {'$set': game_state.dict()}
        )
        
        return True
    
    async def get_valid_actions(self, game_id: str, player_id: str) -> List[str]:
        """Get list of valid actions for current player"""
        game_state = await self.get_game(game_id)
        if not game_state or game_state.current_turn != player_id:
            return []
        
        actions = []
        
        # Check if can summon
        player = await self.get_player(player_id)
        if player and player.hand:
            actions.append('summon')
        
        # Check if can move cards
        for card in game_state.field.cards:
            if card.owner_id == player_id and card.can_move:
                actions.append('move')
                break
        
        # Check if can attack
        for card in game_state.field.cards:
            if card.owner_id == player_id and card.can_attack:
                actions.append('attack')
                break
        
        # Can always end turn
        actions.append('end_turn')
        
        return actions
    
    async def get_game_state_for_player(self, game_id: str, player_id: str) -> Optional[Dict]:
        """Get game state from player's perspective"""
        game_state = await self.get_game(game_id)
        if not game_state:
            return None
        
        player = await self.get_player(player_id)
        if not player:
            return None
        
        # Get hand cards
        hand_cards = []
        for card_id in player.hand:
            card = await self.card_service.get_card_by_id(card_id)
            if card:
                hand_cards.append(card)
        
        # Get valid actions
        valid_actions = await self.get_valid_actions(game_id, player_id)
        
        return {
            'game_state': game_state,
            'hand_cards': hand_cards,
            'valid_actions': valid_actions,
            'is_your_turn': game_state.current_turn == player_id
        }