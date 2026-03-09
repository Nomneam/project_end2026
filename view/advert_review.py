from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
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


def update_expired_ads():
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE advert
        SET status='expired'
        WHERE status='running'
          AND valid_to IS NOT NULL
          AND valid_to < NOW()
    """)

    conn.commit()
    cursor.close()
    conn.close()


@advert_review_bp.route('/ad-review')
def advert_review():
    update_expired_ads()

    user = session.get("user")
    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))

    page_draft = request.args.get("page_draft", 1, type=int)
    page_approved = request.args.get("page_approved", 1, type=int)

    draft_name = (request.args.get("draft_name") or "").strip()
    draft_category = request.args.get("draft_category", type=int)

    approved_name = (request.args.get("approved_name") or "").strip()
    approved_category = request.args.get("approved_category", type=int)
    approved_status = (request.args.get("approved_status") or "").strip()

    per_page = 5

    conn = connect_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT adc_cat_id, adc_cat_name
                FROM advert_category
                WHERE del_flg=0
                ORDER BY adc_cat_name ASC
            """)
            categories = cur.fetchall()

            # Draft query
            draft_where = ["a.status='draft'", "a.del_flg=0"]
            draft_params = []

            if draft_name:
                draft_where.append("a.adv_name LIKE %s")
                draft_params.append(f"%{draft_name}%")

            if draft_category:
                draft_where.append("a.adc_cat_id = %s")
                draft_params.append(draft_category)

            draft_where_sql = " AND ".join(draft_where)

            cur.execute(
                f"""
                SELECT COUNT(*) AS total
                FROM advert a
                WHERE {draft_where_sql}
                """,
                draft_params
            )
            total_draft = cur.fetchone()["total"]
            total_pages_draft = max(1, (total_draft + per_page - 1) // per_page)
            page_draft = min(max(page_draft, 1), total_pages_draft)
            offset_draft = (page_draft - 1) * per_page

            cur.execute(
                f"""
                SELECT
                    a.*,
                    c.cus_fname,
                    c.cus_lname,
                    ac.adc_cat_name
                FROM advert a
                JOIN customer c ON a.cus_id = c.cus_id
                LEFT JOIN advert_category ac ON a.adc_cat_id = ac.adc_cat_id
                WHERE {draft_where_sql}
                ORDER BY a.created_at DESC
                LIMIT %s OFFSET %s
                """,
                draft_params + [per_page, offset_draft]
            )
            adverts = cur.fetchall()

            # Approved query
            approved_where = [
                "a.status IN ('approved','rejected','running','paused','expired')",
                "a.del_flg=0"
            ]
            approved_params = []

            if approved_name:
                approved_where.append("a.adv_name LIKE %s")
                approved_params.append(f"%{approved_name}%")

            if approved_category:
                approved_where.append("a.adc_cat_id = %s")
                approved_params.append(approved_category)

            if approved_status:
                approved_where.append("a.status = %s")
                approved_params.append(approved_status)

            approved_where_sql = " AND ".join(approved_where)

            cur.execute(
                f"""
                SELECT COUNT(*) AS total
                FROM advert a
                WHERE {approved_where_sql}
                """,
                approved_params
            )
            total_approved = cur.fetchone()["total"]
            total_pages_approved = max(1, (total_approved + per_page - 1) // per_page)
            page_approved = min(max(page_approved, 1), total_pages_approved)
            offset_approved = (page_approved - 1) * per_page

            cur.execute(
                f"""
                SELECT
                    a.*,
                    c.cus_fname,
                    c.cus_lname,
                    ac.adc_cat_name
                FROM advert a
                JOIN customer c ON a.cus_id = c.cus_id
                LEFT JOIN advert_category ac ON a.adc_cat_id = ac.adc_cat_id
                WHERE {approved_where_sql}
                ORDER BY a.reviewed_at DESC, a.created_at DESC
                LIMIT %s OFFSET %s
                """,
                approved_params + [per_page, offset_approved]
            )
            approved_ads = cur.fetchall()

        return render_template(
            "admin/ad-review.html",
            adverts=adverts,
            approved_ads=approved_ads,
            categories=categories,
            page_draft=page_draft,
            page_approved=page_approved,
            total_pages_draft=total_pages_draft,
            total_pages_approved=total_pages_approved,
            draft_name=draft_name,
            draft_category=draft_category,
            approved_name=approved_name,
            approved_category=approved_category,
            approved_status=approved_status
        )

    finally:
        conn.close()


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


@advert_review_bp.route('/ad-review/pause', methods=['POST'])
def pause_advert():
    user = session.get("user")
    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))

    data = request.get_json()
    adv_id = data.get("adv_id")
    reason = data.get("reason")

    conn = connect_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE advert
                SET status='paused',
                    rejected_reason=%s
                WHERE adv_id=%s
            """, (reason, adv_id))
        conn.commit()
        return jsonify({"status": "success"})
    finally:
        conn.close()
