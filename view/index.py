from flask import Blueprint, render_template, request, jsonify
import pymysql
import os
from dotenv import load_dotenv


load_dotenv()

index_bp = Blueprint("index", __name__)

def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT") or 3306),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        charset="utf8mb4",
    )

@index_bp.route("/index")
def index_news():
    return render_template("index.html")




@index_bp.get("/api/news/featured")
def api_news_featured():
    limit = int(request.args.get("limit", 3) or 3)

    db = connect_db()
    try:
        with db.cursor() as cur:
            cur.execute("""
                SELECT
                  n.news_id, n.news_title, n.cover_image, n.published_at,
                  c.cat_name,
                  LEFT(COALESCE(n.news_content,''), 180) AS excerpt
                FROM news n
                LEFT JOIN news_category c ON c.cat_id = n.cat_id
                WHERE n.del_flg=0 AND n.status='publish' AND n.is_featured=1
                ORDER BY n.published_at DESC, n.news_id DESC
                LIMIT %s
            """, (limit,))
            items = cur.fetchall()
    finally:
        db.close()

    return jsonify({"ok": True, "items": items})


@index_bp.get("/api/news/must-read")
def api_news_must_read():
    limit = int(request.args.get("limit", 4) or 4)

    db = connect_db()
    try:
        with db.cursor() as cur:
            cur.execute("""
                SELECT
                  n.news_id, n.news_title, n.cover_image, n.published_at,
                  c.cat_name,
                  LEFT(COALESCE(n.news_content,''), 140) AS excerpt
                FROM news n
                LEFT JOIN news_category c ON c.cat_id = n.cat_id
                WHERE n.del_flg=0 AND n.status='publish'
                ORDER BY n.published_at DESC, n.news_id DESC
                LIMIT %s
            """, (limit,))
            items = cur.fetchall()
    finally:
        db.close()

    return jsonify({"ok": True, "items": items})


@index_bp.get("/api/news/list")
def api_news_list():
    page = int(request.args.get("page", 1) or 1)
    page_size = int(request.args.get("page_size", 12) or 12)
    q = (request.args.get("q") or "").strip()
    cat_id = request.args.get("cat_id")
    subcat_id = request.args.get("subcat_id")

    max_pages = 3
    if page < 1:
        page = 1
    if page > max_pages:
        page = max_pages

    where = ["n.del_flg=0", "n.status='publish'"]
    params = []

    if q:
        where.append("(n.news_title LIKE %s OR n.news_content LIKE %s)")
        like = f"%{q}%"
        params.extend([like, like])

    if cat_id:
        where.append("n.cat_id=%s")
        params.append(cat_id)

    if subcat_id:
        where.append("n.subcat_id=%s")
        params.append(subcat_id)

    where_sql = " AND ".join(where)
    offset = (page - 1) * page_size

    db = connect_db()
    try:
        with db.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) AS cnt FROM news n WHERE {where_sql}", params)
            total = int(cur.fetchone()["cnt"] or 0)

            total_pages = max(1, (total + page_size - 1) // page_size)
            total_pages = min(total_pages, max_pages)

            if page > total_pages:
                page = total_pages
                offset = (page - 1) * page_size

            cur.execute(f"""
                SELECT
                  n.news_id, n.news_title, n.cover_image, n.published_at,
                  c.cat_name,
                  LEFT(COALESCE(n.news_content,''), 160) AS excerpt
                FROM news n
                LEFT JOIN news_category c ON c.cat_id = n.cat_id
                WHERE {where_sql}
                ORDER BY n.published_at DESC, n.news_id DESC
                LIMIT %s OFFSET %s
            """, params + [page_size, offset])
            items = cur.fetchall()
    finally:
        db.close()

    return jsonify({
        "ok": True,
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    })


@index_bp.get("/api/news/popular")
def api_news_popular():
    # ✅ คืนชื่อเป็น view_count ให้ JS ใช้ได้ตรงๆ
    limit = int(request.args.get("limit", 7) or 7)

    db = connect_db()
    try:
        with db.cursor() as cur:
            cur.execute("""
                SELECT
                n.news_id,
                n.news_title,
                n.cover_image,
                n.published_at,
                c.cat_name,
                COUNT(v.id) AS view_count
                FROM news n
                LEFT JOIN news_category c ON c.cat_id = n.cat_id
                LEFT JOIN news_view_logs v
                ON v.news_id = n.news_id
                AND v.viewed_at >= NOW() - INTERVAL 24 HOUR
                WHERE n.del_flg=0
                AND n.status='publish'
                AND n.published_at >= NOW() - INTERVAL 24 HOUR
                GROUP BY n.news_id
                HAVING view_count > 0
                ORDER BY view_count DESC, n.published_at DESC
                LIMIT %s
            """, (limit,))
            items = cur.fetchall()
    finally:
        db.close()

    return jsonify({"ok": True, "items": items})


@index_bp.get("/api/ads/icons")
def api_ads_icons():
    db = connect_db()
    try:
        with db.cursor() as cur:
            cur.execute("""
                SELECT
                    adv_id,
                    adv_name,
                    adv_image_url,
                    target_url
                FROM advert
                WHERE status = 'running'
                  AND adv_position = 'HOME_ICON'
                  AND (valid_from IS NULL OR valid_from <= NOW())
                  AND (valid_to IS NULL OR valid_to >= NOW())
                  AND del_flg = 0
                ORDER BY adv_id DESC
            """)
            items = cur.fetchall()
    finally:
        db.close()

    return jsonify({"ok": True, "items": items})



@index_bp.get("/api/ads/footer")
def api_ads_footer():
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
                  AND adv_position = 'FOOTER_HOME'
                  AND (valid_from IS NULL OR valid_from <= NOW())
                  AND (valid_to IS NULL OR valid_to >= NOW())
                  AND del_flg = 0
                ORDER BY adv_id DESC
            """)
            items = cur.fetchall()

            for item in items:
                item["target_url"] = item["target_url"] or "#"

    finally:
        db.close()

    return jsonify({"ok": True, "items": items})


@index_bp.get("/api/ads/hero")
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
                  AND adv_position = 'INDEX_PAGE'
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


@index_bp.route("/api/categories")
def categories():
    conn = connect_db()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT cat_id, cat_name
            FROM news_category
            WHERE cat_id IN (2,3,4)
            AND is_active = 1
            AND del_flg = 0
            ORDER BY cat_id
        """)
        rows = cur.fetchall()
    conn.close()

    return jsonify(ok=True, items=rows)


@index_bp.get("/api/news/by-category")
def api_news_by_category():
    cat_id = request.args.get("cat_id", type=int)
    limit = min(int(request.args.get("limit", 12)), 20)

    if not cat_id:
        return jsonify(ok=False, error="missing cat_id"), 400

    db = connect_db()
    try:
        with db.cursor() as cur:
            cur.execute("""
                SELECT
                  n.news_id,
                  n.news_title,
                  n.cover_image,
                  n.published_at,
                  c.cat_name,
                  LEFT(COALESCE(n.news_content,''),160) AS excerpt
                FROM news n
                LEFT JOIN news_category c ON c.cat_id = n.cat_id
                WHERE n.status='publish'
                  AND n.del_flg=0
                  AND n.cat_id=%s
                ORDER BY n.published_at DESC
                LIMIT %s
            """, (cat_id, limit))

            items = cur.fetchall()
    finally:
        db.close()

    return jsonify(ok=True, items=items)