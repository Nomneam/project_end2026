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

            # ===== ดึงข่าวตามหน้า =====
            query_news = """
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
                WHERE n.del_flg = 0
                ORDER BY n.created_at DESC
                LIMIT %s OFFSET %s
            """
            cursor.execute(query_news, (per_page, offset))
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
