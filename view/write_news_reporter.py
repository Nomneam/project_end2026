from flask import Blueprint, request, session, render_template, redirect, url_for, jsonify
from dotenv import load_dotenv
import os
import json
import base64
import pymysql
import pymysql.cursors

load_dotenv()

write_news_reporter_bp = Blueprint("write_news_reporter", __name__)

def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT")),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )

ALLOWED_EXT = {"png", "jpg", "jpeg", "webp"}
ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp"}

def allowed_file(filename: str) -> bool:
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_EXT

def file_to_data_uri(file_storage):
    """
    เก็บเป็น Data URI: data:image/...;base64,XXXX
    เอาไปแสดงผลได้ทันที <img src="...">
    """
    if not file_storage or not file_storage.filename:
        return None

    if not allowed_file(file_storage.filename):
        return None

    mime = (file_storage.mimetype or "").lower()
    if mime not in ALLOWED_MIME:
        return None

    try:
        raw = file_storage.read()
        if not raw:
            return None
        b64 = base64.b64encode(raw).decode("utf-8")
        return f"data:{mime};base64,{b64}"
    finally:
        try:
            file_storage.seek(0)
        except Exception:
            pass

# ======================================================
# 1) GET เปิดหน้าเขียนข่าว
# ======================================================
@write_news_reporter_bp.route("/reporter/write_news", methods=["GET"])
def reporter_news_create():
    user = session.get("user")
    if not user:
        return redirect(url_for("login_emp.login_emp"))

    if user.get("role_id") != 2:
        return "Forbidden", 403

    conn = connect_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT cat_id, cat_name
        FROM news_category
        WHERE is_active = 1 AND del_flg = 0
        ORDER BY cat_id ASC
    """)
    categories = cur.fetchall()
    cur.close()
    conn.close()

    return render_template("reporter/reporter-write-news.html", categories=categories)


# ======================================================
# 2) POST บันทึกข่าว (Base64 ลง DB)
#    - cover_image: LONGTEXT (data uri)
#    - sub_images : LONGTEXT (json list of data uri)
# ======================================================
@write_news_reporter_bp.route("/reporter/write_news", methods=["POST"])
def reporter_news_create_post():
    user = session.get("user")
    if not user:
        return jsonify(ok=False, message="not logged in"), 401
    if user.get("role_id") != 2:
        return jsonify(ok=False, message="forbidden"), 403

    # --- fields from form (ตรงกับ HTML) ---
    news_title = (request.form.get("title") or "").strip()
    news_content = (request.form.get("content") or "").strip()

    cat_id = int(request.form.get("cat_id") or 0)
    subcat_id = int(request.form.get("subcat_id") or 0)

    news_type = (request.form.get("newsType") or "regular").strip()
    is_featured = 1 if news_type == "featured" else 0

    submit_action = (request.form.get("submit_action") or "publish").strip().lower()
    status = "draft" if submit_action == "draft" else "publish"  # enum ใน DB

    if not news_title or not news_content or cat_id <= 0 or subcat_id <= 0:
        return jsonify(ok=False, message="กรุณากรอกข้อมูลให้ครบ"), 400

    # --- images ---
    main_image = request.files.get("main_image")
    sub_images = request.files.getlist("sub_images")

    if not main_image or not main_image.filename:
        return jsonify(ok=False, message="กรุณาเลือกรูปหลัก"), 400

    # ✅ main -> data uri
    cover_data_uri = file_to_data_uri(main_image)
    if not cover_data_uri:
        return jsonify(ok=False, message="ไฟล์รูปหลักไม่ถูกต้อง (รองรับ png/jpg/jpeg/webp)"), 400

    # ✅ subs -> list of data uri
    sub_list = []
    for f in sub_images:
        if not f or not f.filename:
            continue
        data_uri = file_to_data_uri(f)
        if data_uri:
            sub_list.append(data_uri)

    sub_images_json = json.dumps(sub_list, ensure_ascii=False)

    created_by = user.get("user_id") or user.get("id") or None
    updated_by = created_by

    conn = connect_db()
    try:
        cur = conn.cursor()
        # ✅ สำคัญ: ใช้ชื่อคอลัมน์ให้ตรง DB ของคุณ (จากรูป HeidiSQL)
        cur.execute("""
            INSERT INTO news
              (cat_id, subcat_id, news_title, is_featured,
               news_content, cover_image, sub_images,
               video_url, status, published_at,
               created_by, updated_by, del_flg)
            VALUES
              (%s, %s, %s, %s,
               %s, %s, %s,
               NULL, %s, IF(%s='publish', CURRENT_TIMESTAMP, NULL),
               %s, %s, 0)
        """, (
            cat_id, subcat_id, news_title, is_featured,
            news_content, cover_data_uri, sub_images_json,
            status, status,
            created_by, updated_by
        ))

        news_id = cur.lastrowid
        conn.commit()

        return jsonify(ok=True, message="บันทึกข่าวสำเร็จ", data={"news_id": news_id, "status": status})

    except Exception as e:
        conn.rollback()
        return jsonify(ok=False, message=f"บันทึกข่าวไม่สำเร็จ: {e}"), 500

    finally:
        conn.close()


# ======================================================
# 3) API ดึงประเภทย่อย
# ======================================================
@write_news_reporter_bp.route("/api/news/subcategories", methods=["GET"])
def api_news_subcategories():
    user = session.get("user")
    if not user:
        return jsonify(ok=False, message="not logged in"), 401
    if user.get("role_id") != 2:
        return jsonify(ok=False, message="forbidden"), 403

    cat_id = request.args.get("cat_id", type=int)
    if not cat_id:
        return jsonify(ok=False, message="cat_id required"), 400

    conn = connect_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT subcat_id, subcat_name
        FROM news_subcategory
        WHERE cat_id = %s
          AND is_active = 1
          AND del_flg = 0
        ORDER BY subcat_id ASC
    """, (cat_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify(ok=True, data=rows)
