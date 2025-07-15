from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

# Enums for game constants
class CardType(str, Enum):
    MONSTER = "monster"
    SPELL = "spell"
    TRAP = "trap"

class MonsterType(str, Enum):
    NORMAL = "normal"
    EFFECT = "effect"
    RITUAL = "ritual"
    FUSION = "fusion"

class Attribute(str, Enum):
    LIGHT = "light"
    DARK = "dark"
    WATER = "water"
    FIRE = "fire"
    EARTH = "earth"
    WIND = "wind"
    DIVINE = "divine"

class Race(str, Enum):
    DRAGON = "dragon"
    FIEND = "fiend"
    ZOMBIE = "zombie"
    MACHINE = "machine"
    AQUA = "aqua"
    PYRO = "pyro"
    ROCK = "rock"
    WINGED_BEAST = "winged_beast"
    PLANT = "plant"
    INSECT = "insect"
    THUNDER = "thunder"
    BEAST = "beast"
    BEAST_WARRIOR = "beast_warrior"
    WARRIOR = "warrior"
    SPELLCASTER = "spellcaster"
    FAIRY = "fairy"
    FISH = "fish"
    SEA_SERPENT = "sea_serpent"
    REPTILE = "reptile"
    PSYCHIC = "psychic"
    DIVINE_BEAST = "divine_beast"
    CREATOR_GOD = "creator_god"
    DINOSAUR = "dinosaur"

class TerrainType(str, Enum):
    NORMAL = "normal"
    FOREST = "forest"
    MEADOW = "meadow"
    MOUNTAIN = "mountain"
    SEA = "sea"
    WASTELAND = "wasteland"
    DARKNESS = "darkness"
    TOON = "toon"
    CRUSH = "crush"
    LABYRINTH = "labyrinth"

class GamePhase(str, Enum):
    DRAW = "draw"
    MAIN = "main"
    BATTLE = "battle"
    END = "end"

class CardPosition(str, Enum):
    FACE_UP_ATTACK = "face_up_attack"
    FACE_DOWN_DEFENSE = "face_down_defense"
    FACE_UP_DEFENSE = "face_up_defense"

# Card Models
class YugiohCard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    game_id: int  # Original game card ID (0-853)
    name: str
    card_type: CardType
    description: str
    deck_cost: int
    
    # Monster specific fields
    attack: Optional[int] = None
    defense: Optional[int] = None
    level: Optional[int] = None
    attribute: Optional[Attribute] = None
    race: Optional[Race] = None
    monster_type: Optional[MonsterType] = None
    
    # Spell/Trap specific fields
    spell_type: Optional[str] = None
    trap_type: Optional[str] = None
    
    # Game mechanics
    can_be_deck_leader: bool = False
    leader_abilities: List[str] = []
    terrain_bonuses: Dict[str, int] = {}
    
    # Image and artwork
    image_url: Optional[str] = None
    artwork_url: Optional[str] = None

class DeckCard(BaseModel):
    card_id: str
    quantity: int = 1

class Deck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    player_id: str
    cards: List[DeckCard] = []
    deck_leader_id: str
    total_cost: int = 0
    max_cost: int = 2000
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Game Models
class Position(BaseModel):
    x: int = Field(ge=0, le=6)  # 0-6 for 7x7 grid
    y: int = Field(ge=0, le=6)

class FieldCard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    card_id: str
    position: Position
    owner_id: str
    is_deck_leader: bool = False
    position_state: CardPosition = CardPosition.FACE_UP_ATTACK
    current_attack: int
    current_defense: int
    can_attack: bool = True
    can_move: bool = True
    turns_on_field: int = 0
    status_effects: List[str] = []

class GameField(BaseModel):
    terrain: List[List[TerrainType]] = []  # 7x7 grid
    cards: List[FieldCard] = []
    
    def __init__(self, **data):
        super().__init__(**data)
        if not self.terrain:
            # Initialize with normal terrain
            self.terrain = [[TerrainType.NORMAL for _ in range(7)] for _ in range(7)]

class Player(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: Optional[str] = None
    life_points: int = 8000
    deck_id: str
    hand: List[str] = []  # Card IDs
    deck_leader_position: Optional[Position] = None
    experience: int = 0
    level: int = 1
    wins: int = 0
    losses: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GameState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player1_id: str
    player2_id: str
    current_turn: str  # Player ID
    phase: GamePhase = GamePhase.DRAW
    turn_number: int = 1
    field: GameField = Field(default_factory=GameField)
    player1_lp: int = 8000
    player2_lp: int = 8000
    is_multiplayer: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "active"  # active, finished, paused

class GameAction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    game_id: str
    player_id: str
    action_type: str  # summon, move, attack, activate_spell, etc.
    target_position: Optional[Position] = None
    card_id: Optional[str] = None
    additional_data: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Authentication Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    password_hash: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    profile: Optional[Player] = None

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

# Response Models
class GameResponse(BaseModel):
    game_state: GameState
    player_hand: List[YugiohCard]
    available_actions: List[str]
    message: str = ""

class CardResponse(BaseModel):
    cards: List[YugiohCard]
    total: int
    page: int
    per_page: int

class DeckResponse(BaseModel):
    deck: Deck
    cards: List[YugiohCard]
    total_cost: int
    is_valid: bool
    errors: List[str] = []