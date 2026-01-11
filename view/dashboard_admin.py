# dashboard_admin.py
from flask import Blueprint, render_template, session
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
import bcrypt

# โหลด .env
load_dotenv()

# ฟังก์ชันเชื่อม DB
def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor
    )
    

dashboard_admin_bp = Blueprint('dashboard_admin', __name__)

@dashboard_admin_bp.route('/dashboard/admin')
def admin_dashboard():
    # ตรวจสอบสิทธิ์ Admin (role_id 1)
    if 'user' not in session or session['user']['role_id'] != 1:
        return "Forbidden", 403

    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            # 1. ดึงพนักงานทั้งหมด (จากภาพของคุณมี 3 คน: Apisit, Punyawee, Prayut)
            cursor.execute("""
                SELECT emp_id, emp_fname, emp_lname, emp_email, role_id 
                FROM employee 
                WHERE del_flg = 0
            """)
            employees = cursor.fetchall()

            # 2. ดึงข้อมูลโฆษณา
            cursor.execute("""
                SELECT adv_name, status, created_at 
                FROM advert 
                WHERE del_flg = 0 
                ORDER BY created_at DESC LIMIT 5
            """)
            adverts = cursor.fetchall()

            # 3. คำนวณสถิติอิงจากฐานข้อมูลจริง
            total_staff = len(employees)  # จะได้ค่าเป็น 3 ตามข้อมูลปัจจุบันของคุณ
            
            # จำนวนโฆษณาที่รอตรวจสอบ
            cursor.execute("SELECT COUNT(*) as count FROM advert WHERE status = 'submitted' AND del_flg = 0")
            pending_ads_count = cursor.fetchone()['count']

            # ปรับปรุง: กำหนดค่าออนไลน์ให้สัมพันธ์กับจำนวนพนักงานที่มีจริง
            # สมมติออนไลน์ไว้ไม่เกินพนักงานทั้งหมด (ในที่นี้คือไม่เกิน 3 คน)
            online_count = min(1, total_staff) # ตัวอย่าง: สมมติออนไลน์ 1 คน
            
            # คำนวณออฟไลน์: พนักงานทั้งหมด (3) - ออนไลน์ (1) = 2 (จะไม่ติดลบ)
            offline_count = total_staff - online_count

    finally:
        connection.close()

    return render_template(
        'admin/admin-dashboard.html',
        employees=employees,
        adverts=adverts,
        online_count=online_count,
        offline_count=offline_count,
        total_staff=total_staff,
        pending_ads_count=pending_ads_count
    )

