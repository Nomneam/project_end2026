from flask import Blueprint, render_template, request, jsonify, abort, session, redirect, url_for
import base64
from dotenv import load_dotenv
import pymysql
import os
import bcrypt


load_dotenv()

profile_cus_bp = Blueprint("profile_cus", __name__)

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
        autocommit=True,
        charset="utf8mb4",
    )
    
    
@profile_cus_bp.route("/profile_customer")
def profile_cus():

    if "front_user" not in session:
        return redirect(url_for("index.index_news"))

    user_id = session["front_user"]["id"]

    conn = connect_db()
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT cus_id, cus_fname, cus_lname,
                   cus_phone, cus_email, cus_address,
                   cus_profile, cus_idcard
            FROM customer
            WHERE cus_id = %s AND del_flg = 0
        """, (user_id,))
        user = cursor.fetchone()

    conn.close()

    return render_template("profile_cus.html", user=user)



@profile_cus_bp.route("/update_profile", methods=["POST"])
def update_profile():

    if "front_user" not in session:
        return jsonify(ok=False), 401

    user_id = session["front_user"]["id"]

    data = request.form
    file = request.files.get("avatar")

    avatar_base64 = None
    if file and file.filename != "":
        avatar_base64 = base64.b64encode(file.read()).decode()

    fname = (data.get("fname") or "").strip()
    lname = (data.get("lname") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip()
    citizen_id = (data.get("citizen_id") or "").strip()

    conn = connect_db()

    # ==========================
    # 1️⃣ ดึงข้อมูลเก่า
    # ==========================
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT cus_fname, cus_lname, cus_phone,
                   cus_email, cus_address, cus_idcard
            FROM customer
            WHERE cus_id=%s
        """, (user_id,))
        old_data = cursor.fetchone()

    # ==========================
    # 2️⃣ เทียบข้อมูล
    # ==========================
    changes = []

    field_map = {
        "cus_fname": fname,
        "cus_lname": lname,
        "cus_phone": phone,
        "cus_email": email,
        "cus_idcard": citizen_id,
    }

    for field, new_value in field_map.items():
        old_value = (old_data.get(field) or "").strip()
        if old_value != new_value:
            changes.append(f"{field}: {old_value} → {new_value}")

    if avatar_base64:
        changes.append("Avatar updated")

    # ==========================
    # 3️⃣ UPDATE DB
    # ==========================
    with conn.cursor() as cursor:
        cursor.execute("""
            UPDATE customer
            SET cus_fname=%s,
                cus_lname=%s,
                cus_phone=%s,
                cus_email=%s,
                cus_idcard=%s,
                cus_profile=COALESCE(%s, cus_profile)
            WHERE cus_id=%s
        """, (
            fname,
            lname,
            phone,
            email,
            citizen_id,
            avatar_base64,
            user_id
        ))

    conn.commit()

    # ==========================
    # 4️⃣ เขียน Audit Log
    # ==========================
    if changes:
        detail_text = " | ".join(changes)

        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO audit_logs_cus
                    (cus_id, action, pages, detail, ip_address)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    user_id,
                    "Update",
                    "profile_customer",
                    detail_text,
                    request.remote_addr
                ))
            conn.commit()
        except Exception as e:
            print("Audit Error:", e)

    conn.close()

    # อัปเดต session
    session["front_user"]["name"] = f"{fname} {lname}".strip()
    session.modified = True

    return jsonify(ok=True)



@profile_cus_bp.route("/change_password", methods=["POST"])
def change_password():

    if "front_user" not in session:
        return jsonify(ok=False, message="กรุณาเข้าสู่ระบบ"), 401

    user_id = session["front_user"]["id"]
    data = request.get_json(silent=True) or {}
    step = data.get("step")

    conn = connect_db()

    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT cus_password_hash
            FROM customer
            WHERE cus_id=%s AND del_flg=0
        """, (user_id,))
        user = cursor.fetchone()

    conn.close()

    if not user:
        return jsonify(ok=False, message="ไม่พบผู้ใช้"), 404

    stored_hash = user["cus_password_hash"]
    if isinstance(stored_hash, str):
        stored_hash = stored_hash.encode()

    # =====================
    # STEP 1: VERIFY
    # =====================
    if step == "verify":

        password = (data.get("password") or "").strip()

        if not bcrypt.checkpw(password.encode(), stored_hash):
            return jsonify(ok=False, message="รหัสผ่านไม่ถูกต้อง"), 400

        return jsonify(ok=True)

    # =====================
    # STEP 2: CHANGE
    # =====================
    if step == "change":

        old_password = (data.get("old_password") or "").strip()
        new_password = (data.get("new_password") or "").strip()

        if not bcrypt.checkpw(old_password.encode(), stored_hash):
            return jsonify(ok=False, message="รหัสผ่านเดิมไม่ถูกต้อง"), 400

        if len(new_password) < 6:
            return jsonify(ok=False, message="รหัสใหม่ต้อง ≥ 6 ตัว"), 400

        if bcrypt.checkpw(new_password.encode(), stored_hash):
            return jsonify(ok=False, message="ห้ามใช้รหัสเดิม"), 400

        new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()

        conn = connect_db()
        with conn.cursor() as cursor:
            cursor.execute("""
                UPDATE customer
                SET cus_password_hash=%s,
                    updated_at=NOW()
                WHERE cus_id=%s
            """, (new_hash,user_id))
        conn.commit()
        conn.close()

        # =========================
        # เขียน Audit Log - Change Password
        # =========================
        try:
            conn = connect_db()
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO audit_logs_cus
                    (cus_id, action, pages, detail, ip_address)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    user_id,
                    "Update",
                    "change_password",
                    "Customer changed password",
                    request.remote_addr
                ))
            conn.commit()
            conn.close()
        except Exception as e:
            print("Audit Change Password Error:", e)

        return jsonify(ok=True, message="เปลี่ยนรหัสผ่านสำเร็จ")

    return jsonify(ok=False, message="invalid request"), 400