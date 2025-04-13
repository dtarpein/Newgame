from flask import Blueprint, render_template, jsonify, request, session, redirect, url_for
from flask_login import current_user, login_required
import json
from datetime import datetime

from app import db, llm_service, world_generator, quest_generator, combat_manager, weather_service
from models.character import Character, CharacterAttributes, CharacterInventory, CharacterSkill
from models.world import Region, Location, WorldState
from models.quest import Quest, QuestStep, QuestProgress
from models.npc import NPC, NPCRelationship
from models.item import Item, ItemTemplate

game_bp = Blueprint('game', __name__, url_prefix='/game')

@game_bp.route('/')
@login_required
def game_home():
    """Main game page"""
    if not current_user.active_character_id:
        return redirect(url_for('character.character_select'))
    
    character = Character.query.get(current_user.active_character_id)
    if not character:
        return redirect(url_for('character.character_select'))
    
    # Get character's current region
    current_world_state = WorldState.query.filter_by(
        character_id=character.id
    ).order_by(WorldState.discovery_date.desc()).first()
    
    current_region = None
    if current_world_state:
        current_region = Region.query.get(current_world_state.region_id)
    
    # If no current region, redirect to region select
    if not current_region:
        return redirect(url_for('game.region_select'))
    
    return render_template('game/main.html', 
                          character=character,
                          region=current_region,
                          world_state=current_world_state)

@game_bp.route('/region_select')
@login_required
def region_select():
    """Region selection page"""
    if not current_user.active_character_id:
        return redirect(url_for('character.character_select'))
    
    character = Character.query.get(current_user.active_character_id)
    
    # Get all regions this character has discovered
    discovered_regions = []
    world_states = WorldState.query.filter_by(
        character_id=character.id,
        discovered=True
    ).all()
    
    for state in world_states:
        region = Region.query.get(state.region_id)
        if region:
            discovered_regions.append({
                'region': region,
                'world_state': state
            })
    
    # If no discovered regions, create starter regions
    if not discovered_regions:
        from config import STARTER_REGIONS
        
        for region_data in STARTER_REGIONS:
            # Check if region already exists
            region = Region.query.filter_by(name=region_data['name']).first()
            if not region:
                # Generate region map
                map_data = world_generator.generate_region(
                    region_data['theme'],
                    region_data['difficulty'],
                    character.level
                )
                
                # Create region
                region = Region(
                    name=region_data['name'],
                    description=region_data['description'],
                    theme=region_data['theme'],
                    difficulty=region_data['difficulty'],
                    map_data=json.dumps(map_data['map_data'])
                )
                db.session.add(region)
                db.session.flush()  # Get ID without committing
                
                # Add landmarks
                for landmark in map_data['landmarks']:
                    location = Location(
                        region_id=region.id,
                        name=landmark['name'],
                        description=landmark['description'],
                        location_type=landmark['type'],
                        x_coord=landmark['x'],
                        y_coord=landmark['y']
                    )
                    db.session.add(location)
            
            # Create world state entry
            world_state = WorldState(
                character_id=character.id,
                region_id=region.id,
                discovered=True,
                discovery_date=datetime.utcnow()
            )
            db.session.add(world_state)
            
            discovered_regions.append({
                'region': region,
                'world_state': world_state
            })
        
        db.session.commit()
    
    return render_template('game/region_select.html',
                          character=character,
                          regions=discovered_regions)

@game_bp.route('/enter_region/<int:region_id>')
@login_required
def enter_region(region_id):
    """Enter a region"""
    if not current_user.active_character_id:
        return redirect(url_for('character.character_select'))
    
    character = Character.query.get(current_user.active_character_id)
    region = Region.query.get(region_id)
    
    if not region:
        return redirect(url_for('game.region_select'))
    
    # Check if character has discovered this region
    world_state = WorldState.query.filter_by(
        character_id=character.id,
        region_id=region.id
    ).first()
    
    if not world_state:
        # Create new world state
        world_state = WorldState(
            character_id=character.id,
            region_id=region.id,
            discovered=True,
            discovery_date=datetime.utcnow()
        )
        db.session.add(world_state)
        db.session.commit()
    
    # Update character's last played timestamp
    character.update_last_played()
    
    # Redirect to main game page
    return redirect(url_for('game.game_home'))

@game_bp.route('/quests')
@login_required
def quests():
    """Quest journal page"""
    if not current_user.active_character_id:
        return redirect(url_for('character.character_select'))
    
    character = Character.query.get(current_user.active_character_id)
    
    # Get all active quests
    active_quests = []
    completed_quests = []
    
    quest_progress = QuestProgress.query.filter_by(character_id=character.id).all()
    
    for progress in quest_progress:
        quest = Quest.query.get(progress.quest_id)
        if quest:
            quest_data = {
                'quest': quest,
                'progress': progress,
                'region': Region.query.get(quest.region_id),
                'steps': QuestStep.query.filter_by(quest_id=quest.id).order_by(QuestStep.step_order).all()
            }
            
            if progress.status == 'completed':
                completed_quests.append(quest_data)
            else:
                active_quests.append(quest_data)
    
    return render_template('game/quests.html',
                          character=character,
                          active_quests=active_quests,
                          completed_quests=completed_quests)

@game_bp.route('/inventory')
@login_required
def inventory():
    """Inventory management page"""
    if not current_user.active_character_id:
        return redirect(url_for('character.character_select'))
    
    character = Character.query.get(current_user.active_character_id)
    
    # Get inventory
    inventory = CharacterInventory.query.filter_by(character_id=character.id).first()
    
    if not inventory:
        # Create inventory if it doesn't exist
        inventory = CharacterInventory(character_id=character.id)
        db.session.add(inventory)
        db.session.commit()
    
    # Sort items by type
    equipped_items = []
    weapons = []
    armor = []
    consumables = []
    quest_items = []
    other_items = []
    
    for item in inventory.items:
        if hasattr(item, 'equipped') and item.equipped:
            equipped_items.append(item)
            continue
        
        if item.item_type == 'weapon':
            weapons.append(item)
        elif item.item_type == 'armor':
            armor.append(item)
        elif item.item_type == 'consumable':
            consumables.append(item)
        elif item.item_type == 'quest':
            quest_items.append(item)
        else:
            other_items.append(item)
    
    return render_template('game/inventory.html',
                          character=character,
                          inventory=inventory,
                          equipped_items=equipped_items,
                          weapons=weapons,
                          armor=armor,
                          consumables=consumables,
                          quest_items=quest_items,
                          other_items=other_items)

@game_bp.route('/combat')
@login_required
def combat():
    """Combat interface"""
    if not current_user.active_character_id:
        return redirect(url_for('character.character_select'))
    
    character = Character.query.get(current_user.active_character_id)
    
    # Check if there's an active combat in session
    if 'combat' not in session or session['combat']['status'] != 'active':
        # If not, redirect to main game
        return redirect(url_for('game.game_home'))
    
    combat_data = session['combat']
    
    # Get character's current region
    current_world_state = WorldState.query.filter_by(
        character_id=character.id
    ).order_by(WorldState.discovery_date.desc()).first()
    
    current_region = None
    if current_world_state:
        current_region = Region.query.get(current_world_state.region_id)
    
    return render_template('game/combat.html',
                          character=character,
                          combat=combat_data,
                          region=current_region)

@game_bp.route('/npc/<int:npc_id>')
@login_required
def npc_interaction(npc_id):
    """NPC interaction page"""
    if not current_user.active_character_id:
        return redirect(url_for('character.character_select'))
    
    character = Character.query.get(current_user.active_character_id)
    npc = NPC.query.get(npc_id)
    
    if not npc:
        return redirect(url_for('game.game_home'))
    
    # Get relationship
    relationship = NPCRelationship.query.filter_by(
        character_id=character.id,
        npc_id=npc.id
    ).first()
    
    if not relationship:
        # Create default neutral relationship
        relationship = NPCRelationship(
            character_id=character.id,
            npc_id=npc.id,
            status='neutral',
            value=50  # Neutral value
        )
        db.session.add(relationship)
        db.session.commit()
    
    # Get conversation history
    conversation_history = session.get('conversation_history', {}).get(str(npc.id), [])
    
    # Get available quests from this NPC
    available_quests = Quest.query.filter_by(giver_id=npc.id).all()
    active_quests = []
    
    for quest in available_quests:
        progress = QuestProgress.query.filter_by(
            character_id=character.id,
            quest_id=quest.id
        ).first()
        
        if progress and progress.status != 'completed':
            active_quests.append({
                'quest': quest,
                'progress': progress
            })
    
    return render_template('game/npc.html',
                          character=character,
                          npc=npc,
                          relationship=relationship,
                          conversation_history=conversation_history,
                          available_quests=available_quests,
                          active_quests=active_quests)

@game_bp.route('/shop/<int:npc_id>')
@login_required
def shop(npc_id):
    """Shop interface"""
    if not current_user.active_character_id:
        return redirect(url_for('character.character_select'))
    
    character = Character.query.get(current_user.active_character_id)
    npc = NPC.query.get(npc_id)
    
    if not npc or npc.occupation != 'merchant':
        return redirect(url_for('game.game_home'))
    
    # Get relationship
    relationship = NPCRelationship.query.filter_by(
        character_id=character.id,
        npc_id=npc.id
    ).first()
    
    # Calculate price modifier based on relationship and charisma
    price_modifier = 1.0
    if relationship:
        # Relationship from 0-100 affects prices by ±20%
        rel_modifier = 1.2 - (relationship.value / 250)  # 0.8 at 100, 1.2 at 0
        price_modifier *= rel_modifier
    
    # Charisma affects prices by ±10%
    charisma_modifier = 1.1 - (character.attributes.charisma / 200)
    price_modifier *= charisma_modifier
    
    # Get shop inventory
    shop_inventory = Item.query.filter_by(owner_id=npc.id).all()
    
    # Group items by type
    weapons = []
    armor = []
    consumables = []
    other_items = []
    
    for item in shop_inventory:
        # Apply price modifier
        if hasattr(item, 'properties') and item.properties:
            props = json.loads(item.properties)
            if 'value' in props:
                props['sale_price'] = int(props['value'] * price_modifier)
                props['buy_price'] = int(props['value'] * 0.5)  # Shop buys at 50%
                item.properties = json.dumps(props)
        
        if item.item_type == 'weapon':
            weapons.append(item)
        elif item.item_type == 'armor':
            armor.append(item)
        elif item.item_type == 'consumable':
            consumables.append(item)
        else:
            other_items.append(item)
    
    # Get character inventory
    character_inventory = CharacterInventory.query.filter_by(character_id=character.id).first()
    if not character_inventory:
        character_inventory = CharacterInventory(character_id=character.id)
        db.session.add(character_inventory)
        db.session.commit()
    
    return render_template('game/shop.html',
                          character=character,
                          npc=npc,
                          weapons=weapons,
                          armor=armor,
                          consumables=consumables,
                          other_items=other_items,
                          character_inventory=character_inventory,
                          price_modifier=price_modifier)


# API endpoints for game state updates

@game_bp.route('/api/move', methods=['POST'])
@login_required
def move_character():
    """Update character position"""
    if not current_user.active_character_id:
        return jsonify({"error": "No active character"}), 404
    
    data = request.json
    x = data.get('x')
    y = data.get('y')
    region_id = data.get('region_id')
    
    if not all([x is not None, y is not None, region_id]):
        return jsonify({"error": "Missing position data"}), 400
    
    # Get world state
    world_state = WorldState.query.filter_by(
        character_id=current_user.active_character_id,
        region_id=region_id
    ).first()
    
    if not world_state:
        return jsonify({"error": "Region not found"}), 404
    
    # Update position
    world_state.position_x = x
    world_state.position_y = y
    db.session.commit()
    
    # Check for location discovery
    locations = Location.query.filter_by(region_id=region_id).all()
    discovered_locations = json.loads(world_state.discovered_locations or '[]')
    newly_discovered = []
    
    for location in locations:
        # Check if within discovery range (distance < 2)
        dist = ((location.x_coord - x) ** 2 + (location.y_coord - y) ** 2) ** 0.5
        if dist < 2 and location.id not in discovered_locations:
            discovered_locations.append(location.id)
            newly_discovered.append(location)
    
    if newly_discovered:
        world_state.discovered_locations = json.dumps(discovered_locations)
        db.session.commit()
    
    # Return updated position and any discoveries
    return jsonify({
        "position": {
            "x": x,
            "y": y
        },
        "discoveries": [loc.to_dict() for loc in newly_discovered]
    })

@game_bp.route('/api/quest/<int:quest_id>/progress', methods=['POST'])
@login_required
def update_quest_progress(quest_id):
    """Update quest progress"""
    if not current_user.active_character_id:
        return jsonify({"error": "No active character"}), 404
    
    data = request.json
    step = data.get('step')
    completed = data.get('completed', False)
    
    # Get quest progress
    progress = QuestProgress.query.filter_by(
        character_id=current_user.active_character_id,
        quest_id=quest_id
    ).first()
    
    if not progress:
        return jsonify({"error": "Quest not found"}), 404
    
    # Update progress
    if completed:
        progress.status = 'completed'
        progress.completion_date = datetime.utcnow()
        
        # Award rewards
        quest = Quest.query.get(quest_id)
        character = Character.query.get(current_user.active_character_id)
        
        character.add_xp(quest.xp_reward)
        character.gold += quest.gold_reward
        
        # Add reward items to inventory
        inventory = CharacterInventory.query.filter_by(character_id=character.id).first()
        if not inventory:
            inventory = CharacterInventory(character_id=character.id)
            db.session.add(inventory)
            db.session.flush()
        
        # Add reward items
        for template in quest.reward_items:
            item = Item(
                template_id=template.id,
                name=template.name,
                description=template.description,
                item_type=template.item_type,
                rarity=template.rarity,
                properties=template.properties
            )
            db.session.add(item)
            db.session.flush()
            inventory.add_item(item)
    elif step:
        progress.current_step = step
    
    db.session.commit()
    
    return jsonify({
        "quest_id": quest_id,
        "status": progress.status,
        "current_step": progress.current_step,
        "completion_date": progress.completion_date.isoformat() if progress.completion_date else None
    })

@game_bp.route('/api/combat/start', methods=['POST'])
@login_required
def start_combat():
    """Initiate combat encounter"""
    if not current_user.active_character_id:
        return jsonify({"error": "No active character"}), 404
    
    data = request.json
    enemy_type = data.get('enemy_type')
    
    if not enemy_type:
        return jsonify({"error": "Missing enemy type"}), 400
    
    character = Character.query.get(current_user.active_character_id)
    
    # Get character's current region
    current_world_state = WorldState.query.filter_by(
        character_id=character.id
    ).order_by(WorldState.discovery_date.desc()).first()
    
    if not current_world_state:
        return jsonify({"error": "No current region"}), 400
    
    current_region = Region.query.get(current_world_state.region_id)
    
    # Generate enemy
    enemy = combat_manager.generate_combat_encounter(current_region, character.level)
    
    # Initialize combat in session
    session['combat'] = {
        'enemy': enemy,
        'character_id': character.id,
        'round': 1,
        'character_hp': character.attributes.health,
        'enemy_hp': enemy['health'],
        'status': 'active',
        'log': [f"Combat with {enemy['name']} begins!"]
    }
    
    return jsonify(session['combat'])

@game_bp.route('/api/combat/action', methods=['POST'])
@login_required
def combat_action():
    """Process combat action"""
    if 'combat' not in session or session['combat']['status'] != 'active':
        return jsonify({"error": "No active combat"}), 400
    
    data = request.json
    action = data.get('action')
    
    if not action:
        return jsonify({"error": "Missing action"}), 400
    
    character = Character.query.get(current_user.active_character_id)
    combat_data = session['combat']
    
    # Process action
    result = combat_manager.process_action(action, character, combat_data['enemy'], 'enemy')
    
    # Update combat state
    combat_data['character_hp'] = result['character_hp']
    combat_data['enemy_hp'] = result['enemy_hp']
    combat_data['log'].append(result['log'])
    combat_data['round'] += 1
    
    # Check for end of combat
    if combat_data['character_hp'] <= 0:
        combat_data['status'] = 'defeat'
        combat_data['log'].append(f"You have been defeated by {combat_data['enemy']['name']}!")
        
        # Handle defeat
        character.attributes.health = 1  # Avoid actual death
        db.session.commit()
    
    elif combat_data['enemy_hp'] <= 0:
        combat_data['status'] = 'victory'
        combat_data['log'].append(f"You have defeated {combat_data['enemy']['name']}!")
        
        # Calculate rewards
        rewards = combat_manager.calculate_rewards(character, combat_data['enemy'])
        combat_data['rewards'] = rewards
        
        # Apply rewards
        character.add_xp(rewards['xp'])
        character.gold += rewards['gold']
        
        # Add items to inventory
        if rewards['items']:
            inventory = CharacterInventory.query.filter_by(character_id=character.id).first()
            if not inventory:
                inventory = CharacterInventory(character_id=character.id)
                db.session.add(inventory)
                db.session.flush()
            
            for item_name in rewards['items']:
                # Check if there's a template for this item
                template = ItemTemplate.query.filter_by(name=item_name).first()
                
                if template:
                    # Create item from template
                    item = Item(
                        template_id=template.id,
                        name=template.name,
                        description=template.description,
                        item_type=template.item_type,
                        rarity=template.rarity,
                        properties=template.properties
                    )
                else:
                    # Create basic item
                    item = Item(
                        name=item_name,
                        description=f"A {item_name} dropped by {combat_data['enemy']['name']}",
                        item_type='misc',
                        rarity='common',
                        properties=json.dumps({"value": 1})
                    )
                
                db.session.add(item)
                db.session.flush()
                inventory.add_item(item)
        
        db.session.commit()
    
    # Update session
    session['combat'] = combat_data
    session.modified = True
    
    return jsonify(combat_data)