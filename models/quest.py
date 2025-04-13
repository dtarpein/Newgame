from app import db
from datetime import datetime
import json

# Association table for quests and reward items
quest_rewards = db.Table('quest_rewards',
    db.Column('quest_id', db.Integer, db.ForeignKey('quest.id'), primary_key=True),
    db.Column('item_template_id', db.Integer, db.ForeignKey('item_template.id'), primary_key=True)
)

class Quest(db.Model):
    """Quest model representing a mission or task for players"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    objective = db.Column(db.Text, nullable=False)
    quest_type = db.Column(db.String(50), nullable=False)  # fetch, kill, escort, explore, delivery
    difficulty = db.Column(db.Integer, default=1)
    min_level = db.Column(db.Integer, default=1)
    xp_reward = db.Column(db.Integer, default=100)
    gold_reward = db.Column(db.Integer, default=50)
    repeatable = db.Column(db.Boolean, default=False)
    region_id = db.Column(db.Integer, db.ForeignKey('region.id'))
    giver_id = db.Column(db.Integer, db.ForeignKey('npc.id'))
    prereq_quest_id = db.Column(db.Integer, db.ForeignKey('quest.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    steps = db.relationship('QuestStep', backref='quest', lazy=True, cascade="all, delete-orphan")
    progress = db.relationship('QuestProgress', backref='quest', lazy=True)
    reward_items = db.relationship('ItemTemplate', secondary=quest_rewards, lazy='subquery',
                                  backref=db.backref('reward_for_quests', lazy=True))
    
    def __repr__(self):
        return f"<Quest {self.id}: {self.title}>"
    
    def to_dict(self):
        """Convert quest data to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'objective': self.objective,
            'quest_type': self.quest_type,
            'difficulty': self.difficulty,
            'min_level': self.min_level,
            'xp_reward': self.xp_reward,
            'gold_reward': self.gold_reward,
            'repeatable': self.repeatable,
            'region_id': self.region_id,
            'giver_id': self.giver_id,
            'prereq_quest_id': self.prereq_quest_id,
            'steps': [step.to_dict() for step in self.steps],
            'reward_items': [item.to_dict() for item in self.reward_items]
        }

class QuestStep(db.Model):
    """Steps required to complete a quest"""
    id = db.Column(db.Integer, primary_key=True)
    quest_id = db.Column(db.Integer, db.ForeignKey('quest.id'), nullable=False)
    description = db.Column(db.Text, nullable=False)
    step_order = db.Column(db.Integer, nullable=False)
    step_type = db.Column(db.String(50), default='basic')  # basic, item, kill, location, interact
    target_id = db.Column(db.Integer)  # ID of target item, enemy, location, etc.
    target_count = db.Column(db.Integer, default=1)  # Number of items to collect, enemies to kill, etc.
    target_data = db.Column(db.Text)  # Additional JSON data for step
    
    def __repr__(self):
        return f"<QuestStep {self.id}: {self.description[:20]}...>"
    
    def to_dict(self):
        """Convert quest step data to dictionary"""
        return {
            'id': self.id,
            'quest_id': self.quest_id,
            'description': self.description,
            'step_order': self.step_order,
            'step_type': self.step_type,
            'target_id': self.target_id,
            'target_count': self.target_count,
            'target_data': json.loads(self.target_data) if self.target_data else None
        }

class QuestProgress(db.Model):
    """Tracks a character's progress on a quest"""
    id = db.Column(db.Integer, primary_key=True)
    character_id = db.Column(db.Integer, db.ForeignKey('character.id'), nullable=False)
    quest_id = db.Column(db.Integer, db.ForeignKey('quest.id'), nullable=False)
    status = db.Column(db.String(20), default='inactive')  # inactive, active, completed, failed
    current_step = db.Column(db.Integer, default=1)
    progress_data = db.Column(db.Text)  # JSON data with step-specific progress tracking
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completion_date = db.Column(db.DateTime)
    times_completed = db.Column(db.Integer, default=0)  # For repeatable quests
    
    def __repr__(self):
        return f"<QuestProgress {self.id}: Character {self.character_id} on Quest {self.quest_id}>"
    
    def to_dict(self):
        """Convert quest progress data to dictionary"""
        return {
            'id': self.id,
            'character_id': self.character_id,
            'quest_id': self.quest_id,
            'status': self.status,
            'current_step': self.current_step,
            'progress_data': json.loads(self.progress_data) if self.progress_data else {},
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completion_date': self.completion_date.isoformat() if self.completion_date else None,
            'times_completed': self.times_completed
        }
    
    def update_progress(self, step_number, progress_info):
        """Update progress on a specific step"""
        if self.progress_data:
            progress = json.loads(self.progress_data)
        else:
            progress = {}
        
        # Initialize step data if not exists
        if str(step_number) not in progress:
            progress[str(step_number)] = {}
        
        # Update with new progress info
        progress[str(step_number)].update(progress_info)
        
        # Save updated progress
        self.progress_data = json.dumps(progress)
        
        # Check if step is complete
        step_complete = progress.get(str(step_number), {}).get('complete', False)
        
        # Move to next step if current step is complete
        if step_complete and self.current_step == step_number:
            # Get total steps for this quest
            total_steps = db.session.query(db.func.max(QuestStep.step_order)).filter_by(quest_id=self.quest_id).scalar() or 1
            
            if step_number < total_steps:
                self.current_step = step_number + 1
            else:
                # All steps complete, mark quest as completed
                self.status = 'completed'
                self.completion_date = datetime.utcnow()
                self.times_completed += 1
        
        return step_complete
    
    def is_step_complete(self, step_number):
        """Check if a specific step is complete"""
        if not self.progress_data:
            return False
        
        progress = json.loads(self.progress_data)
        return progress.get(str(step_number), {}).get('complete', False)
    
    def get_step_progress(self, step_number):
        """Get progress details for a specific step"""
        if not self.progress_data:
            return {}
        
        progress = json.loads(self.progress_data)
        return progress.get(str(step_number), {})