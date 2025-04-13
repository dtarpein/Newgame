import random
import json

class QuestGenerator:
    """Service for generating quests in the game"""
    
    def __init__(self, llm_service):
        """Initialize with LLM service for narrative generation"""
        self.llm_service = llm_service
        
        # Quest templates for fallback generation
        self.quest_templates = {
            'fetch': {
                'title_format': "Retrieve the {item}",
                'description_format': "A {item} has been lost in the {location}. It's needed by {character} for {reason}.",
                'objective_format': "Find the {item} and return it to {character}.",
                'steps': [
                    "Speak with {character} to learn about the lost {item}.",
                    "Travel to the {location} to search for the {item}.",
                    "Retrieve the {item} from {obstacle}.",
                    "Return the {item} to {character}."
                ]
            },
            'kill': {
                'title_format': "Eliminate the {enemy}",
                'description_format': "The {enemy} has been causing trouble in {location}. {character} has asked you to deal with them.",
                'objective_format': "Defeat the {enemy} and report back to {character}.",
                'steps': [
                    "Speak with {character} to learn about the {enemy} threat.",
                    "Track down the {enemy} in {location}.",
                    "Defeat the {enemy} in combat.",
                    "Return to {character} with proof of your victory."
                ]
            },
            'escort': {
                'title_format': "Escort {character} to {destination}",
                'description_format': "{character} needs safe passage to {destination} through {obstacle}.",
                'objective_format': "Safely escort {character} to {destination}.",
                'steps': [
                    "Meet {character} at the starting point.",
                    "Protect {character} as you travel through {obstacle}.",
                    "Defeat any {enemy} that tries to ambush you.",
                    "Deliver {character} safely to {destination}."
                ]
            },
            'delivery': {
                'title_format': "Deliver {item} to {character}",
                'description_format': "An important {item} needs to be delivered to {character} in {location}.",
                'objective_format': "Deliver the {item} to {character} in {location}.",
                'steps': [
                    "Receive the {item} and delivery instructions.",
                    "Travel to {location}, avoiding {obstacle}.",
                    "Navigate through {location} to find {character}.",
                    "Hand over the {item} to {character}."
                ]
            },
            'explore': {
                'title_format': "Explore the {location}",
                'description_format': "The {location} holds many secrets. {character} wants you to map it out and discover what's hidden there.",
                'objective_format': "Explore the {location} and report your findings to {character}.",
                'steps': [
                    "Speak with {character} to learn about the {location}.",
                    "Travel to and enter the {location}.",
                    "Map out the area and discover the {secret}.",
                    "Return to {character} with your findings."
                ]
            }
        }
    
    def generate_quest(self, character, region, quest_type):
        """Generate a quest for a character in a region"""
        try:
            # Try to generate quest with LLM
            quest_data = self.llm_service.generate_quest(character, region, quest_type)
            if self._validate_quest_data(quest_data):
                return quest_data
        except Exception as e:
            print(f"LLM quest generation failed: {e}")
        
        # Fall back to template-based generation
        return self._generate_fallback_quest(character, region, quest_type)
    
    def _validate_quest_data(self, quest_data):
        """Validate quest data structure"""
        required_keys = ['title', 'description', 'objective', 'difficulty', 
                         'reward_xp', 'reward_gold', 'reward_items', 'steps']
        
        if not all(key in quest_data for key in required_keys):
            return False
        
        if not isinstance(quest_data['reward_items'], list):
            return False
        
        if not isinstance(quest_data['steps'], list) or len(quest_data['steps']) == 0:
            return False
        
        return True
    
    def _generate_fallback_quest(self, character, region, quest_type):
        """Generate a procedural quest using templates"""
        # Default to fetch if quest type not recognized
        if quest_type not in self.quest_templates:
            quest_type = 'fetch'
        
        template = self.quest_templates[quest_type]
        
        # Fill in placeholder values
        placeholders = self._generate_placeholders(region, quest_type)
        
        # Generate title, description, and objective
        title = template['title_format'].format(**placeholders)
        description = template['description_format'].format(**placeholders)
        objective = template['objective_format'].format(**placeholders)
        
        # Generate steps
        steps = []
        for i, step_format in enumerate(template['steps']):
            step_description = step_format.format(**placeholders)
            steps.append({
                "order": i + 1,
                "description": step_description
            })
        
        # Calculate rewards based on character level and region difficulty
        difficulty = region.difficulty
        character_level = character.level
        
        reward_xp = int(character_level * 50 * (1 + (difficulty / 10)))
        reward_gold = int(character_level * 10 * (1 + (difficulty / 10)))
        
        # Generate reward items
        reward_items = self._generate_reward_items(character_level, difficulty, quest_type)
        
        return {
            "title": title,
            "description": description,
            "objective": objective,
            "difficulty": difficulty,
            "reward_xp": reward_xp,
            "reward_gold": reward_gold,
            "reward_items": reward_items,
            "steps": steps
        }
    
    def _generate_placeholders(self, region, quest_type):
        """Generate placeholder values for quest templates"""
        placeholders = {}
        
        # Create location-based placeholders
        placeholders['location'] = region.name
        
        # Quest-specific placeholders
        if quest_type == 'fetch':
            items = ["ancient artifact", "magical crystal", "lost heirloom", "rare herb", 
                     "stolen necklace", "forgotten tome", "enchanted weapon"]
            characters = ["the local healer", "a worried merchant", "an elderly scholar", 
                          "the town's blacksmith", "a mysterious traveler"]
            reasons = ["a powerful ritual", "treating a rare illness", "completing their collection", 
                       "crafting a special item", "returning it to its rightful owner"]
            obstacles = ["a hidden cave", "a band of thieves", "a dangerous creature", 
                         "a locked chest", "the depths of the wilderness"]
            
            placeholders['item'] = random.choice(items)
            placeholders['character'] = random.choice(characters)
            placeholders['reason'] = random.choice(reasons)
            placeholders['obstacle'] = random.choice(obstacles)
        
        elif quest_type == 'kill':
            enemies = ["pack of wolves", "bandit leader", "corrupted spirit", 
                       "rampaging troll", "cult of fanatics", "venomous beast"]
            characters = ["the village elder", "a concerned farmer", "the local guard captain", 
                          "a frightened traveler", "a vengeful survivor"]
            
            placeholders['enemy'] = random.choice(enemies)
            placeholders['character'] = random.choice(characters)
        
        elif quest_type == 'escort':
            characters = ["wounded soldier", "wealthy merchant", "young noble", 
                          "foreign diplomat", "elderly pilgrim", "scared child"]
            destinations = ["neighboring village", "mountain sanctuary", "coastal fort", 
                            "forest temple", "desert oasis"]
            obstacles = ["monster territory", "bandit-infested woods", "treacherous mountain path", 
                         "war-torn countryside", "dangerous swampland"]
            enemies = ["bandits", "wild beasts", "hostile natives", "undead", "mercenaries"]
            
            placeholders['character'] = random.choice(characters)
            placeholders['destination'] = random.choice(destinations)
            placeholders['obstacle'] = random.choice(obstacles)
            placeholders['enemy'] = random.choice(enemies)
        
        elif quest_type == 'delivery':
            items = ["sealed letter", "rare medicine", "diplomatic package", 
                     "fragile artifact", "valuable supplies", "magical component"]
            characters = ["reclusive mage", "noble's steward", "frontier outpost commander", 
                          "temple priestess", "underground contact"]
            obstacles = ["enemy patrols", "harsh weather", "difficult terrain", 
                         "territorial wildlife", "suspicious guards"]
            
            placeholders['item'] = random.choice(items)
            placeholders['character'] = random.choice(characters)
            placeholders['obstacle'] = random.choice(obstacles)
        
        elif quest_type == 'explore':
            locations = ["ancient ruins", "forgotten catacombs", "uncharted cave system", 
                         "abandoned mine", "overgrown temple", "mysterious tower"]
            characters = ["cartographer's guild", "curious scholar", "treasure hunter", 
                          "royal historian", "local folklore collector"]
            secrets = ["hidden treasure", "lost knowledge", "ancient technology", 
                       "forgotten history", "powerful artifact"]
            
            placeholders['location'] = random.choice(locations)
            placeholders['character'] = random.choice(characters)
            placeholders['secret'] = random.choice(secrets)
        
        return placeholders
    
    def _generate_reward_items(self, character_level, difficulty, quest_type):
        """Generate appropriate reward items for the quest"""
        reward_items = []
        
        # Always include a gold reward
        gold_item = {
            "name": "Gold",
            "description": "Standard currency",
            "type": "currency",
            "rarity": "common",
            "properties": {
                "value": character_level * 10 * difficulty
            }
        }
        reward_items.append(gold_item)
        
        # Add consumable reward
        consumable_types = ["Health Potion", "Mana Potion", "Stamina Potion", "Antidote", "Elixir"]
        consumable = {
            "name": random.choice(consumable_types),
            "description": f"A useful potion for adventurers",
            "type": "consumable",
            "rarity": "common",
            "properties": {
                "value": character_level * 5,
                "effect": consumable_types[0].lower().replace(" ", "_")
            }
        }
        reward_items.append(consumable)
        
        # Add special quest-specific reward with higher chance for better items on harder quests
        rarity_thresholds = {
            "common": 0,
            "uncommon": 3,
            "rare": 6,
            "epic": 8
        }
        
        # Determine rarity based on difficulty
        rarity = "common"
        for r, threshold in rarity_thresholds.items():
            if difficulty >= threshold:
                rarity = r
        
        # Quest-specific rewards
        if quest_type == 'fetch' or quest_type == 'delivery':
            item_types = ["ring", "amulet", "trinket"]
            attributes = ["strength", "intelligence", "agility", "charisma"]
            
            special_item = {
                "name": f"{rarity.capitalize()} {random.choice(item_types)} of {random.choice(attributes).capitalize()}",
                "description": f"A {rarity} item that enhances {random.choice(attributes)}",
                "type": "accessory",
                "rarity": rarity,
                "properties": {
                    "value": character_level * 10 * (difficulty / 2)
                }
            }
            reward_items.append(special_item)
        
        elif quest_type == 'kill':
            weapon_types = ["sword", "axe", "bow", "staff", "dagger"]
            
            special_item = {
                "name": f"{rarity.capitalize()} {random.choice(weapon_types)}",
                "description": f"A {rarity} weapon taken from your defeated enemy",
                "type": "weapon",
                "rarity": rarity,
                "properties": {
                    "damage": character_level * (1 + (difficulty / 10)),
                    "value": character_level * 15 * (difficulty / 2)
                }
            }
            reward_items.append(special_item)
        
        elif quest_type == 'escort' or quest_type == 'explore':
            armor_types = ["helmet", "chestplate", "gloves", "boots"]
            
            special_item = {
                "name": f"{rarity.capitalize()} {random.choice(armor_types)}",
                "description": f"A {rarity} piece of protective gear",
                "type": "armor",
                "rarity": rarity,
                "properties": {
                    "defense": character_level * (1 + (difficulty / 20)),
                    "value": character_level * 12 * (difficulty / 2)
                }
            }
            reward_items.append(special_item)
        
        return reward_items