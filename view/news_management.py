from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime
import base64

# โหลดค่าคอนฟิกจากไฟล์ .env
load_dotenv()

news_management_bp = Blueprint('news_management', __name__)


def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor
    )

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
# 1) หน้า จัดการข่าว (Admin)
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

            # ===== นับจำนวนข่าวทั้งหมด =====
            cursor.execute("""
                SELECT COUNT(*) AS total
                FROM news
                WHERE del_flg = 0
            """)
            total_news = cursor.fetchone()['total']
            total_pages = (total_news + per_page - 1) // per_page

            # ===== ดึงข่าว (เฉพาะข้อมูลที่จำเป็น) =====
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

            # ===== หมวดหมู่ข่าว =====
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
# 2) API ดึงข้อมูลข่าวตาม ID (Admin)
# =====================================================
@news_management_bp.route('/news-management/<int:news_id>', methods=['GET'])
def get_news_by_id(news_id):
    user = session.get("user")
    if not user or not user.get("id"):
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    n.news_id,
                    n.news_title,
                    n.status,
                    n.created_at,
                    n.news_content,
                    n.cover_image,
                    n.cat_id,
                    n.subcat_id,
                    e.emp_fname,
                    e.emp_lname,
                    c.cat_name
                FROM news n
                LEFT JOIN employee e ON n.created_by = e.emp_id
                LEFT JOIN news_category c ON n.cat_id = c.cat_id
                WHERE n.news_id = %s
                  AND n.del_flg = 0
                LIMIT 1
            """, (news_id,))

            news = cursor.fetchone()

            if not news:
                return jsonify({
                    "success": False,
                    "message": "ไม่พบข้อมูลข่าว"
                }), 404

    finally:
        connection.close()

    return jsonify({
        "success": True,
        "data": news
    })

# =====================================================
# 3) API ดึงหมวดย่อยตามหมวดหลัก (Admin)
# ====================================================
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
# 1) AJAX ค้นหาข่าว (Admin)
# =====================================================
@news_management_bp.route('/news-management/ajax-search')
def ajax_search_news_management():
    user = session.get("user")
    if not user or not user.get("id"):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 401

    page = request.args.get('page', 1, type=int)
    per_page = 5
    offset = (page - 1) * per_page

    q = request.args.get('q', '').strip()
    category = request.args.get('category', '').strip()
    status = request.args.get('status', '').strip()

    base_where = " WHERE n.del_flg = 0 "
    params = []

    if q:
        base_where += " AND n.news_title LIKE %s "
        params.append(f"%{q}%")

    if category:
        base_where += " AND n.cat_id = %s "
        params.append(category)

    if status:
        base_where += " AND n.status = %s "
        params.append(status)

    connection = connect_db()
    try:
        with connection.cursor() as cursor:

            # นับจำนวนทั้งหมด
            cursor.execute(f"""
                SELECT COUNT(*) AS total
                FROM news n
                {base_where}
            """, params)
            total_news = cursor.fetchone()['total']
            total_pages = (total_news + per_page - 1) // per_page

            # ดึงข้อมูลหน้า
            cursor.execute(f"""
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
                {base_where}
                ORDER BY n.created_at DESC
                LIMIT %s OFFSET %s
            """, params + [per_page, offset])

            rows = cursor.fetchall()

    finally:
        connection.close()

    return jsonify({
        "success": True,
        "data": rows,
        "page": page,
        "total_pages": total_pages,
        "total": total_news
    })

# ======================================================
# 1) API ลบข่าว (Admin)
# ======================================================
@news_management_bp.route('/admin/news/delete/<int:news_id>', methods=['POST'])
def delete_news(news_id):
    user = session.get("user")
    if not user or not user.get("id"):
        return jsonify({
            "success": False,
            "message": "Unauthorized"
        }), 401

    users_id = user.get("id")

    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            # เช็กว่ามีข่าวจริง และยังไม่ถูกลบ
            cursor.execute("""
                SELECT news_id
                FROM news
                WHERE news_id = %s AND del_flg = 0
                LIMIT 1
            """, (news_id,))
            row = cursor.fetchone()

            if not row:
                return jsonify({
                    "success": False,
                    "message": "ไม่พบข่าว หรือข่าวถูกลบไปแล้ว"
                }), 404

            # Soft delete + เก็บคนลบ + เวลา
            cursor.execute("""
                UPDATE news
                SET del_flg = 1,
                    updated_at = NOW(),
                    updated_by = %s
                WHERE news_id = %s
            """, (users_id, news_id))

        connection.commit()

    except Exception as e:
        connection.rollback()
        return jsonify({
            "success": False,
            "message": "ลบข่าวไม่สำเร็จ",
            "error": str(e)
        }), 500

    finally:
        connection.close()

    return jsonify({
        "success": True,
        "message": "ลบข่าวเรียบร้อยแล้ว"
    })

# ======================================================
# 3) API แก้ไขข่าว (Admin)
# ====================================================
@news_management_bp.route('/admin/news/<int:news_id>/update', methods=['POST'])
def update_news_modal(news_id):
    user = session.get("user")
    if not user or not user.get("id"):
        return jsonify(success=False, message="Unauthorized"), 401

    title = (request.form.get("title") or "").strip()
    content = (request.form.get("content") or "").strip()
    status = (request.form.get("status") or "").strip()
    cat_id = request.form.get("cat_id", type=int)

    # ✅ แก้ตรงนี้
    subcat_raw = request.form.get("subcat_id")
    subcat_id = int(subcat_raw) if subcat_raw else None

    main_image = request.files.get("main_image")

    if not title or not content:
        return jsonify(success=False, message="กรุณากรอกข้อมูลให้ครบ"), 400

    connection = connect_db()
    try:
        with connection.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("""
                SELECT cover_image
                FROM news
                WHERE news_id = %s AND del_flg = 0
            """, (news_id,))
            old = cursor.fetchone()

            if not old:
                return jsonify(success=False, message="ไม่พบข่าว"), 404

            cover_image = old["cover_image"]
            if main_image and main_image.filename:
                new_cover = file_to_data_uri(main_image)
                if not new_cover:
                    return jsonify(success=False, message="ไฟล์รูปไม่ถูกต้อง"), 400
                cover_image = new_cover

            cursor.execute("""
                UPDATE news
                SET news_title = %s,
                    news_content = %s,
                    status = %s,
                    cat_id = %s,
                    subcat_id = %s,
                    cover_image = %s,
                    updated_at = NOW(),
                    updated_by = %s
                WHERE news_id = %s
            """, (
                title, content, status, cat_id, subcat_id,
                cover_image,
                user.get("id"),
                news_id
            ))

        connection.commit()
        return jsonify(success=True, message="แก้ไขข่าวสำเร็จ")
    

    except Exception as e:
        connection.rollback()
        print("❌ UPDATE ERROR:", e)   #  จะได้เห็น error ชัด ๆ
        return jsonify(success=False, message=str(e)), 500

    finally:
        connection.close()


# ======================================================
# 4) API: สถิติข่าว "วันนี้" แยกตามหมวดหมู่ (Admin Dashboard / Chart.js)
@news_management_bp.route('/api/news/today-by-category')
def api_news_today_by_category():
    user = session.get("user")
    if not user or not user.get("id"):
        return jsonify(success=False, message="Unauthorized"), 401

    range_type = request.args.get("range", "month")  # day | week | month | year | all

    if range_type == "all":
        date_condition = "1=1"
    elif range_type == "day":
        date_condition = """
            n.created_at >= CURDATE()
            AND n.created_at < CURDATE() + INTERVAL 1 DAY
        """
    elif range_type == "week":
        date_condition = """
            n.created_at >= CURDATE() - INTERVAL 7 DAY
            AND n.created_at < CURDATE() + INTERVAL 1 DAY
        """
    elif range_type == "year":
        date_condition = """
            n.created_at >= CURDATE() - INTERVAL 1 YEAR
            AND n.created_at < CURDATE() + INTERVAL 1 DAY
        """
    else:  # month (default)
        date_condition = """
            n.created_at >= CURDATE() - INTERVAL 1 MONTH
            AND n.created_at < CURDATE() + INTERVAL 1 DAY
        """

    conn = connect_db()
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
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

            # นับรวมทั้งหมดในช่วงเวลาเดียวกัน
            sql_total = f"""
                SELECT COUNT(n.news_id) AS total_all
                FROM news n
                WHERE n.del_flg = 0
                  AND {date_condition}
            """
            cursor.execute(sql_total)
            total_all = cursor.fetchone()["total_all"]

        return jsonify(
            success=True,
            labels=[r["cat_name"] for r in rows],
            values=[r["total"] for r in rows],
            total_all=total_all,   #  เพิ่มยอดรวมทั้งหมด
            range=range_type
        )
    except Exception as e:
        return jsonify(success=False, message=str(e)), 500
    finally:
        conn.close()

