from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_required, current_user

# Create the blueprint
admin_bp = Blueprint('admin', __name__)

# Admin routes
@admin_bp.route('/admin')
@login_required
def admin_panel():
    # Check if user has admin rights
    if not current_user.is_admin:
        flash('You do not have permission to access the admin panel')
        return redirect(url_for('main.index'))
    
    return render_template('admin/dashboard.html')

# Add more admin routes as needed