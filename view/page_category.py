from flask import Blueprint, render_template, request, jsonify, abort
from dotenv import load_dotenv
import pymysql
import os
from datetime import datetime

load_dotenv()

page_cat_bp = Blueprint("page_cat", __name__)

# =============================
# DB
# =============================
def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT", 3306)),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        charset="utf8mb4",
    )
    
    
def time_ago(dt):
    if not dt:
        return "—"

    now = datetime.now()
    diff = now - dt
    seconds = diff.total_seconds()

    if seconds < 0:
        return "—"

    minutes = int(seconds // 60)
    hours = int(minutes // 60)
    days = int(hours // 24)

    if minutes < 1:
        return "เมื่อสักครู่"

    if minutes < 60:
        return f"{minutes} นาทีที่แล้ว"

    if hours < 24:
        return f"{hours} ชม. ที่แล้ว"

    if days < 30:
        return f"{days} วันก่อน"

    thai_months = [
        "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.",
        "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.",
        "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ]

    month = thai_months[dt.month]

    if dt.year == now.year:
        return f"{dt.day} {month}"

    return f"{dt.day} {month} {dt.year + 543}"


# =============================
# PAGE
# =============================
@page_cat_bp.route("/page_category")
def page_category():
    cat_id = request.args.get("cat_id")
    subcat_id = request.args.get("subcat_id")

    if not cat_id:
        abort(400, "cat_id is required")


    return render_template(
        "page_category.html",
        cat_id=cat_id,
        subcat_id=subcat_id
    )

# =============================
# API
# =============================
@page_cat_bp.route("/api/page_category")
def api_page_category():
    cat_id = request.args.get("cat_id")
    subcat_id = request.args.get("subcat_id")
    page = int(request.args.get("page", 1))

    if not cat_id:
        abort(400, "cat_id is required")

    PAGE_SIZE = 15
    offset = (page - 1) * PAGE_SIZE

    conn = connect_db()

    with conn.cursor() as cur:
        # -------------------------
        # category name
        # -------------------------
        cur.execute(
            "SELECT cat_name FROM news_category WHERE cat_id=%s",
            [cat_id]
        )
        cat_row = cur.fetchone()
        category_name = cat_row["cat_name"] if cat_row else ""

        # -------------------------
        # sub category name (ถ้ามี)
        # -------------------------
        subcat_name = None
        if subcat_id:
            cur.execute(
                "SELECT subcat_name FROM news_subcategory WHERE subcat_id=%s",
                [subcat_id]
            )
            row = cur.fetchone()
            if row:
                subcat_name = row["subcat_name"]

        # -------------------------
        # news list
        # -------------------------
        sql = """
        SELECT
            n.news_id,
            n.news_title AS title,
            n.published_at,
            LEFT(n.news_content, 200) AS summary,
            n.cover_image,
            n.created_at,
            s.subcat_id,
            s.subcat_name
        FROM news n
        LEFT JOIN news_subcategory s ON n.subcat_id = s.subcat_id
        WHERE n.cat_id = %s
          AND n.status = 'publish'
          AND n.del_flg = 0
        """
        params = [cat_id]

        if subcat_id:
            sql += " AND n.subcat_id = %s"
            params.append(subcat_id)

        sql += " ORDER BY n.created_at DESC LIMIT %s OFFSET %s"
        params.extend([PAGE_SIZE, offset])

        cur.execute(sql, params)
        items = cur.fetchall()
        
        for item in items:
            item["time_ago"] = time_ago(item.get("published_at"))

        # -------------------------
        # count
        # -------------------------
        count_sql = """
        SELECT COUNT(*) AS total
        FROM news n
        WHERE n.cat_id = %s
          AND n.status = 'publish'
          AND n.del_flg = 0
        """
        count_params = [cat_id]

        if subcat_id:
            count_sql += " AND n.subcat_id = %s"
            count_params.append(subcat_id)

        cur.execute(count_sql, count_params)
        total = cur.fetchone()["total"]

        # -------------------------
        # sub categories
        # -------------------------
        cur.execute(
            """
            SELECT subcat_id, subcat_name
            FROM news_subcategory
            WHERE cat_id=%s
            ORDER BY subcat_name
            """,
            [cat_id]
        )
        subs = cur.fetchall()

    conn.close()

    return jsonify({
        "cat_id": cat_id,
        "category_name": category_name,
        "subcat_id": subcat_id,
        "subcat_name": subcat_name,
        "items": items,
        "subs": subs,
        "total": total,
        "page": page,
        "pageSize": PAGE_SIZE
    })
    
    
    
@page_cat_bp.get("/api/ads/cathero")
def api_ads_hero():
    db = connect_db()
    try:
        with db.cursor() as cur:
            cur.execute("""
                SELECT
                    adv_id,
                    adv_name,
                    adv_description,
                    adv_image_url,
                    target_url
                FROM advert
                WHERE status = 'running'
                  AND adv_position = 'CATEGORY_PAGE'
                  AND del_flg = 0
                  AND (valid_from IS NULL OR valid_from <= NOW())
                  AND (valid_to IS NULL OR valid_to >= NOW())
                ORDER BY adv_id DESC
                LIMIT 1
            """)
            ad = cur.fetchone()

            # ถ้าไม่มีโฆษณา
            if not ad:
                return jsonify({"ok": True, "item": None})

            # กันค่า NULL
            ad["target_url"] = ad["target_url"] or "#"
            ad["adv_description"] = ad["adv_description"] or ""

            # กัน path รูปว่าง
            if not ad["adv_image_url"]:
                return jsonify({"ok": True, "item": None})

    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

    finally:
        db.close()

    return jsonify({"ok": True, "item": ad})
