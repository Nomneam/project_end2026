# dashboard_owner.py
from flask import Blueprint, render_template, session, jsonify, request
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors

load_dotenv()

def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor
    )

dashboard_owner_bp = Blueprint('dashboard_owner', __name__)

@dashboard_owner_bp.route('/dashboard/owner')
def owner_dashboard():
    if 'user' not in session or session['user']['role_id'] != 3:
        return "Forbidden", 403
    return render_template('owner/owner-dashboard.html')


# =========================
# API: Owner Dashboard
# =========================
@dashboard_owner_bp.route('/api/owner/dashboard')
def api_owner_dashboard():
    if 'user' not in session or session['user']['role_id'] != 3:
        return jsonify(success=False, message="Forbidden"), 403

    conn = connect_db()
    try:
        with conn.cursor() as cur:

            # ===== รายรับเดือนนี้ =====
            cur.execute("""
                SELECT IFNULL(SUM(total_amount),0) AS total
                FROM advert_order
                WHERE order_status IN ('paid','active','completed')
                  AND MONTH(start_date) = MONTH(CURDATE())
                  AND YEAR(start_date) = YEAR(CURDATE())
            """)
            revenue_month = cur.fetchone()["total"] or 0

            # ===== จำนวนพนักงาน =====
            cur.execute("SELECT COUNT(*) AS total FROM employee WHERE del_flg = 0")
            total_emp = cur.fetchone()["total"] or 0

            # ===== จำนวน Role =====
            cur.execute("SELECT COUNT(*) AS total FROM role WHERE del_flg = 0")
            total_role = cur.fetchone()["total"] or 0

            # ===== รายรับแยกตามประเภทโฆษณา =====
            cur.execute("""
                SELECT c.adc_cat_name AS name, IFNULL(SUM(o.total_amount),0) AS total
                FROM advert_category c
                LEFT JOIN advert_order o 
                  ON o.adc_cat_id = c.adc_cat_id
                 AND o.order_status IN ('paid','active','completed')
                GROUP BY c.adc_cat_id, c.adc_cat_name
                ORDER BY total DESC
            """)
            revenue_by_cat = cur.fetchall() or []

            # ===== จำนวนพนักงานแยกตาม Role =====
            cur.execute("""
                SELECT r.role_name AS name, COUNT(e.emp_id) AS total
                FROM role r
                LEFT JOIN employee e 
                  ON r.role_id = e.role_id 
                 AND e.del_flg = 0
                WHERE r.del_flg = 0
                GROUP BY r.role_id, r.role_name
                ORDER BY total DESC
            """)
            emp_by_role = cur.fetchall() or []

            # ===== รายชื่อพนักงาน + สถานะออนไลน์/ออฟไลน์ =====
            cur.execute("""
                SELECT 
                    e.emp_id,
                    CONCAT(e.emp_fname, ' ', e.emp_lname) AS fullname,
                    r.role_name,
                    CASE 
                        WHEN al.action = 'Login' THEN 'online'
                        ELSE 'offline'
                    END AS status
                FROM employee e
                LEFT JOIN role r 
                    ON e.role_id = r.role_id
                LEFT JOIN (
                    SELECT t.emp_id, t.action
                    FROM audit_logs_emp t
                    INNER JOIN (
                        SELECT emp_id, MAX(created_at) AS last_time
                        FROM audit_logs_emp
                        GROUP BY emp_id
                    ) x 
                      ON t.emp_id = x.emp_id 
                     AND t.created_at = x.last_time
                ) al 
                  ON e.emp_id = al.emp_id
                WHERE e.del_flg = 0
                ORDER BY e.created_at DESC
                LIMIT 5
            """)
            employees = cur.fetchall() or []

            # ===== จำนวนลูกค้า =====
            cur.execute("SELECT COUNT(*) AS total FROM customer WHERE del_flg = 0")
            total_customer = cur.fetchone()["total"] or 0

            # ===== จำนวนข่าวเดือนปัจจุบัน =====
            cur.execute("""
                SELECT COUNT(*) AS total
                FROM news
                WHERE del_flg = 0
                  AND status = 'publish'
                  AND YEAR(created_at) = YEAR(CURDATE())
                  AND MONTH(created_at) = MONTH(CURDATE())
            """)
            total_news_month = cur.fetchone()["total"] or 0

            # ===== จำนวนประเภทข่าวทั้งหมด =====
            cur.execute("SELECT COUNT(*) AS total FROM news_category WHERE del_flg = 0")
            total_news_category = cur.fetchone()["total"] or 0

            # ===== ประเภทข่าวที่มีข่าวมากที่สุด =====
            cur.execute("""
                SELECT 
                    c.cat_name AS category_name,
                    COUNT(n.news_id) AS total
                FROM news_category c
                LEFT JOIN news n 
                  ON c.cat_id = n.cat_id
                 AND n.del_flg = 0
                 AND n.status = 'publish'
                GROUP BY c.cat_id, c.cat_name
                ORDER BY total DESC
                LIMIT 3
            """)
            news_by_category = cur.fetchall() or []

            # ===== จำนวนโฆษณาที่ Approve เดือนนี้ =====
            cur.execute("""
                SELECT COUNT(*) AS total
                FROM advert
                WHERE del_flg = 0
                  AND status = 'approved'
                  AND YEAR(created_at) = YEAR(CURDATE())
                  AND MONTH(created_at) = MONTH(CURDATE())
            """)
            total_ads_approved_month = cur.fetchone()["total"] or 0

        return jsonify(
            success=True,
            revenue_month=revenue_month,
            total_ads_approved_month=total_ads_approved_month,
            total_emp=total_emp,
            total_customer=total_customer,
            total_role=total_role,
            total_news_month=total_news_month,
            total_news_category=total_news_category,
            revenue_by_cat=revenue_by_cat,
            emp_by_role=emp_by_role,
            employees=employees,
            news_by_category=news_by_category
        )

    finally:
        conn.close()





