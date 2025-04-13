from app import db
from datetime import datetime
import json

# Association table for character-item many-to-many relationship
character_items = db.Table('character_items',
    db.Column('character_id', db.Integer, db.ForeignKey('character_inventory.id'), primary_key=True),
    db.Column('item_id', db.Integer, db.ForeignKey('item.id'), primary_key=True),
    db.Column('quantity', db.Integer, default=1),
    db.Column('equipped', db.Boolean, default=False)
)

class Character(db.Model):
    """Character model representing a player's game avatar"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    character_class = db.Column(db.String(50), nullable=False)
    level = db.Column(db.Integer, default=1)
    xp = db.Column(db.Integer, default=0)
    xp_to_next_level = db.Column(db.Integer, default=100)
    gold = db.Column(db.Integer, default=10)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_played = db.Column(db.DateTime, default=datetime.utcnow)
    appearance = db.Column(db.Text)  # JSON string of appearance details
    
    # Relationships
    attributes = db.relationship('CharacterAttributes', backref='character', uselist=False, lazy=True, cascade="all, delete-orphan")
    inventory = db.relationship('CharacterInventory', backref='character', uselist=False, lazy=True, cascade="all, delete-orphan")
    skills = db.relationship('CharacterSkill', backref='character', lazy=True, cascade="all, delete-orphan")
    quest_progress = db.relationship('QuestProgress', backref='character', lazy=True, cascade="all, delete-orphan")
    npc_relationships = db.relationship('NPCRelationship', backref='character', lazy=True, cascade="all, delete-orphan")
    world_states = db.relationship('WorldState', backref='character', lazy=True, cascade="all, delete-orphan")
    
    def __init__(self, user_id, name, character_class, appearance=None):
        self.user_id = user_id
        self.name = name
        self.character_class = character_class
        self.level = 1
        self.xp = 0
        self.xp_to_next_level = 100
        self.gold = 10
        self.appearance = json.dumps(appearance) if appearance else json.dumps({})
    
    def update_last_played(self):
        """Update last played timestamp"""
        self.last_played = datetime.utcnow()
        db.session.commit()
    
    def add_xp(self, amount):
        """Add XP and handle level up"""
        self.xp += amount
        
        # Check for level up
        while self.xp >= self.xp_to_next_level:
            self.level_up()
        
        db.session.commit()
        return self.level
    
    def level_up(self):
        """Level up the character"""
        self.level += 1
        self.xp -= self.xp_to_next_level
        # New XP threshold is level^2 * 100
        self.xp_to_next_level = (self.level * self.level) * 100
        
        # Increase attributes
        self.attributes.max_health += 5
        self.attributes.health = self.attributes.max_health
        self.attributes.max_mana += 3
        self.attributes.mana = self.attributes.max_mana
        self.attributes.strength += 1
        self.attributes.intelligence += 1
        self.attributes.agility += 1
        self.attributes.charisma += 1
    
    def to_dict(self):
        """Convert character data to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'character_class': self.character_class,
            'level': self.level,
            'xp': self.xp,
            'xp_to_next_level': self.xp_to_next_level,
            'gold': self.gold,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_played': self.last_played.isoformat() if self.last_played else None,
            'appearance': json.loads(self.appearance) if self.appearance else {},
            'attributes': self.attributes.to_dict() if self.attributes else {},
            'skills': [skill.to_dict() for skill in self.skills] if self.skills else []
        }

class CharacterAttributes(db.Model):
    """Character attributes and stats"""
    id = db.Column(db.Integer, primary_key=True)
    character_id = db.Column(db.Integer, db.ForeignKey('character.id'), nullable=False)
    
    # Base attributes
    health = db.Column(db.Integer, default=100)
    max_health = db.Column(db.Integer, default=100)
    mana = db.Column(db.Integer, default=50)
    max_mana = db.Column(db.Integer, default=50)
    
    # Primary attributes
    strength = db.Column(db.Integer, default=10)  # Physical damage, carrying capacity
    intelligence = db.Column(db.Integer, default=10)  # Magic power, learning ability
    agility = db.Column(db.Integer, default=10)  # Speed, dodge chance, critical hit
    charisma = db.Column(db.Integer, default=10)  # NPC interactions, prices
    
    # Derived attributes (updated on request rather than stored)
    @property
    def physical_defense(self):
        """Calculate physical defense from attributes and equipment"""
        base = self.strength // 2
        # Could factor in equipment here
        return base
    
    @property
    def magic_defense(self):
        """Calculate magic defense from attributes and equipment"""
        base = self.intelligence // 2
        # Could factor in equipment here
        return base
    
    @property
    def critical_chance(self):
        """Calculate critical hit chance from agility"""
        return 5 + (self.agility // 5)  # Base 5% + 1% per 5 agility
    
    def to_dict(self):
        """Convert attributes to dictionary"""
        return {
            'health': self.health,
            'max_health': self.max_health,
            'mana': self.mana,
            'max_mana': self.max_mana,
            'strength': self.strength,
            'intelligence': self.intelligence,
            'agility': self.agility,
            'charisma': self.charisma,
            'physical_defense': self.physical_defense,
            'magic_defense': self.magic_defense,
            'critical_chance': self.critical_chance
        }

class CharacterInventory(db.Model):
    """Character inventory containing items"""
    id = db.Column(db.Integer, primary_key=True)
    character_id = db.Column(db.Integer, db.ForeignKey('character.id'), nullable=False)
    max_slots = db.Column(db.Integer, default=20)
    
    # Many-to-many relationship with items
    items = db.relationship('Item', secondary=character_items, lazy='subquery',
                           backref=db.backref('inventories', lazy=True))
    
    def add_item(self, item, quantity=1):
        """Add an item to inventory"""
        if len(self.items) >= self.max_slots:
            return False, "Inventory full"
        
        self.items.append(item)
        return True, f"Added {item.name} to inventory"
    
    def remove_item(self, item_id, quantity=1):
        """Remove an item from inventory"""
        for item in self.items:
            if item.id == item_id:
                self.items.remove(item)
                return True, f"Removed {item.name} from inventory"
        
        return False, "Item not found in inventory"
    
    def has_item(self, item_id):
        """Check if inventory contains an item"""
        for item in self.items:
            if item.id == item_id:
                return True
        return False
    
    def equip_item(self, item_id):
        """Equip an item"""
        # This would need to be implemented with item types, slots, etc.
        pass
    
    def to_dict(self):
        """Convert inventory to dictionary"""
        return {
            'max_slots': self.max_slots,
            'used_slots': len(self.items),
            'items': [item.to_dict() for item in self.items] if self.items else []
        }

class CharacterSkill(db.Model):
    """Character skills and abilities"""
    id = db.Column(db.Integer, primary_key=True)
    character_id = db.Column(db.Integer, db.ForeignKey('character.id'), nullable=False)
    skill_name = db.Column(db.String(50), nullable=False)
    skill_level = db.Column(db.Integer, default=1)
    skill_type = db.Column(db.String(50))  # combat, magic, utility, etc.
    skill_description = db.Column(db.Text)
    skill_effect = db.Column(db.Text)  # JSON string of skill effects
    
    def to_dict(self):
        """Convert skill to dictionary"""
        return {
            'id': self.id,
            'skill_name': self.skill_name,
            'skill_level': self.skill_level,
            'skill_type': self.skill_type,
            'skill_description': self.skill_description,
            'skill_effect': json.loads(self.skill_effect) if self.skill_effect else {}
        }