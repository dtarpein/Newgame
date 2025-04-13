from app import db
from datetime import datetime
import json

class Region(db.Model):
    """Game region/map area"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    theme = db.Column(db.String(50))  # forest, desert, mountains, etc.
    difficulty = db.Column(db.Integer, default=1)  # 1-10 scale
    map_data = db.Column(db.Text)  # JSON string of map tiles
    
    # Relationships
    locations = db.relationship('Location', backref='region', lazy=True, cascade="all, delete-orphan")
    npcs = db.relationship('NPC', backref='region', lazy=True)
    quests = db.relationship('Quest', backref='region', lazy=True)
    
    def to_dict(self):
        """Convert region data to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'theme': self.theme,
            'difficulty': self.difficulty,
            'map_data': json.loads(self.map_data) if self.map_data else {},
            'location_count': len(self.locations) if self.locations else 0,
            'npc_count': len(self.npcs) if self.npcs else 0,
            'quest_count': len(self.quests) if self.quests else 0
        }

class Location(db.Model):
    """Points of interest within regions"""
    id = db.Column(db.Integer, primary_key=True)
    region_id = db.Column(db.Integer, db.ForeignKey('region.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    location_type = db.Column(db.String(50))  # town, dungeon, shop, landmark, etc.
    x_coord = db.Column(db.Integer)  # Position on the map
    y_coord = db.Column(db.Integer)  # Position on the map
    discovery_text = db.Column(db.Text)  # Text shown when location is discovered
    properties = db.Column(db.Text)  # JSON string of location-specific properties
    
    # Relationships
    npcs = db.relationship('NPC', backref='location', lazy=True)
    
    def to_dict(self):
        """Convert location data to dictionary"""
        return {
            'id': self.id,
            'region_id': self.region_id,
            'name': self.name,
            'description': self.description,
            'location_type': self.location_type,
            'x_coord': self.x_coord,
            'y_coord': self.y_coord,
            'discovery_text': self.discovery_text,
            'properties': json.loads(self.properties) if self.properties else {},
            'npc_count': len(self.npcs) if self.npcs else 0
        }

class WorldState(db.Model):
    """Tracks the state of the world for a specific character"""
    id = db.Column(db.Integer, primary_key=True)
    character_id = db.Column(db.Integer, db.ForeignKey('character.id'), nullable=False)
    region_id = db.Column(db.Integer, db.ForeignKey('region.id'), nullable=False)
    
    # Character's state in this region
    discovered = db.Column(db.Boolean, default=False)
    discovery_date = db.Column(db.DateTime)
    position_x = db.Column(db.Integer, default=0)
    position_y = db.Column(db.Integer, default=0)
    
    # Location discoveries
    discovered_locations = db.Column(db.Text)  # JSON array of location IDs
    
    # World state properties
    weather = db.Column(db.String(50), default='clear')
    time_of_day = db.Column(db.String(20), default='day')
    environment_state = db.Column(db.Text)  # JSON string of environment variables
    
    # Region instance for this character (for procedural content)
    region_seed = db.Column(db.Integer)  # Random seed for procedural generation
    region_instance = db.Column(db.Text)  # JSON string of instance-specific data
    
    def __init__(self, character_id, region_id, discovered=False, discovery_date=None):
        self.character_id = character_id
        self.region_id = region_id
        self.discovered = discovered
        self.discovery_date = discovery_date or datetime.utcnow()
        self.position_x = 0
        self.position_y = 0
        self.discovered_locations = json.dumps([])
        import random
        self.region_seed = random.randint(1, 1000000)  # Generate random seed
    
    def discover_location(self, location_id):
        """Mark a location as discovered"""
        locations = json.loads(self.discovered_locations)
        if location_id not in locations:
            locations.append(location_id)
            self.discovered_locations = json.dumps(locations)
            return True
        return False
    
    def has_discovered_location(self, location_id):
        """Check if a location is discovered"""
        locations = json.loads(self.discovered_locations)
        return location_id in locations
    
    def to_dict(self):
        """Convert world state to dictionary"""
        return {
            'character_id': self.character_id,
            'region_id': self.region_id,
            'discovered': self.discovered,
            'discovery_date': self.discovery_date.isoformat() if self.discovery_date else None,
            'position': {
                'x': self.position_x,
                'y': self.position_y
            },
            'discovered_locations': json.loads(self.discovered_locations) if self.discovered_locations else [],
            'weather': self.weather,
            'time_of_day': self.time_of_day,
            'environment_state': json.loads(self.environment_state) if self.environment_state else {},
            'region_seed': self.region_seed,
            'region_instance': json.loads(self.region_instance) if self.region_instance else {}
        }