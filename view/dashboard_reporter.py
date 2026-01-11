# dashboard_reporter.py
from flask import Blueprint, render_template, session, jsonify, request
from dotenv import load_dotenv
import pymysql
import os
import pymysql.cursors

load_dotenv()

dashboard_reporter_bp = Blueprint("dashboard_reporter", __name__)

# -------------------------------
# DB helper
# -------------------------------
def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT") or 3306),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,   # dashboard เป็น read-only เปิด autocommit ได้เลย
    )


def require_reporter():
    """คืน dict user ถ้าเป็น reporter ไม่งั้นคืน None"""
    user = session.get("user")
    if not user:
        return None
    if int(user.get("role_id") or 0) != 2:
        return None
    if not user.get("id"):
        return None
    return user


# -------------------------------
# Page: Reporter Dashboard
# -------------------------------
@dashboard_reporter_bp.route("/reporter/dashboard", methods=["GET"])
def reporter_dashboard():
    user = require_reporter()
    if not user:
        return "Forbidden", 403

    user_id = int(user["id"])

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            # 1) total news written by this reporter
            cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM news
                WHERE created_by = %s AND del_flg = 0
                """,
                (user_id,),
            )
            total_news = int((cursor.fetchone() or {}).get("total") or 0)

            # 2) latest news list
            cursor.execute(
                """
                SELECT
                    n.news_id,
                    n.news_title,
                    n.is_featured,
                    n.status,
                    n.published_at,
                    n.created_at,
                    c.cat_name AS category_name
                FROM news n
                LEFT JOIN news_category c ON n.cat_id = c.cat_id
                WHERE n.created_by = %s
                  AND n.del_flg = 0
                ORDER BY n.created_at DESC
                LIMIT 10
                """,
                (user_id,),
            )
            latest_news = cursor.fetchall() or []
    finally:
        conn.close()

    return render_template(
        "reporter/reporter-dashboard.html",
        total_news=total_news,
        latest_news=latest_news,
        user=user,
    )


# -------------------------------
# API: Subcategories by cat_id
# GET /api/news/subcategories?cat_id=1
# -------------------------------
@dashboard_reporter_bp.route("/api/news/subcategories", methods=["GET"])
def api_news_subcategories():
    user = require_reporter()
    if not user:
        return jsonify({"ok": False, "message": "Forbidden"}), 403

    cat_id = request.args.get("cat_id", type=int)
    if not cat_id:
        return jsonify({"ok": False, "message": "missing cat_id"}), 400

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT subcat_id, subcat_name
                FROM news_subcategory
                WHERE cat_id = %s AND del_flg = 0
                ORDER BY subcat_name
                """,
                (cat_id,),
            )
            rows = cursor.fetchall() or []
    finally:
        conn.close()

    return jsonify({"ok": True, "data": rows})
