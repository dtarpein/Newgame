from flask import Flask, render_template, jsonify, request, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_socketio import SocketIO, emit
from flask_login import LoginManager, current_user, login_user, logout_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
import os
import json
from datetime import datetime, timedelta

# Initialize Flask app
app = Flask(__name__)
app.config.from_pyfile('config.py')

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
socketio = SocketIO(app)
login_manager = LoginManager(app)
login_manager.login_view = 'auth.login'

# Import models after initializing db to avoid circular dependencies
from models.user import User
from models.character import Character, CharacterAttributes, CharacterInventory
from models.world import Region, Location, WorldState
from models.quest import Quest, QuestStep, QuestProgress
from models.npc import NPC, NPCRelationship
from models.item import Item, ItemTemplate

# Import services
from services.llm_service import LLMService
from services.world_gen import WorldGenerator
from services.quest_gen import QuestGenerator
from services.combat import CombatManager
from services.weather_service import WeatherService

# Initialize services
llm_service = LLMService(app.config['OPENAI_API_KEY'])
world_generator = WorldGenerator(llm_service)
quest_generator = QuestGenerator(llm_service)
combat_manager = CombatManager()
weather_service = WeatherService(app.config['WEATHER_API_KEY'])

# Setup login manager
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Register blueprints for routes
from routes.auth import auth_bp
from routes.game import game_bp
from routes.character import character_bp
from routes.admin import admin_bp

app.register_blueprint(auth_bp)
app.register_blueprint(game_bp)
app.register_blueprint(character_bp)
app.register_blueprint(admin_bp)

# Root route
@app.route('/')
def index():
    return render_template('index.html')

# API routes for game data
@app.route('/api/world/regions')
@login_required
def get_regions():
    """Get all discovered regions for current player"""
    character_id = current_user.active_character_id
    character = Character.query.get(character_id)
    if not character:
        return jsonify({"error": "No active character"}), 404
    
    discovered_regions = []
    for region in Region.query.all():
        # Check if the character has discovered this region
        if WorldState.query.filter_by(
            character_id=character_id,
            region_id=region.id,
            discovered=True
        ).first():
            discovered_regions.append(region.to_dict())
    
    return jsonify(discovered_regions)

@app.route('/api/world/generate_region', methods=['POST'])
@login_required
def generate_region():
    """Generate a new region"""
    data = request.json
    theme = data.get('theme', 'forest')
    difficulty = data.get('difficulty', 1)
    
    character_id = current_user.active_character_id
    character = Character.query.get(character_id)
    if not character:
        return jsonify({"error": "No active character"}), 404
    
    # Generate region using the world generator service
    region_data = world_generator.generate_region(theme, difficulty, character.level)
    
    # Create new region in database
    new_region = Region(
        name=region_data['name'],
        description=region_data['description'],
        theme=theme,
        difficulty=difficulty,
        map_data=json.dumps(region_data['map_data'])
    )
    db.session.add(new_region)
    db.session.flush()  # Get ID without committing
    
    # Create world state entry to mark as discovered
    world_state = WorldState(
        character_id=character_id,
        region_id=new_region.id,
        discovered=True,
        discovery_date=datetime.utcnow()
    )
    db.session.add(world_state)
    
    # Create locations for this region
    for landmark in region_data['landmarks']:
        location = Location(
            region_id=new_region.id,
            name=landmark['name'],
            description=landmark['description'],
            location_type=landmark['type'],
            x_coord=landmark['x'],
            y_coord=landmark['y']
        )
        db.session.add(location)
    
    db.session.commit()
    
    return jsonify(new_region.to_dict())

@app.route('/api/quest/generate', methods=['POST'])
@login_required
def generate_quest():
    """Generate a new quest for the player"""
    data = request.json
    region_id = data.get('region_id')
    quest_type = data.get('quest_type', 'adventure')
    
    character_id = current_user.active_character_id
    character = Character.query.get(character_id)
    if not character:
        return jsonify({"error": "No active character"}), 404
    
    region = Region.query.get(region_id)
    if not region:
        return jsonify({"error": "Region not found"}), 404
    
    # Generate quest using the quest generator service
    quest_data = quest_generator.generate_quest(character, region, quest_type)
    
    # Create new quest in database
    new_quest = Quest(
        title=quest_data['title'],
        description=quest_data['description'],
        objective=quest_data['objective'],
        quest_type=quest_type,
        difficulty=quest_data['difficulty'],
        xp_reward=quest_data['reward_xp'],
        gold_reward=quest_data['reward_gold'],
        region_id=region_id
    )
    db.session.add(new_quest)
    db.session.flush()  # Get ID without committing
    
    # Add quest steps
    for step_data in quest_data['steps']:
        step = QuestStep(
            quest_id=new_quest.id,
            description=step_data['description'],
            step_order=step_data['order']
        )
        db.session.add(step)
    
    # Create quest progress entry for the character
    progress = QuestProgress(
        character_id=character_id,
        quest_id=new_quest.id,
        status='active',
        current_step=1
    )
    db.session.add(progress)
    
    # Add reward items
    for item_data in quest_data['reward_items']:
        # Check if template exists
        template = ItemTemplate.query.filter_by(name=item_data['name']).first()
        if not template:
            # Create template if it doesn't exist
            template = ItemTemplate(
                name=item_data['name'],
                description=item_data['description'],
                item_type=item_data['type'],
                rarity=item_data['rarity'],
                properties=json.dumps(item_data.get('properties', {}))
            )
            db.session.add(template)
            db.session.flush()
        
        # Link item to quest as reward
        new_quest.reward_items.append(template)
    
    db.session.commit()
    
    return jsonify(new_quest.to_dict())

@app.route('/api/character/inventory', methods=['GET'])
@login_required
def get_inventory():
    """Get current character's inventory"""
    character_id = current_user.active_character_id
    if not character_id:
        return jsonify({"error": "No active character"}), 404
    
    inventory = CharacterInventory.query.filter_by(character_id=character_id).first()
    if not inventory:
        return jsonify({"error": "Inventory not found"}), 404
    
    items = []
    for item in inventory.items:
        items.append(item.to_dict())
    
    return jsonify(items)

@app.route('/api/npc/dialogue', methods=['POST'])
@login_required
def npc_dialogue():
    """Generate dialogue for an NPC interaction"""
    data = request.json
    npc_id = data.get('npc_id')
    intent = data.get('intent', 'general')
    
    character_id = current_user.active_character_id
    if not character_id:
        return jsonify({"error": "No active character"}), 404
    
    npc = NPC.query.get(npc_id)
    if not npc:
        return jsonify({"error": "NPC not found"}), 404
    
    # Get character and relationship data
    character = Character.query.get(character_id)
    relationship = NPCRelationship.query.filter_by(
        character_id=character_id,
        npc_id=npc_id
    ).first()
    
    if not relationship:
        # Create default neutral relationship
        relationship = NPCRelationship(
            character_id=character_id,
            npc_id=npc_id,
            status='neutral',
            value=50  # Neutral value
        )
        db.session.add(relationship)
        db.session.commit()
    
    # Get dialogue from LLM service
    conversation_history = session.get('conversation_history', {}).get(str(npc_id), [])
    
    dialogue_data = llm_service.generate_dialogue(
        npc, 
        character, 
        conversation_history, 
        intent,
        relationship
    )
    
    # Update conversation history in session
    if 'conversation_history' not in session:
        session['conversation_history'] = {}
    
    if str(npc_id) not in session['conversation_history']:
        session['conversation_history'][str(npc_id)] = []
    
    # Add new dialogue to history
    session['conversation_history'][str(npc_id)].append({
        'speaker': 'npc',
        'text': dialogue_data['text'],
        'timestamp': datetime.utcnow().isoformat()
    })
    
    # Limit conversation history to last 10 exchanges
    if len(session['conversation_history'][str(npc_id)]) > 20:
        session['conversation_history'][str(npc_id)] = session['conversation_history'][str(npc_id)][-20:]
    
    session.modified = True
    
    # Update relationship based on dialogue
    if dialogue_data.get('relationship_change'):
        relationship.value += dialogue_data['relationship_change']
        # Keep in range 0-100
        relationship.value = max(0, min(100, relationship.value))
        
        # Update status based on value
        if relationship.value >= 80:
            relationship.status = 'friendly'
        elif relationship.value >= 50:
            relationship.status = 'neutral'
        elif relationship.value >= 20:
            relationship.status = 'unfriendly'
        else:
            relationship.status = 'hostile'
            
        db.session.commit()
    
    return jsonify(dialogue_data)

@app.route('/api/combat/initiate', methods=['POST'])
@login_required
def initiate_combat():
    """Start a combat encounter"""
    data = request.json
    enemy_type = data.get('enemy_type')
    difficulty = data.get('difficulty', 1)
    
    character_id = current_user.active_character_id
    character = Character.query.get(character_id)
    if not character:
        return jsonify({"error": "No active character"}), 404
    
    # Generate enemy using LLM
    enemy_data = llm_service.generate_enemy(enemy_type, difficulty, character.level)
    
    # Initialize combat in session
    session['combat'] = {
        'enemy': enemy_data,
        'character_id': character_id,
        'round': 1,
        'character_hp': character.attributes.health,
        'enemy_hp': enemy_data['health'],
        'status': 'active',
        'log': [f"Combat with {enemy_data['name']} begins!"]
    }
    
    return jsonify(session['combat'])

@app.route('/api/combat/action', methods=['POST'])
@login_required
def combat_action():
    """Process a combat action"""
    if 'combat' not in session or session['combat']['status'] != 'active':
        return jsonify({"error": "No active combat"}), 400
    
    data = request.json
    action = data.get('action')
    target = data.get('target', 'enemy')
    
    combat_data = session['combat']
    character = Character.query.get(combat_data['character_id'])
    
    # Process character's action
    result = combat_manager.process_action(action, character, combat_data['enemy'], target)
    
    # Update combat state
    combat_data['log'].append(result['log'])
    combat_data['character_hp'] = result['character_hp']
    combat_data['enemy_hp'] = result['enemy_hp']
    combat_data['round'] += 1
    
    # Check for combat end
    if combat_data['character_hp'] <= 0:
        combat_data['status'] = 'defeat'
        combat_data['log'].append(f"You have been defeated by {combat_data['enemy']['name']}!")
    elif combat_data['enemy_hp'] <= 0:
        combat_data['status'] = 'victory'
        combat_data['log'].append(f"You have defeated {combat_data['enemy']['name']}!")
        
        # Award XP and items on victory
        xp_gain = combat_data['enemy']['xp_value']
        character.xp += xp_gain
        
        # Check for level up
        if character.xp >= character.xp_to_next_level:
            old_level = character.level
            character.level += 1
            character.xp_to_next_level = calculate_next_level_xp(character.level)
            combat_data['log'].append(f"Level Up! You are now level {character.level}!")
            
            # Increase attributes on level up
            character.attributes.max_health += 5
            character.attributes.health = character.attributes.max_health
            character.attributes.strength += 1
            character.attributes.intelligence += 1
            character.attributes.agility += 1
            character.attributes.charisma += 1
        
        db.session.commit()
    
    session['combat'] = combat_data
    session.modified = True
    
    return jsonify(combat_data)

# WebSocket event handlers
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    if current_user.is_authenticated:
        # Join a personal room
        room = f"user_{current_user.id}"
        join_room(room)
        emit('status', {'message': 'Connected to game server'})

@socketio.on('world_update')
def handle_world_update(data):
    """Handle updates to world state"""
    if current_user.is_authenticated:
        character_id = current_user.active_character_id
        if not character_id:
            return
        
        # Update character position
        if 'position' in data:
            x = data['position']['x']
            y = data['position']['y']
            region_id = data['position']['region_id']
            
            # Save position to database
            world_state = WorldState.query.filter_by(
                character_id=character_id,
                region_id=region_id
            ).first()
            
            if world_state:
                world_state.position_x = x
                world_state.position_y = y
                db.session.commit()
                
                # Notify about position update
                room = f"user_{current_user.id}"
                emit('position_updated', {'x': x, 'y': y}, room=room)

# Helper function
def calculate_next_level_xp(level):
    """Calculate XP needed for next level"""
    return 100 * level * level

# Run the application
if __name__ == "__main__":
    socketio.run(app, debug=app.config['DEBUG'])
