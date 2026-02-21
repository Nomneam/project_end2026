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
# ==============================
#  Advert Review Page
# ==============================
@advert_review_bp.route('/ad-review')
def advert_review():
    user = session.get("user")
    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))

    page_draft = request.args.get("page_draft", 1, type=int)
    page_approved = request.args.get("page_approved", 1, type=int)

    per_page = 5
    offset_draft = (page_draft - 1) * per_page
    offset_approved = (page_approved - 1) * per_page

    conn = connect_db()
    try:
        with conn.cursor() as cur:

            # ===============================
            # นับจำนวน draft
            # ===============================
            cur.execute("""
                SELECT COUNT(*) AS total
                FROM advert
                WHERE status='draft' AND del_flg=0
            """)
            total_draft = cur.fetchone()["total"]
            total_pages_draft = (total_draft + per_page - 1) // per_page

            # ===============================
            # ดึง draft ตามหน้า
            # ===============================
            cur.execute("""
                SELECT 
                    a.*,
                    c.cus_fname,
                    c.cus_lname,
                    ac.adc_cat_name
                FROM advert a
                JOIN customer c ON a.cus_id = c.cus_id
                LEFT JOIN advert_category ac ON a.adc_cat_id = ac.adc_cat_id
                WHERE a.status='draft' 
                  AND a.del_flg=0
                ORDER BY a.created_at DESC
                LIMIT %s OFFSET %s
            """, (per_page, offset_draft))
            adverts = cur.fetchall()

            # ===============================
            # นับ approved / rejected
            # ===============================
            cur.execute("""
                SELECT COUNT(*) AS total
                FROM advert
                WHERE status IN ('approved','rejected')
                  AND del_flg=0
            """)
            total_approved = cur.fetchone()["total"]
            total_pages_approved = (total_approved + per_page - 1) // per_page

            # ===============================
            # ดึง approved / rejected
            # ===============================
            cur.execute("""
                SELECT 
                    a.*,
                    c.cus_fname,
                    c.cus_lname,
                    ac.adc_cat_name
                FROM advert a
                JOIN customer c ON a.cus_id = c.cus_id
                LEFT JOIN advert_category ac ON a.adc_cat_id = ac.adc_cat_id
                WHERE a.status IN ('approved','rejected')
                  AND a.del_flg=0
                ORDER BY a.reviewed_at DESC
                LIMIT %s OFFSET %s
            """, (per_page, offset_approved))
            approved_ads = cur.fetchall()

        return render_template(
            "admin/ad-review.html",
            adverts=adverts,
            approved_ads=approved_ads,
            page_draft=page_draft,
            page_approved=page_approved,
            total_pages_draft=total_pages_draft,
            total_pages_approved=total_pages_approved
        )

    finally:
        conn.close()


#  Approve
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


#  Reject
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
