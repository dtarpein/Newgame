import openai
import json
import re
import random

class LLMService:
    """Service for integrating Large Language Models into the game"""
    
    def __init__(self, api_key):
        """Initialize with OpenAI API key"""
        openai.api_key = api_key
    
    def generate_text(self, prompt, max_tokens=300, temperature=0.7, model="gpt-3.5-turbo"):
        """Generate text using OpenAI API"""
        try:
            response = openai.ChatCompletion.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a creative fantasy game assistant."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error in LLM text generation: {e}")
            description = descriptions.get(theme, descriptions[default_theme])
        
        # Generate a simple map grid
        width, height = 20, 20
        tiles = []
        
        # Fill with appropriate terrain based on theme
        if theme == 'forest':
            base_tile = 'forest'
            secondary_tile = 'grass'
            tertiary_tile = 'water'
        elif theme == 'mountain':
            base_tile = 'mountain'
            secondary_tile = 'grass'
            tertiary_tile = 'rock'
        elif theme == 'desert':
            base_tile = 'sand'
            secondary_tile = 'rock'
            tertiary_tile = 'cactus'
        elif theme == 'swamp':
            base_tile = 'swamp'
            secondary_tile = 'water'
            tertiary_tile = 'grass'
        elif theme == 'town':
            base_tile = 'grass'
            secondary_tile = 'path'
            tertiary_tile = 'building'
        elif theme == 'dungeon':
            base_tile = 'stone'
            secondary_tile = 'corridor'
            tertiary_tile = 'wall'
        else:
            base_tile = 'grass'
            secondary_tile = 'forest'
            tertiary_tile = 'water'
        
        # Generate tile map with random distribution
        for y in range(height):
            row = []
            for x in range(width):
                r = random.random()
                if r < 0.7:  # 70% base terrain
                    row.append(base_tile)
                elif r < 0.9:  # 20% secondary terrain
                    row.append(secondary_tile)
                else:  # 10% tertiary terrain
                    row.append(tertiary_tile)
            tiles.append(row)
        
        # Generate some landmarks
        landmarks = []
        landmark_types = ['natural', 'ruin', 'settlement', 'cave', 'special']
        
        # Number of landmarks scales with difficulty
        num_landmarks = max(3, min(7, difficulty + 2))
        
        # Track used positions to avoid overlap
        used_positions = set()
        
        for i in range(num_landmarks):
            # Try to find unused position
            attempts = 0
            while attempts < 20:  # Limit attempts to prevent infinite loop
                x = random.randint(0, width - 1)
                y = random.randint(0, height - 1)
                pos = (x, y)
                if pos not in used_positions:
                    used_positions.add(pos)
                    break
                attempts += 1
            
            landmark_type = random.choice(landmark_types)
            
            # Generate landmark name based on type and theme
            if landmark_type == 'natural':
                prefixes = ["Ancient", "Mystic", "Whispering", "Giant", "Crystal", "Shadow"]
                suffixes = ["Tree", "Rock", "Pool", "Waterfall", "Geyser", "Formation"]
                name = f"{random.choice(prefixes)} {random.choice(suffixes)}"
            elif landmark_type == 'ruin':
                prefixes = ["Abandoned", "Forgotten", "Ancient", "Crumbling", "Lost", "Haunted"]
                suffixes = ["Temple", "Tower", "Fortress", "Shrine", "Palace", "Monument"]
                name = f"{random.choice(prefixes)} {random.choice(suffixes)}"
            elif landmark_type == 'settlement':
                prefixes = ["Trader's", "Hunter's", "Miner's", "Pilgrim's", "Refugee", "Outlaw"]
                suffixes = ["Camp", "Outpost", "Village", "Haven", "Rest", "Hideout"]
                name = f"{random.choice(prefixes)} {random.choice(suffixes)}"
            elif landmark_type == 'cave':
                prefixes = ["Dark", "Echoing", "Hidden", "Glittering", "Damp", "Winding"]
                suffixes = ["Cavern", "Grotto", "Cave", "Tunnel", "Passage", "Mine"]
                name = f"{random.choice(prefixes)} {random.choice(suffixes)}"
            else:  # special
                special_names = [
                    "Moonlit Altar", "Wizard's Laboratory", "Dragon's Rest",
                    "Fairy Circle", "Elemental Nexus", "Time-Lost Shrine"
                ]
                name = random.choice(special_names)
            
            # Generate landmark description
            landmark_desc = f"A {landmark_type} location in the {theme}. "
            if landmark_type == 'natural':
                landmark_desc += f"A remarkable {theme} feature that stands out from its surroundings."
            elif landmark_type == 'ruin':
                landmark_desc += f"The remains of an ancient structure, now reclaimed by the {theme}."
            elif landmark_type == 'settlement':
                landmark_desc += f"A small gathering of inhabitants who have adapted to life in the {theme}."
            elif landmark_type == 'cave':
                landmark_desc += f"An opening leading beneath the surface, promising both danger and discovery."
            else:  # special
                landmark_desc += f"A unique location with mysterious properties, unlike anything else in the {theme}."
            
            landmarks.append({
                "name": name,
                "description": landmark_desc,
                "type": landmark_type,
                "x": x,
                "y": y
            })
        
        return {
            "name": name,
            "description": description,
            "map_data": {
                "width": width,
                "height": height,
                "tiles": tiles
            },
            "landmarks": landmarks
        }
    
    def _generate_fallback_quest(self, character, region, quest_type):
        """Generate a procedural quest when API call fails"""
        quest_types = {
            'fetch': ["Retrieval", "Collection", "Gathering", "Recovery"],
            'kill': ["Hunting", "Extermination", "Culling", "Bounty"],
            'escort': ["Protection", "Convoy", "Safeguard", "Guidance"],
            'explore': ["Exploration", "Mapping", "Discovery", "Scouting"],
            'delivery': ["Delivery", "Transport", "Courier", "Shipment"]
        }
        
        # Default to fetch if type not recognized
        if quest_type not in quest_types:
            quest_type = 'fetch'
        
        title_prefix = random.choice(quest_types[quest_type])
        
        # Generate quest title based on type and region
        if quest_type == 'fetch':
            items = ["Artifact", "Heirloom", "Ingredient", "Relic", "Tome", "Crystal"]
            title = f"{title_prefix}: The Lost {random.choice(items)}"
        elif quest_type == 'kill':
            enemies = ["Bandits", "Wolves", "Cultists", "Spirits", "Golems", "Vermin"]
            title = f"{title_prefix}: {random.choice(enemies)} Threat"
        elif quest_type == 'escort':
            npcs = ["Merchant", "Scholar", "Noble", "Child", "Elder", "Pilgrim"]
            title = f"{title_prefix}: {random.choice(npcs)}'s Journey"
        elif quest_type == 'explore':
            locations = ["Ruins", "Cave", "Forest", "Temple", "Tower", "Passage"]
            title = f"{title_prefix}: Forgotten {random.choice(locations)}"
        else:  # delivery
            packages = ["Package", "Message", "Supplies", "Medicine", "Weapon", "Treasure"]
            title = f"{title_prefix}: Urgent {random.choice(packages)}"
        
        # Generate quest description
        descriptions = {
            'fetch': f"An important item has been lost in the {region.theme}. Retrieve it to earn a reward.",
            'kill': f"Dangerous creatures are causing problems in the {region.theme}. Eliminate them to restore safety.",
            'escort': f"Someone needs safe passage through the {region.theme}. Ensure they reach their destination unharmed.",
            'explore': f"An uncharted area in the {region.theme} holds valuable secrets. Explore it and report your findings.",
            'delivery': f"A package must reach its recipient in the {region.theme}. Ensure it arrives safely and quickly."
        }
        
        description = descriptions.get(quest_type, descriptions['fetch'])
        
        # Generate quest objective
        objectives = {
            'fetch': f"Find and retrieve the lost item from the {region.theme}.",
            'kill': f"Defeat the specified enemies in the {region.theme}.",
            'escort': f"Protect the NPC as they travel through the {region.theme}.",
            'explore': f"Discover and map the specified location in the {region.theme}.",
            'delivery': f"Deliver the package to its destination in the {region.theme}."
        }
        
        objective = objectives.get(quest_type, objectives['fetch'])
        
        # Generate quest steps
        steps = []
        if quest_type == 'fetch':
            steps = [
                {"order": 1, "description": f"Speak with locals to learn about the lost item."},
                {"order": 2, "description": f"Search the {region.theme} for clues to its location."},
                {"order": 3, "description": f"Recover the item from its current possessor."},
                {"order": 4, "description": f"Return the item to the quest giver."}
            ]
        elif quest_type == 'kill':
            steps = [
                {"order": 1, "description": f"Track down the creatures' lair in the {region.theme}."},
                {"order": 2, "description": f"Defeat a specific number of the creatures."},
                {"order": 3, "description": f"Eliminate the leader of the group."},
                {"order": 4, "description": f"Return with proof of your success."}
            ]
        elif quest_type == 'escort':
            steps = [
                {"order": 1, "description": f"Meet the person you need to escort."},
                {"order": 2, "description": f"Guide them through the dangerous {region.theme}."},
                {"order": 3, "description": f"Protect them from ambushes along the way."},
                {"order": 4, "description": f"Deliver them safely to their destination."}
            ]
        elif quest_type == 'explore':
            steps = [
                {"order": 1, "description": f"Find the entrance to the unexplored area."},
                {"order": 2, "description": f"Map out the main features of the location."},
                {"order": 3, "description": f"Discover the secret hidden within."},
                {"order": 4, "description": f"Return with your findings."}
            ]
        else:  # delivery
            steps = [
                {"order": 1, "description": f"Receive the package and delivery instructions."},
                {"order": 2, "description": f"Travel to the delivery location in the {region.theme}."},
                {"order": 3, "description": f"Overcome obstacles preventing delivery."},
                {"order": 4, "description": f"Hand over the package to the recipient."}
            ]
        
        # Calculate rewards based on character level and difficulty
        difficulty = max(1, min(10, character.level))
        reward_xp = character.level * 50 * difficulty
        reward_gold = character.level * 10 * difficulty
        
        # Generate reward item
        item_types = ["weapon", "armor", "consumable", "accessory"]
        rarities = ["common", "uncommon", "rare"]
        
        # Higher difficulty has chance for better rewards
        rarity_index = min(len(rarities) - 1, difficulty // 4)
        rarity = rarities[rarity_index]
        
        reward_item = {
            "name": f"{rarity.capitalize()} {random.choice(item_types)}",
            "description": f"A {rarity} item appropriate for a level {character.level} character.",
            "type": random.choice(item_types),
            "rarity": rarity,
            "properties": {
                "value": character.level * 5 * (rarity_index + 1)
            }
        }
        
        # Add specific properties based on item type
        if reward_item["type"] == "weapon":
            reward_item["properties"]["damage"] = character.level + rarity_index + 1
        elif reward_item["type"] == "armor":
            reward_item["properties"]["defense"] = character.level // 2 + rarity_index + 1
        elif reward_item["type"] == "consumable":
            reward_item["properties"]["effect"] = "restore_health"
            reward_item["properties"]["amount"] = character.level * 5 + rarity_index * 10
        else:  # accessory
            stat_bonus = ["strength", "intelligence", "agility", "charisma"]
            reward_item["properties"]["bonus_type"] = random.choice(stat_bonus)
            reward_item["properties"]["bonus_amount"] = rarity_index + 1
        
        return {
            "title": title,
            "description": description,
            "objective": objective,
            "difficulty": difficulty,
            "reward_xp": reward_xp,
            "reward_gold": reward_gold,
            "reward_items": [reward_item],
            "steps": steps
        }
    
    def _generate_fallback_dialogue(self, npc, character, intent, relationship):
        """Generate a procedural dialogue when API call fails"""
        # Base responses based on relationship status
        relationship_responses = {
            'friendly': [
                f"Ah, {character.name}! Always a pleasure to see you around these parts.",
                f"Well met, friend! How may I be of service to you today?",
                f"I was just thinking about you! What perfect timing."
            ],
            'neutral': [
                f"Hello there. What brings you to me today?",
                f"Well met, traveler. How can I help you?",
                f"Greetings. Do you need something from me?"
            ],
            'unfriendly': [
                f"*sigh* What do you want now?",
                f"I'm rather busy at the moment. Make it quick.",
                f"Oh, it's you again. State your business."
            ],
            'hostile': [
                f"I have nothing to say to you. Leave me be.",
                f"*glares silently*",
                f"Unless you're here to make amends, I suggest you keep moving."
            ]
        }
        
        # Intent-specific additions
        intent_additions = {
            'quest': {
                'friendly': " I might have something you could help me with, actually.",
                'neutral': " Are you looking for work? I might have something.",
                'unfriendly': " I suppose I could use someone with your... skills.",
                'hostile': " ...though I do have a problem someone like you might solve."
            },
            'shop': {
                'friendly': " Looking to trade? I'll give you my best prices!",
                'neutral': " I have goods to trade, if you're interested.",
                'unfriendly': " I suppose I can show you my wares. No haggling.",
                'hostile': " I don't normally serve your kind, but coin is coin."
            },
            'information': {
                'friendly': " What would you like to know? I'm happy to share what I know.",
                'neutral': " Information? I might know something about that.",
                'unfriendly': " Information has its price. What's it worth to you?",
                'hostile': " Why should I tell you anything? What's in it for me?"
            },
            'greeting': {
                'friendly': " It's a fine day, isn't it? How have your adventures been?",
                'neutral': " How go your travels?",
                'unfriendly': " What do you want?",
                'hostile': " *returns to what they were doing*"
            }
        }
        
        # Default to greeting if intent not recognized
        if intent not in intent_additions:
            intent = 'greeting'
        
        # Default to neutral if relationship not recognized
        rel_status = relationship.status if relationship.status in relationship_responses else 'neutral'
        
        # Construct response
        base_response = random.choice(relationship_responses[rel_status])
        if rel_status != 'hostile' or intent == 'quest':  # Hostile NPCs only respond to quests
            addition = intent_additions[intent][rel_status]
            text = base_response + addition
        else:
            text = base_response
        
        # Determine relationship change based on NPC personality and intent
        rel_change = 0
        if intent == 'greeting':
            # Friendly personality more likely to improve relationship
            if npc.personality == 'kind' or npc.personality == 'friendly':
                rel_change = random.choice([0, 1])
            elif npc.personality == 'gruff' or npc.personality == 'suspicious':
                rel_change = 0
        elif intent == 'quest' and rel_status != 'hostile':
            # Quest interest slightly improves relationship
            rel_change = 1
        
        # Determine if NPC offers quest or trade
        offers_quest = intent == 'quest' and rel_status != 'hostile'
        offers_trade = intent == 'shop' and rel_status != 'hostile'
        
        return {
            "text": text,
            "tone": rel_status,
            "relationship_change": rel_change,
            "offers_quest": offers_quest,
            "offers_trade": offers_trade
        }
    
    def _generate_fallback_enemy(self, enemy_type, difficulty, player_level):
        """Generate a procedural enemy when API call fails"""
        enemy_types = {
            'humanoid': ["Bandit", "Cultist", "Mercenary", "Rogue", "Tribesman"],
            'beast': ["Wolf", "Bear", "Boar", "Snake", "Tiger"],
            'undead': ["Skeleton", "Zombie", "Ghost", "Wraith", "Revenant"],
            'elemental': ["Fire", "Water", "Earth", "Air", "Lightning"],
            'monster': ["Ogre", "Troll", "Goblin", "Orc", "Drake"]
        }
        
        # Default to beast if type not recognized
        if enemy_type not in enemy_types:
            enemy_type = 'beast'
        
        # Determine enemy name
        if enemy_type == 'elemental':
            name = f"{random.choice(enemy_types[enemy_type])} Elemental"
        else:
            name = random.choice(enemy_types[enemy_type])
        
        # Generate adjective based on difficulty
        if difficulty <= 3:
            adjectives = ["Young", "Weak", "Small", "Inexperienced", "Minor"]
        elif difficulty <= 6:
            adjectives = ["", "", "", "Veteran", "Hardened"]  # Empty strings for no adjective
        else:
            adjectives = ["Elite", "Deadly", "Massive", "Ancient", "Legendary"]
        
        adjective = random.choice(adjectives)
        if adjective:
            name = f"{adjective} {name}"
        
        # Scale stats based on player level and difficulty
        level = max(1, min(player_level + difficulty - 3, player_level + 3))
        health = level * 20 + difficulty * 10
        attack = level * 2 + difficulty
        defense = level + difficulty // 2
        
        # Generate abilities
        abilities = []
        
        # Basic attack always included
        abilities.append({
            "name": "Attack",
            "description": "A basic physical attack",
            "damage": attack,
            "effect": "none"
        })
        
        # Add specialized abilities based on enemy type
        if enemy_type == 'humanoid':
            abilities.append({
                "name": "Precise Strike",
                "description": "A carefully aimed attack that deals extra damage",
                "damage": int(attack * 1.5),
                "effect": "none"
            })
        elif enemy_type == 'beast':
            abilities.append({
                "name": "Feral Swipe",
                "description": "A wild attack that has a chance to cause bleeding",
                "damage": attack,
                "effect": "bleed"
            })
        elif enemy_type == 'undead':
            abilities.append({
                "name": "Life Drain",
                "description": "Drains life from the target to heal the caster",
                "damage": int(attack * 0.8),
                "effect": "lifesteal"
            })
        elif enemy_type == 'elemental':
            element = name.split()[0].lower()
            abilities.append({
                "name": f"{element.capitalize()} Blast",
                "description": f"A concentrated blast of {element} energy",
                "damage": int(attack * 1.2),
                "effect": element
            })
        else:  # monster
            abilities.append({
                "name": "Crushing Blow",
                "description": "A powerful attack that can stun the target",
                "damage": int(attack * 1.3),
                "effect": "stun"
            })
        
        # Add a defensive ability at higher difficulties
        if difficulty >= 5:
            defensive_abilities = {
                'humanoid': {
                    "name": "Parry",
                    "description": "Deflects an incoming attack and counter-attacks",
                    "damage": int(attack * 0.5),
                    "effect": "counter"
                },
                'beast': {
                    "name": "Thick Hide",
                    "description": "Temporarily increases defense",
                    "damage": 0,
                    "effect": "defense_up"
                },
                'undead': {
                    "name": "Necrotic Barrier",
                    "description": "Creates a shield that absorbs damage",
                    "damage": 0,
                    "effect": "shield"
                },
                'elemental': {
                    "name": "Element Shift",
                    "description": "Changes elemental affinity to resist attacks",
                    "damage": 0,
                    "effect": "resist"
                },
                'monster': {
                    "name": "Regenerate",
                    "description": "Heals a portion of maximum health",
                    "damage": 0,
                    "effect": "heal"
                }
            }
            
            abilities.append(defensive_abilities.get(enemy_type, defensive_abilities['beast']))
        
        # Determine weaknesses and resistances
        weaknesses = []
        resistances = []
        
        if enemy_type == 'humanoid':
            weaknesses = ["magic", "poison"]
            resistances = ["physical"]
        elif enemy_type == 'beast':
            weaknesses = ["fire", "poison"]
            resistances = ["cold", "lightning"]
        elif enemy_type == 'undead':
            weaknesses = ["holy", "fire"]
            resistances = ["poison", "cold"]
        elif enemy_type == 'elemental':
            element = name.split()[0].lower()
            if element == "fire":
                weaknesses = ["water", "cold"]
                resistances = ["fire", "lightning"]
            elif element == "water":
                weaknesses = ["lightning", "earth"]
                resistances = ["fire", "water"]
            elif element == "earth":
                weaknesses = ["water", "acid"]
                resistances = ["lightning", "physical"]
            elif element == "air":
                weaknesses = ["earth", "ice"]
                resistances = ["lightning", "fire"]
            else:  # lightning
                weaknesses = ["earth", "crystal"]
                resistances = ["lightning", "water"]
        else:  # monster
            weaknesses = ["magic", "holy"]
            resistances = ["physical", "poison"]
        
        # Calculate rewards
        xp_value = level * 30 + difficulty * 20
        gold_value = level * 5 + difficulty * 3
        
        # Generate potential drops
        drop_table = [
            {
                "item": "Health Potion",
                "chance": 50  # 50% chance
            }
        ]
        
        # Add enemy-specific drop
        if enemy_type == 'humanoid':
            drop_table.append({
                "item": "Coin Purse",
                "chance": 70
            })
        elif enemy_type == 'beast':
            drop_table.append({
                "item": "Hide",
                "chance": 80
            })
        elif enemy_type == 'undead':
            drop_table.append({
                "item": "Bone Dust",
                "chance": 60
            })
        elif enemy_type == 'elemental':
            element = name.split()[0].lower()
            drop_table.append({
                "item": f"{element.capitalize()} Essence",
                "chance": 40
            })
        else:  # monster
            drop_table.append({
                "item": "Monster Fang",
                "chance": 50
            })
        
        # Chance for equipment drop increases with difficulty
        equipment_chance = 10 + difficulty * 5  # 15% to 60%
        if random.randint(1, 100) <= equipment_chance:
            equipment_types = ["Weapon", "Armor", "Accessory"]
            drop_table.append({
                "item": f"{name}'s {random.choice(equipment_types)}",
                "chance": equipment_chance
            })
        
        return {
            "name": name,
            "description": f"A level {level} {enemy_type} enemy with {health} health.",
            "level": level,
            "health": health,
            "attack": attack,
            "defense": defense,
            "abilities": abilities,
            "weaknesses": weaknesses,
            "resistances": resistances,
            "xp_value": xp_value,
            "gold_value": gold_value,
            "drop_table": drop_table
        }
    
    def _generate_fallback_item(self, item_type, rarity, character_level):
        """Generate a procedural item when API call fails"""
        # Rarity factors
        rarity_factors = {
            'common': 1.0,
            'uncommon': 1.5,
            'rare': 2.0,
            'epic': 3.0,
            'legendary': 5.0
        }
        
        # Default to common if rarity not recognized
        if rarity not in rarity_factors:
            rarity = 'common'
        
        rarity_factor = rarity_factors[rarity]
        
        # Item name prefixes based on rarity
        rarity_prefixes = {
            'common': ["Simple", "Basic", "Standard", "Plain", "Ordinary"],
            'uncommon': ["Fine", "Quality", "Sturdy", "Reliable", "Improved"],
            'rare': ["Superior", "Excellent", "Remarkable", "Exceptional", "Reinforced"],
            'epic': ["Exquisite", "Magnificent", "Masterwork", "Legendary", "Ancient"],
            'legendary': ["Mythical", "Divine", "Celestial", "Transcendent", "Ultimate"]
        }
        
        prefix = random.choice(rarity_prefixes[rarity])
        
        # Generate item based on type
        if item_type == 'weapon':
            weapon_types = ["Sword", "Axe", "Mace", "Bow", "Staff", "Dagger"]
            subtype = random.choice(weapon_types).lower()
            name = f"{prefix} {subtype.capitalize()}"
            
            # Generate description
            descriptions = {
                'sword': "A bladed weapon designed for cutting and thrusting",
                'axe': "A hefty weapon with a sharp edge for chopping",
                'mace': "A blunt weapon designed to crush and bludgeon",
                'bow': "A ranged weapon that fires arrows with precision",
                'staff': "A magical implement that enhances spellcasting",
                'dagger': "A small, quick blade for swift and precise strikes"
            }
            
            description = descriptions.get(subtype, f"A {subtype} of {rarity} quality")
            
            # Properties based on level and rarity
            damage = int((character_level * 2) * rarity_factor)
            if subtype in ['sword', 'dagger']:
                crit_chance = 5 + (character_level // 5) + int(rarity_factor)
                properties = {
                    "damage": damage,
                    "crit_chance": crit_chance,
                    "durability": 100,
                    "value": int(character_level * 10 * rarity_factor)
                }
            elif subtype in ['axe', 'mace']:
                properties = {
                    "damage": int(damage * 1.2),  # Higher base damage
                    "attack_speed": "slow",
                    "durability": 120,
                    "value": int(character_level * 12 * rarity_factor)
                }
            elif subtype == 'bow':
                properties = {
                    "damage": damage,
                    "range": "long",
                    "ammo_type": "arrow",
                    "durability": 80,
                    "value": int(character_level * 15 * rarity_factor)
                }
            else:  # staff
                magic_bonus = character_level // 3 + int(rarity_factor)
                properties = {
                    "damage": int(damage * 0.8),  # Lower base damage
                    "magic_bonus": magic_bonus,
                    "element": random.choice(["fire", "ice", "lightning", "arcane"]),
                    "durability": 90,
                    "value": int(character_level * 20 * rarity_factor)
                }
        
        elif item_type == 'armor':
            armor_types = ["Helmet", "Chestplate", "Gloves", "Boots", "Shield", "Robe"]
            subtype = random.choice(armor_types).lower()
            name = f"{prefix} {subtype.capitalize()}"
            
            # Generate description
            descriptions = {
                'helmet': "Protective headgear to shield against blows",
                'chestplate': "Armor for the torso providing substantial protection",
                'gloves': "Hand protection allowing for dexterity in combat",
                'boots': "Footwear offering protection and stability",
                'shield': "A defensive implement to block attacks",
                'robe': "Lightweight garment favored by spellcasters"
            }
            
            description = descriptions.get(subtype, f"A {subtype} of {rarity} quality")
            
            # Properties based on level and rarity
            defense = int((character_level) * rarity_factor)
            if subtype in ['helmet', 'chestplate', 'gloves', 'boots']:
                properties = {
                    "defense": defense,
                    "weight": "medium",
                    "durability": 100,
                    "value": int(character_level * 8 * rarity_factor)
                }
            elif subtype == 'shield':
                block_chance = 10 + (character_level // 4) + int(rarity_factor)
                properties = {
                    "defense": int(defense * 0.7),
                    "block_chance": block_chance,
                    "durability": 120,
                    "value": int(character_level * 10 * rarity_factor)
                }
            else:  # robe
                magic_resist = character_level // 4 + int(rarity_factor)
                properties = {
                    "defense": int(defense * 0.5),  # Lower defense
                    "magic_resist": magic_resist,
                    "weight": "light",
                    "durability": 70,
                    "value": int(character_level * 12 * rarity_factor)
                }
        
        elif item_type == 'consumable':
            consumable_types = ["Potion", "Scroll", "Food", "Elixir", "Powder"]
            subtype = random.choice(consumable_types).lower()
            
            # Effects based on subtype
            if subtype == 'potion':
                effects = ["Health", "Mana", "Strength", "Speed", "Resistance"]
                effect = random.choice(effects)
                name = f"{prefix} {effect} Potion"
                description = f"A liquid that temporarily enhances {effect.lower()}"
                
                # Properties based on effect
                if effect == "Health":
                    amount = int((20 + character_level * 5) * rarity_factor)
                    properties = {
                        "effect": "restore_health",
                        "amount": amount,
                        "value": int(character_level * 3 * rarity_factor)
                    }
                elif effect == "Mana":
                    amount = int((15 + character_level * 4) * rarity_factor)
                    properties = {
                        "effect": "restore_mana",
                        "amount": amount,
                        "value": int(character_level * 3 * rarity_factor)
                    }
                else:
                    duration = int(30 + rarity_factor * 15)  # Seconds
                    amount = int(1 + rarity_factor)
                    properties = {
                        "effect": f"boost_{effect.lower()}",
                        "amount": amount,
                        "duration": duration,
                        "value": int(character_level * 5 * rarity_factor)
                    }
            
            elif subtype == 'scroll':
                spells = ["Fireball", "Healing", "Protection", "Teleport", "Summon"]
                spell = random.choice(spells)
                name = f"Scroll of {spell}"
                description = f"A magical parchment that casts {spell} when read"
                
                spell_power = int(character_level * rarity_factor)
                properties = {
                    "spell": spell.lower(),
                    "power": spell_power,
                    "uses": 1,
                    "value": int(character_level * 10 * rarity_factor)
                }
            
            else:  # food, elixir, powder
                effects = ["Regeneration", "Fortitude", "Clarity", "Swiftness", "Might"]
                effect = random.choice(effects)
                name = f"{prefix} {subtype.capitalize()} of {effect}"
                description = f"A {subtype} that grants {effect} when consumed"
                
                duration = int((60 + character_level * 10) * rarity_factor)  # Seconds
                amount = int(1 + (rarity_factor / 2))
                properties = {
                    "effect": effect.lower(),
                    "amount": amount,
                    "duration": duration,
                    "value": int(character_level * 4 * rarity_factor)
                }
        
        else:  # accessory
            accessory_types = ["Ring", "Amulet", "Bracelet", "Belt", "Earring", "Charm"]
            subtype = random.choice(accessory_types).lower()
            
            # Attribute bonuses
            attributes = ["Strength", "Intelligence", "Agility", "Charisma", "Vitality", "Luck"]
            attribute = random.choice(attributes)
            name = f"{prefix} {subtype.capitalize()} of {attribute}"
            description = f"A {subtype} that enhances the wearer's {attribute.lower()}"
            
            bonus_amount = int(1 + (rarity_factor / 2))
            properties = {
                "bonus_type": attribute.lower(),
                "bonus_amount": bonus_amount,
                "value": int(character_level * 15 * rarity_factor)
            }
            
            # Add secondary effect for higher rarities
            if rarity in ['rare', 'epic', 'legendary']:
                secondary_effects = [
                    "fire_resist", "cold_resist", "lightning_resist", "poison_resist",
                    "health_regen", "mana_regen", "movement_speed", "luck"
                ]
                sec_effect = random.choice(secondary_effects)
                sec_amount = int(rarity_factor)
                properties[sec_effect] = sec_amount
        
        # Level requirement based on character level and rarity
        level_req = max(1, character_level - int(5 / rarity_factor))
        
        return {
            "name": name,
            "description": description,
            "item_type": item_type,
            "subtype": subtype,
            "rarity": rarity,
            "level_requirement": level_req,
            "properties": properties,
            "value": properties.get("value", int(character_level * 5 * rarity_factor))
        } Fallback response
            return self._generate_fallback_text(prompt)
    
    def generate_region(self, theme, difficulty, player_level):
        """Generate a region description and features"""
        system_prompt = """You are a fantasy world builder. Create vivid, detailed regions for 
        a text-based role playing game. Provide consistent, usable information 
        in a structured format following the requested JSON schema."""
        
        prompt = f"""Generate a detailed fantasy region with the theme '{theme}' and difficulty level {difficulty} 
        appropriate for a level {player_level} player.
        
        Return the response in valid JSON format with the following structure:
        {{
            "name": "Region name",
            "description": "Detailed description of the region",
            "map_data": {{
                "width": 20,
                "height": 20,
                "tiles": [...] (fill with "grass", "water", "mountain", "forest", "path", "sand")
            }},
            "landmarks": [
                {{
                    "name": "Landmark name",
                    "description": "Description of the landmark",
                    "type": "town|dungeon|camp|ruin|natural",
                    "x": X coordinate (0-19),
                    "y": Y coordinate (0-19)
                }}
            ] (include 3-5 landmarks)
        }}
        
        Make the region thematically consistent but with variety in landmarks and geography.
        Ensure coordinates don't overlap."""
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=800,
                temperature=0.7
            )
            
            # Extract JSON from response
            json_text = response.choices[0].message.content
            # Clean up the response to ensure valid JSON
            json_text = re.sub(r'```json', '', json_text)
            json_text = re.sub(r'```', '', json_text)
            return json.loads(json_text)
        
        except Exception as e:
            print(f"Error in region generation: {e}")
            # Fallback to procedural generation
            return self._generate_fallback_region(theme, difficulty, player_level)
    
    def generate_quest(self, character, region, quest_type):
        """Generate a quest appropriate for the player in the current region"""
        system_prompt = """You are a quest designer for a fantasy RPG. Create engaging, 
        varied quests that fit the game world and character level. Provide a 
        consistent structure following the JSON format requested."""
        
        # Create context-aware prompt
        prompt = f"""Generate a {quest_type} quest for a level {character.level} {character.character_class} 
        in a region called "{region.name}" which is described as: "{region.description}"
        
        Return the response in valid JSON format with the following structure:
        {{
            "title": "Quest title",
            "description": "Engaging quest description/hook",
            "objective": "Clear primary objective",
            "difficulty": Numerical difficulty (1-10),
            "reward_xp": XP reward appropriate for level {character.level},
            "reward_gold": Gold reward appropriate for level {character.level},
            "reward_items": [
                {{
                    "name": "Item name",
                    "description": "Item description",
                    "type": "weapon|armor|consumable|treasure",
                    "rarity": "common|uncommon|rare|epic",
                    "properties": {{
                        // Item specific properties
                    }}
                }}
            ],
            "steps": [
                {{
                    "order": 1,
                    "description": "Step description"
                }},
                ...
            ]
        }}
        
        Ensure the quest fits thematically with a {region.theme} environment.
        Make quest complexity appropriate for a level {character.level} character.
        Include 3-5 steps to complete the quest."""
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=800,
                temperature=0.7
            )
            
            # Extract JSON from response
            json_text = response.choices[0].message.content
            # Clean up the response to ensure valid JSON
            json_text = re.sub(r'```json', '', json_text)
            json_text = re.sub(r'```', '', json_text)
            return json.loads(json_text)
        
        except Exception as e:
            print(f"Error in quest generation: {e}")
            # Fallback to procedural generation
            return self._generate_fallback_quest(character, region, quest_type)
    
    def generate_dialogue(self, npc, character, conversation_history, intent, relationship):
        """Generate contextual dialogue for an NPC"""
        system_prompt = """You are a dialogue writer for a fantasy RPG. Create natural, character-appropriate 
        responses for NPCs that maintain consistent personality and reflect their relationship with the player."""
        
        # Format previous conversation
        formatted_history = ""
        for entry in conversation_history[-5:]:  # Last 5 exchanges
            speaker = "Player" if entry.get('speaker') == 'player' else npc.name
            formatted_history += f"{speaker}: {entry.get('text')}\n"
        
        prompt = f"""Generate dialogue for {npc.name}, a {npc.race} {npc.occupation} with a {npc.personality} personality.
        The player is a level {character.level} {character.character_class} named {character.name}.
        Their relationship status is: {relationship.status} (Value: {relationship.value}/100)
        
        Dialogue traits: {', '.join(json.loads(npc.dialogue_traits) if npc.dialogue_traits else [])}
        
        Current conversation intent: {intent}
        
        Previous conversation:
        {formatted_history}
        
        Return the response in valid JSON format with the following structure:
        {{
            "text": "The NPC's dialogue response",
            "tone": "friendly|neutral|suspicious|hostile",
            "relationship_change": Change in relationship value (-5 to +5),
            "offers_quest": Boolean indicating if dialogue suggests a quest,
            "offers_trade": Boolean indicating if dialogue suggests trading
        }}
        
        The response should reflect the NPC's personality and their relationship with the player.
        If the relationship is poor, the NPC should be more guarded or hostile.
        If the relationship is good, the NPC should be more helpful and friendly."""
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=400,
                temperature=0.7
            )
            
            # Extract JSON from response
            json_text = response.choices[0].message.content
            # Clean up the response to ensure valid JSON
            json_text = re.sub(r'```json', '', json_text)
            json_text = re.sub(r'```', '', json_text)
            return json.loads(json_text)
        
        except Exception as e:
            print(f"Error in dialogue generation: {e}")
            # Fallback to procedural generation
            return self._generate_fallback_dialogue(npc, character, intent, relationship)
    
    def generate_enemy(self, enemy_type, difficulty, player_level):
        """Generate an enemy for combat"""
        system_prompt = """You are a monster designer for a fantasy RPG. Create balanced, 
        thematically appropriate enemies that provide an engaging challenge for players."""
        
        prompt = f"""Create a {enemy_type} enemy appropriate for a level {player_level} player with difficulty {difficulty}.
        
        Return the response in valid JSON format with the following structure:
        {{
            "name": "Enemy name",
            "description": "Enemy description",
            "level": Enemy level (close to player level),
            "health": Health points appropriate for level,
            "attack": Attack rating,
            "defense": Defense rating,
            "abilities": [
                {{
                    "name": "Ability name",
                    "description": "What the ability does",
                    "damage": Damage dealt (or 0 if not damaging),
                    "effect": "Any special effects"
                }}
            ],
            "weaknesses": ["element or attack type"],
            "resistances": ["element or attack type"],
            "xp_value": XP value for defeating,
            "gold_value": Gold dropped,
            "drop_table": [
                {{
                    "item": "Item name",
                    "chance": Drop chance percentage
                }}
            ]
        }}
        
        Ensure the enemy is balanced for a level {player_level} player.
        Difficulty {difficulty} should be reflected in stats and abilities.
        Include 2-3 unique abilities that fit the enemy type."""
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=600,
                temperature=0.7
            )
            
            # Extract JSON from response
            json_text = response.choices[0].message.content
            # Clean up the response to ensure valid JSON
            json_text = re.sub(r'```json', '', json_text)
            json_text = re.sub(r'```', '', json_text)
            return json.loads(json_text)
        
        except Exception as e:
            print(f"Error in enemy generation: {e}")
            # Fallback to procedural generation
            return self._generate_fallback_enemy(enemy_type, difficulty, player_level)
    
    def generate_item(self, item_type, rarity, character_level):
        """Generate a unique item"""
        system_prompt = """You are a item designer for a fantasy RPG. Create balanced, 
        interesting items that fit the game world and are appropriate for character level."""
        
        prompt = f"""Create a {rarity} {item_type} appropriate for a level {character_level} character.
        
        Return the response in valid JSON format with the following structure:
        {{
            "name": "Item name",
            "description": "Item description",
            "item_type": "{item_type}",
            "subtype": "Specific type (sword, staff, potion, etc)",
            "rarity": "{rarity}",
            "level_requirement": Level needed to use (at or below character level),
            "properties": {{
                // Item-specific properties depending on type
                // For weapons: damage, crit_chance, etc.
                // For armor: defense, resist, etc.
                // For consumables: effect, duration, etc.
            }},
            "value": Gold value of item
        }}
        
        Ensure the item is balanced for a level {character_level} character.
        The {rarity} rarity should be reflected in the item's power and uniqueness.
        Include appropriate properties for the item type."""
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=400,
                temperature=0.7
            )
            
            # Extract JSON from response
            json_text = response.choices[0].message.content
            # Clean up the response to ensure valid JSON
            json_text = re.sub(r'```json', '', json_text)
            json_text = re.sub(r'```', '', json_text)
            return json.loads(json_text)
        
        except Exception as e:
            print(f"Error in item generation: {e}")
            # Fallback to procedural generation
            return self._generate_fallback_item(item_type, rarity, character_level)
    
    def _generate_fallback_text(self, prompt):
        """Generate fallback text when API call fails"""
        # Simple fallback for when the API isn't available
        first_words = prompt.split()[:10]
        theme = "mysterious" if "mysterious" in prompt.lower() else (
            "dangerous" if "danger" in prompt.lower() else "intriguing")
        
        if "region" in prompt.lower() or "place" in prompt.lower():
            return f"A {theme} place appears before you, shrouded in mist. The air feels charged with potential adventure."
        elif "quest" in prompt.lower() or "mission" in prompt.lower():
            return f"A {theme} task awaits, promising both danger and reward to those brave enough to undertake it."
        elif "enemy" in prompt.lower() or "monster" in prompt.lower():
            return f"A {theme} creature approaches, its intentions unclear but its presence commanding attention."
        elif "dialogue" in prompt.lower() or "conversation" in prompt.lower():
            return "The figure regards you with a measured gaze. 'What brings you to these parts, traveler?'"
        else:
            return "The world shifts subtly around you, responding to unseen forces. What will you do next?"
    
    def _generate_fallback_region(self, theme, difficulty, player_level):
        """Generate a procedural region when API call fails"""
        themes = {
            'forest': ["Whispering Woods", "Ancient Grove", "Verdant Wilderness", "Emerald Canopy"],
            'mountain': ["Craggy Peaks", "Mist-Shrouded Heights", "Stone Sentinels", "Clouded Summit"],
            'desert': ["Endless Sands", "Scorched Wastes", "Dune Sea", "Sun's Anvil"],
            'swamp': ["Murky Depths", "Foggy Marshland", "Mire of Shadows", "Boggy Lowlands"],
            'town': ["Crossroads Haven", "Trader's Rest", "Hillside Settlement", "Riverside Village"],
            'dungeon': ["Forgotten Depths", "Shadow Labyrinth", "Ancient Vault", "Ruined Chambers"]
        }
        
        default_theme = 'forest'
        if theme not in themes:
            theme = default_theme
        
        name = random.choice(themes[theme])
        
        # Basic descriptions based on theme
        descriptions = {
            'forest': f"A dense woodland where sunlight filters through the canopy in dappled patterns. The trees stand ancient and watchful, home to countless creatures both mundane and magical. Level {difficulty} area.",
            'mountain': f"Towering peaks rise majestically into the clouds, their slopes dotted with pine and rocky outcroppings. The thin air carries the distant cry of hunting birds. Level {difficulty} area.",
            'desert': f"An endless expanse of shifting sand dunes under a merciless sun. By day the heat is unbearable, by night the cold is biting. Strange mirages appear on the horizon. Level {difficulty} area.",
            'swamp': f"Murky waters wind between gnarled cypress trees draped in hanging moss. The air is thick with humidity and the buzz of insects. Deceptive footing makes travel treacherous. Level {difficulty} area.",
            'town': f"A settlement of wooden and stone buildings where people go about their daily business. The central square features a well, and merchants hawk their wares from stalls. Level {difficulty} area.",
            'dungeon': f"Ancient stonework corridors stretch into darkness, their walls inscribed with worn symbols. The air is stale and carries echoes from unseen chambers deeper within. Level {difficulty} area."
        }
        
        #