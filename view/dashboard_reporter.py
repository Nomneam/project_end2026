# dashboard_reporter.py
from flask import Blueprint, render_template, session

# ตั้งชื่อ blueprint แบบสั้นตรงกับ url_for
dashboard_reporter_bp = Blueprint('dashboard_reporter', __name__)

@dashboard_reporter_bp.route('/dashboard/reporter')
def reporter_dashboard():
    if 'user' not in session or session['user']['role_id'] != 2:
        return "Forbidden", 403
    return render_template('reporter-dashboard.html')
