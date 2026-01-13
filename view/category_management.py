from flask import Blueprint, render_template, request, jsonify, session ,redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime


load_dotenv()

category_management_bp = Blueprint('category_management', __name__)

def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor
    )

@category_management_bp.route('/category-management')
def category_management():
    user = session.get("user")
    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))

    conn = connect_db()
    cursor = conn.cursor()

    # ดึงข้อมูลหมวดหมู่หลัก
    cursor.execute("SELECT * FROM news_category WHERE del_flg = 0 ORDER BY cat_name ASC")
    categories = cursor.fetchall()

    # ดึงข้อมูลหมวดหมู่ย่อย
    cursor.execute("SELECT * FROM news_subcategory WHERE del_flg = 0")
    subcategories = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template('admin/category-management.html', 
                           categories=categories, 
                           subcategories=subcategories)


@category_management_bp.route('/get-subcategories/<int:cat_id>')
def get_subcategories(cat_id):
    conn = connect_db()
    cursor = conn.cursor() # ใช้ DictCursor ตามที่คุณตั้งค่าไว้ใน connect_db()
    
    # ดึงข้อมูลประเภทย่อยที่ยังไม่ได้ถูกลบ (del_flg = 0)
    cursor.execute("SELECT subcat_id, subcat_name FROM news_subcategory WHERE cat_id = %s AND del_flg = 0", (cat_id,))
    subs = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return jsonify(subs) # ส่งข้อมูลกลับเป็น JSON