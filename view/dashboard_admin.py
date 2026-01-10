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
    # ตรวจสอบสิทธิ์ (role_id 1 = Admin)
    if 'user' not in session or session['user']['role_id'] != 1:
        return "Forbidden", 403

    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            # 1. ดึงข้อมูลพนักงาน (ใช้ table: employee)
            # หมายเหตุ: ใน Schema ไม่มี col 'is_online' ผมจึงขอใช้ mock-up หรือคุณอาจต้องเพิ่ม col นี้ภายหลัง
            cursor.execute("""
                SELECT emp_id, emp_fname, emp_lname, emp_email, role_id 
                FROM employee 
                WHERE del_flg = 0
            """)
            employees = cursor.fetchall()

            # 2. ดึงข้อมูลโฆษณา (ใช้ table: advert)
            cursor.execute("""
                SELECT adv_name, status, created_at 
                FROM advert 
                WHERE del_flg = 0 
                ORDER BY created_at DESC LIMIT 5
            """)
            adverts = cursor.fetchall()

            # 3. คำนวณสถิติ
            # จำนวนพนักงานทั้งหมด
            total_staff = len(employees)
            
            # โฆษณาที่รอตรวจสอบ (status = 'submitted')
            cursor.execute("SELECT COUNT(*) as count FROM advert WHERE status = 'submitted' AND del_flg = 0")
            pending_ads_count = cursor.fetchone()['count']

            # (ตัวอย่าง) สมมติว่านับพนักงานออนไลน์จาก session หรือ table อื่น 
            # ในที่นี้ขอกำหนดค่าตัวอย่างไว้ก่อนเพื่อให้กราฟทำงานได้
            online_count = 5 
            offline_count = total_staff - online_count

    finally:
        connection.close()

    return render_template(
        'admin-dashboard.html',
        employees=employees,
        adverts=adverts,
        online_count=online_count,
        offline_count=offline_count,
        total_staff=total_staff,
        pending_ads_count=pending_ads_count
    )

