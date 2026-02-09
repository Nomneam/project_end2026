from flask import Blueprint, render_template, request, jsonify, abort
from dotenv import load_dotenv
from view.navbar import load_nav_categories
import pymysql
import os

load_dotenv()

page_cat_bp = Blueprint("page_cat", __name__)

# ==================================================
# DB
# ==================================================
def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT", 3306)),
        cursorclass=pymysql.cursors.DictCursor
    )

# ==================================================
# PAGE
# ==================================================
@page_cat_bp.route("/page_category")
def page_category():
    categories = load_nav_categories()
    return render_template(
        "page_category.html",
        categories=categories
    )

# ==================================================
# API
# ==================================================
@page_cat_bp.route("/api/page_category")
def api_page_category():
    cat = request.args.get("cat")
    sub = request.args.get("sub")
    page = int(request.args.get("page", 1))

    if not cat:
        abort(400, "category is required")

    PAGE_SIZE = 15
    offset = (page - 1) * PAGE_SIZE

    conn = connect_db()

    with conn.cursor() as cur:
        # ------------------------------------------
        # ข่าวในหมวด
        # ------------------------------------------
        sql = """
        SELECT
            n.id,
            n.title,
            n.summary,
            n.cover_image,
            n.created_at,
            s.slug AS sub_slug,
            s.name AS sub_name,
            c.name AS category_name
        FROM news n
        JOIN news_subcategory s ON n.subcategory_id = s.id
        JOIN news_category c ON s.category_id = c.id
        WHERE c.slug = %s
        """
        params = [cat]

        if sub:
            sql += " AND s.slug = %s"
            params.append(sub)

        sql += """
        ORDER BY n.created_at DESC
        LIMIT %s OFFSET %s
        """
        params.extend([PAGE_SIZE, offset])

        cur.execute(sql, params)
        items = cur.fetchall()

        # ------------------------------------------
        # COUNT
        # ------------------------------------------
        count_sql = """
        SELECT COUNT(*) AS total
        FROM news n
        JOIN news_subcategory s ON n.subcategory_id = s.id
        JOIN news_category c ON s.category_id = c.id
        WHERE c.slug = %s
        """
        count_params = [cat]

        if sub:
            count_sql += " AND s.slug = %s"
            count_params.append(sub)

        cur.execute(count_sql, count_params)
        total = cur.fetchone()["total"]

        # ------------------------------------------
        # SUB CATEGORIES
        # ------------------------------------------
        cur.execute("""
            SELECT slug, name
            FROM news_subcategory s
            JOIN news_category c ON s.category_id = c.id
            WHERE c.slug = %s
            ORDER BY name
        """, [cat])
        subs = cur.fetchall()

    conn.close()

    return jsonify({
        "category": cat,
        "category_name": items[0]["category_name"] if items else "",
        "items": items,
        "subs": subs,
        "total": total,
        "page": page,
        "pageSize": PAGE_SIZE
    })
