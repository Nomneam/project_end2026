# dashboard_owner.py
from flask import Blueprint, render_template, session

# ตั้งชื่อ blueprint แบบสั้นและชัดเจน
dashboard_owner_bp = Blueprint('dashboard_owner', __name__)

@dashboard_owner_bp.route('/dashboard/owner')
def owner_dashboard():
    if 'user' not in session or session['user']['role_id'] != 3:
        return "Forbidden", 403
    return render_template('owner-dashboard.html')
