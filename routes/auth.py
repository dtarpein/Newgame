from flask import Blueprint, render_template, redirect, url_for, flash, request, session
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

from app import db
from models.user import User

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """User login page"""
    if current_user.is_authenticated:
        return redirect(url_for('game.game_home'))
    
    if request.method == 'POST':
        # Get form data
        username = request.form.get('username')
        password = request.form.get('password')
        remember = True if request.form.get('remember') else False
        
        # Validate input
        if not username or not password:
            flash('Please enter both username and password.', 'error')
            return render_template('auth/login.html')
        
        # Find user
        user = User.query.filter_by(username=username).first()
        
        # Check if user exists and password is correct
        if not user or not user.check_password(password):
            flash('Invalid username or password. Please try again.', 'error')
            return render_template('auth/login.html')
        
        # Login user
        login_user(user, remember=remember)
        
        # Update last login time
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Redirect to previous page or default
        next_page = request.args.get('next')
        if not next_page or next_page.startswith('/'):
            next_page = url_for('game.game_home')
        
        return redirect(next_page)
    
    return render_template('auth/login.html')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """User registration page"""
    if current_user.is_authenticated:
        return redirect(url_for('game.game_home'))
    
    if request.method == 'POST':
        # Get form data
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        password_confirm = request.form.get('password_confirm')
        
        # Validate input
        if not username or not email or not password:
            flash('Please fill in all required fields.', 'error')
            return render_template('auth/register.html')
        
        if password != password_confirm:
            flash('Passwords do not match.', 'error')
            return render_template('auth/register.html')
        
        # Check if username or email already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('Username already exists. Please choose another.', 'error')
            return render_template('auth/register.html')
        
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            flash('Email already registered. Please use another or log in.', 'error')
            return render_template('auth/register.html')
        
        # Create new user
        new_user = User(username=username, email=email, password=password)
        
        # Add to database
        db.session.add(new_user)
        db.session.commit()
        
        flash('Registration successful! You can now log in.', 'success')
        return redirect(url_for('auth.login'))
    
    return render_template('auth/register.html')

@auth_bp.route('/logout')
@login_required
def logout():
    """Log out the current user"""
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@auth_bp.route('/profile')
@login_required
def profile():
    """User profile page"""
    return render_template('auth/profile.html', user=current_user)

@auth_bp.route('/profile/edit', methods=['GET', 'POST'])
@login_required
def edit_profile():
    """Edit user profile"""
    if request.method == 'POST':
        # Get form data
        email = request.form.get('email')
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        new_password_confirm = request.form.get('new_password_confirm')
        
        # Update email if changed
        if email and email != current_user.email:
            # Check if email already in use
            existing_email = User.query.filter_by(email=email).first()
            if existing_email:
                flash('Email already in use by another account.', 'error')
            else:
                current_user.email = email
                flash('Email updated successfully.', 'success')
        
        # Update password if provided
        if current_password and new_password:
            # Verify current password
            if not current_user.check_password(current_password):
                flash('Current password is incorrect.', 'error')
            elif new_password != new_password_confirm:
                flash('New passwords do not match.', 'error')
            else:
                current_user.set_password(new_password)
                flash('Password updated successfully.', 'success')
        
        # Save changes
        db.session.commit()
        
        return redirect(url_for('auth.profile'))
    
    return render_template('auth/edit_profile.html', user=current_user)

@auth_bp.route('/reset-password', methods=['GET', 'POST'])
def reset_password_request():
    """Request password reset"""
    if current_user.is_authenticated:
        return redirect(url_for('game.game_home'))
    
    if request.method == 'POST':
        email = request.form.get('email')
        
        if not email:
            flash('Please enter your email address.', 'error')
            return render_template('auth/reset_password_request.html')
        
        user = User.query.filter_by(email=email).first()
        
        if user:
            # TODO: Implement password reset email functionality
            flash('If your email is registered, you will receive password reset instructions.', 'info')
        else:
            # Don't reveal if email exists or not
            flash('If your email is registered, you will receive password reset instructions.', 'info')
        
        return redirect(url_for('auth.login'))
    
    return render_template('auth/reset_password_request.html')