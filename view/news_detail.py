from flask import Blueprint, render_template, abort, session, request, url_for,jsonify
import pymysql
import os
import json
import re
from dotenv import load_dotenv
from datetime import datetime
from markupsafe import escape



load_dotenv()

news_detail_bp = Blueprint("news_detail", __name__)

# ✅ จำกัดรูปรองสูงสุด
MAX_INLINE_IMAGES = 5


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
# Helpers: Thai date + time ago
# ---------------------------
TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]


def format_th_date(dt):
    if not dt:
        return "—"
    return f"{dt.day} {TH_MONTHS[dt.month - 1]} {dt.year + 543}"


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
    return url_for("static", filename=p)


def parse_sub_images(raw) -> list[str]:
    """sub_images เป็น JSON list ของ path (string)"""
    if not raw:
        return []
    try:
        arr = json.loads(raw)
        if not isinstance(arr, list):
            return []
        out = []
        for x in arr:
            if isinstance(x, str) and x.strip():
                out.append(x.strip())
        return out
    except Exception:
        return []


# ---------------------------
# ✅ แปลง plain text ให้เป็นหลาย <p>
# ---------------------------
def text_to_paragraph_html(text: str) -> str:
    """
    แปลง plain text -> HTML หลาย <p>
    - แยกพารากราฟด้วยบรรทัดว่าง (เว้น 1 บรรทัดขึ้นไป)
    - ใน 1 พารากราฟ ถ้ามีขึ้นบรรทัดใหม่ให้เป็น <br>
    - escape กัน XSS
    """
    t = (text or "").strip()
    if not t:
        return ""

    t = t.replace("\r\n", "\n").replace("\r", "\n")
    parts = re.split(r"\n\s*\n+", t)

    out = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        safe = escape(p).replace("\n", "<br>")
        out.append(f"<p>{safe}</p>")
    return "\n".join(out)


def ensure_html_has_paragraphs(content: str) -> str:
    """
    ถ้า content เป็น HTML อยู่แล้ว (มี <p> หรือมี tag ชัดเจน) ก็คืนเดิม
    ถ้าเป็น plain text ให้แปลงเป็นหลาย <p>
    """
    c = (content or "").strip()
    if not c:
        return ""

    lower = c.lower()

    if "<p" in lower or "</p>" in lower:
        return c

    # มี tag อื่น ๆ ถือว่าเป็น HTML (ไม่ไปแตะ)
    if re.search(r"<[a-z][\s>]", lower):
        return c

    return text_to_paragraph_html(c)


# ---------------------------
# Insert image inline helpers
# ---------------------------
def build_inline_figure(img_url: str, idx: int) -> str:
    return f"""
      <figure class="article-inline-img my-3">
        <img src="{img_url}" alt="sub-image-{idx}" class="w-100 rounded-4 shadow-sm border" loading="lazy">
      </figure>
    """.strip()


def insert_after_nth_p(html: str, insert_html: str, n: int) -> str:
    """insert หลังแท็ก </p> ครั้งที่ n (นับจาก 1). ถ้าไม่พอ -> ต่อท้าย"""
    if n <= 0:
        return html + "\n" + insert_html

    needle = "</p>"
    start = 0
    count = 0
    lower = html.lower()

    while True:
        pos = lower.find(needle, start)
        if pos == -1:
            return html + "\n" + insert_html
        count += 1
        end_pos = pos + len(needle)
        if count == n:
            return html[:end_pos] + "\n" + insert_html + "\n" + html[end_pos:]
        start = end_pos


def insert_after_nth_br(html: str, insert_html: str, n: int) -> str:
    """insert หลัง <br> ครั้งที่ n (รองรับ <br>, <br/>, <br />). ถ้าไม่พอ -> ต่อท้าย"""
    if n <= 0:
        return html + "\n" + insert_html

    pattern = re.compile(r"<br\s*/?>", re.IGNORECASE)
    matches = list(pattern.finditer(html))
    if len(matches) < n:
        return html + "\n" + insert_html
    pos = matches[n - 1].end()
    return html[:pos] + "\n" + insert_html + "\n" + html[pos:]


def inject_sub_images_into_content(html: str, img_urls: list[str]) -> str:
    """
    ✅ แทรกรูปรองสูงสุด MAX_INLINE_IMAGES รูป (ค่าเริ่มต้น 5)
    - ถ้ามี </p> -> แทรกแบบกระจายทุก ๆ 2 ย่อหน้า (หลัง p2, p4, p6, ...)
    - ถ้าไม่มี </p> แต่มี <br> -> แทรกแบบกระจายหลัง br (4, 10, 16, 22, 28)
    - ถ้าไม่มีเลย -> ต่อท้ายทั้งหมด
    """
    content = (html or "").strip()
    if not img_urls:
        return content

    # 🔒 ล็อกจำนวนสูงสุด
    img_urls = img_urls[:MAX_INLINE_IMAGES]
    lower = content.lower()

    # 1) มี </p> -> กระจายรูปหลังทุก ๆ 2 ย่อหน้า
    if "</p>" in lower:
        out = content
        for i, url in enumerate(img_urls):
            fig = build_inline_figure(url, i + 1)
            paragraph_index = (i + 1) * 2  # รูป1หลังp2, รูป2หลังp4, ...
            out = insert_after_nth_p(out, fig, paragraph_index)
        return out

    # 2) มี <br> -> กระจายหลัง br (ปรับได้ตามชอบ)
    if "<br" in lower:
        out = content
        br_slots = [4, 10, 16, 22, 28]  # รองรับถึง 5 รูป
        for i, url in enumerate(img_urls):
            fig = build_inline_figure(url, i + 1)
            nth = br_slots[i] if i < len(br_slots) else br_slots[-1]
            out = insert_after_nth_br(out, fig, nth)
        return out

    # 3) ไม่เจออะไรเลย -> ต่อท้าย
    figures = [build_inline_figure(u, i + 1) for i, u in enumerate(img_urls)]
    return content + "\n" + "\n".join(figures)


# ---------------------------
# Route
# ---------------------------
@news_detail_bp.get("/news/<int:news_id>")
def news_detail(news_id: int):
    user_id = session.get("user_id")  # มี login ค่อยได้ค่า ไม่มีก็ None
    user_agent = (request.headers.get("User-Agent") or "")[:255]

    conn = connect_db()
    try:

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

            # ✅ cover image (เก็บเป็น path ก็ได้ / http ก็ได้)
            article["cover_image"] = safe_str(article.get("cover_image"), "")

            # ✅ เตรียมรูปรอง (จำกัด 5 รูป)
            raw_sub = article.get("sub_images")
            sub_list = parse_sub_images(raw_sub)
            sub_urls = [normalize_img_url(p) for p in sub_list if p][:MAX_INLINE_IMAGES]

            # ✅ ทำให้ content เป็นหลาย <p> ก่อน (ถ้าเป็น plain text)
            content = safe_str(article.get("news_content"), "")
            content = ensure_html_has_paragraphs(content)

            # ✅ แทรกรูปรองลงในเนื้อหา
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
            article=article,
            hot=hot,
            related=related,
        )

    finally:
        conn.close()


@news_detail_bp.get("/api/ads/sidebar")
def api_ads_sidebar():
    db = connect_db()
    try:
        with db.cursor() as cur:
            cur.execute("""
                SELECT
                    adv_name,
                    adv_image_url,
                    target_url
                FROM advert
                WHERE status = 'running'
                  AND adv_position = 'SIDEBAR'
                  AND (valid_from IS NULL OR valid_from <= NOW())
                  AND (valid_to IS NULL OR valid_to >= NOW())
                ORDER BY adv_id DESC
                LIMIT 5
            """)
            ads = cur.fetchall()

            for ad in ads:
                ad["target_url"] = ad["target_url"] or "#"

    finally:
        db.close()

    return jsonify({"ok": True, "items": ads})