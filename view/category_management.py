from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime

# โหลดค่าคอนฟิกจากไฟล์ .env
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
    """หน้าหลักจัดการหมวดหมู่: แสดงรายการทั้งหมด"""
    user = session.get("user")
    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            # ดึงข้อมูลหมวดหมู่หลักพร้อมนับจำนวนข่าว
            cursor.execute("""
                SELECT c.*, 
                (SELECT COUNT(*) FROM news n WHERE n.cat_id = c.cat_id AND n.del_flg = 0) as news_count
                FROM news_category c 
                WHERE c.del_flg = 0 
                ORDER BY c.cat_name ASC
            """)
            categories = cursor.fetchall()
            return render_template('admin/category-management.html', categories=categories)
    finally:
        conn.close()

@category_management_bp.route('/get-subcategories/<int:cat_id>')
def get_subcategories(cat_id):
    """API ดึงหมวดหมู่ย่อยตาม ID (ใช้ใน Modal)"""
    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT subcat_id, subcat_name FROM news_subcategory WHERE cat_id = %s AND del_flg = 0", (cat_id,))
            subs = cursor.fetchall()
            return jsonify(subs)
    finally:
        conn.close()

# --- 1. เพิ่มหมวดหมู่หลักพร้อมประเภทย่อย (ป้องกัน Duplicate Entry) ---
@category_management_bp.route('/add-category', methods=['POST'])
def add_category():
    user = session.get("user")
    cat_name = request.form.get('cat_name', '').strip()
    sub_names = request.form.getlist('subs[]')
    
    if not cat_name:
        return jsonify({"success": False, "message": "กรุณากรอกชื่อหมวดหมู่"}), 400

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            # ตรวจสอบชื่อหลัก (กู้คืนถ้าเคยลบ เพื่อเลี่ยง Error 1062)
            cursor.execute("SELECT cat_id, del_flg FROM news_category WHERE cat_name = %s", (cat_name,))
            existing = cursor.fetchone()

            if existing:
                if existing['del_flg'] == 0:
                    return jsonify({"success": False, "message": "มีชื่อหมวดหมู่นี้อยู่ในระบบแล้ว"}), 400
                else:
                    # ถ้าเคยลบไปแล้ว ให้กู้คืน (Restore)
                    cat_id = existing['cat_id']
                    cursor.execute("UPDATE news_category SET del_flg = 0, updated_at = %s, updated_by = %s WHERE cat_id = %s", 
                                   (datetime.now(), user.get('id'), cat_id))
            else:
                # กรณีใหม่จริงๆ ให้ INSERT
                cursor.execute("INSERT INTO news_category (cat_name, is_active, created_at, created_by, del_flg) VALUES (%s, 1, %s, %s, 0)", 
                               (cat_name, datetime.now(), user.get('id')))
                cat_id = cursor.lastrowid

            # บันทึกประเภทย่อยทั้งหมด
            for s_name in sub_names:
                s_name = s_name.strip()
                if s_name:
                    # ตรวจสอบชื่อซ้ำในประเภทย่อย (Restore Logic)
                    cursor.execute("SELECT subcat_id FROM news_subcategory WHERE cat_id = %s AND subcat_name = %s", (cat_id, s_name))
                    sub_exists = cursor.fetchone()
                    if sub_exists:
                        cursor.execute("UPDATE news_subcategory SET del_flg = 0 WHERE subcat_id = %s", (sub_exists['subcat_id'],))
                    else:
                        cursor.execute("""
                            INSERT INTO news_subcategory (cat_id, subcat_name, is_active, created_at, created_by, del_flg) 
                            VALUES (%s, %s, 1, %s, %s, 0)
                        """, (cat_id, s_name, datetime.now(), user.get('id')))
        conn.commit()
        return jsonify({"success": True, "message": "บันทึกข้อมูลเรียบร้อยแล้ว"})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

# --- 2. อัปเดตหมวดหมู่ และ Sync ประเภทย่อย ---
@category_management_bp.route('/update-category', methods=['POST'])
def update_category():
    user = session.get("user")
    cat_id = request.form.get('cat_id')
    cat_name = request.form.get('cat_name', '').strip()
    sub_names = request.form.getlist('subs[]')

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            # เช็กชื่อซ้ำ (ยกเว้นตัวเอง)
            cursor.execute("SELECT cat_id FROM news_category WHERE cat_name = %s AND cat_id != %s AND del_flg = 0", (cat_name, cat_id))
            if cursor.fetchone():
                return jsonify({"success": False, "message": "ชื่อนี้ถูกใช้ไปแล้ว"}), 400

            # อัปเดตหมวดหมู่หลัก
            cursor.execute("UPDATE news_category SET cat_name = %s, updated_at = %s, updated_by = %s WHERE cat_id = %s", 
                           (cat_name, datetime.now(), user.get('id'), cat_id))

            # ดึงประเภทย่อยปัจจุบันใน DB มาเทียบเพื่อ Sync
            cursor.execute("SELECT subcat_id, subcat_name, del_flg FROM news_subcategory WHERE cat_id = %s", (cat_id,))
            db_subs = {row['subcat_name']: row for row in cursor.fetchall()}
            new_names = [s.strip() for s in sub_names if s.strip()]

            # ปิดการใช้งาน (Soft Delete) อันที่ไม่อยู่ในรายการใหม่
            for name, data in db_subs.items():
                if name not in new_names and data['del_flg'] == 0:
                    cursor.execute("UPDATE news_subcategory SET del_flg = 1 WHERE subcat_id = %s", (data['subcat_id'],))

            # กู้คืนหรือเพิ่มใหม่
            for s_name in new_names:
                if s_name in db_subs:
                    if db_subs[s_name]['del_flg'] == 1:
                        cursor.execute("UPDATE news_subcategory SET del_flg = 0 WHERE subcat_id = %s", (db_subs[s_name]['subcat_id'],))
                else:
                    cursor.execute("INSERT INTO news_subcategory (cat_id, subcat_name, is_active, created_at, created_by, del_flg) VALUES (%s, %s, 1, %s, %s, 0)",
                                   (cat_id, s_name, datetime.now(), user.get('id')))
        conn.commit()
        return jsonify({"success": True})
    finally:
        conn.close()

# --- 3. ลบหมวดหมู่หลัก (Soft Delete) ---
@category_management_bp.route('/delete-category', methods=['POST'])
def delete_category():
    cat_id = request.form.get('cat_id')
    user = session.get("user")
    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE news_category SET del_flg = 1, updated_at = %s, updated_by = %s WHERE cat_id = %s", (datetime.now(), user.get('id'), cat_id))
            cursor.execute("UPDATE news_subcategory SET del_flg = 1 WHERE cat_id = %s", (cat_id,))
        conn.commit()
        return jsonify({"success": True})
    finally:
        conn.close()