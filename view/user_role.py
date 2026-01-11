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
    conn = connect_db()
    try:
        with conn.cursor() as cur:
            # 1. ดึงข้อมูลรายชื่อพนักงานพร้อมชื่อบทบาท
            cur.execute("""
                SELECT 
                    e.emp_id, e.emp_username, e.emp_fname, e.emp_lname, 
                    e.emp_email, e.role_id, e.created_at, e.del_flg,
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
    data = request.form
    
    # --- ส่วนที่เพิ่ม/แก้ไข ---
    # รับ role_id มาเพื่อตัดสินใจเลือก prefix
    role_id = data.get("role_id")
    auto_emp_code = generate_emp_code(role_id)
    # -----------------------

    password_hash = bcrypt.hashpw(
        data["password"].encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    conn = connect_db()
    try:
        with conn.cursor() as cur:
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
                    created_at,
                    created_by,
                    del_flg
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,NOW(),%s,0)
            """, (
                role_id,
                auto_emp_code, # ใช้รหัสที่ Gen อัตโนมัติ
                data["emp_fname"],
                data["emp_lname"],
                data["emp_username"],
                password_hash,
                data["emp_phone"],
                data["emp_email"],
                session.get("emp_id")
            ))
        conn.commit()
        return redirect(url_for("user_role.user_role"))
    finally:
        conn.close()

@user_role_bp.route("/user-role/edit/<int:emp_id>", methods=["POST"])
def edit_user(emp_id):
    data = request.form

    conn = connect_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE employee SET
                    role_id = %s,
                    emp_fname = %s,
                    emp_lname = %s,
                    emp_phone = %s,
                    emp_email = %s,
                    updated_at = NOW(),
                    updated_by = %s
                WHERE emp_id = %s
            """, (
                data["role_id"],
                data["emp_fname"],
                data["emp_lname"],
                data["emp_phone"],
                data["emp_email"],
                session.get("emp_id"),
                emp_id
            ))
        conn.commit()
        return redirect(url_for("user_role.user_role"))
    finally:
        conn.close()


@user_role_bp.route("/user-role/delete/<int:emp_id>", methods=["POST"])
def delete_user(emp_id):
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



