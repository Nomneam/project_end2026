from flask import Blueprint, render_template, request, jsonify
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime

load_dotenv()

advertising_revenue_bp = Blueprint('advertising_revenue', __name__)

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
@advertising_revenue_bp.route('/advertising-revenue')
def advertising_revenue_page():
    return render_template('owner/Advertising-revenue.html')


# ======================================================
# 2) SUMMARY (รายได้รวมทั้งปี)
# ======================================================
@advertising_revenue_bp.route('/api/owner/advertising-revenue/summary')
def api_advertising_revenue_summary():
    try:
        year = int(request.args.get("year", datetime.now().year))
    except (ValueError, TypeError):
        year = datetime.now().year

    conn = connect_db()
    with conn.cursor() as cur:

        cur.execute("""
            SELECT 
                COALESCE(SUM(adv_price),0) AS total_revenue,
                COUNT(*) AS total_orders
            FROM advert
            WHERE YEAR(created_at) = %s
              AND status IN ('approved','running','expired')
              AND del_flg = 0
        """, (year,))
        summary = cur.fetchone()

        cur.execute("""
            SELECT c.adc_cat_name,
                   COALESCE(SUM(a.adv_price),0) AS total
            FROM advert a
            JOIN advert_category c 
                ON a.adc_cat_id = c.adc_cat_id
            WHERE YEAR(a.created_at) = %s
              AND a.status IN ('approved','running','expired')
              AND a.del_flg = 0
            GROUP BY c.adc_cat_id
            ORDER BY total DESC
            LIMIT 1
        """, (year,))
        top_cat = cur.fetchone()

    conn.close()

    return jsonify(success=True, data={
        "totalRevenue": float(summary["total_revenue"] or 0),
        "totalOrders": summary["total_orders"] or 0,
        "topCategory": top_cat["adc_cat_name"] if top_cat else "-"
    })


# ======================================================
# 3) MONTHLY (รายได้รายเดือน)
# ======================================================
@advertising_revenue_bp.route('/api/owner/advertising-revenue/monthly')
def api_advertising_revenue_monthly():
    try:
        year = int(request.args.get("year", datetime.now().year))
    except (ValueError, TypeError):
        year = datetime.now().year

    conn = connect_db()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
                MONTH(created_at) AS month,
                COALESCE(SUM(adv_price),0) AS total
            FROM advert
            WHERE YEAR(created_at) = %s
              AND status IN ('approved','running','expired')
              AND del_flg = 0
            GROUP BY MONTH(created_at)
        """, (year,))
        rows = cur.fetchall()
    conn.close()

    data = {m: 0 for m in range(1, 13)}
    for r in rows:
        data[r["month"]] = float(r["total"])

    return jsonify(success=True, data=data)


# ======================================================
# 4) BY CATEGORY (รายได้ตามประเภท)
# ======================================================
@advertising_revenue_bp.route('/api/owner/advertising-revenue/by-category')
def api_advertising_revenue_by_category():
    try:
        year = int(request.args.get("year", datetime.now().year))
    except (ValueError, TypeError):
        year = datetime.now().year

    conn = connect_db()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT c.adc_cat_name,
                   COALESCE(SUM(a.adv_price),0) AS total
            FROM advert a
            JOIN advert_category c 
                ON a.adc_cat_id = c.adc_cat_id
            WHERE YEAR(a.created_at) = %s
              AND a.status IN ('approved','running','expired')
              AND a.del_flg = 0
            GROUP BY c.adc_cat_id
            ORDER BY total DESC
        """, (year,))
        rows = cur.fetchall()
    conn.close()

    return jsonify(success=True, data=[
        {"label": r["adc_cat_name"], "value": float(r["total"])}
        for r in rows
    ])


# ======================================================
# 5) COMPARE BY TYPE (รายได้รายเดือนแยกประเภท)
# ======================================================
@advertising_revenue_bp.route('/api/owner/advertising-revenue/compare-by-type')
def api_compare_revenue_by_type():
    try:
        year = int(request.args.get("year", datetime.now().year))
    except (ValueError, TypeError):
        year = datetime.now().year

    conn = connect_db()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
                MONTH(a.created_at) AS month,
                c.adc_cat_name AS type,
                COALESCE(SUM(a.adv_price),0) AS total
            FROM advert a
            JOIN advert_category c 
                ON a.adc_cat_id = c.adc_cat_id
            WHERE YEAR(a.created_at) = %s
              AND a.status IN ('approved','running','expired')
              AND a.del_flg = 0
            GROUP BY MONTH(a.created_at), c.adc_cat_id
        """, (year,))
        rows = cur.fetchall()
    conn.close()

    result = {}

    for r in rows:
        month = r["month"]
        ad_type = r["type"]

        if ad_type not in result:
            result[ad_type] = {m: 0 for m in range(1, 13)}

        result[ad_type][month] = float(r["total"])

    return jsonify(success=True, data=result)
