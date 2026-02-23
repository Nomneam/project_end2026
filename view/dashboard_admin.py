# dashboard_admin.py
from flask import Blueprint, render_template, session ,redirect, url_for , jsonify
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors


# โหลด .env
load_dotenv()

# ฟังก์ชันเชื่อม DB
def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor
    )
    

dashboard_admin_bp = Blueprint('dashboard_admin', __name__)

@dashboard_admin_bp.route('/dashboard/admin')
def admin_dashboard():
    user = session.get("user")
    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))
    if session['user']['role_id'] != 1:
        return "Forbidden", 403

    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT emp_id, emp_fname, emp_lname, emp_code, emp_email, role_id 
                FROM employee 
                WHERE del_flg = 0
            """)
            employees = cursor.fetchall()

            cursor.execute("""
                SELECT adv_name, status, created_at 
                FROM advert 
                WHERE del_flg = 0 
                ORDER BY created_at DESC LIMIT 5
            """)
            adverts = cursor.fetchall()

            cursor.execute("SELECT COUNT(*) as count FROM advert WHERE status = 'submitted' AND del_flg = 0")
            pending_ads_count = cursor.fetchone()['count']

            cursor.execute("SELECT COUNT(*) as count FROM advert WHERE status = 'approved' AND del_flg = 0")
            published_ads_count = cursor.fetchone()['count']

            # =============================
            # 🔥 นับออนไลน์ / ออฟไลน์ วันนี้
            # =============================
            cursor.execute("""
                SELECT emp_id
                FROM employee
                WHERE del_flg = 0
            """)
            employees_all = cursor.fetchall()
            emp_ids = [e["emp_id"] for e in employees_all]
            total_staff = len(emp_ids)

            online_count = 0
            if emp_ids:
                cursor.execute("""
                    SELECT emp_id, action
                    FROM audit_logs_emp a1
                    WHERE DATE(created_at) = CURDATE()
                      AND action IN ('Login', 'Logout')
                      AND created_at = (
                          SELECT MAX(a2.created_at)
                          FROM audit_logs_emp a2
                          WHERE a2.emp_id = a1.emp_id
                            AND DATE(a2.created_at) = CURDATE()
                            AND a2.action IN ('Login', 'Logout')
                      )
                """)
                logs = cursor.fetchall()
                last_action_map = {row["emp_id"]: row["action"] for row in logs}

                for emp_id in emp_ids:
                    if last_action_map.get(emp_id) == "Login":
                        online_count += 1

            offline_count = total_staff - online_count

    finally:
        connection.close()

    return render_template(
        'admin/admin-dashboard.html',
        employees=employees,
        adverts=adverts,
        online_count=online_count,
        offline_count=offline_count,
        total_staff=total_staff,
        pending_ads_count=pending_ads_count,
        published_ads_count=published_ads_count 
    )




@dashboard_admin_bp.route('/admin/user-activity/today')
def api_dashboard_admin_user_activity_today():
    user = session.get("user")
    if not user or user.get("role_id") != 1:
        return jsonify(success=False, message="Unauthorized"), 401

    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT emp_id
                FROM employee
                WHERE del_flg = 0
            """)
            employees = cursor.fetchall()
            emp_ids = [e["emp_id"] for e in employees]
            total_staff = len(emp_ids)

            online_count = 0
            if emp_ids:
                cursor.execute("""
                    SELECT emp_id, action
                    FROM audit_logs_emp a1
                    WHERE DATE(created_at) = CURDATE()
                      AND action IN ('Login', 'Logout')
                      AND created_at = (
                          SELECT MAX(a2.created_at)
                          FROM audit_logs_emp a2
                          WHERE a2.emp_id = a1.emp_id
                            AND DATE(a2.created_at) = CURDATE()
                            AND a2.action IN ('Login', 'Logout')
                      )
                """)
                logs = cursor.fetchall()
                last_action_map = {row["emp_id"]: row["action"] for row in logs}

                for emp_id in emp_ids:
                    if last_action_map.get(emp_id) == "Login":
                        online_count += 1

            offline_count = total_staff - online_count

            return jsonify(
                success=True,
                online=online_count,
                offline=offline_count,
                total=total_staff
            )
    finally:
        connection.close()


