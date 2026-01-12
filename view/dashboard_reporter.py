# dashboard_reporter.py
from flask import Blueprint, render_template, session, jsonify, request
from dotenv import load_dotenv
import pymysql
import os
import pymysql.cursors
import math

load_dotenv()
dashboard_reporter_bp = Blueprint("dashboard_reporter", __name__)

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

def require_reporter():
    user = session.get("user")
    if not user:
        return None
    if int(user.get("role_id") or 0) != 2:
        return None
    if not user.get("id"):
        return None
    return user


@dashboard_reporter_bp.route("/reporter/dashboard", methods=["GET"])
def reporter_dashboard():
    user = require_reporter()
    if not user:
        return "Forbidden", 403

    user_id = int(user["id"])

    # ---------------- pagination ----------------
    per_page = 5
    page = request.args.get("page", default=1, type=int)
    if page < 1:
        page = 1
    offset = (page - 1) * per_page

    # ---------------- filters ----------------
    # cat_id: ประเภทข่าว (จากตาราง news_category)
    cat_id = request.args.get("cat_id", default="", type=str).strip()

    # kind: ชนิดข่าว -> all | featured | normal
    kind = (request.args.get("kind") or "all").strip()  # all/featured/normal

    # status: all | publish | draft (คุณใช้ publish อยู่ใน DB)
    status = (request.args.get("status") or "all").strip()  # all/publish/draft

    # สร้าง WHERE แบบยืดหยุ่น
    where = ["n.created_by = %s", "n.del_flg = 0"]
    params = [user_id]

    if cat_id:
        # cat_id ใน DB เป็น int -> validate
        try:
            cat_id_int = int(cat_id)
            where.append("n.cat_id = %s")
            params.append(cat_id_int)
        except ValueError:
            cat_id = ""  # ถ้าแปลกๆ ให้ ignore

    if kind == "featured":
        where.append("COALESCE(n.is_featured,0) = 1")
    elif kind == "normal":
        where.append("COALESCE(n.is_featured,0) = 0")

    if status == "publish":
        where.append("n.status = 'publish'")
    elif status == "draft":
        # ถ้าของคุณเก็บเป็น 'draft' ก็ใช้แบบนี้ได้เลย
        # แต่ถ้าเป็นค่าอื่น เช่น 'pending' ให้ปรับตรงนี้
        where.append("n.status <> 'publish'")

    where_sql = " AND ".join(where)

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            # 1) total news ทั้งหมดของ reporter (ไม่ต้อง filter ก็ได้)
            cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM news
                WHERE created_by = %s AND del_flg = 0
                """,
                (user_id,),
            )
            total_news = int((cursor.fetchone() or {}).get("total") or 0)

            # 2) ดึง category list ไปทำ dropdown filter
            cursor.execute(
                """
                SELECT cat_id, cat_name
                FROM news_category
                WHERE del_flg = 0
                ORDER BY cat_name
                """
            )
            categories = cursor.fetchall() or []

            # 3) COUNT ตาม filter (เพื่อคำนวณจำนวนหน้า)
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

            # 4) SELECT ตาม filter + pagination
            cursor.execute(
                f"""
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
                WHERE {where_sql}
                ORDER BY n.created_at DESC
                LIMIT %s OFFSET %s
                """,
                tuple(params + [per_page, offset]),
            )
            latest_news = cursor.fetchall() or []
    finally:
        conn.close()

    return render_template(
        "reporter/reporter-dashboard.html",
        user=user,
        total_news=total_news,
        latest_news=latest_news,

        # pagination
        page=page,
        per_page=per_page,
        total_rows=total_rows,
        total_pages=total_pages,

        # filter data
        categories=categories,

        # selected filters (เอาไว้ set ค่าใน dropdown)
        f_cat_id=cat_id,
        f_kind=kind,
        f_status=status,
    )
