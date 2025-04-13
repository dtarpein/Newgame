from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
import json
from datetime import datetime

from app import db
from models.character import Character, CharacterAttributes, CharacterInventory, CharacterSkill
from models.item import Item, ItemTemplate

character_bp = Blueprint('character', __name__, url_prefix='/character')

@character_bp.route('/')
@login_required
def character_select():
    """Character selection page"""
    # Get all characters for the current user
    characters = Character.query.filter_by(user_id=current_user.id).all()
    
    # Check if user has any characters
    if not characters:
        # Redirect to character creation if no characters
        return redirect(url_for('character.character_create'))
    
    return render_template('character/select.html', 
                          characters=characters, 
                          active_character_id=current_user.active_character_id)

@character_bp.route('/create', methods=['GET', 'POST'])
@login_required
def character_create():
    """Character creation page"""
    if request.method == 'POST':
        # Get form data
        name = request.form.get('name')
        character_class = request.form.get('character_class')
        
        # Validate input
        if not name or not character_class:
            flash('Please fill in all required fields.', 'error')
            return render_template('character/create.html')
        
        # Load appearance data if provided
        appearance = {}
        for key in ['hair_style', 'hair_color', 'skin_tone', 'eye_color', 'face_style']:
            if key in request.form:
                appearance[key] = request.form.get(key)
        
        # Create character
        character = Character(
            user_id=current_user.id,
            name=name,
            character_class=character_class,
            appearance=json.dumps(appearance)
        )
        
        # Add to database
        db.session.add(character)
        db.session.flush()  # Flush to get ID without committing
        
        # Create character attributes
        from config import STARTING_ATTRIBUTES, CHARACTER_CLASSES
        attributes = STARTING_ATTRIBUTES.copy()
        
        # Apply class-specific attribute bonuses
        if character_class in CHARACTER_CLASSES:
            class_bonuses = CHARACTER_CLASSES[character_class].get('attribute_bonuses', {})
            for attr, bonus in class_bonuses.items():
                if attr in attributes:
                    attributes[attr] += bonus
        
        character_attributes = CharacterAttributes(
            character_id=character.id,
            health=attributes['health'],
            max_health=attributes['max_health'],
            mana=attributes['mana'],
            max_mana=attributes['max_mana'],
            strength=attributes['strength'],
            intelligence=attributes['intelligence'],
            agility=attributes['agility'],
            charisma=attributes['charisma']
        )
        
        db.session.add(character_attributes)
        
        # Create inventory
        inventory = CharacterInventory(character_id=character.id)
        db.session.add(inventory)
        
        # Add starting skills
        if character_class in CHARACTER_CLASSES:
            starting_skills = CHARACTER_CLASSES[character_class].get('starting_skills', [])
            for skill_name in starting_skills:
                skill = CharacterSkill(
                    character_id=character.id,
                    skill_name=skill_name,
                    skill_level=1,
                    skill_type='ability',
                    skill_description=f"A basic {skill_name} skill",
                    skill_effect=json.dumps({"type": skill_name})
                )
                db.session.add(skill)
        
        # Add starting items
        if character_class in CHARACTER_CLASSES:
            starting_items = CHARACTER_CLASSES[character_class].get('starting_items', [])
            for item_code in starting_items:
                # Find template
                from config import STARTER_ITEMS
                item_data = None
                for starter_item in STARTER_ITEMS:
                    if starter_item['code'] == item_code:
                        item_data = starter_item
                        break
                
                if item_data:
                    # Check if template exists in database
                    template = ItemTemplate.query.filter_by(code=item_code).first()
                    
                    if not template:
                        # Create template if it doesn't exist
                        template = ItemTemplate(
                            name=item_data['name'],
                            code=item_data['code'],
                            description=item_data['description'],
                            item_type=item_data['item_type'],
                            subtype=item_data['subtype'],
                            rarity=item_data['rarity'],
                            properties=json.dumps(item_data['properties'])
                        )
                        db.session.add(template)
                        db.session.flush()
                    
                    # Create item instance
                    item = Item(
                        template_id=template.id,
                        name=template.name,
                        description=template.description,
                        item_type=template.item_type,
                        subtype=template.subtype,
                        rarity=template.rarity,
                        properties=template.properties
                    )
                    db.session.add(item)
                    db.session.flush()
                    
                    # Add to inventory
                    inventory.items.append(item)
        
        # Commit all changes
        db.session.commit()
        
        # Set as active character
        current_user.active_character_id = character.id
        db.session.commit()
        
        flash(f'Character {name} created successfully!', 'success')
        return redirect(url_for('game.game_home'))
    
    # Get character classes from config
    from config import CHARACTER_CLASSES
    return render_template('character/create.html', character_classes=CHARACTER_CLASSES)

@character_bp.route('/select/<int:character_id>')
@login_required
def select_character(character_id):
    """Select character as active"""
    # Verify character belongs to user
    character = Character.query.filter_by(id=character_id, user_id=current_user.id).first()
    
    if not character:
        flash('Character not found.', 'error')
        return redirect(url_for('character.character_select'))
    
    # Set as active character
    current_user.active_character_id = character_id
    db.session.commit()
    
    # Update last played time
    character.last_played = datetime.utcnow()
    db.session.commit()
    
    return redirect(url_for('game.game_home'))

@character_bp.route('/detail/<int:character_id>')
@login_required
def character_detail(character_id):
    """Character detail page"""
    # Verify character belongs to user
    character = Character.query.filter_by(id=character_id, user_id=current_user.id).first()
    
    if not character:
        flash('Character not found.', 'error')
        return redirect(url_for('character.character_select'))
    
    return render_template('character/detail.html', character=character)

@character_bp.route('/delete/<int:character_id>', methods=['POST'])
@login_required
def delete_character(character_id):
    """Delete a character"""
    # Verify character belongs to user
    character = Character.query.filter_by(id=character_id, user_id=current_user.id).first()
    
    if not character:
        flash('Character not found.', 'error')
        return redirect(url_for('character.character_select'))
    
    # Confirmation check
    confirm = request.form.get('confirm')
    if not confirm or confirm.lower() != character.name.lower():
        flash('Please type the character name to confirm deletion.', 'error')
        return redirect(url_for('character.character_detail', character_id=character_id))
    
    # Check if this is the active character
    if current_user.active_character_id == character_id:
        current_user.active_character_id = None
        db.session.commit()
    
    # Delete the character
    character_name = character.name
    db.session.delete(character)
    db.session.commit()
    
    flash(f'Character {character_name} has been deleted.', 'success')
    return redirect(url_for('character.character_select'))

# API endpoints for character data

@character_bp.route('/api/character/<int:character_id>')
@login_required
def get_character_data(character_id):
    """Get character data as JSON"""
    # Verify character belongs to user
    character = Character.query.filter_by(id=character_id, user_id=current_user.id).first()
    
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    return jsonify(character.to_dict())

@character_bp.route('/api/character/<int:character_id>/attributes')
@login_required
def get_character_attributes(character_id):
    """Get character attributes as JSON"""
    # Verify character belongs to user
    character = Character.query.filter_by(id=character_id, user_id=current_user.id).first()
    
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    return jsonify(character.attributes.to_dict() if character.attributes else {})

@character_bp.route('/api/character/<int:character_id>/inventory')
@login_required
def get_character_inventory(character_id):
    """Get character inventory as JSON"""
    # Verify character belongs to user
    character = Character.query.filter_by(id=character_id, user_id=current_user.id).first()
    
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    inventory = CharacterInventory.query.filter_by(character_id=character_id).first()
    
    if not inventory:
        return jsonify({"error": "Inventory not found"}), 404
    
    return jsonify(inventory.to_dict())

@character_bp.route('/api/character/<int:character_id>/skills')
@login_required
def get_character_skills(character_id):
    """Get character skills as JSON"""
    # Verify character belongs to user
    character = Character.query.filter_by(id=character_id, user_id=current_user.id).first()
    
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    skills = CharacterSkill.query.filter_by(character_id=character_id).all()
    skills_data = [skill.to_dict() for skill in skills]
    
    return jsonify(skills_data)

@character_bp.route('/api/character/<int:character_id>/add-skill', methods=['POST'])
@login_required
def add_character_skill(character_id):
    """Add a new skill to character"""
    # Verify character belongs to user
    character = Character.query.filter_by(id=character_id, user_id=current_user.id).first()
    
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    data = request.json
    skill_name = data.get('skill_name')
    skill_level = data.get('skill_level', 1)
    skill_type = data.get('skill_type')
    skill_description = data.get('skill_description')
    skill_effect = data.get('skill_effect', {})
    
    if not skill_name or not skill_type:
        return jsonify({"error": "Missing required fields"}), 400
    
    # Check if skill already exists
    existing_skill = CharacterSkill.query.filter_by(character_id=character_id, skill_name=skill_name).first()
    
    if existing_skill:
        # Update existing skill
        existing_skill.skill_level = skill_level
        existing_skill.skill_description = skill_description or existing_skill.skill_description
        existing_skill.skill_effect = json.dumps(skill_effect) if skill_effect else existing_skill.skill_effect
        db.session.commit()
        
        return jsonify({"message": "Skill updated successfully", "skill": existing_skill.to_dict()})
    
    # Create new skill
    new_skill = CharacterSkill(
        character_id=character_id,
        skill_name=skill_name,
        skill_level=skill_level,
        skill_type=skill_type,
        skill_description=skill_description,
        skill_effect=json.dumps(skill_effect)
    )
    
    db.session.add(new_skill)
    db.session.commit()
    
    return jsonify({"message": "Skill added successfully", "skill": new_skill.to_dict()})