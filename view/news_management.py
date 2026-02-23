from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime
import base64
import json

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
# IMAGE VALIDATION (BASE64)
# =========================
ALLOWED_EXT = {"png", "jpg", "jpeg", "webp"}
ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp"}

def allowed_file(filename: str) -> bool:
    if not filename or "." not in filename:
        return False
    return filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT

def file_to_data_uri(file_storage):
    if not file_storage or not file_storage.filename:
        return None

    if not allowed_file(file_storage.filename):
        return None

    mime = (file_storage.mimetype or "").lower()
    if mime not in ALLOWED_MIME:
        return None

    raw = file_storage.read()
    if not raw:
        return None

    return f"data:{mime};base64,{base64.b64encode(raw).decode('utf-8')}"

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
                    n.video_url,
                    n.cat_id,
                    n.subcat_id,

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

    title = request.form.get("title")
    content = request.form.get("content")
    status = request.form.get("status")
    cat_id = request.form.get("cat_id", type=int)
    subcat_id = request.form.get("subcat_id", type=int)
    video_url = request.form.get("video_url")

    main_image = request.files.get("main_image")
    sub_images = request.files.getlist("sub_images")

    if not title or not content:
        return jsonify(success=False, message="กรอกข้อมูลไม่ครบ"), 400

    conn = connect_db()
    try:
        with conn.cursor() as cursor:

            cursor.execute("""
                SELECT cover_image, sub_images 
                FROM news 
                WHERE news_id=%s
            """, (news_id,))
            old = cursor.fetchone()

            if not old:
                return jsonify(success=False, message="ไม่พบข่าว"), 404

            cover_image = old["cover_image"]
            old_sub_images = old["sub_images"]

            # ==========================
            # รูปปก
            # ==========================
            if main_image and main_image.filename:
                new_cover = file_to_data_uri(main_image)
                if not new_cover:
                    return jsonify(success=False, message="ไฟล์รูปไม่ถูกต้อง"), 400
                cover_image = new_cover

            # ==========================
            # รูปย่อย (หลายรูป)
            # ==========================

            deleted_sub_images = request.form.get("deleted_sub_images")

            # โหลดรูปเก่า
            if old_sub_images:
                try:
                    current_images = json.loads(old_sub_images)
                except:
                    current_images = []
            else:
                current_images = []

            # ลบรูปที่ถูกเลือก
            if deleted_sub_images:
                try:
                    deleted_list = json.loads(deleted_sub_images)
                    current_images = [
                        img for img in current_images
                        if img not in deleted_list
                    ]
                except:
                    pass

            # เพิ่มรูปใหม่
            for img in sub_images:
                if img and img.filename:
                    img_data = file_to_data_uri(img)
                    if img_data:
                        current_images.append(img_data)

            # แปลงกลับเป็น JSON
            final_sub_images = json.dumps(current_images) if current_images else None

            # ==========================
            # UPDATE
            # ==========================
            cursor.execute("""
                UPDATE news
                SET news_title=%s,
                    news_content=%s,
                    status=%s,
                    cat_id=%s,
                    subcat_id=%s,
                    cover_image=%s,
                    sub_images=%s,
                    video_url=%s,
                    updated_at=NOW(),
                    updated_by=%s
                WHERE news_id=%s
            """, (
                title,
                content,
                status,
                cat_id,
                subcat_id,
                cover_image,
                final_sub_images,
                video_url,
                user.get("id"),
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