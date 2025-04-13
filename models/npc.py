from app import db
from datetime import datetime
import json

class NPC(db.Model):
    """NPC (Non-Player Character) Model"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    race = db.Column(db.String(50))
    occupation = db.Column(db.String(50))
    personality = db.Column(db.String(50))
    description = db.Column(db.Text)
    dialogue_traits = db.Column(db.Text)  # JSON array of personality traits
    region_id = db.Column(db.Integer, db.ForeignKey('region.id'))
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'))
    x_coord = db.Column(db.Integer)
    y_coord = db.Column(db.Integer)
    sprite_id = db.Column(db.String(50))
    is_merchant = db.Column(db.Boolean, default=False)
    is_quest_giver = db.Column(db.Boolean, default=False)
    is_trainer = db.Column(db.Boolean, default=False)
    is_hostile = db.Column(db.Boolean, default=False)
    level = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    relationships = db.relationship('NPCRelationship', backref='npc', lazy=True, cascade="all, delete-orphan")
    dialogues = db.relationship('NPCDialogue', backref='npc', lazy=True, cascade="all, delete-orphan")
    quests = db.relationship('Quest', backref='quest_giver', lazy=True, foreign_keys='Quest.giver_id')
    
    def __repr__(self):
        return f"<NPC {self.id}: {self.name}>"
    
    def to_dict(self):
        """Convert NPC data to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'race': self.race,
            'occupation': self.occupation,
            'personality': self.personality,
            'description': self.description,
            'dialogue_traits': json.loads(self.dialogue_traits) if self.dialogue_traits else [],
            'region_id': self.region_id,
            'location_id': self.location_id,
            'position': {'x': self.x_coord, 'y': self.y_coord},
            'sprite_id': self.sprite_id,
            'is_merchant': self.is_merchant,
            'is_quest_giver': self.is_quest_giver,
            'is_trainer': self.is_trainer,
            'is_hostile': self.is_hostile,
            'level': self.level
        }
    
    def get_available_quests(self, character):
        """Get quests available from this NPC for a specific character"""
        available_quests = []
        
        for quest in self.quests:
            if not quest.is_active:
                continue
            
            # Check if character meets level requirement
            if character.level < quest.min_level:
                continue
            
            # Check if quest has prerequisite
            if quest.prereq_quest_id:
                # Check if prerequisite is completed
                prereq_progress = QuestProgress.query.filter_by(
                    character_id=character.id,
                    quest_id=quest.prereq_quest_id,
                    status='completed'
                ).first()
                
                if not prereq_progress:
                    continue
            
            # Check if quest is already completed and not repeatable
            existing_progress = QuestProgress.query.filter_by(
                character_id=character.id,
                quest_id=quest.id
            ).first()
            
            if existing_progress and existing_progress.status == 'completed' and not quest.repeatable:
                continue
            
            # Quest is available
            available_quests.append(quest)
        
        return available_quests
    
    def get_shop_inventory(self):
        """Get merchant inventory items if NPC is a shopkeeper"""
        if not self.is_merchant:
            return []
        
        from models.item import Item
        items = Item.query.filter_by(owner_id=self.id).all()
        return items

class NPCRelationship(db.Model):
    """Tracks relationship between a character and an NPC"""
    id = db.Column(db.Integer, primary_key=True)
    character_id = db.Column(db.Integer, db.ForeignKey('character.id'), nullable=False)
    npc_id = db.Column(db.Integer, db.ForeignKey('npc.id'), nullable=False)
    status = db.Column(db.String(20), default='neutral')  # friendly, neutral, unfriendly, hostile
    value = db.Column(db.Integer, default=50)  # 0-100 scale, 0=hostile, 100=friendly
    interaction_count = db.Column(db.Integer, default=0)
    last_interaction = db.Column(db.DateTime)
    relationship_data = db.Column(db.Text)  # JSON for additional data
    
    def __repr__(self):
        return f"<NPCRelationship: Character {self.character_id} - NPC {self.npc_id}>"
    
    def to_dict(self):
        """Convert relationship data to dictionary"""
        return {
            'id': self.id,
            'character_id': self.character_id,
            'npc_id': self.npc_id,
            'status': self.status,
            'value': self.value,
            'interaction_count': self.interaction_count,
            'last_interaction': self.last_interaction.isoformat() if self.last_interaction else None,
            'relationship_data': json.loads(self.relationship_data) if self.relationship_data else {}
        }
    
    def update_relationship(self, change_amount):
        """Update relationship value and status"""
        # Update value within bounds
        self.value = max(0, min(100, self.value + change_amount))
        
        # Update status based on value
        if self.value >= 80:
            self.status = 'friendly'
        elif self.value >= 50:
            self.status = 'neutral'
        elif self.value >= 20:
            self.status = 'unfriendly'
        else:
            self.status = 'hostile'
        
        # Update interaction data
        self.interaction_count += 1
        self.last_interaction = datetime.utcnow()
        
        return self.status

class NPCDialogue(db.Model):
    """Dialogue options for NPCs"""
    id = db.Column(db.Integer, primary_key=True)
    npc_id = db.Column(db.Integer, db.ForeignKey('npc.id'), nullable=False)
    category = db.Column(db.String(50), default='greeting')  # greeting, quest, shop, gossip, etc.
    condition = db.Column(db.String(50))  # When dialogue is available (relationship status, quest progress, etc.)
    content = db.Column(db.Text, nullable=False)
    response_options = db.Column(db.Text)  # JSON array of possible player responses
    next_dialogue_id = db.Column(db.Integer, db.ForeignKey('npc_dialogue.id'))
    quest_id = db.Column(db.Integer, db.ForeignKey('quest.id'))
    relationship_change = db.Column(db.Integer, default=0)  # How this dialogue affects relationship
    
    def __repr__(self):
        return f"<NPCDialogue {self.id}: NPC {self.npc_id} - {self.category}>"
    
    def to_dict(self):
        """Convert dialogue data to dictionary"""
        return {
            'id': self.id,
            'npc_id': self.npc_id,
            'category': self.category,
            'condition': self.condition,
            'content': self.content,
            'response_options': json.loads(self.response_options) if self.response_options else [],
            'next_dialogue_id': self.next_dialogue_id,
            'quest_id': self.quest_id,
            'relationship_change': self.relationship_change
        }