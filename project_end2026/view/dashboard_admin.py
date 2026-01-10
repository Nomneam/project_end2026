# dashboard_admin.py
from flask import Blueprint, render_template, session

dashboard_admin_bp = Blueprint('dashboard_admin', __name__)

@dashboard_admin_bp.route('/dashboard/admin')
def admin_dashboard():
    if 'user' not in session or session['user']['role_id'] != 1:
        return "Forbidden", 403
    return render_template('admin-dashboard.html')
