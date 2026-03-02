# dashboard_admin.py
from flask import Blueprint, render_template, session ,redirect, url_for , jsonify ,request
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from math import ceil
from datetime import datetime



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

    if user.get("role_id") != 1:
        return "Forbidden", 403

    page = int(request.args.get("page", 1))
    per_page = 5
    offset = (page - 1) * per_page
    
    current_month = datetime.now().month
    thai_months = [
        "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ]


    connection = connect_db()

    try:
        with connection.cursor() as cursor:

            # =============================
            # 5 โฆษณาล่าสุด
            # =============================
            cursor.execute("""
                SELECT adv_name, status, created_at 
                FROM advert 
                WHERE del_flg = 0 
                ORDER BY created_at DESC 
                LIMIT 5
            """)
            adverts = cursor.fetchall()

            # =============================
            # นับสถานะโฆษณา
            # =============================
            cursor.execute("""
                SELECT COUNT(*) as count 
                FROM advert 
                WHERE status = 'expired' AND del_flg = 0
            """)
            expired_ads_count = cursor.fetchone()['count']

            cursor.execute("""
                SELECT COUNT(*) as count 
                FROM advert 
                WHERE status = 'draft' AND del_flg = 0
            """)
            pending_ads_count = cursor.fetchone()['count']

            cursor.execute("""
                SELECT COUNT(*) as count 
                FROM advert 
                WHERE status IN ('approved', 'running')
                AND del_flg = 0
            """)

            published_ads_count = cursor.fetchone()['count']

            # =============================
            # นับพนักงานทั้งหมด
            # =============================
            cursor.execute("""
                SELECT COUNT(*) as total
                FROM employee
                WHERE del_flg = 0
            """)
            total_staff = cursor.fetchone()["total"]

            # =============================
            # นับจำนวนออนไลน์
            # =============================
            cursor.execute("""
                SELECT COUNT(*) as total
                FROM employee e
                JOIN (
                    SELECT emp_id, action
                    FROM audit_logs_emp a1
                    WHERE DATE(created_at) = CURDATE()
                      AND action IN ('Login','Logout')
                      AND created_at = (
                          SELECT MAX(a2.created_at)
                          FROM audit_logs_emp a2
                          WHERE a2.emp_id = a1.emp_id
                            AND DATE(a2.created_at) = CURDATE()
                            AND a2.action IN ('Login','Logout')
                      )
                ) last_log ON last_log.emp_id = e.emp_id
                WHERE last_log.action = 'Login'
                  AND e.del_flg = 0
            """)
            total_online = cursor.fetchone()["total"]

            total_pages = ceil(total_online / per_page) if total_online > 0 else 1

            # =============================
            # ดึงพนักงานออนไลน์แบบแบ่งหน้า
            # =============================
            cursor.execute("""
                SELECT e.emp_id, e.emp_fname, e.emp_lname, 
                       e.emp_email, e.role_id
                FROM employee e
                JOIN (
                    SELECT emp_id, action
                    FROM audit_logs_emp a1
                    WHERE DATE(created_at) = CURDATE()
                      AND action IN ('Login','Logout')
                      AND created_at = (
                          SELECT MAX(a2.created_at)
                          FROM audit_logs_emp a2
                          WHERE a2.emp_id = a1.emp_id
                            AND DATE(a2.created_at) = CURDATE()
                            AND a2.action IN ('Login','Logout')
                      )
                ) last_log ON last_log.emp_id = e.emp_id
                WHERE last_log.action = 'Login'
                  AND e.del_flg = 0
                LIMIT %s OFFSET %s
            """, (per_page, offset))

            online_employees = cursor.fetchall()

            # =============================
            # คำนวณ Offline
            # =============================
            offline_count = max(total_staff - total_online, 0)

    finally:
        connection.close()

    return render_template(
        'admin/admin-dashboard.html',
        adverts=adverts,
        online_employees=online_employees,
        page=page,
        total_pages=total_pages,
        online_count=total_online,
        offline_count=offline_count,
        total_staff=total_staff,
        pending_ads_count=pending_ads_count,
        published_ads_count=published_ads_count,
        expired_ads_count=expired_ads_count,
        current_month=current_month,
        thai_months=thai_months
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


@dashboard_admin_bp.route("/admin/ads-status-by-month")
def ads_status_by_month():

    user = session.get("user")
    if not user or user.get("role_id") != 1:
        return jsonify(success=False, message="Unauthorized"), 401

    month = request.args.get("month", type=int)
    year = request.args.get("year", type=int) or datetime.now().year

    # ตรวจสอบเดือน
    if not month or month < 1 or month > 12:
        return jsonify(success=False, message="Invalid month"), 400

    connection = connect_db()

    try:
        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT 
                    COALESCE(SUM(CASE WHEN status IN ('approved','running') THEN 1 END), 0) AS approved,
                    COALESCE(SUM(CASE WHEN status='draft' THEN 1 END), 0) AS pending,
                    COALESCE(SUM(CASE WHEN status='expired' THEN 1 END), 0) AS expired
                FROM advert
                WHERE del_flg = 0
                  AND MONTH(created_at) = %s
                  AND YEAR(created_at) = %s
            """, (month, year))

            result = cursor.fetchone() or {}

            return jsonify({
                "success": True,
                "approved": result.get("approved", 0),
                "pending": result.get("pending", 0),
                "expired": result.get("expired", 0),
                "month": month,
                "year": year
            })

    except Exception as e:
        return jsonify(success=False, message=str(e)), 500

    finally:
        connection.close()