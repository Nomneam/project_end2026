from flask import Blueprint, render_template, request, jsonify, session ,redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime

load_dotenv()

advert_review_bp = Blueprint('advert_review', __name__)

def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor
    )

@advert_review_bp.route('/ad-review')
def advert_review():
    user = session.get("user")
    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))
    conn = connect_db()
    try:
        with conn.cursor() as cur:
            # ----------------------------
            # โฆษณาที่รอตรวจสอบ (submitted)
            # ----------------------------
            cur.execute("""
                SELECT 
                    a.adv_id,
                    a.adv_name,
                    a.valid_from,
                    a.valid_to,
                    a.status,        
                    c.cus_fname,
                    c.cus_lname,
                    ar.advert_area_name,
                    ao.total_amount,
                    ac.adc_cat_name
                FROM advert a
                JOIN customer c ON a.cus_id = c.cus_id
                LEFT JOIN advert_order ao ON a.adv_id = ao.adv_id
                LEFT JOIN advert_area ar ON ao.advert_area_id = ar.advert_area_id
                LEFT JOIN advert_category ac ON a.adc_cat_id = ac.adc_cat_id
                WHERE a.status = 'submitted'
                  AND a.del_flg = 0
                ORDER BY a.created_at DESC
                LIMIT 5
            """)
            adverts = cur.fetchall()

            # ----------------------------
            # โฆษณาที่อนุมัติหรือปฏิเสธแล้ว
            # ----------------------------
            cur.execute("""
                SELECT 
                    a.adv_id,
                    a.adv_name,
                    a.valid_from,
                    a.valid_to,
                    a.status,
                    c.cus_fname,
                    c.cus_lname,
                    ar.advert_area_name,
                    ao.total_amount,
                    ac.adc_cat_name
                FROM advert a
                JOIN customer c ON a.cus_id = c.cus_id
                LEFT JOIN advert_order ao ON a.adv_id = ao.adv_id
                LEFT JOIN advert_area ar ON ao.advert_area_id = ar.advert_area_id
                LEFT JOIN advert_category ac ON a.adc_cat_id = ac.adc_cat_id
                WHERE a.status IN ('approved','rejected')
                  AND a.del_flg = 0
                ORDER BY a.reviewed_at DESC
                LIMIT 5
            """)
            approved_ads = cur.fetchall()

        # ส่ง template พร้อมทั้งสองตัวแปร
        return render_template(
            'admin/ad-review.html',
            adverts=adverts,
            approved_ads=approved_ads
        )
    finally:
        conn.close()




# ✅ Approve
@advert_review_bp.route('/ad-review/approve', methods=['POST'])
def approve_advert():
    user = session.get("user")
    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))
    data = request.get_json()
    adv_id = data.get('adv_id')
    emp_id = session.get('emp_id', 1)

    conn = connect_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE advert
                SET status='approved',
                    reviewed_by_emp_id=%s,
                    reviewed_at=%s
                WHERE adv_id=%s
            """, (emp_id, datetime.now(), adv_id))
        conn.commit()
        return jsonify({'status': 'success'})
    finally:
        conn.close()


# ❌ Reject
@advert_review_bp.route('/ad-review/reject', methods=['POST'])
def reject_advert():
    user = session.get("user")
    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))
    data = request.get_json()
    adv_id = data.get('adv_id')
    reason = data.get('reason')
    emp_id = session.get('emp_id', 1)

    conn = connect_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE advert
                SET status='rejected',
                    rejected_reason=%s,
                    reviewed_by_emp_id=%s,
                    reviewed_at=%s
                WHERE adv_id=%s
            """, (reason, emp_id, datetime.now(), adv_id))
        conn.commit()
        return jsonify({'status': 'success'})
    finally:
        conn.close()
