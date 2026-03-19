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

news_management_bp = Blueprint('news_management', __name__)

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
        cursorclass=pymysql.cursors.DictCursor
    )
    
# =========================
# UPLOAD CONFIG
# =========================
BASE_UPLOAD_DIR = os.path.join("static", "uploads", "news")
COVER_DIR = os.path.join(BASE_UPLOAD_DIR, "cover")
SUB_DIR = os.path.join(BASE_UPLOAD_DIR, "sub")

ALLOWED_EXT = {"png", "jpg", "jpeg", "webp", "gif"}

def allowed_file(filename: str):
    if not filename or "." not in filename:
        return False
    return filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT


def save_image(file_storage, kind="cover"):

    if not file_storage or not file_storage.filename:
        return None

    filename = secure_filename(file_storage.filename)

    if not allowed_file(filename):
        return None

    kind = kind.lower()

    if kind == "sub":
        folder = SUB_DIR
    else:
        folder = COVER_DIR

    os.makedirs(folder, exist_ok=True)

    ext = filename.rsplit(".", 1)[1].lower()

    new_name = f"{uuid.uuid4().hex}.{ext}"

    full_path = os.path.join(folder, new_name)

    file_storage.save(full_path)

    return f"uploads/news/{kind}/{new_name}"



# =====================================================
# 1) หน้า Admin จัดการข่าว
# =====================================================
@news_management_bp.route('/news-management')
def news_management():

    user = session.get("user")
    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))

    page = request.args.get('page', 1, type=int)
    per_page = 5
    offset = (page - 1) * per_page

    connection = connect_db()
    try:
        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT COUNT(*) AS total
                FROM news
                WHERE del_flg = 0
            """)
            total_news = cursor.fetchone()['total']
            total_pages = (total_news + per_page - 1) // per_page

            cursor.execute("""
                SELECT
                    n.news_id,
                    n.news_title,
                    n.status,
                    n.created_at,
                    e.emp_fname,
                    e.emp_lname,
                    c.cat_name
                FROM news n
                LEFT JOIN employee e ON n.created_by = e.emp_id
                LEFT JOIN news_category c ON n.cat_id = c.cat_id
                WHERE n.del_flg = 0
                ORDER BY n.created_at DESC
                LIMIT %s OFFSET %s
            """, (per_page, offset))

            news_list = cursor.fetchall()

            cursor.execute("""
                SELECT cat_id, cat_name
                FROM news_category
                WHERE del_flg = 0
            """)
            categories = cursor.fetchall()

    finally:
        connection.close()

    return render_template(
        'admin/news-management.html',
        news_list=news_list,
        categories=categories,
        page=page,
        total_pages=total_pages
    )

# =====================================================
# 2) ดึงข่าวตาม ID
# =====================================================
@news_management_bp.route('/news-management/<int:news_id>')
def get_news_by_id(news_id):

    user = session.get("user")
    if not user or not user.get("id"):
        return jsonify(success=False, message="Unauthorized"), 401

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    n.news_id,
                    n.news_title,
                    n.news_content,
                    n.status,
                    n.created_at,
                    n.cover_image,
                    n.sub_images,
                    n.video_path,
                    n.cat_id,
                    n.subcat_id,
                    n.is_featured,

                    -- ผู้เขียน
                    IFNULL(e.emp_fname, '') AS emp_fname,
                    IFNULL(e.emp_lname, '') AS emp_lname,

                    -- หมวดหลัก
                    IFNULL(c.cat_name, '-') AS cat_name,

                    -- หมวดย่อย
                    IFNULL(s.subcat_name, '') AS subcat_name

                FROM news n
                LEFT JOIN employee e 
                    ON n.created_by = e.emp_id
                LEFT JOIN news_category c 
                    ON n.cat_id = c.cat_id
                    AND c.del_flg = 0
                LEFT JOIN news_subcategory s
                    ON n.subcat_id = s.subcat_id
                    AND s.del_flg = 0

                WHERE n.news_id = %s
                  AND n.del_flg = 0
                LIMIT 1
            """, (news_id,))

            news = cursor.fetchone()

            if not news:
                return jsonify(success=False, message="ไม่พบข่าว"), 404

    finally:
        conn.close()

    return jsonify(success=True, data=news)

# =====================================================
# 3) ดึงหมวดย่อย
# =====================================================
@news_management_bp.route('/admin/categories/<int:cat_id>/subcategories')
def get_subcategories(cat_id):

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT subcat_id, subcat_name
                FROM news_subcategory
                WHERE cat_id = %s AND del_flg = 0
                ORDER BY subcat_name
            """, (cat_id,))
            rows = cursor.fetchall()
    finally:
        conn.close()

    return jsonify(success=True, data=rows)

# =====================================================
# 4) ลบข่าว (Soft Delete)
# =====================================================
@news_management_bp.route('/admin/news/delete/<int:news_id>', methods=['POST'])
def delete_news(news_id):

    user = session.get("user")
    if not user or not user.get("id"):
        return jsonify(success=False, message="Unauthorized"), 401

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE news
                SET del_flg = 1,
                    updated_at = NOW(),
                    updated_by = %s
                WHERE news_id = %s
            """, (user.get("id"), news_id))
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify(success=False, message=str(e)), 500
    finally:
        conn.close()

    return jsonify(success=True, message="ลบสำเร็จ")

# =====================================================
# 5) แก้ไขข่าว
# =====================================================
@news_management_bp.route('/admin/news/<int:news_id>/update', methods=['POST'])
def update_news(news_id):

    user = session.get("user")
    if not user or not user.get("id"):
        return jsonify(success=False, message="Unauthorized"), 401

    user_id = user.get("id")

    title = (request.form.get("title") or "").strip()
    content = (request.form.get("content") or "").strip()
    status = (request.form.get("status") or "draft").strip()

    cat_id = request.form.get("cat_id", type=int)
    subcat_id = request.form.get("subcat_id", type=int)

    video_path = (request.form.get("video_url") or "").strip()

    # ✅ FIX: รับ is_featured
    is_featured = request.form.get("is_featured", type=int, default=0)

    main_image = request.files.get("cover_image")
    sub_images = request.files.getlist("sub_images")

    remove_cover = (request.form.get("remove_cover") or "0") == "1"
    remove_subs = (request.form.get("remove_subs") or "0") == "1"

    deleted_sub_images = request.form.get("deleted_sub_images")

    if not title or not content:
        return jsonify(success=False, message="กรอกข้อมูลไม่ครบ"), 400

    conn = connect_db()

    try:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT cover_image, sub_images
                FROM news
                WHERE news_id=%s AND del_flg=0
            """, (news_id,))

            old = cursor.fetchone()

            if not old:
                return jsonify(success=False, message="ไม่พบข่าว"), 404

            # ================= COVER =================
            old_cover = (old.get("cover_image") or "").strip()

            if remove_cover:
                final_cover = None

            elif main_image and main_image.filename:
                new_cover = save_image(main_image, "cover")

                if not new_cover:
                    return jsonify(success=False, message="ไฟล์รูปไม่ถูกต้อง"), 400

                final_cover = new_cover
            else:
                final_cover = old_cover

            # ================= SUB IMAGES =================
            old_sub_raw = old.get("sub_images")

            try:
                old_subs = json.loads(old_sub_raw) if old_sub_raw else []
                if not isinstance(old_subs, list):
                    old_subs = []
            except:
                old_subs = []

            if remove_subs:
                final_subs = []
            else:
                deleted = []

                if deleted_sub_images:
                    try:
                        deleted = json.loads(deleted_sub_images)
                    except:
                        deleted = []

                old_subs = [img for img in old_subs if img not in deleted]

                picked = [f for f in (sub_images or []) if f and f.filename]

                for f in picked:
                    p = save_image(f, "sub")

                    if not p:
                        return jsonify(success=False, message="ไฟล์รูปรองไม่ถูกต้อง"), 400

                    old_subs.append(p)

                # จำกัด 5 รูป
                final_subs = old_subs[:5]

            # ================= UPDATE =================
            cursor.execute("""
                UPDATE news
                SET
                    news_title=%s,
                    news_content=%s,
                    status=%s,
                    cat_id=%s,
                    subcat_id=%s,
                    video_path=%s,
                    cover_image=%s,
                    sub_images=%s,
                    updated_at=NOW(),
                    is_featured=%s,
                    updated_by=%s
                WHERE news_id=%s
            """, (
                title,
                content,
                status,
                cat_id,
                subcat_id,
                video_path if video_path else None,
                final_cover,
                json.dumps(final_subs, ensure_ascii=False),
                is_featured,   # ✅ สำคัญ
                user_id,
                news_id
            ))

        conn.commit()

    except Exception as e:
        conn.rollback()
        return jsonify(success=False, message=str(e)), 500

    finally:
        conn.close()

    return jsonify(success=True, message="แก้ไขสำเร็จ")


# =====================================================
# 6) Dashboard Chart API
# =====================================================
@news_management_bp.route('/api/news/today-by-category')
def api_news_today_by_category():

    user = session.get("user")
    if not user or not user.get("id"):
        return jsonify(success=False, message="Unauthorized"), 401

    range_type = request.args.get("range", "all")  # day | week | month | year | all

    # ===== เงื่อนไขวันที่ =====
    if range_type == "day":
        date_condition = """
            n.created_at >= CURDATE()
            AND n.created_at < CURDATE() + INTERVAL 1 DAY
        """
    elif range_type == "week":
        date_condition = """
            n.created_at >= CURDATE() - INTERVAL 7 DAY
        """
    elif range_type == "month":
        date_condition = """
            n.created_at >= CURDATE() - INTERVAL 30 DAY
        """
    elif range_type == "year":
        date_condition = """
            n.created_at >= CURDATE() - INTERVAL 1 YEAR
        """
    else:  # all
        date_condition = "1=1"

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            sql = f"""
                SELECT 
                    IFNULL(c.cat_name, 'ไม่ระบุหมวด') AS cat_name,
                    COUNT(n.news_id) AS total
                FROM news n
                LEFT JOIN news_category c 
                    ON n.cat_id = c.cat_id
                    AND c.del_flg = 0
                WHERE n.del_flg = 0
                  AND {date_condition}
                GROUP BY n.cat_id
                ORDER BY total DESC
            """
            cursor.execute(sql)
            rows = cursor.fetchall()

        return jsonify(
            success=True,
            labels=[r["cat_name"] for r in rows],
            values=[r["total"] for r in rows],
            range=range_type
        )

    except Exception as e:
        return jsonify(success=False, message=str(e)), 500
    finally:
        conn.close()