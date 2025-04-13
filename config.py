import os
from datetime import timedelta

# Flask configuration
DEBUG = True
SECRET_KEY = os.environ.get('SECRET_KEY') or os.urandom(24)

# SQLAlchemy configuration
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///realm_weaver.db'
SQLALCHEMY_TRACK_MODIFICATIONS = False

# OpenAI API configuration
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY') or 'your_openai_api_key_here'

# External APIs
WEATHER_API_KEY = os.environ.get('WEATHER_API_KEY') or 'your_weather_api_key_here'

# Session configuration
PERMANENT_SESSION_LIFETIME = timedelta(days=7)

# Game configuration
STARTING_ATTRIBUTES = {
    'health': 100,
    'max_health': 100, 
    'mana': 50,
    'max_mana': 50,
    'strength': 10,
    'intelligence': 10,
    'agility': 10,
    'charisma': 10
}

# Game class configurations
CHARACTER_CLASSES = {
    'warrior': {
        'description': 'A mighty fighter skilled in melee combat',
        'attribute_bonuses': {
            'strength': 3,
            'health': 20,
            'max_health': 20
        },
        'starting_skills': ['slash', 'block', 'charge'],
        'starting_items': ['simple_sword', 'leather_armor']
    },
    'mage': {
        'description': 'A practitioner of the arcane arts',
        'attribute_bonuses': {
            'intelligence': 3,
            'mana': 20,
            'max_mana': 20
        },
        'starting_skills': ['fireball', 'frost_bolt', 'arcane_shield'],
        'starting_items': ['apprentice_staff', 'cloth_robes']
    },
    'rogue': {
        'description': 'A nimble and stealthy character adept at subterfuge',
        'attribute_bonuses': {
            'agility': 3,
            'charisma': 1
        },
        'starting_skills': ['backstab', 'stealth', 'pickpocket'],
        'starting_items': ['simple_dagger', 'leather_armor']
    },
    'bard': {
        'description': 'A charming performer with a touch of magic',
        'attribute_bonuses': {
            'charisma': 3,
            'intelligence': 1
        },
        'starting_skills': ['inspire', 'charm', 'distract'],
        'starting_items': ['simple_lute', 'fancy_clothes']
    }
}

# Initial game regions
STARTER_REGIONS = [
    {
        'name': 'Sylvandale Forest',
        'theme': 'forest',
        'difficulty': 1,
        'description': 'A peaceful woodland realm with dappled sunlight and ancient trees. Suitable for novice adventurers.'
    },
    {
        'name': 'Mistvale Village',
        'theme': 'town',
        'difficulty': 1,
        'description': 'A small settlement nestled at the edge of Sylvandale Forest. A good place to find quests and supplies.'
    }
]

# Starting items templates
STARTER_ITEMS = [
    {
        'name': 'Simple Sword',
        'code': 'simple_sword',
        'description': 'A basic but reliable iron sword',
        'item_type': 'weapon',
        'subtype': 'sword',
        'rarity': 'common',
        'properties': {
            'damage': 5,
            'durability': 100,
            'value': 10
        }
    },
    {
        'name': 'Leather Armor',
        'code': 'leather_armor',
        'description': 'Basic protection made from tanned hide',
        'item_type': 'armor',
        'subtype': 'body',
        'rarity': 'common',
        'properties': {
            'defense': 3,
            'durability': 80,
            'value': 15
        }
    },
    {
        'name': 'Apprentice Staff',
        'code': 'apprentice_staff',
        'description': 'A wooden staff infused with minor arcane energy',
        'item_type': 'weapon',
        'subtype': 'staff',
        'rarity': 'common',
        'properties': {
            'damage': 3,
            'magic_bonus': 2,
            'durability': 90,
            'value': 12
        }
    },
    {
        'name': 'Cloth Robes',
        'code': 'cloth_robes',
        'description': 'Simple robes that enhance magical abilities',
        'item_type': 'armor',
        'subtype': 'body',
        'rarity': 'common',
        'properties': {
            'defense': 1,
            'magic_resist': 2,
            'durability': 60,
            'value': 8
        }
    },
    {
        'name': 'Simple Dagger',
        'code': 'simple_dagger',
        'description': 'A small blade for quick strikes',
        'item_type': 'weapon',
        'subtype': 'dagger',
        'rarity': 'common',
        'properties': {
            'damage': 3,
            'crit_chance': 5,
            'durability': 70,
            'value': 8
        }
    },
    {
        'name': 'Simple Lute',
        'code': 'simple_lute',
        'description': 'A basic stringed instrument for performances',
        'item_type': 'weapon',
        'subtype': 'instrument',
        'rarity': 'common',
        'properties': {
            'damage': 1,
            'charisma_bonus': 2,
            'durability': 50,
            'value': 15
        }
    },
    {
        'name': 'Fancy Clothes',
        'code': 'fancy_clothes',
        'description': 'Colorful garments that impress common folk',
        'item_type': 'armor',
        'subtype': 'body',
        'rarity': 'common',
        'properties': {
            'defense': 1,
            'charisma_bonus': 2,
            'durability': 40,
            'value': 12
        }
    },
    {
        'name': 'Health Potion',
        'code': 'health_potion',
        'description': 'A red liquid that restores health',
        'item_type': 'consumable',
        'subtype': 'potion',
        'rarity': 'common',
        'properties': {
            'restore_health': 20,
            'value': 5
        }
    },
    {
        'name': 'Mana Potion',
        'code': 'mana_potion',
        'description': 'A blue liquid that restores mana',
        'item_type': 'consumable',
        'subtype': 'potion',
        'rarity': 'common',
        'properties': {
            'restore_mana': 15,
            'value': 5
        }
    }
]

# Starting NPC templates
STARTER_NPCS = [
    {
        'name': 'Mayor Thornwick',
        'race': 'human',
        'occupation': 'mayor',
        'personality': 'formal',
        'description': 'The portly mayor of Mistvale Village, known for his flowery speeches and concern for order',
        'dialogue_traits': ['verbose', 'proper', 'concerned'],
        'location': 'Mistvale Village'
    },
    {
        'name': 'Elara the Herbalist',
        'race': 'elf',
        'occupation': 'healer',
        'personality': 'kind',
        'description': 'A wise elf who collects herbs in Sylvandale Forest and sells remedies to villagers',
        'dialogue_traits': ['wise', 'gentle', 'helpful'],
        'location': 'Sylvandale Forest'
    },
    {
        'name': 'Grimble',
        'race': 'dwarf',
        'occupation': 'blacksmith',
        'personality': 'gruff',
        'description': 'The village blacksmith with impressive muscles and an even more impressive beard',
        'dialogue_traits': ['direct', 'honest', 'technical'],
        'location': 'Mistvale Village'
    },
    {
        'name': 'Whisper',
        'race': 'halfling',
        'occupation': 'merchant',
        'personality': 'shrewd',
        'description': 'A traveling merchant with mysterious goods and questionable sourcing',
        'dialogue_traits': ['evasive', 'witty', 'persuasive'],
        'location': 'Mistvale Village'
    }
]