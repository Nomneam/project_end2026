from flask import Blueprint, request, session, render_template, redirect, url_for, jsonify
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors

load_dotenv()

def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT")),
        cursorclass=pymysql.cursors.DictCursor
    )

write_news_reporter_bp = Blueprint("write_news_reporter", __name__)

@write_news_reporter_bp.route("/reporter/write_news")
def reporter_news_create():
    user = session.get("user")
    if not user:
        return redirect(url_for("login_emp.login_emp"))

    # role_id=2 คือ Reporter
    if user.get("role_id") != 2:
        return "Forbidden", 403

    conn = connect_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT cat_id, cat_name
        FROM news_category
        WHERE is_active = 1 AND del_flg = 0
        ORDER BY cat_id ASC
    """)
    categories = cur.fetchall()

    cur.close()
    conn.close()

    # ส่งแค่ categories พอ (ไม่ส่ง subcategories แล้ว)
    return render_template(
        "reporter/reporter-write-news.html",
        categories=categories
    )

@write_news_reporter_bp.route("/api/news/subcategories")
def api_news_subcategories():
    user = session.get("user")
    if not user:
        return jsonify(ok=False, message="not logged in"), 401

    # role_id=2 คือ Reporter (กัน role อื่นยิง API)
    if user.get("role_id") != 2:
        return jsonify(ok=False, message="forbidden"), 403

    cat_id = request.args.get("cat_id", type=int)
    if not cat_id:
        return jsonify(ok=False, message="cat_id required"), 400

    conn = connect_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT subcat_id, subcat_name
        FROM news_subcategory
        WHERE cat_id = %s
          AND is_active = 1
          AND del_flg = 0
        ORDER BY subcat_id ASC
    """, (cat_id,))
    rows = cur.fetchall()

    cur.close()
    conn.close()

    return jsonify(ok=True, data=rows)
