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
    # หน้า index: โหลดหมวด + หมวดย่อย เพื่อทำ navbar
    db = connect_db()
    try:
        with db.cursor() as cur:
            cur.execute("""
                SELECT cat_id, cat_name
                FROM news_category
                WHERE is_active=1 AND del_flg=0
                ORDER BY cat_id ASC
            """)
            cats = cur.fetchall()

            cur.execute("""
                SELECT subcat_id, cat_id, subcat_name
                FROM news_subcategory
                WHERE is_active=1 AND del_flg=0
                ORDER BY cat_id ASC, subcat_id ASC
            """)
            subs = cur.fetchall()
    finally:
        db.close()

    sub_map = {}
    for s in subs:
        sub_map.setdefault(s["cat_id"], []).append(s)

    categories = []
    for c in cats:
        categories.append({
            "cat_id": c["cat_id"],
            "cat_name": c["cat_name"],
            "subs": sub_map.get(c["cat_id"], [])
        })

    return render_template("index.html", categories=categories)


@index_bp.get("/api/news/featured")
def api_news_featured():
    # API: ข่าวยอดฮิต (สไลด์) = is_featured=1
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
    # API: ไม่ควรพลาด = ข่าวล่าสุด (เอา 4 อัน) [ไม่บังคับต้อง featured]
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
    # API: ข่าวล่าสุด + ข่าวเพิ่มเติม (pagination + filter หมวด/หมวดย่อย + ค้นหา)
    page = int(request.args.get("page", 1) or 1)
    page_size = int(request.args.get("page_size", 12) or 12)
    q = (request.args.get("q") or "").strip()
    cat_id = request.args.get("cat_id")
    subcat_id = request.args.get("subcat_id")

    # จำกัด 3 หน้า/หมวดตาม requirement
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
            # total
            cur.execute(f"SELECT COUNT(*) AS cnt FROM news n WHERE {where_sql}", params)
            total = int(cur.fetchone()["cnt"] or 0)

            total_pages = max(1, (total + page_size - 1) // page_size)
            total_pages = min(total_pages, max_pages)

            if page > total_pages:
                page = total_pages
                offset = (page - 1) * page_size

            # list
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
    # API: ยอดนิยม = วิวภายใน 24 ชม.แรกหลังข่าวลง (อิง news_view_logs)
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
                  COUNT(v.id) AS views_24h_after_publish
                FROM news n
                LEFT JOIN news_category c ON c.cat_id = n.cat_id
                LEFT JOIN news_view_logs v
                  ON v.news_id = n.news_id
                 AND v.viewed_at >= n.published_at
                 AND v.viewed_at <  n.published_at + INTERVAL 24 HOUR
                WHERE n.del_flg=0 AND n.status='publish'
                GROUP BY n.news_id
                ORDER BY views_24h_after_publish DESC, n.published_at DESC
                LIMIT %s
            """, (limit,))
            items = cur.fetchall()
    finally:
        db.close()

    return jsonify({"ok": True, "items": items})
