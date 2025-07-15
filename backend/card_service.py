import aiohttp
import json
from typing import List, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import YugiohCard, CardType, Attribute, Race, MonsterType, TerrainType
import logging

logger = logging.getLogger(__name__)

class CardService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.cards_collection = db.yugioh_cards
        self.ygoprodeck_api = "https://db.ygoprodeck.com/api/v7/cardinfo.php"
        
    async def initialize_card_database(self):
        """Initialize the card database with Yu-Gi-Oh! cards from external API"""
        try:
            # Check if cards already exist
            card_count = await self.cards_collection.count_documents({})
            if card_count > 0:
                logger.info(f"Card database already initialized with {card_count} cards")
                return
            
            # Fetch cards from YGOPRODeck API
            async with aiohttp.ClientSession() as session:
                async with session.get(self.ygoprodeck_api) as response:
                    if response.status == 200:
                        data = await response.json()
                        cards_data = data.get('data', [])
                        
                        yugioh_cards = []
                        for i, card_data in enumerate(cards_data[:854]):  # Limit to 854 cards like original
                            yugioh_card = self._convert_to_yugioh_card(card_data, i)
                            yugioh_cards.append(yugioh_card.dict())
                        
                        # Insert cards into database
                        if yugioh_cards:
                            await self.cards_collection.insert_many(yugioh_cards)
                            logger.info(f"Inserted {len(yugioh_cards)} cards into database")
                        
                        # Create special story cards
                        await self._create_story_cards()
                        
        except Exception as e:
            logger.error(f"Error initializing card database: {e}")
            
    def _convert_to_yugioh_card(self, card_data: Dict, game_id: int) -> YugiohCard:
        """Convert external card data to YugiohCard format"""
        card_type = self._determine_card_type(card_data)
        
        # Base card info
        yugioh_card = YugiohCard(
            game_id=game_id,
            name=card_data.get('name', ''),
            card_type=card_type,
            description=card_data.get('desc', ''),
            deck_cost=self._calculate_deck_cost(card_data),
            image_url=card_data.get('card_images', [{}])[0].get('image_url', ''),
            artwork_url=card_data.get('card_images', [{}])[0].get('image_url_small', '')
        )
        
        # Monster specific fields
        if card_type == CardType.MONSTER:
            yugioh_card.attack = card_data.get('atk', 0)
            yugioh_card.defense = card_data.get('def', 0)
            yugioh_card.level = card_data.get('level', 1)
            yugioh_card.attribute = self._convert_attribute(card_data.get('attribute', ''))
            yugioh_card.race = self._convert_race(card_data.get('race', ''))
            yugioh_card.monster_type = self._determine_monster_type(card_data)
            yugioh_card.can_be_deck_leader = yugioh_card.level >= 1
            
            # Set terrain bonuses based on race
            yugioh_card.terrain_bonuses = self._calculate_terrain_bonuses(yugioh_card.race)
            
        elif card_type == CardType.SPELL:
            yugioh_card.spell_type = card_data.get('race', 'Normal')
            
        elif card_type == CardType.TRAP:
            yugioh_card.trap_type = card_data.get('race', 'Normal')
            
        return yugioh_card
    
    def _determine_card_type(self, card_data: Dict) -> CardType:
        """Determine card type from external data"""
        frame_type = card_data.get('frameType', '').lower()
        type_line = card_data.get('type', '').lower()
        
        if 'monster' in frame_type or 'monster' in type_line:
            return CardType.MONSTER
        elif 'spell' in frame_type or 'spell' in type_line:
            return CardType.SPELL
        elif 'trap' in frame_type or 'trap' in type_line:
            return CardType.TRAP
        else:
            return CardType.MONSTER  # Default to monster
    
    def _determine_monster_type(self, card_data: Dict) -> MonsterType:
        """Determine monster type from external data"""
        type_line = card_data.get('type', '').lower()
        
        if 'ritual' in type_line:
            return MonsterType.RITUAL
        elif 'fusion' in type_line:
            return MonsterType.FUSION
        elif 'effect' in type_line:
            return MonsterType.EFFECT
        else:
            return MonsterType.NORMAL
    
    def _convert_attribute(self, attribute: str) -> Attribute:
        """Convert external attribute to internal enum"""
        attr_map = {
            'light': Attribute.LIGHT,
            'dark': Attribute.DARK,
            'water': Attribute.WATER,
            'fire': Attribute.FIRE,
            'earth': Attribute.EARTH,
            'wind': Attribute.WIND,
            'divine': Attribute.DIVINE
        }
        return attr_map.get(attribute.lower(), Attribute.LIGHT)
    
    def _convert_race(self, race: str) -> Race:
        """Convert external race to internal enum"""
        race_map = {
            'dragon': Race.DRAGON,
            'fiend': Race.FIEND,
            'zombie': Race.ZOMBIE,
            'machine': Race.MACHINE,
            'aqua': Race.AQUA,
            'pyro': Race.PYRO,
            'rock': Race.ROCK,
            'winged beast': Race.WINGED_BEAST,
            'plant': Race.PLANT,
            'insect': Race.INSECT,
            'thunder': Race.THUNDER,
            'beast': Race.BEAST,
            'beast-warrior': Race.BEAST_WARRIOR,
            'warrior': Race.WARRIOR,
            'spellcaster': Race.SPELLCASTER,
            'fairy': Race.FAIRY,
            'fish': Race.FISH,
            'sea serpent': Race.SEA_SERPENT,
            'reptile': Race.REPTILE,
            'psychic': Race.PSYCHIC,
            'divine-beast': Race.DIVINE_BEAST,
            'creator god': Race.CREATOR_GOD,
            'dinosaur': Race.DINOSAUR
        }
        return race_map.get(race.lower(), Race.WARRIOR)
    
    def _calculate_deck_cost(self, card_data: Dict) -> int:
        """Calculate deck cost based on card power"""
        base_cost = 10
        
        if card_data.get('type', '').lower().find('monster') != -1:
            atk = card_data.get('atk', 0)
            def_val = card_data.get('def', 0)
            level = card_data.get('level', 1)
            
            # Cost calculation similar to original game
            cost = base_cost + (level * 5) + (atk // 100) + (def_val // 100)
            return min(cost, 500)  # Cap at 500
        
        return base_cost
    
    def _calculate_terrain_bonuses(self, race: Race) -> Dict[str, int]:
        """Calculate terrain bonuses based on monster race"""
        bonuses = {}
        
        # Define terrain bonuses like in original game
        terrain_race_bonuses = {
            TerrainType.FOREST: [Race.INSECT, Race.BEAST, Race.BEAST_WARRIOR, Race.PLANT, Race.PYRO],
            TerrainType.MEADOW: [Race.WARRIOR, Race.BEAST_WARRIOR],
            TerrainType.MOUNTAIN: [Race.DRAGON, Race.WINGED_BEAST, Race.THUNDER, Race.FAIRY],
            TerrainType.SEA: [Race.FISH, Race.SEA_SERPENT, Race.THUNDER, Race.AQUA],
            TerrainType.WASTELAND: [Race.DINOSAUR, Race.MACHINE, Race.ZOMBIE, Race.ROCK],
            TerrainType.DARKNESS: [Race.FIEND, Race.SPELLCASTER, Race.ZOMBIE],
            TerrainType.TOON: [],  # Special handling for toon monsters
        }
        
        # Apply bonuses
        for terrain, races in terrain_race_bonuses.items():
            if race in races:
                bonuses[terrain.value] = 500  # +500 ATK/DEF bonus
            elif terrain == TerrainType.FOREST and race == Race.FIEND:
                bonuses[terrain.value] = -400  # Penalty for fiends in forest
            elif terrain == TerrainType.MEADOW and race == Race.SPELLCASTER:
                bonuses[terrain.value] = -200  # Penalty for spellcasters in meadow
            elif terrain == TerrainType.MOUNTAIN and race == Race.ZOMBIE:
                bonuses[terrain.value] = -200  # Penalty for zombies in mountain
            elif terrain == TerrainType.SEA and race in [Race.PYRO, Race.MACHINE]:
                bonuses[terrain.value] = -300  # Penalty for fire/machine in sea
            elif terrain == TerrainType.WASTELAND and race in [Race.FISH, Race.PLANT, Race.SEA_SERPENT, Race.AQUA]:
                bonuses[terrain.value] = -300  # Penalty for water types in wasteland
            elif terrain == TerrainType.DARKNESS and race == Race.FAIRY:
                bonuses[terrain.value] = -400  # Penalty for fairies in darkness
        
        return bonuses
    
    async def _create_story_cards(self):
        """Create the special story cards Red Rose and White Rose"""
        story_cards = [
            YugiohCard(
                game_id=854,
                name="Red Rose",
                card_type=CardType.SPELL,
                description="A mystical red rose that symbolizes passion and power.",
                deck_cost=0,
                spell_type="Normal",
                can_be_deck_leader=False
            ),
            YugiohCard(
                game_id=855,
                name="White Rose",
                card_type=CardType.SPELL,
                description="A pure white rose that represents peace and purity.",
                deck_cost=0,
                spell_type="Normal",
                can_be_deck_leader=False
            )
        ]
        
        for card in story_cards:
            await self.cards_collection.insert_one(card.dict())
    
    async def get_cards(self, 
                       skip: int = 0, 
                       limit: int = 50, 
                       card_type: Optional[CardType] = None,
                       race: Optional[Race] = None,
                       attribute: Optional[Attribute] = None,
                       search: Optional[str] = None) -> List[YugiohCard]:
        """Get cards with filtering options"""
        query = {}
        
        if card_type:
            query['card_type'] = card_type.value
        if race:
            query['race'] = race.value
        if attribute:
            query['attribute'] = attribute.value
        if search:
            query['name'] = {'$regex': search, '$options': 'i'}
        
        cursor = self.cards_collection.find(query).skip(skip).limit(limit)
        cards_data = await cursor.to_list(length=limit)
        
        return [YugiohCard(**card) for card in cards_data]
    
    async def get_card_by_id(self, card_id: str) -> Optional[YugiohCard]:
        """Get a specific card by ID"""
        card_data = await self.cards_collection.find_one({'id': card_id})
        if card_data:
            return YugiohCard(**card_data)
        return None
    
    async def get_card_by_game_id(self, game_id: int) -> Optional[YugiohCard]:
        """Get a specific card by game ID (0-855)"""
        card_data = await self.cards_collection.find_one({'game_id': game_id})
        if card_data:
            return YugiohCard(**card_data)
        return None
    
    async def get_deck_leader_cards(self) -> List[YugiohCard]:
        """Get all cards that can be deck leaders"""
        query = {'can_be_deck_leader': True}
        cursor = self.cards_collection.find(query)
        cards_data = await cursor.to_list(length=None)
        
        return [YugiohCard(**card) for card in cards_data]
    
    async def search_cards(self, query: str, limit: int = 20) -> List[YugiohCard]:
        """Search cards by name"""
        search_query = {'name': {'$regex': query, '$options': 'i'}}
        cursor = self.cards_collection.find(search_query).limit(limit)
        cards_data = await cursor.to_list(length=limit)
        
        return [YugiohCard(**card) for card in cards_data]