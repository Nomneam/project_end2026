from flask import Blueprint, request, session, render_template, redirect, url_for
from flask import jsonify
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
import bcrypt

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
    
    
def print_bcrypt_hash(plain_password: str):
    hashed = bcrypt.hashpw(
        plain_password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    print("====== BCRYPT HASH ======")
    print("password :", plain_password)
    print("hash     :", hashed)
    print("=========================")

    return hashed

print_bcrypt_hash("1122")
    
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

    session["front_user"] = {
        "id": user["cus_id"],
        "username": user["cus_username"],
        "name": f"{user['cus_fname']} {user['cus_lname']}".strip(),
        "avatar": user["cus_profile"] or None
    }
    

    return jsonify(
        ok=True,
        user={
            "name": session["front_user"]["name"],
            "avatar": session["front_user"]["avatar"]
        }
    )

@login_customer_bp.route("/me")
def me():
    user = session.get("front_user")
    if not user:
        return jsonify(ok=False), 401
    return jsonify(ok=True, user=user)



@login_customer_bp.route("/logout_cus")
def logout_cus():
    session.pop("front_user", None)
    return redirect(url_for("index.index_news"))