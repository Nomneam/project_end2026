from flask import Blueprint, request, session, render_template, redirect, url_for
from flask import jsonify
from dotenv import load_dotenv
from flask import Response
import os
import pymysql
import pymysql.cursors
import bcrypt
import base64

load_dotenv()

login_customer_bp = Blueprint("login_customer", __name__)

def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT")),
        cursorclass=pymysql.cursors.DictCursor
    )
    
    

    
@login_customer_bp.route("/login_cus", methods=["POST"])
def login_cus():
    username = (request.form.get("username") or "").strip()
    password = (request.form.get("password") or "").strip()

    if not username or not password:
        return jsonify(ok=False, message="กรุณากรอก Username และ Password"), 400

    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            cus_id,
            cus_username,
            cus_password_hash,
            cus_fname,
            cus_lname,
            cus_profile
        FROM customer
        WHERE cus_username = %s AND del_flg = 0
        LIMIT 1
    """, (username,))
    user = cursor.fetchone()

    cursor.close()
    conn.close()

    if not user:
        return jsonify(ok=False, message="Username หรือ Password ไม่ถูกต้อง"), 401

    stored_hash = user["cus_password_hash"]

    if not stored_hash or not stored_hash.startswith("$2"):
        return jsonify(ok=False, message="บัญชีนี้ต้องตั้งรหัสผ่านใหม่"), 401

    try:
        if not bcrypt.checkpw(password.encode(), stored_hash.encode()):
            return jsonify(ok=False, message="Username หรือ Password ไม่ถูกต้อง"), 401
    except ValueError:
        return jsonify(ok=False, message="บัญชีนี้ไม่รองรับรูปแบบรหัสผ่านปัจจุบัน"), 401

    # ✅ เก็บเฉพาะข้อมูลเล็ก ๆ ใน session (ห้ามเก็บ base64)
    session["front_user"] = {
        "id": user["cus_id"],
        "username": user["cus_username"],
        "name": f"{user['cus_fname']} {user['cus_lname']}".strip(),
    }

    session.modified = True  # ป้องกันกรณี session ไม่อัปเดต

    # ======================
    # เขียน Audit Log Login
    # ======================
    try:
        conn = connect_db()
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO audit_logs_cus
                (cus_id, action, pages, detail, ip_address)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                user["cus_id"],
                "Login",
                "login",
                "Customer logged in",
                request.remote_addr
            ))
        conn.commit()
        conn.close()
    except Exception as e:
        print("Audit Login Error:", e)

    return jsonify(
        ok=True,
        user={
            "name": session["front_user"]["name"],
            "avatar": user["cus_profile"]  # ส่งให้ frontend ใช้แสดงผล แต่ไม่เก็บใน session
        }
    )

@login_customer_bp.route("/avatar/<int:user_id>")
def get_avatar(user_id):
    conn = connect_db()
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT cus_profile
            FROM customer
            WHERE cus_id=%s
        """, (user_id,))
        row = cursor.fetchone()
    conn.close()

    if not row or not row["cus_profile"]:
        return "", 404

    try:
        img_binary = base64.b64decode(row["cus_profile"])
        return Response(img_binary, mimetype="image/jpeg")
    except Exception:
        return "", 404



@login_customer_bp.route("/logout_cus")
def logout_cus():
    user = session.get("front_user")

    if user:
        try:
            conn = connect_db()
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO audit_logs_cus
                    (cus_id, action, pages, detail, ip_address)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    user["id"],
                    "Logout",
                    "logout",
                    "Customer logged out",
                    request.remote_addr
                ))
            conn.commit()
            conn.close()
        except Exception as e:
            print("Audit Logout Error:", e)

    session.pop("front_user", None)
    return redirect(url_for("index.index_news"))