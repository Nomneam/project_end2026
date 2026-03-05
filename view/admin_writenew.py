from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
import json
import uuid
from werkzeug.utils import secure_filename

load_dotenv()

admin_writenew_bp = Blueprint("admin_writenew", __name__)

MAX_SUB_IMAGES = 5

# ======================================================
# DATABASE
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
# Upload config (เหมือน Reporter)
# ======================================================
BASE_UPLOAD_DIR = os.path.join("static", "uploads", "news")
COVER_DIR = os.path.join(BASE_UPLOAD_DIR, "cover")
SUB_DIR = os.path.join(BASE_UPLOAD_DIR, "sub")

ALLOWED_EXT = {"png", "jpg", "jpeg", "webp"}

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

    kind = (kind or "cover").lower().strip()
    if kind not in ("cover", "sub"):
        kind = "cover"

    target_dir = COVER_DIR if kind == "cover" else SUB_DIR
    os.makedirs(target_dir, exist_ok=True)

    ext = filename.rsplit(".", 1)[1].lower()
    new_name = f"{uuid.uuid4().hex}.{ext}"
    full_path = os.path.join(target_dir, new_name)
    file_storage.save(full_path)

    # ✅ เก็บ path เหมือน reporter
    return f"uploads/news/{kind}/{new_name}"


# ======================================================
# 1) GET หน้าเขียนข่าว (Admin)
# ======================================================
@admin_writenew_bp.route("/admin-write-new", methods=["GET"])
def admin_writenew():
    user = session.get("user")
    if not user:
        return redirect(url_for("login_emp.login_emp"))

    # ถ้าอยากจำกัด role ก็ใส่เพิ่มตรงนี้ได้
    # if user.get("role_id") != 1:
    #     return "Forbidden", 403

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

    return render_template(
        "admin/admin-writenew.html",
        user=user,
        categories=categories
    )


# ======================================================
# 2) POST บันทึกข่าว (เหมือน Reporter)
# ======================================================
@admin_writenew_bp.route("/admin-write-new", methods=["POST"])
def admin_writenew_post():
    user = session.get("user")
    if not user:
        return jsonify(ok=False, message="not logged in"), 401

    title = (request.form.get("title") or "").strip()
    content = (request.form.get("content") or "").strip()
    cat_id = int(request.form.get("cat_id") or 0)

    # ✅ subcat ไม่บังคับ
    raw_subcat = (request.form.get("subcat_id") or "").strip()
    subcat_id = None
    try:
        if raw_subcat:
            v = int(raw_subcat)
            if v > 0:
                subcat_id = v
    except Exception:
        subcat_id = None

    news_type = (request.form.get("newsType") or "regular").strip()
    is_featured = 1 if news_type == "featured" else 0

    submit_action = (request.form.get("submit_action") or "publish").strip().lower()
    status = "draft" if submit_action == "draft" else "publish"

    # ✅ validate (ไม่บังคับ subcat)
    if not title or not content or cat_id <= 0:
        return jsonify(ok=False, message="กรุณากรอกข้อมูลให้ครบ"), 400

    # --- images ---
    main_image = request.files.get("main_image")
    sub_images = request.files.getlist("sub_images")

    if not main_image or not main_image.filename:
        return jsonify(ok=False, message="กรุณาเลือกรูปหลัก"), 400

    cover_path = save_image(main_image, "cover")
    if not cover_path:
        return jsonify(ok=False, message="ไฟล์รูปหลักไม่ถูกต้อง (รองรับ png/jpg/jpeg/webp)"), 400

    # ✅ จำกัดสูงสุด 5 รูป
    sub_list = []
    for f in (sub_images or [])[:MAX_SUB_IMAGES]:
        if not f or not f.filename:
            continue
        p = save_image(f, "sub")
        if p:
            sub_list.append(p)

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
    updated_by = created_by

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
                   NULL, %s, IF(%s='publish', CURRENT_TIMESTAMP, NULL),
                   %s, %s, 0)
            """, (
                cat_id, subcat_id, title, is_featured,
                content, cover_path, sub_images_json,
                video_path,
                status, status,
                created_by, updated_by
            ))

            news_id = cur.lastrowid

        conn.commit()
        return jsonify(
            ok=True,
            message="เพิ่มข่าวสำเร็จ",
            data={"news_id": news_id, "status": status}
        )

    except Exception as e:
        conn.rollback()
        return jsonify(ok=False, message=f"บันทึกข่าวไม่สำเร็จ: {e}"), 500

    finally:
        conn.close()


# ======================================================
# 3) API ดึงประเภทย่อย (เหมือน Reporter)
# ======================================================
@admin_writenew_bp.route("/api/admin/news/subcategories", methods=["GET"])
def api_admin_news_subcategories():
    user = session.get("user")
    if not user:
        return jsonify(ok=False, message="not logged in"), 401

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