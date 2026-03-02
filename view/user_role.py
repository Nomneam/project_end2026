from flask import Blueprint, request, session, render_template, redirect, url_for, jsonify
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
import bcrypt
import time
import random

# โหลด .env
load_dotenv()

user_role_bp = Blueprint("user_role", __name__)

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



def generate_emp_code(role_id):
    # กำหนดคำนำหน้าตาม Role ID
    prefix = ""
    if str(role_id) == '1': # Admin
        prefix = "ADM"
    elif str(role_id) == '2': # Reporter
        prefix = "RPT"
    else: # Owner / User
        prefix = "OWN"
    
    # สร้างตัวเลข 13 หลัก (ใช้ Timestamp + เลขสุ่ม เพื่อให้ไม่ซ้ำกัน)
    # หรือถ้าต้องการเลข 13 หลักคงที่ สามารถใช้ random.getrandbits ได้
    digits = str(int(time.time())) + str(random.randint(100, 999))
    # หากต้องการให้ครบ 13 หลักพอดีเป๊ะ:
    random_13_digits = ''.join([str(random.randint(0, 9)) for _ in range(13)])
    
    return f"{prefix}{random_13_digits}"

@user_role_bp.route("/user-role")
def user_role():
    user = session.get("user")
    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))
    
    conn = connect_db()
    try:
        with conn.cursor() as cur:
            # 1. ดึงข้อมูลรายชื่อพนักงานพร้อมชื่อบทบาท
            cur.execute("""
                SELECT 
                    e.emp_id,
                    e.emp_username,
                    e.emp_fname,
                    e.emp_lname,
                    e.emp_email,
                    e.emp_phone,
                    e.emp_idcard,
                    e.emp_address,
                    e.role_id,
                    e.created_at,
                    e.del_flg,
                    r.role_name
                FROM employee e
                LEFT JOIN role r ON e.role_id = r.role_id
                WHERE e.del_flg = 0
                ORDER BY e.emp_id DESC
            """)
            users = cur.fetchall()

            # 2. ดึงข้อมูลสรุปจำนวนตาม Role (สำหรับแสดงในการ์ด)
            cur.execute("""
                SELECT 
                    r.role_name, 
                    COUNT(e.emp_id) as count 
                FROM role r
                LEFT JOIN employee e ON r.role_id = e.role_id AND e.del_flg = 0
                GROUP BY r.role_id
            """)
            role_summary = cur.fetchall()

        return render_template("admin/user-role.html", 
                               users=users, 
                               role_summary=role_summary)
    finally:
        conn.close()


@user_role_bp.route("/user-role/add", methods=["POST"])
def add_user():
    user = session.get("user")
    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))

    data = request.form

    role_id = data.get("role_id")
    auto_emp_code = generate_emp_code(role_id)

    password_hash = bcrypt.hashpw(
        data["password"].encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    conn = connect_db()

    try:
        with conn.cursor() as cur:

            # ✅ เช็ค email ซ้ำ
            cur.execute("""
                SELECT emp_id FROM employee
                WHERE emp_email = %s AND del_flg = 0
            """, (data["emp_email"],))
            if cur.fetchone():
                return "Email นี้ถูกใช้งานแล้ว", 400

            # ✅ เช็ค username ซ้ำ (แนะนำให้มี)
            cur.execute("""
                SELECT emp_id FROM employee
                WHERE emp_username = %s AND del_flg = 0
            """, (data["emp_username"],))
            if cur.fetchone():
                return "Username นี้ถูกใช้งานแล้ว", 400

            # ✅ INSERT เพิ่ม emp_address และ emp_idcard
            cur.execute("""
                INSERT INTO employee (
                    role_id,
                    emp_code,
                    emp_fname,
                    emp_lname,
                    emp_username,
                    emp_password_hash,
                    emp_phone,
                    emp_email,
                    emp_address,
                    emp_idcard,
                    created_at,
                    created_by,
                    del_flg
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),%s,0)
            """, (
                role_id,
                auto_emp_code,
                data.get("emp_fname"),
                data.get("emp_lname"),
                data.get("emp_username"),
                password_hash,
                data.get("emp_phone"),
                data.get("emp_email"),
                data.get("emp_address"),   
                data.get("emp_idcard"),   
                user.get("id")           
            ))

        conn.commit()
        return redirect(url_for("user_role.user_role"))

    except Exception as e:
        conn.rollback()
        return f"เกิดข้อผิดพลาด: {str(e)}", 500

    finally:
        conn.close()


@user_role_bp.route("/user-role/edit/<int:emp_id>", methods=["POST"])
def edit_user(emp_id):
    data = request.form
    user = session.get("user")

    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))

    conn = connect_db()
    try:
        with conn.cursor() as cur:

            # --- เช็ค email ซ้ำ (ยกเว้นตัวเอง) ---
            cur.execute("""
                SELECT emp_id FROM employee
                WHERE emp_email = %s 
                AND emp_id != %s 
                AND del_flg = 0
            """, (data["emp_email"].strip(), emp_id))

            existing = cur.fetchone()
            if existing:
                return "Email นี้ถูกใช้งานแล้ว", 400

            # --- UPDATE ข้อมูล ---
            cur.execute("""
                UPDATE employee SET
                    role_id = %s,
                    emp_fname = %s,
                    emp_lname = %s,
                    emp_phone = %s,
                    emp_email = %s,
                    emp_address = %s,
                    emp_idcard = %s,
                    updated_at = NOW(),
                    updated_by = %s
                WHERE emp_id = %s
            """, (
                data.get("role_id"),
                data.get("emp_fname"),
                data.get("emp_lname"),
                data.get("emp_phone"),
                data.get("emp_email").strip().lower(),
                data.get("emp_address"),
                data.get("emp_idcard"),
                session.get("emp_id"),
                emp_id
            ))

        conn.commit()

        return {"status": "success"}  #  แนะนำให้ return json ถ้าใช้ ajax

    finally:
        conn.close()



@user_role_bp.route("/user-role/delete/<int:emp_id>", methods=["POST"])
def delete_user(emp_id):
    user = session.get("user")
    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))
    conn = connect_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE employee
                SET del_flg = 1,
                    updated_at = NOW(),
                    updated_by = %s
                WHERE emp_id = %s
            """, (
                session.get("emp_id"),
                emp_id
            ))
        conn.commit()
        return jsonify({"status": "success"})
    finally:
        conn.close()



