from flask import Blueprint, render_template, abort, session, request, url_for
import pymysql
import os
import json
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

def normalize_img_url(path: str) -> str:
    """รองรับทั้ง http(s) และ path ใน static เช่น uploads/news/xxx.webp"""
    p = (path or "").strip()
    if not p:
        return ""
    if p.startswith("http://") or p.startswith("https://"):
        return p
    # เก็บใน DB แบบ "uploads/news/xxx.webp" -> url_for static
    return url_for("static", filename=p)

def parse_sub_images(raw) -> list[str]:
    """sub_images เป็น JSON list ของ path (string)"""
    if not raw:
        return []
    try:
        arr = json.loads(raw)
        if not isinstance(arr, list):
            return []
        # เอาเฉพาะ string ที่ไม่ว่าง
        out = []
        for x in arr:
            if isinstance(x, str) and x.strip():
                out.append(x.strip())
        return out
    except Exception:
        return []

def build_inline_figure(img_url: str, idx: int) -> str:
    # ใส่ class เผื่อคุณไปแต่ง css ต่อใน news_detail.css
    return f"""
      <figure class="article-inline-img my-3">
        <img src="{img_url}" alt="sub-image-{idx}" class="w-100 rounded-4 shadow-sm border" loading="lazy">
      </figure>
    """.strip()

def inject_sub_images_into_content(html: str, img_urls: list[str]) -> str:
    """
    แทรกรูปรองสูงสุด 2 รูป:
    - ถ้ามี </p> จะใส่หลังย่อหน้าแรกและย่อหน้าที่สอง
    - ถ้าไม่มี </p> จะต่อท้ายเนื้อหา
    """
    content = (html or "").strip()
    if not img_urls:
        return content

    # จำกัด 2 รูปตามที่คุยกัน
    img_urls = img_urls[:2]
    figures = [build_inline_figure(u, i + 1) for i, u in enumerate(img_urls)]

    lower = content.lower()
    if "</p>" not in lower:
        # ไม่มีพารากราฟ -> ต่อท้าย
        return content + "\n" + "\n".join(figures)

    # แทรกหลัง </p> ครั้งที่ 1 และ 2 (ถ้ามี)
    out = content
    insert_positions = [1, 2]  # หลังย่อหน้าแรก, หลังย่อหน้าที่สอง
    for idx, fig in enumerate(figures):
        nth = insert_positions[idx] if idx < len(insert_positions) else insert_positions[-1]
        out = insert_after_nth_p(out, fig, nth)

    return out

def insert_after_nth_p(html: str, insert_html: str, n: int) -> str:
    """insert หลังแท็ก </p> ครั้งที่ n (นับจาก 1). ถ้าไม่พอ -> ต่อท้าย"""
    if n <= 0:
        return html + "\n" + insert_html

    needle = "</p>"
    start = 0
    count = 0
    while True:
        pos = html.lower().find(needle, start)
        if pos == -1:
            # ไม่เจอครบ -> ต่อท้าย
            return html + "\n" + insert_html
        count += 1
        end_pos = pos + len(needle)
        if count == n:
            return html[:end_pos] + "\n" + insert_html + "\n" + html[end_pos:]
        start = end_pos

@news_detail_bp.get("/news/<int:news_id>")
def news_detail(news_id: int):
    user_id = session.get("user_id")  # มี login ค่อยได้ค่า ไม่มีก็ None
    user_agent = (request.headers.get("User-Agent") or "")[:255]

    conn = connect_db()
    try:
        categories = load_nav_categories(conn)

        with conn.cursor() as cur:
            # 1) Article (เพิ่ม sub_images)
            cur.execute(
                """
                SELECT
                    n.news_id,
                    n.news_title,
                    n.news_content,
                    n.cover_image,
                    n.sub_images,
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

            # ✅ normalize cover image (เก็บเป็น path ก็ได้ / http ก็ได้)
            article["cover_image"] = safe_str(article.get("cover_image"), "")

            # ✅ แทรกรูปรอง 2 รูปเข้าไปในเนื้อหา
            raw_sub = article.get("sub_images")
            sub_list = parse_sub_images(raw_sub)  # list[path]
            sub_urls = [normalize_img_url(p) for p in sub_list if p][:2]

            # ถ้าเนื้อหาที่เก็บเป็น plain text ไม่ใช่ HTML -> แปลงให้เป็น <p> ง่าย ๆ
            content = safe_str(article.get("news_content"), "")
            if content and ("</p>" not in content.lower() and "<p" not in content.lower() and "<br" not in content.lower()):
                # ทำเป็นพารากราฟเดียวแบบง่าย ๆ
                content = "<p>" + content.replace("\n", "<br>") + "</p>"

            article["news_content"] = inject_sub_images_into_content(content, sub_urls)

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
                ORDER BY n.published_at DESC, n.news_id DESC
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
