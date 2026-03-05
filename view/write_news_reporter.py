from flask import Blueprint, request, session, render_template, redirect, url_for, jsonify
from dotenv import load_dotenv
import os
import json
import uuid
import pymysql
import pymysql.cursors
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge

load_dotenv()

write_news_reporter_bp = Blueprint("write_news_reporter", __name__)

# ======================================================
# Upload config
# ======================================================
BASE_UPLOAD_DIR = os.path.join("static", "uploads", "news")

COVER_DIR = os.path.join(BASE_UPLOAD_DIR, "cover")
SUB_DIR = os.path.join(BASE_UPLOAD_DIR, "sub")
VIDEO_DIR = os.path.join(BASE_UPLOAD_DIR, "video")

ALLOWED_EXT = {"png", "jpg", "jpeg", "webp"}

MAX_SUB_IMAGES = 5

ROLE_REPORTER = 2


# ======================================================
# DB
# ======================================================
def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT") or 3306),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
        charset="utf8mb4",
    )


# ======================================================
# Image
# ======================================================
def allowed_file(filename: str) -> bool:
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_EXT


def save_image(file_storage, kind: str = "cover"):
    if not file_storage or not file_storage.filename:
        return None

    filename = secure_filename(file_storage.filename)
    if not allowed_file(filename):
        return None

    kind = kind.lower().strip()
    if kind not in ("cover", "sub"):
        kind = "cover"

    target_dir = COVER_DIR if kind == "cover" else SUB_DIR
    os.makedirs(target_dir, exist_ok=True)

    ext = filename.rsplit(".", 1)[1].lower()
    new_name = f"{uuid.uuid4().hex}.{ext}"
    full_path = os.path.join(target_dir, new_name)
    file_storage.save(full_path)

    return f"uploads/news/{kind}/{new_name}"




# ======================================================
# GET Page
# ======================================================
@write_news_reporter_bp.route("/reporter/write_news", methods=["GET"])
def reporter_news_create():
    user = session.get("user")
    if not user:
        return redirect(url_for("login_emp.login_emp"))

    if user.get("role_id") != ROLE_REPORTER:
        return "Forbidden", 403

    conn = connect_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT cat_id, cat_name
                FROM news_category
                WHERE is_active = 1 AND del_flg = 0
                ORDER BY cat_id ASC
            """)
            categories = cur.fetchall() or []
    finally:
        conn.close()

    return render_template("reporter/reporter-write-news.html", categories=categories)


# ======================================================
# POST Save News
# ======================================================
@write_news_reporter_bp.route("/reporter/write_news", methods=["POST"])
def reporter_news_create_post():
    user = session.get("user")
    if not user:
        return jsonify(ok=False, message="not logged in"), 401
    if user.get("role_id") != ROLE_REPORTER:
        return jsonify(ok=False, message="forbidden"), 403

    news_title = (request.form.get("title") or "").strip()
    news_content = (request.form.get("content") or "").strip()
    cat_id = int(request.form.get("cat_id") or 0)

    raw_subcat = (request.form.get("subcat_id") or "").strip()
    subcat_id = int(raw_subcat) if raw_subcat.isdigit() else None

    news_type = (request.form.get("newsType") or "regular").strip()
    is_featured = 1 if news_type == "featured" else 0

    submit_action = (request.form.get("submit_action") or "publish").strip().lower()
    status = "draft" if submit_action == "draft" else "publish"

    if not news_title or not news_content or cat_id <= 0:
        return jsonify(ok=False, message="กรุณากรอกข้อมูลให้ครบ"), 400

    saved_files = []

    # ======================
    # IMAGE
    # ======================
    main_image = request.files.get("main_image")
    if not main_image or not main_image.filename:
        return jsonify(ok=False, message="กรุณาเลือกรูปหลัก"), 400

    cover_path = save_image(main_image, "cover")
    if not cover_path:
        return jsonify(ok=False, message="ไฟล์รูปหลักไม่ถูกต้อง"), 400

    saved_files.append(os.path.join("static", cover_path))

    sub_images = request.files.getlist("sub_images")
    sub_list = []

    for f in (sub_images or [])[:MAX_SUB_IMAGES]:
        p = save_image(f, "sub")
        if p:
            sub_list.append(p)
            saved_files.append(os.path.join("static", p))

    sub_images_json = json.dumps(sub_list, ensure_ascii=False)
    
    # ======================
    # VIDEO (URL)
    # ======================
    video_path = (request.form.get("video_path") or "").strip()

    if not video_path:
        video_path = None
        
    if video_path and not video_path.startswith(("http://", "https://")):
        return jsonify(ok=False, message="Video URL ไม่ถูกต้อง"), 400

    created_by = user.get("user_id") or user.get("id")

    # ======================
    # INSERT DB
    # ======================
    conn = connect_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO news
                  (cat_id, subcat_id, news_title, is_featured,
                   news_content, cover_image, sub_images,
                   video_path, status, published_at,
                   created_by, updated_by, del_flg)
                VALUES
                  (%s, %s, %s, %s,
                   %s, %s, %s,
                   %s, %s, IF(%s='publish', CURRENT_TIMESTAMP, NULL),
                   %s, %s, 0)
            """, (
                cat_id, subcat_id, news_title, is_featured,
                news_content, cover_path, sub_images_json,
                video_path,
                status, status,
                created_by, created_by
            ))

            news_id = cur.lastrowid

        conn.commit()

        return jsonify(ok=True, message="บันทึกข่าวสำเร็จ", data={
            "news_id": news_id,
            "status": status
        })

    except Exception as e:
        conn.rollback()

        return jsonify(ok=False, message=f"บันทึกข่าวไม่สำเร็จ: {e}"), 500

    finally:
        conn.close()


# ======================================================
# API Subcategory
# ======================================================
@write_news_reporter_bp.route("/api/news/subcategories", methods=["GET"])
def api_news_subcategories():
    user = session.get("user")
    if not user:
        return jsonify(ok=False, message="not logged in"), 401
    if user.get("role_id") != ROLE_REPORTER:
        return jsonify(ok=False, message="forbidden"), 403

    cat_id = request.args.get("cat_id", type=int)
    if not cat_id:
        return jsonify(ok=False, message="cat_id required"), 400

    conn = connect_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT subcat_id, subcat_name
                FROM news_subcategory
                WHERE cat_id = %s
                  AND is_active = 1
                  AND del_flg = 0
                ORDER BY subcat_id ASC
            """, (cat_id,))
            rows = cur.fetchall() or []
    finally:
        conn.close()

    return jsonify(ok=True, data=rows)