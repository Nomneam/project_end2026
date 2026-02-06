from flask import Blueprint, render_template, abort, session, request
import pymysql
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

news_detail_bp = Blueprint("news_detail", __name__)

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

# ---------------------------
# Navbar loader (เหมือน index)
# ---------------------------
def load_nav_categories(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT cat_id, cat_name
            FROM news_category
            WHERE is_active=1 AND del_flg=0
            ORDER BY cat_id ASC
        """)
        cats = cur.fetchall() or []

        cur.execute("""
            SELECT subcat_id, cat_id, subcat_name
            FROM news_subcategory
            WHERE is_active=1 AND del_flg=0
            ORDER BY cat_id ASC, subcat_id ASC
        """)
        subs = cur.fetchall() or []

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
    return categories

# ---------------------------
# Helpers: Thai date + time ago
# ---------------------------
TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

def format_th_date(dt):
    if not dt:
        return "—"
    return f"{dt.day} {TH_MONTHS[dt.month-1]} {dt.year + 543}"

def time_ago(dt):
    if not dt:
        return "—"
    now = datetime.now()
    sec = int((now - dt).total_seconds())
    if sec < 60:
        return "เมื่อสักครู่"
    if sec < 3600:
        return f"{sec // 60} นาทีที่แล้ว"
    if sec < 86400:
        return f"{sec // 3600} ชม. ที่แล้ว"
    return f"{sec // 86400} วันที่แล้ว"

def safe_str(x, default="—"):
    s = (x or "").strip() if isinstance(x, str) else x
    return s if s else default

def safe_int(x, default=0):
    try:
        return int(x)
    except Exception:
        return default

@news_detail_bp.get("/news/<int:news_id>")
def news_detail(news_id: int):
    user_id = session.get("user_id")  # มี login ค่อยได้ค่า ไม่มีก็ None
    user_agent = (request.headers.get("User-Agent") or "")[:255]

    conn = connect_db()
    try:
        categories = load_nav_categories(conn)

        with conn.cursor() as cur:
            # 1) Article (ตัด employee ออก)
            cur.execute(
                """
                SELECT
                    n.news_id,
                    n.news_title,
                    n.news_content,
                    n.cover_image,
                    n.view_count,
                    n.published_at,
                    n.created_at,
                    c.cat_name AS category_name
                FROM news n
                LEFT JOIN news_category c ON c.cat_id = n.cat_id
                WHERE n.news_id = %s
                  AND n.status = 'publish'
                  AND (n.del_flg IS NULL OR n.del_flg = 0)
                LIMIT 1
                """,
                (news_id,),
            )
            article = cur.fetchone()
            if not article:
                abort(404)

            # 2) view_count +1
            cur.execute(
                """
                UPDATE news
                SET view_count = COALESCE(view_count, 0) + 1
                WHERE news_id = %s
                """,
                (news_id,),
            )

            # 3) insert view log (ไม่เก็บ IP)
            cur.execute(
                """
                INSERT INTO news_view_logs (news_id, user_id, user_agent)
                VALUES (%s, %s, %s)
                """,
                (news_id, user_id, user_agent),
            )

            # 4) get latest view_count
            cur.execute("SELECT view_count FROM news WHERE news_id = %s LIMIT 1", (news_id,))
            vc = cur.fetchone()
            article["view_count"] = safe_int(vc["view_count"], 0) if vc else safe_int(article.get("view_count"), 0)

            base_dt = article.get("published_at") or article.get("created_at")
            article["date_text"] = format_th_date(base_dt)
            article["time_ago"] = time_ago(base_dt)
            article["category_name"] = safe_str(article.get("category_name"), "news")
            article["cover_image"] = safe_str(article.get("cover_image"), "")

            # 5) Hot 24 hours
            cur.execute(
                """
                SELECT
                    n.news_id,
                    n.news_title,
                    c.cat_name AS category_name,
                    COUNT(l.id) AS views_24h,
                    MAX(l.viewed_at) AS last_viewed_at
                FROM news_view_logs l
                JOIN news n ON n.news_id = l.news_id
                LEFT JOIN news_category c ON c.cat_id = n.cat_id
                WHERE n.status = 'publish'
                  AND (n.del_flg IS NULL OR n.del_flg = 0)
                  AND l.viewed_at >= NOW() - INTERVAL 1 DAY
                GROUP BY n.news_id, n.news_title, c.cat_name
                ORDER BY views_24h DESC
                LIMIT 6
                """
            )
            hot = cur.fetchall() or []
            for h in hot:
                h["category_name"] = safe_str(h.get("category_name"), "news")
                h["time_ago"] = time_ago(h.get("last_viewed_at"))

            # 6) Related (หมวดเดียวกัน)
            cur.execute(
                """
                SELECT
                    n.news_id,
                    n.news_title,
                    n.cover_image,
                    n.published_at,
                    c.cat_name AS category_name
                FROM news n
                LEFT JOIN news_category c ON c.cat_id = n.cat_id
                WHERE n.status = 'publish'
                  AND (n.del_flg IS NULL OR n.del_flg = 0)
                  AND n.news_id <> %s
                  AND n.cat_id = (SELECT cat_id FROM news WHERE news_id = %s LIMIT 1)
                ORDER BY n.published_at DESC
                LIMIT 4
                """,
                (news_id, news_id),
            )
            related = cur.fetchall() or []
            for r in related:
                r["category_name"] = safe_str(r.get("category_name"), "news")
                r["time_ago"] = time_ago(r.get("published_at"))
                r["cover_image"] = safe_str(r.get("cover_image"), "")

        return render_template(
            "news_detail.html",
            categories=categories,
            article=article,
            hot=hot,
            related=related,
        )

    finally:
        conn.close()
