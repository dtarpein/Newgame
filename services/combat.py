import random
import math
import json

class CombatManager:
    """Service for handling combat encounters"""
    
    def __init__(self):
        """Initialize combat manager"""
        self.status_effects = {
            "bleed": {"damage_per_turn": 3, "duration": 3, "description": "Taking damage over time"},
            "poison": {"damage_per_turn": 5, "duration": 3, "description": "Taking poison damage over time"},
            "burn": {"damage_per_turn": 4, "duration": 2, "description": "Taking fire damage over time"},
            "stun": {"skip_turn": True, "duration": 1, "description": "Cannot act for one turn"},
            "frozen": {"skip_turn": True, "duration": 2, "description": "Cannot act for two turns"},
            "shield": {"damage_reduction": 0.5, "duration": 3, "description": "Taking reduced damage"},
            "strength": {"damage_bonus": 1.5, "duration": 3, "description": "Dealing increased damage"},
            "weakness": {"damage_penalty": 0.7, "duration": 2, "description": "Dealing reduced damage"},
            "regeneration": {"heal_per_turn": 5, "duration": 3, "description": "Recovering health over time"}
        }
    
    def process_action(self, action, character, enemy, target):
        """Process a combat action and return the results"""
        result = {
            "character_hp": character.attributes.health,
            "enemy_hp": enemy["health"],
            "log": "",
            "effects": []
        }
        
        # Character's turn
        if target == "enemy":
            damage_dealt, effects = self._process_character_attack(action, character, enemy)
            result["enemy_hp"] -= damage_dealt
            result["log"] = f"You used {action} and dealt {damage_dealt} damage to {enemy['name']}."
            
            # Add any status effects
            if effects:
                result["effects"].extend(effects)
                effect_text = ", ".join([f"{effect} ({self.status_effects[effect]['description']})" for effect in effects])
                result["log"] += f" Applied effects: {effect_text}."
        
        # Enemy's turn (if still alive)
        if result["enemy_hp"] > 0:
            enemy_damage, enemy_effects = self._process_enemy_attack(enemy, character)
            result["character_hp"] -= enemy_damage
            result["log"] += f" {enemy['name']} attacks and deals {enemy_damage} damage to you."
            
            # Add any status effects
            if enemy_effects:
                result["effects"].extend(enemy_effects)
                effect_text = ", ".join([f"{effect} ({self.status_effects[effect]['description']})" for effect in enemy_effects])
                result["log"] += f" Enemy applied effects: {effect_text}."
        
        return result
    
    def _process_character_attack(self, action, character, enemy):
        """Process character's attack"""
        # Base damage calculation
        base_damage = character.attributes.strength
        damage_multiplier = 1.0
        effects = []
        
        # Apply modifiers based on action
        if action == "attack":
            # Basic attack
            damage_multiplier = 1.0
        elif action == "heavy_attack":
            # Stronger attack with chance to stun
            damage_multiplier = 1.5
            if random.random() < 0.2:  # 20% chance to stun
                effects.append("stun")
        elif action == "precise_strike":
            # Attack with higher critical chance
            damage_multiplier = 0.8
            # Critical hit check
            crit_chance = character.attributes.critical_chance + 15  # +15% for precise strike
            if random.random() * 100 < crit_chance:
                damage_multiplier = 2.0
                effects.append("bleed")  # Critical hits cause bleeding
        elif action == "defend":
            # Defensive stance reduces damage dealt but grants shield effect
            damage_multiplier = 0.5
            effects.append("shield")
        elif action == "fireball" and character.character_class == "mage":
            # Mage-specific spell
            base_damage = character.attributes.intelligence
            damage_multiplier = 1.8
            effects.append("burn")
        elif action == "backstab" and character.character_class == "rogue":
            # Rogue-specific ability
            damage_multiplier = 2.0
            if random.random() < 0.4:  # 40% chance to poison
                effects.append("poison")
        
        # Calculate raw damage
        raw_damage = base_damage * damage_multiplier
        
        # Apply enemy defense
        final_damage = max(1, raw_damage - enemy["defense"])
        
        # Round to integer
        final_damage = int(final_damage)
        
        return final_damage, effects
    
    def _process_enemy_attack(self, enemy, character):
        """Process enemy's attack"""
        effects = []
        
        # Select a random ability from enemy's abilities
        ability = random.choice(enemy["abilities"])
        
        # Base damage from ability
        base_damage = ability["damage"]
        
        # Apply character defense
        final_damage = max(1, base_damage - character.attributes.physical_defense)
        
        # Apply ability effects
        if ability["effect"] != "none":
            if ability["effect"] in self.status_effects:
                effects.append(ability["effect"])
            elif ability["effect"] == "lifesteal":
                # Enemy heals for a portion of damage dealt
                heal_amount = int(final_damage * 0.3)
                enemy["health"] = min(enemy["health"] + heal_amount, enemy["max_health"])
        
        # Round to integer
        final_damage = int(final_damage)
        
        return final_damage, effects
    
    def apply_status_effects(self, combat_state):
        """Apply active status effects at the start of a round"""
        # Initialize or update status effect tracking
        if "status_effects" not in combat_state:
            combat_state["status_effects"] = {
                "character": {},
                "enemy": {}
            }
        
        # Process character status effects
        effects_to_remove = []
        for effect, data in combat_state["status_effects"]["character"].items():
            # Skip if duration is zero
            if data["duration"] <= 0:
                effects_to_remove.append(effect)
                continue
            
            # Apply effect
            effect_data = self.status_effects.get(effect, {})
            
            if "damage_per_turn" in effect_data:
                damage = effect_data["damage_per_turn"]
                combat_state["character_hp"] -= damage
                combat_state["log"].append(f"You take {damage} damage from {effect}.")
            
            if "heal_per_turn" in effect_data:
                heal = effect_data["heal_per_turn"]
                combat_state["character_hp"] = min(combat_state["character_hp"] + heal, combat_state["character"]["attributes"]["max_health"])
                combat_state["log"].append(f"You recover {heal} health from {effect}.")
            
            # Decrement duration
            data["duration"] -= 1
            if data["duration"] <= 0:
                effects_to_remove.append(effect)
        
        # Remove expired effects
        for effect in effects_to_remove:
            del combat_state["status_effects"]["character"][effect]
            combat_state["log"].append(f"The {effect} effect on you has worn off.")
        
        # Process enemy status effects
        effects_to_remove = []
        for effect, data in combat_state["status_effects"]["enemy"].items():
            # Skip if duration is zero
            if data["duration"] <= 0:
                effects_to_remove.append(effect)
                continue
            
            # Apply effect
            effect_data = self.status_effects.get(effect, {})
            
            if "damage_per_turn" in effect_data:
                damage = effect_data["damage_per_turn"]
                combat_state["enemy_hp"] -= damage
                combat_state["log"].append(f"{combat_state['enemy']['name']} takes {damage} damage from {effect}.")
            
            if "heal_per_turn" in effect_data:
                heal = effect_data["heal_per_turn"]
                combat_state["enemy_hp"] = min(combat_state["enemy_hp"] + heal, combat_state["enemy"]["max_health"])
                combat_state["log"].append(f"{combat_state['enemy']['name']} recovers {heal} health from {effect}.")
            
            # Decrement duration
            data["duration"] -= 1
            if data["duration"] <= 0:
                effects_to_remove.append(effect)
        
        # Remove expired effects
        for effect in effects_to_remove:
            del combat_state["status_effects"]["enemy"][effect]
            combat_state["log"].append(f"The {effect} effect on {combat_state['enemy']['name']} has worn off.")
        
        return combat_state
    
    def check_combat_status(self, combat_state):
        """Check if combat has ended"""
        if combat_state["character_hp"] <= 0:
            combat_state["status"] = "defeat"
            combat_state["log"].append(f"You have been defeated by {combat_state['enemy']['name']}!")
        elif combat_state["enemy_hp"] <= 0:
            combat_state["status"] = "victory"
            combat_state["log"].append(f"You have defeated {combat_state['enemy']['name']}!")
        
        return combat_state
    
    def calculate_rewards(self, character, enemy):
        """Calculate rewards for defeating an enemy"""
        xp_reward = enemy["xp_value"]
        gold_reward = enemy["gold_value"]
        
        # Determine which items drop based on chance
        item_drops = []
        for drop in enemy["drop_table"]:
            if random.random() * 100 < drop["chance"]:
                item_drops.append(drop["item"])
        
        return {
            "xp": xp_reward,
            "gold": gold_reward,
            "items": item_drops
        }
    
    def generate_combat_encounter(self, region, character_level, difficulty=None):
        """Generate a random combat encounter for a region"""
        # If difficulty not specified, use region difficulty
        if difficulty is None:
            difficulty = region.difficulty
        
        # Select enemy type based on region theme
        enemy_types = {
            "forest": ["wolf", "bear", "bandit", "fey", "treant"],
            "mountain": ["goat", "eagle", "troll", "golem", "climber"],
            "desert": ["scorpion", "snake", "nomad", "mummy", "elemental"],
            "swamp": ["alligator", "mosquito", "witch", "blob", "toad"],
            "town": ["thief", "drunk", "guard", "beggar", "mercenary"],
            "dungeon": ["skeleton", "zombie", "cultist", "mimic", "ghost"]
        }
        
        default_types = ["bandit", "wolf", "cultist", "spirit", "slime"]
        types_for_region = enemy_types.get(region.theme, default_types)
        
        enemy_type = random.choice(types_for_region)
        
        # TODO: Generate enemy data or call LLMService to generate it
        
        # Placeholder enemy data for now
        enemy = {
            "name": f"Level {character_level} {enemy_type.capitalize()}",
            "level": character_level,
            "health": character_level * 20 + difficulty * 10,
            "max_health": character_level * 20 + difficulty * 10,
            "attack": character_level * 3 + difficulty,
            "defense": character_level + difficulty // 2,
            "abilities": [
                {
                    "name": "Attack",
                    "description": "A basic attack",
                    "damage": character_level * 3 + difficulty,
                    "effect": "none"
                }
            ],
            "xp_value": character_level * 30 + difficulty * 20,
            "gold_value": character_level * 5 + difficulty * 3,
            "drop_table": [
                {
                    "item": "Health Potion",
                    "chance": 50
                }
            ]
        }
        
        return enemy