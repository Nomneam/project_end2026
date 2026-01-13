from flask import Blueprint, render_template, session, jsonify, request
from dotenv import load_dotenv
import pymysql
import os
import pymysql.cursors
import math
import json
import uuid
from werkzeug.utils import secure_filename

load_dotenv()
dashboard_reporter_bp = Blueprint("dashboard_reporter", __name__)

# ---------------- Upload config ----------------
UPLOAD_DIR = os.path.join("static", "uploads", "news")
ALLOWED_EXT = {"png", "jpg", "jpeg", "webp", "gif"}

def allowed_file(filename: str) -> bool:
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_EXT

def save_image(file_storage):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = secure_filename(file_storage.filename)
    ext = filename.rsplit(".", 1)[1].lower()
    new_name = f"{uuid.uuid4().hex}.{ext}"
    full_path = os.path.join(UPLOAD_DIR, new_name)
    file_storage.save(full_path)
    return f"/static/uploads/news/{new_name}"

def safe_int(v, default=None):
    try:
        if v is None or str(v).strip() == "":
            return default
        return int(v)
    except Exception:
        return default

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


# ---------------- Dashboard ----------------
@dashboard_reporter_bp.route("/reporter/dashboard", methods=["GET"])
def reporter_dashboard():
    user = require_reporter()
    if not user:
        return "Forbidden", 403

    user_id = int(user["id"])

    per_page = 5
    page = request.args.get("page", default=1, type=int)
    if page < 1:
        page = 1
    offset = (page - 1) * per_page

    cat_id = (request.args.get("cat_id") or "").strip()
    kind = (request.args.get("kind") or "all").strip()
    status = (request.args.get("status") or "all").strip()

    where = ["n.created_by = %s", "n.del_flg = 0"]
    params = [user_id]

    if cat_id:
        cat_id_int = safe_int(cat_id)
        if cat_id_int is not None:
            where.append("n.cat_id = %s")
            params.append(cat_id_int)
        else:
            cat_id = ""

    if kind == "featured":
        where.append("COALESCE(n.is_featured,0) = 1")
    elif kind == "normal":
        where.append("COALESCE(n.is_featured,0) = 0")

    if status == "publish":
        where.append("n.status = 'publish'")
    elif status == "draft":
        where.append("n.status <> 'publish'")

    where_sql = " AND ".join(where)

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM news
                WHERE created_by = %s AND del_flg = 0
                """,
                (user_id,),
            )
            total_news = int((cursor.fetchone() or {}).get("total") or 0)

            cursor.execute(
                """
                SELECT cat_id, cat_name
                FROM news_category
                WHERE del_flg = 0
                ORDER BY cat_name
                """
            )
            categories = cursor.fetchall() or []

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
        page=page,
        per_page=per_page,
        total_rows=total_rows,
        total_pages=total_pages,
        categories=categories,
        f_cat_id=cat_id,
        f_kind=kind,
        f_status=status,
    )


# ---------------- Soft Delete ----------------
@dashboard_reporter_bp.route("/reporter/news/delete/<int:news_id>", methods=["POST"])
def reporter_soft_delete(news_id):
    user = require_reporter()
    if not user:
        return jsonify({"ok": False, "message": "Forbidden"}), 403

    user_id = int(user["id"])

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT news_id
                FROM news
                WHERE news_id = %s AND created_by = %s AND del_flg = 0
                """,
                (news_id, user_id),
            )
            if not cursor.fetchone():
                return jsonify({"ok": False, "message": "ไม่พบข่าว หรือไม่มีสิทธิ์ลบ"}), 404

            cursor.execute(
                """
                UPDATE news
                SET del_flg = 1,
                    updated_by = %s,
                    updated_at = NOW()
                WHERE news_id = %s
                """,
                (user_id, news_id),
            )

        return jsonify({"ok": True, "message": "ลบข่าวเรียบร้อย"}), 200
    finally:
        conn.close()


# ---------------- Detail (สำคัญ: ต้องมี cat_id/subcat_id) ----------------
@dashboard_reporter_bp.route("/reporter/news/detail/<int:news_id>", methods=["GET"])
def reporter_news_detail(news_id):
    user = require_reporter()
    if not user:
        return jsonify({"ok": False, "message": "Forbidden"}), 403

    user_id = int(user["id"])

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
                    n.updated_at,

                    n.cat_id,       -- ✅ เพิ่ม
                    n.subcat_id,    -- ✅ เพิ่ม

                    n.cover_image,
                    n.sub_images,
                    n.video_url,

                    c.cat_name AS category_name,
                    s.subcat_name AS subcategory_name
                FROM news n
                LEFT JOIN news_category c ON n.cat_id = c.cat_id
                LEFT JOIN news_subcategory s ON n.subcat_id = s.subcat_id
                WHERE n.news_id = %s
                  AND n.created_by = %s
                  AND n.del_flg = 0
                LIMIT 1
                """,
                (news_id, user_id),
            )
            row = cursor.fetchone()
            if not row:
                return jsonify({"ok": False, "message": "ไม่พบข่าว หรือไม่มีสิทธิ์ดู"}), 404

            return jsonify({"ok": True, "data": row}), 200
    finally:
        conn.close()


# ---------------- Subcategories ----------------
@dashboard_reporter_bp.route("/reporter/subcategories", methods=["GET"])
def reporter_subcategories():
    user = require_reporter()
    if not user:
        return jsonify({"ok": False, "message": "Forbidden"}), 403

    cat_id = safe_int(request.args.get("cat_id"))
    if not cat_id:
        return jsonify({"ok": True, "data": []}), 200

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT subcat_id, subcat_name
                FROM news_subcategory
                WHERE del_flg = 0 AND cat_id = %s
                ORDER BY subcat_name
                """,
                (cat_id,),
            )
            rows = cursor.fetchall() or []
        return jsonify({"ok": True, "data": rows}), 200
    finally:
        conn.close()


# ---------------- Update (รองรับรูป) ----------------
@dashboard_reporter_bp.route("/reporter/news/update/<int:news_id>", methods=["POST"])
def reporter_news_update(news_id):
    user = require_reporter()
    if not user:
        return jsonify({"ok": False, "message": "Forbidden"}), 403

    user_id = int(user["id"])

    news_title = (request.form.get("news_title") or "").strip()
    news_content = (request.form.get("news_content") or "").strip()

    cat_id = safe_int(request.form.get("cat_id"))
    subcat_id = safe_int(request.form.get("subcat_id"), default=None)
    is_featured = safe_int(request.form.get("is_featured"), default=0)
    status = (request.form.get("status") or "draft").strip()
    video_url = (request.form.get("video_url") or "").strip()

    if not news_title or not news_content or not cat_id:
        return jsonify({"ok": False, "message": "กรุณากรอกข้อมูลที่จำเป็นให้ครบ"}), 400

    if status not in ("draft", "publish"):
        status = "draft"
    if is_featured not in (0, 1):
        is_featured = 0

    # files + remove flags
    cover_file = request.files.get("cover_image")          # single
    sub_files = request.files.getlist("sub_images")        # multiple
    remove_cover = (request.form.get("remove_cover") or "0").strip() == "1"
    remove_subs = (request.form.get("remove_subs") or "0").strip() == "1"

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            # load old
            cursor.execute(
                """
                SELECT cover_image, sub_images, published_at
                FROM news
                WHERE news_id=%s AND created_by=%s AND del_flg=0
                """,
                (news_id, user_id),
            )
            old = cursor.fetchone()
            if not old:
                return jsonify({"ok": False, "message": "ไม่พบข่าว หรือไม่มีสิทธิ์แก้ไข"}), 404

            new_cover = old.get("cover_image")
            old_sub_raw = old.get("sub_images")

            # cover
            if remove_cover:
                new_cover = None
            elif cover_file and cover_file.filename:
                if not allowed_file(cover_file.filename):
                    return jsonify({"ok": False, "message": "ไฟล์รูปปกไม่รองรับ"}), 400
                new_cover = save_image(cover_file)

            # subs
            if remove_subs:
                new_subs = []
            elif sub_files and any(f and f.filename for f in sub_files):
                new_subs = []
                for f in sub_files:
                    if not f or not f.filename:
                        continue
                    if not allowed_file(f.filename):
                        return jsonify({"ok": False, "message": "มีไฟล์รูปรองที่ไม่รองรับ"}), 400
                    new_subs.append(save_image(f))
            else:
                try:
                    new_subs = json.loads(old_sub_raw) if old_sub_raw else []
                    if not isinstance(new_subs, list):
                        new_subs = []
                except Exception:
                    new_subs = []

            cursor.execute(
                """
                UPDATE news
                SET
                  news_title=%s,
                  news_content=%s,
                  cat_id=%s,
                  subcat_id=%s,
                  is_featured=%s,
                  status=%s,
                  cover_image=%s,
                  sub_images=%s,
                  updated_by=%s,
                  updated_at=NOW(),
                  published_at = CASE
                    WHEN %s = 'publish' AND published_at IS NULL THEN NOW()
                    WHEN %s <> 'publish' THEN NULL
                    ELSE published_at
                  END
                WHERE news_id=%s
                """,
                (
                    news_title, news_content, cat_id, subcat_id,
                    is_featured, status,
                    new_cover,
                    json.dumps(new_subs, ensure_ascii=False),
                    user_id,
                    status, status,
                    news_id,
                ),
            )

        return jsonify({"ok": True, "message": "บันทึกการแก้ไขเรียบร้อย"}), 200
    finally:
        conn.close()
