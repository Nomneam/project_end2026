from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime
import json
import uuid
from werkzeug.utils import secure_filename

load_dotenv()

admin_writenew_bp = Blueprint('admin_writenew', __name__)

# =========================
# DATABASE
# =========================
def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )

# =========================
# FILE CONFIG
# =========================
UPLOAD_FOLDER = "static/uploads/news"
ALLOWED_EXT = {"png", "jpg", "jpeg", "webp"}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename: str) -> bool:
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_EXT

def save_file(file_storage):
    if not file_storage or not file_storage.filename:
        return None

    if not allowed_file(file_storage.filename):
        return None

    filename = secure_filename(file_storage.filename)
    ext = filename.rsplit(".", 1)[1].lower()

    new_filename = f"{uuid.uuid4().hex}.{ext}"
    save_path = os.path.join(UPLOAD_FOLDER, new_filename)

    file_storage.save(save_path)

    return f"/{UPLOAD_FOLDER}/{new_filename}"


# ======================================================
# 1) GET หน้าเขียนข่าว
# ======================================================
@admin_writenew_bp.route('/admin-write-new', methods=["GET"])
def admin_writenew():
    user = session.get("user")
    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))

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

    return render_template('admin/admin-writenew.html', user=user, categories=categories)


# ======================================================
# 2) POST บันทึกข่าว
# ======================================================
@admin_writenew_bp.route('/admin-write-new', methods=["POST"])
def admin_writenew_post():
    user = session.get("user")
    if not user or not user.get("id"):
        return jsonify(ok=False, message="not logged in"), 401

    title = (request.form.get("title") or "").strip()
    content = (request.form.get("content") or "").strip()
    cat_id = int(request.form.get("cat_id") or 0)
    subcat_id = int(request.form.get("subcat_id") or 0)

    news_type = (request.form.get("newsType") or "regular").strip()
    is_featured = 1 if news_type == "featured" else 0

    submit_action = (request.form.get("submit_action") or "publish").strip().lower()
    status = "draft" if submit_action == "draft" else "publish"

    if not title or not content or cat_id <= 0 or subcat_id <= 0:
        return jsonify(ok=False, message="กรุณากรอกข้อมูลให้ครบ"), 400

    main_image = request.files.get("main_image")
    sub_images = request.files.getlist("sub_images")

    if not main_image or not main_image.filename:
        return jsonify(ok=False, message="กรุณาเลือกรูปหลัก"), 400

    # 🔥 บันทึกรูปหลักเป็น path
    cover_path = save_file(main_image)
    if not cover_path:
        return jsonify(ok=False, message="ไฟล์รูปหลักไม่ถูกต้อง"), 400

    # 🔥 บันทึกรูปย่อย
    sub_list = []
    for f in sub_images:
        if f and f.filename:
            path = save_file(f)
            if path:
                sub_list.append(path)

    sub_images_json = json.dumps(sub_list, ensure_ascii=False)

    created_by = user.get("id")
    updated_by = user.get("id")

    conn = connect_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO news
              (cat_id, subcat_id, news_title, is_featured,
               news_content, cover_image, sub_images,
               status, published_at,
               created_by, updated_by, del_flg)
            VALUES
              (%s, %s, %s, %s,
               %s, %s, %s,
               %s, IF(%s='publish', NOW(), NULL),
               %s, %s, 0)
        """, (
            cat_id, subcat_id, title, is_featured,
            content, cover_path, sub_images_json,
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
# 3) API ดึงประเภทย่อย (Admin)
# ======================================================
@admin_writenew_bp.route("/api/admin/news/subcategories", methods=["GET"])
def api_admin_news_subcategories():
    user = session.get("user")
    if not user or not user.get("id"):
        return jsonify(ok=False, message="not logged in"), 401

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
