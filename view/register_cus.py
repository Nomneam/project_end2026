from flask import Blueprint, request, jsonify, session
from dotenv import load_dotenv
import pymysql
import os
import bcrypt
import re

load_dotenv()

register_cus_bp = Blueprint("register_cus", __name__)

# =============================
# DB
# =============================
def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT", 3306)),
        cursorclass=pymysql.cursors.DictCursor,
        charset="utf8mb4",
        autocommit=False  # ใช้ transaction
    )

# =============================
# Validate Thai ID
# =============================
def validate_thai_id(idcard: str) -> bool:
    if not idcard.isdigit() or len(idcard) != 13:
        return False

    total = sum(int(idcard[i]) * (13 - i) for i in range(12))
    check_digit = (11 - (total % 11)) % 10
    return check_digit == int(idcard[-1])


# =============================
# Register
# =============================
@register_cus_bp.route("/register_cus", methods=["POST"])
def register_customer():

    username = request.form.get("username", "").strip()
    fname = request.form.get("fname", "").strip()
    lname = request.form.get("lname", "").strip()
    phone = request.form.get("phone", "").replace("-", "").strip()
    idcard = request.form.get("idcard", "").strip()
    email = request.form.get("email", "").strip()
    password = request.form.get("password", "").strip()

    # ===== Required Check =====
    if not all([username, fname, lname, phone, idcard, email, password]):
        return jsonify(ok=False, message="กรุณากรอกข้อมูลให้ครบ"), 400

    # ===== Password Length =====
    if len(password) < 6:
        return jsonify(ok=False, message="รหัสผ่านต้องอย่างน้อย 6 ตัว"), 400

    # ===== Email Format =====
    if not re.fullmatch(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify(ok=False, message="รูปแบบ Email ไม่ถูกต้อง"), 400

    # ===== Thai ID Checksum =====
    if not validate_thai_id(idcard):
        return jsonify(ok=False, message="เลขบัตรประชาชนไม่ถูกต้อง"), 400

    # ===== Phone Check =====
    if not re.fullmatch(r"0[689]\d{8}", phone):
        return jsonify(ok=False, message="เบอร์โทรต้องขึ้นต้น 06, 08 หรือ 09 และมี 10 หลัก"), 400

    conn = connect_db()
    cur = conn.cursor()

    try:
        # ===== Hash Password =====
        hashed_pw = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        # ===== Insert =====
        cur.execute("""
            INSERT INTO customer
            (cus_username, cus_fname, cus_lname, cus_phone, cus_idcard, cus_email, cus_password_hash)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, (username, fname, lname, phone, idcard, email, hashed_pw))

        conn.commit()
        new_user_id = cur.lastrowid

    except pymysql.err.IntegrityError:
        conn.rollback()
        return jsonify(ok=False, message="Username หรือ Email ถูกใช้แล้ว"), 400

    finally:
        cur.close()
        conn.close()

    # ===== Auto Login (เหมือน login route) =====
    session["front_user"] = {
        "id": new_user_id,
        "username": username,
        "name": f"{fname} {lname}".strip(),
    }

    session.modified = True

    return jsonify(
        ok=True,
        redirect="/customer/dashboard"
    )