from flask import Blueprint, request, session, render_template, redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
import bcrypt

# โหลด .env
load_dotenv()

login_emp_bp = Blueprint("login_emp", __name__)

# ฟังก์ชันเชื่อม DB
def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT")),
        cursorclass=pymysql.cursors.DictCursor
    )

# ==========================================================
# auditlogin_emp
# ==========================================================
def audit_log(emp_id, action, pages="", detail=""):
    conn = None
    try:
        conn = connect_db()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO audit_logs_emp (emp_id, action, pages, detail, ip_address, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """, (
                emp_id,
                action,
                pages,
                detail,
                request.headers.get("X-Forwarded-For", request.remote_addr)
            ))
            conn.commit()
    except Exception as e:
        print("Audit log error:", e)
    finally:
        if conn:
            conn.close()


@login_emp_bp.route("/login_emp", methods=["GET", "POST"])
def login_emp():
    error = None

    if request.method == "POST":
        username = (request.form.get("username") or "").strip()
        password = (request.form.get("password") or "").strip()

        if not username or not password:
            error = "กรุณากรอก Username และ Password"
            return render_template("login_emp.html", error=error)

        conn = None
        cursor = None
        try:
            conn = connect_db()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    e.emp_id,
                    e.emp_username,
                    e.emp_password_hash,
                    e.emp_fname,
                    e.emp_lname,
                    e.role_id,
                    r.role_name
                FROM employee e
                LEFT JOIN role r ON r.role_id = e.role_id
                WHERE e.emp_username = %s
                  AND e.del_flg = 0
                LIMIT 1
            """, (username,))
            user = cursor.fetchone()
        finally:
            try:
                if cursor:
                    cursor.close()
            finally:
                if conn:
                    conn.close()

        # ไม่เจอ user หรือไม่มี hash
        if not user or not user.get("emp_password_hash"):
            error = "Username หรือ Password ไม่ถูกต้อง"
            return render_template("login_emp.html", error=error)

        # ตรวจสอบรหัสผ่าน
        stored_hash = (user["emp_password_hash"] or "").strip().encode("utf-8")
        password_bytes = password.encode("utf-8")

        if not bcrypt.checkpw(password_bytes, stored_hash):
            error = "Username หรือ Password ไม่ถูกต้อง"
            return render_template("login_emp.html", error=error)

        # login ผ่าน -> เก็บ session โดยใช้ emp_fname เป็นชื่อแสดงผล
        session["user"] = {
            "id": user["emp_id"],
            "username": user["emp_username"],
            "fname": user.get("emp_fname") or user["emp_username"],  #  ใช้ emp_fname
            "lname": user.get("emp_lname") or "",
            "role_id": user.get("role_id"),
            "role_name": user.get("role_name") or "",               # จาก DB (ถ้ามี)
            "avatar_url": None,                                     # ปรับได้ถ้ามีใน DB
        }

        audit_log(
            emp_id=user["emp_id"],
            action="Login",
            pages="/login_emp",
            detail="Employee login success"
        )

        # Redirect ตาม role (ไม่ใช้ mapping)
        if user.get("role_id") == 1:
            return redirect(url_for("dashboard_admin.admin_dashboard"))
        elif user.get("role_id") == 2:
            return redirect(url_for("dashboard_reporter.reporter_dashboard"))
        elif user.get("role_id") == 3:
            return redirect(url_for("dashboard_owner.owner_dashboard"))
        else:
            session.clear()
            error = "Role ไม่ถูกต้อง"
            return render_template("login_emp.html", error=error)

    return render_template("login_emp.html", error=error)


@login_emp_bp.route("/logout_emp")
def logout_emp():
    user = session.get("user")

    if user and user.get("id"):
        #  เรียกใช้ฟังก์ชัน audit log
        audit_log(
                emp_id=user["id"],
                action="Logout",
                pages="/logout_emp",
                detail="Employee logout"
            )
    session.clear()
    return redirect(url_for("login_emp.login_emp"))

