from app import db
from datetime import datetime
import json

class ItemTemplate(db.Model):
    """Template for items in the game"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(50), unique=True)
    description = db.Column(db.Text)
    item_type = db.Column(db.String(50), nullable=False)  # weapon, armor, consumable, quest, misc
    subtype = db.Column(db.String(50))  # sword, potion, helmet, etc.
    rarity = db.Column(db.String(20), default='common')  # common, uncommon, rare, epic, legendary
    level_req = db.Column(db.Integer, default=1)
    properties = db.Column(db.Text)  # JSON data for item stats, effects, etc.
    icon = db.Column(db.String(100))
    stackable = db.Column(db.Boolean, default=False)
    max_stack = db.Column(db.Integer, default=1)
    usable = db.Column(db.Boolean, default=False)
    equipable = db.Column(db.Boolean, default=False)
    tradeable = db.Column(db.Boolean, default=True)
    
    def __repr__(self):
        return f"<ItemTemplate {self.id}: {self.name}>"
    
    def to_dict(self):
        """Convert item template data to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'description': self.description,
            'item_type': self.item_type,
            'subtype': self.subtype,
            'rarity': self.rarity,
            'level_req': self.level_req,
            'properties': json.loads(self.properties) if self.properties else {},
            'icon': self.icon,
            'stackable': self.stackable,
            'max_stack': self.max_stack,
            'usable': self.usable,
            'equipable': self.equipable,
            'tradeable': self.tradeable
        }

class Item(db.Model):
    """Item instance in the game"""
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('item_template.id'))
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    item_type = db.Column(db.String(50), nullable=False)
    subtype = db.Column(db.String(50))
    rarity = db.Column(db.String(20), default='common')
    properties = db.Column(db.Text)  # JSON data for item stats, effects, etc.
    icon = db.Column(db.String(100))
    quantity = db.Column(db.Integer, default=1)
    durability = db.Column(db.Integer)
    max_durability = db.Column(db.Integer)
    bound_to_character = db.Column(db.Integer, db.ForeignKey('character.id'))
    owner_id = db.Column(db.Integer)  # Could be character, NPC, or container
    owner_type = db.Column(db.String(20))  # character, npc, container, world
    world_x = db.Column(db.Integer)  # Position in world if dropped
    world_y = db.Column(db.Integer)
    region_id = db.Column(db.Integer, db.ForeignKey('region.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    template = db.relationship('ItemTemplate', backref='instances')
    
    def __repr__(self):
        return f"<Item {self.id}: {self.name}>"
    
    def to_dict(self):
        """Convert item data to dictionary"""
        return {
            'id': self.id,
            'template_id': self.template_id,
            'name': self.name,
            'description': self.description,
            'item_type': self.item_type,
            'subtype': self.subtype,
            'rarity': self.rarity,
            'properties': json.loads(self.properties) if self.properties else {},
            'icon': self.icon,
            'quantity': self.quantity,
            'durability': self.durability,
            'max_durability': self.max_durability,
            'bound_to_character': self.bound_to_character,
            'owner': {
                'id': self.owner_id,
                'type': self.owner_type
            },
            'world_position': {
                'x': self.world_x,
                'y': self.world_y,
                'region_id': self.region_id
            } if self.world_x is not None and self.world_y is not None else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def get_value(self):
        """Get the gold value of the item"""
        properties = json.loads(self.properties) if self.properties else {}
        base_value = properties.get('value', 0)
        
        # Adjust value based on durability if applicable
        if self.durability is not None and self.max_durability is not None and self.max_durability > 0:
            durability_factor = self.durability / self.max_durability
            return int(base_value * durability_factor)
        
        return base_value
    
    def use(self, character):
        """Use the item, applying its effects"""
        if not self.usable:
            return False, "This item cannot be used."
        
        properties = json.loads(self.properties) if self.properties else {}
        
        # Apply effects based on item type
        if self.item_type == 'consumable':
            # Health restoration
            if 'restore_health' in properties:
                heal_amount = properties['restore_health']
                old_health = character.attributes.health
                character.attributes.health = min(character.attributes.max_health, 
                                                character.attributes.health + heal_amount)
                actual_heal = character.attributes.health - old_health
                
                # Reduce quantity
                self.quantity -= 1
                
                if self.quantity <= 0:
                    # Remove item if depleted
                    db.session.delete(self)
                
                db.session.commit()
                return True, f"Restored {actual_heal} health points."
            
            # Mana restoration
            elif 'restore_mana' in properties:
                mana_amount = properties['restore_mana']
                old_mana = character.attributes.mana
                character.attributes.mana = min(character.attributes.max_mana, 
                                               character.attributes.mana + mana_amount)
                actual_mana = character.attributes.mana - old_mana
                
                # Reduce quantity
                self.quantity -= 1
                
                if self.quantity <= 0:
                    # Remove item if depleted
                    db.session.delete(self)
                
                db.session.commit()
                return True, f"Restored {actual_mana} mana points."
            
            # Temporary buff
            elif 'buff' in properties:
                buff_type = properties['buff']
                duration = properties.get('duration', 60)  # Default 60 seconds
                strength = properties.get('strength', 1)
                
                # Apply buff to character
                if hasattr(character, 'add_buff'):
                    character.add_buff(buff_type, duration, strength)
                
                # Reduce quantity
                self.quantity -= 1
                
                if self.quantity <= 0:
                    # Remove item if depleted
                    db.session.delete(self)
                
                db.session.commit()
                return True, f"Applied {buff_type} buff."
            
            else:
                return False, "This item has no usable effects."
        
        elif self.item_type == 'scroll':
            # Cast spell effect
            spell = properties.get('spell')
            if spell:
                # TODO: Implement spell casting system
                
                # Reduce quantity
                self.quantity -= 1
                
                if self.quantity <= 0:
                    # Remove item if depleted
                    db.session.delete(self)
                
                db.session.commit()
                return True, f"Cast {spell} spell."
            
            else:
                return False, "This scroll has no spell encoded on it."
        
        else:
            return False, "This item cannot be used directly."
    
    def equip(self, character):
        """Equip the item to a character"""
        if not self.equipable:
            return False, "This item cannot be equipped."
        
        # Get equipment slot based on item type/subtype
        slot = self._get_equipment_slot()
        
        if not slot:
            return False, f"No equipment slot found for {self.item_type} {self.subtype}."
        
        # Check if character meets level requirement
        properties = json.loads(self.properties) if self.properties else {}
        level_req = properties.get('level_req', 1)
        
        if character.level < level_req:
            return False, f"You must be level {level_req} to equip this item."
        
        # Unequip current item in slot if any
        current_equipment = db.session.query(EquippedItem).filter_by(
            character_id=character.id,
            slot=slot
        ).first()
        
        if current_equipment:
            current_equipment.is_equipped = False
        
        # Create or update equipment entry
        equipment = db.session.query(EquippedItem).filter_by(
            character_id=character.id,
            item_id=self.id
        ).first()
        
        if equipment:
            equipment.slot = slot
            equipment.is_equipped = True
        else:
            equipment = EquippedItem(
                character_id=character.id,
                item_id=self.id,
                slot=slot,
                is_equipped=True
            )
            db.session.add(equipment)
        
        db.session.commit()
        return True, f"Equipped {self.name} in {slot} slot."
    
    def unequip(self, character):
        """Unequip the item from a character"""
        # Find equipment entry
        equipment = db.session.query(EquippedItem).filter_by(
            character_id=character.id,
            item_id=self.id,
            is_equipped=True
        ).first()
        
        if not equipment:
            return False, f"{self.name} is not equipped."
        
        # Unequip item
        equipment.is_equipped = False
        db.session.commit()
        
        return True, f"Unequipped {self.name}."
    
    def _get_equipment_slot(self):
        """Determine equipment slot based on item type and subtype"""
        if self.item_type == 'weapon':
            if self.subtype in ['sword', 'axe', 'mace', 'dagger', 'staff', 'wand']:
                return 'main_hand'
            elif self.subtype == 'bow':
                return 'both_hands'
            elif self.subtype == 'shield':
                return 'off_hand'
        
        elif self.item_type == 'armor':
            if self.subtype == 'helmet' or self.subtype == 'hat':
                return 'head'
            elif self.subtype in ['chestplate', 'robe', 'tunic']:
                return 'body'
            elif self.subtype in ['gloves', 'gauntlets']:
                return 'hands'
            elif self.subtype in ['boots', 'shoes']:
                return 'feet'
            elif self.subtype == 'shield':
                return 'off_hand'
        
        elif self.item_type == 'accessory':
            if self.subtype == 'ring':
                return 'ring'
            elif self.subtype == 'amulet':
                return 'neck'
            elif self.subtype == 'belt':
                return 'waist'
        
        # Default or unknown
        return None

class EquippedItem(db.Model):
    """Tracks which items are equipped by characters"""
    id = db.Column(db.Integer, primary_key=True)
    character_id = db.Column(db.Integer, db.ForeignKey('character.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), nullable=False)
    slot = db.Column(db.String(20), nullable=False)
    is_equipped = db.Column(db.Boolean, default=True)
    equipped_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    character = db.relationship('Character', backref='equipped_items')
    item = db.relationship('Item', backref='equipped_by')
    
    def __repr__(self):
        return f"<EquippedItem: Character {self.character_id} - Item {self.item_id} in slot {self.slot}>"