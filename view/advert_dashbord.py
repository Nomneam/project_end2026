from flask import Blueprint, render_template, request, jsonify
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime

load_dotenv()

advert_dashbord_bp = Blueprint('advert_dashbord', __name__)

def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )

# ======================================================
# 1) หน้า Dashboard
# ======================================================
@advert_dashbord_bp.route('/advert-dashbord')
def advert_dashbord_page():
    return render_template('owner/advert-dashbord.html')


# ======================================================
# 2) API: ข้อมูล Dashboard
# ======================================================
@advert_dashbord_bp.route('/api/advert-dashboard')
def advert_dashboard_api():
    year = int(request.args.get('year', datetime.now().year))
    last_year = year - 1

    conn = connect_db()
    try:
        with conn.cursor() as cur:

            # =========================
            # KPI 1: โฆษณาทั้งหมดปีนี้
            # =========================
            cur.execute("""
                SELECT COUNT(*) AS total
                FROM advert
                WHERE YEAR(created_at) = %s
                  AND del_flg = 0
            """, (year,))
            total_ads_year = cur.fetchone()['total']

            # =========================
            # KPI 2: อนุมัติแล้ว
            # =========================
            cur.execute("""
                SELECT COUNT(*) AS total
                FROM advert
                WHERE YEAR(created_at) = %s
                  AND status IN ('approved','running','expired','paused')
                  AND del_flg = 0
            """, (year,))
            approved_ads = cur.fetchone()['total']

            # =========================
            # KPI 3: ยังไม่อนุมัติ
            # =========================
            cur.execute("""
                SELECT COUNT(*) AS total
                FROM advert
                WHERE YEAR(created_at) = %s
                  AND status IN ('draft','submitted')
                  AND del_flg = 0
            """, (year,))
            pending_ads = cur.fetchone()['total']

            # =========================
            # KPI 4: จำนวนประเภทโฆษณา
            # =========================
            cur.execute("""
                SELECT COUNT(DISTINCT adc_cat_id) AS total
                FROM advert
                WHERE del_flg = 0
            """)
            total_categories = cur.fetchone()['total']

            # ==================================================
            # กราฟ: ปีปัจจุบัน
            # ==================================================
            cur.execute("""
                SELECT MONTH(created_at) AS month,
                       COUNT(*) AS total
                FROM advert
                WHERE YEAR(created_at) = %s
                  AND del_flg = 0
                GROUP BY MONTH(created_at)
            """, (year,))
            current_data = cur.fetchall()

            current_map = {row['month']: row['total'] for row in current_data}
            monthly_current = [current_map.get(m, 0) for m in range(1, 13)]

            # ==================================================
            # กราฟ: ปีที่แล้ว
            # ==================================================
            cur.execute("""
                SELECT MONTH(created_at) AS month,
                       COUNT(*) AS total
                FROM advert
                WHERE YEAR(created_at) = %s
                  AND del_flg = 0
                GROUP BY MONTH(created_at)
            """, (last_year,))
            last_data = cur.fetchall()

            last_map = {row['month']: row['total'] for row in last_data}
            monthly_last = [last_map.get(m, 0) for m in range(1, 13)]

            # =========================
            # Top 5 ลูกค้า
            # =========================
            cur.execute("""
                SELECT 
                    c.cus_fname,
                    c.cus_lname,
                    COUNT(a.adv_id) AS total_ads,
                    IFNULL(SUM(a.adv_price),0) AS total_amount
                FROM advert a
                JOIN customer c ON a.cus_id = c.cus_id
                WHERE a.del_flg = 0
                AND a.status IN ('approved','running','paused','expired')
                GROUP BY a.cus_id
                ORDER BY total_ads DESC
                LIMIT 5
            """)
            top_customers = cur.fetchall()

        return jsonify({
            "kpi": {
                "totalAdsYear": total_ads_year,
                "approvedAds": approved_ads,
                "pendingAds": pending_ads,
                "totalCategories": total_categories
            },
            "monthlyAds": {
                "current": monthly_current,
                "last": monthly_last,
                "year": year,
                "lastYear": last_year
            },
            "topCustomers": top_customers
        })

    finally:
        conn.close()

# ======================================================
# 3) API: ดึงปีที่มีข้อมูลจริง
# ======================================================
@advert_dashbord_bp.route("/api/advert-years")
def get_advert_years():

    conn = connect_db()
    try:
        with conn.cursor() as cur:

            cur.execute("""
                SELECT DISTINCT YEAR(created_at) AS year
                FROM advert
                WHERE del_flg = 0
                ORDER BY year DESC
            """)

            rows = cur.fetchall()

            years = [row["year"] for row in rows if row["year"]]

        return jsonify({
            "years": years
        })

    finally:
        conn.close()

