from flask import Blueprint, render_template, request, session, jsonify
from dotenv import load_dotenv
import pymysql
import pymysql.cursors
import os
import math

load_dotenv()
news_list_bp = Blueprint("news_list", __name__)

def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT") or 3306),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )

def require_login():
    # หน้านี้คุณจะให้ใครเห็นก็ได้:
    # - ถ้าจะให้ Reporter/Admin ดู: เช็ค session มี user
    # - ถ้าจะให้คนทั่วไปดู: เอา require_login ออกได้
    user = session.get("user")
    if not user:
        return None
    return user

@news_list_bp.route("/reporter/news-list", methods=["GET"])
def news_list_page():
    user = require_login()
    if not user:
        return "Forbidden", 403

    per_page = 10
    page = request.args.get("page", default=1, type=int)
    if page < 1:
        page = 1
    offset = (page - 1) * per_page

    q = (request.args.get("q") or "").strip()

    where = ["n.del_flg = 0", "n.status = 'publish'"]
    params = []

    if q:
        where.append("n.news_title LIKE %s")
        params.append(f"%{q}%")

    where_sql = " AND ".join(where)

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT COUNT(*) AS total
                FROM news n
                WHERE {where_sql}
                """,
                tuple(params),
            )
            total_rows = int((cursor.fetchone() or {}).get("total") or 0)
            total_pages = max(1, math.ceil(total_rows / per_page))
            if page > total_pages:
                page = total_pages
                offset = (page - 1) * per_page

            cursor.execute(
                f"""
                SELECT
                  n.news_id,
                  n.news_title,
                  n.is_featured,
                  n.published_at,
                  n.status,
                  c.cat_name AS category_name,
                  e.emp_fname AS author_fname,
                  e.emp_lname AS author_lname
                FROM news n
                LEFT JOIN news_category c ON n.cat_id = c.cat_id
                LEFT JOIN employee e ON n.created_by = e.emp_id
                WHERE {where_sql}
                ORDER BY n.published_at DESC, n.news_id DESC
                LIMIT %s OFFSET %s
                """,
                tuple(params + [per_page, offset]),
            )
            rows = cursor.fetchall() or []
    finally:
        conn.close()

    return render_template(
        "reporter/news-list.html",
        user=user,
        rows=rows,
        page=page,
        per_page=per_page,
        total_rows=total_rows,
        total_pages=total_pages,
        q=q,
    )

@news_list_bp.route("/reporter/news/public-detail/<int:news_id>", methods=["GET"])
def public_news_detail(news_id):
    user = require_login()
    if not user:
        return jsonify({"ok": False, "message": "Forbidden"}), 403

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                  n.news_id,
                  n.news_title,
                  n.news_content,
                  n.is_featured,
                  n.status,
                  n.published_at,
                  n.cover_image,
                  n.sub_images,
                  n.video_url,
                  c.cat_name AS category_name,
                  s.subcat_name AS subcategory_name,
                  e.emp_fname AS author_fname,
                  e.emp_lname AS author_lname
                FROM news n
                LEFT JOIN news_category c ON n.cat_id = c.cat_id
                LEFT JOIN news_subcategory s ON n.subcat_id = s.subcat_id
                LEFT JOIN employee e ON n.created_by = e.emp_id
                WHERE n.news_id = %s
                  AND n.del_flg = 0
                  AND n.status = 'publish'
                LIMIT 1
                """,
                (news_id,),
            )
            row = cursor.fetchone()
            if not row:
                return jsonify({"ok": False, "message": "ไม่พบข่าว"}), 404

            return jsonify({"ok": True, "data": row}), 200
    finally:
        conn.close()
