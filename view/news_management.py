from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime

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

