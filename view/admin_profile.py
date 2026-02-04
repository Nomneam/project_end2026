from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime
import base64
import json
from werkzeug.utils import secure_filename
import re
import uuid

load_dotenv()

admin_profile_bp = Blueprint('admin_profile', __name__)


def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )

ALLOWED_EXT = {"png", "jpg", "jpeg", "webp"}
ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp"}

def allowed_file(filename: str) -> bool:
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_EXT

def file_to_data_uri(file_storage):
    if not file_storage or not file_storage.filename:
        return None

    if not allowed_file(file_storage.filename):
        return None

    mime = (file_storage.mimetype or "").lower()
    if mime not in ALLOWED_MIME:
        return None

    try:
        raw = file_storage.read()
        if not raw:
            return None
        b64 = base64.b64encode(raw).decode("utf-8")
        return f"data:{mime};base64,{b64}"
    finally:
        try:
            file_storage.seek(0)
        except Exception:
            pass


@admin_profile_bp.route("/admin-profile", methods=["GET"])
def profile_page():
    user_session = session.get("user")
    if not user_session or not user_session.get("id"):
        return redirect(url_for("login_emp.login_emp"))
    
    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            sql = """
                SELECT 
                    emp_code,
                    emp_fname,
                    emp_lname,
                    emp_username,
                    emp_phone,
                    emp_email,
                    emp_idcard,
                    emp_profile
                FROM employee
                WHERE emp_id = %s AND del_flg = 0
            """
            cursor.execute(sql, (user_session["id"],))
            user = cursor.fetchone()

    finally:
        conn.close()

    return render_template("admin/admin-profile.html", user=user)


#  ==============================
#   Update Profile
#  ==============================

@admin_profile_bp.route("/admin-profile/update", methods=["POST"])
def update_profile():

    user_session = session.get("user")
    if not user_session or not user_session.get("id"):
        return jsonify({"error": "unauthorized"}), 401

    emp_id = user_session["id"]

    emp_fname = request.form.get("emp_fname")
    emp_lname = request.form.get("emp_lname")
    emp_phone = request.form.get("emp_phone")
    emp_email = request.form.get("emp_email")
    emp_idcard = request.form.get("emp_idcard")
    emp_profile_file = request.files.get("emp_profile")

    # ไม่มีข้อมูลเปลี่ยน
    if not any([emp_fname, emp_lname, emp_phone, emp_email, emp_idcard, emp_profile_file]):
        return jsonify({"error": "no data to update"}), 400

    # 🔎 Validation ฝั่ง backend (กันยิงมั่ว)
    if emp_phone and not re.match(r"^\d{10}$", emp_phone):
        return jsonify({"error": "invalid phone"}), 400

    if emp_email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", emp_email):
        return jsonify({"error": "invalid email"}), 400

    update_fields = []
    update_values = []

    if emp_fname:
        update_fields.append("emp_fname = %s")
        update_values.append(emp_fname)

    if emp_lname:
        update_fields.append("emp_lname = %s")
        update_values.append(emp_lname)

    if emp_phone:
        update_fields.append("emp_phone = %s")
        update_values.append(emp_phone)

    if emp_email:
        update_fields.append("emp_email = %s")
        update_values.append(emp_email)

    if emp_idcard:
        update_fields.append("emp_idcard = %s")
        update_values.append(emp_idcard)

    # 📸 จัดการอัปโหลดรูป
    if emp_profile_file and emp_profile_file.filename:
        if not allowed_file(emp_profile_file.filename) or emp_profile_file.mimetype not in ALLOWED_MIME:
            return jsonify({"error": "invalid image type"}), 400

        upload_dir = os.path.join("static", "uploads")
        os.makedirs(upload_dir, exist_ok=True)  # ✅ แก้ error โฟลเดอร์ไม่มี

        safe_name = secure_filename(emp_profile_file.filename)
        filename = f"{uuid.uuid4().hex}_{safe_name}"
        filepath = os.path.join(upload_dir, filename)

        emp_profile_file.save(filepath)

        update_fields.append("emp_profile = %s")
        update_values.append(filepath.replace("\\", "/"))  # ให้ path ใช้กับ URL ได้

    if not update_fields:
        return jsonify({"error": "no valid fields"}), 400

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            update_values.append(emp_id)
            sql = f"""
                UPDATE employee
                SET {', '.join(update_fields)}
                WHERE emp_id = %s AND del_flg = 0
            """
            cursor.execute(sql, tuple(update_values))
            conn.commit()
    except Exception as e:
        conn.rollback()
        print("Update profile error:", e)
        return jsonify({"error": "db error"}), 500
    finally:
        conn.close()

    return jsonify({"success": True})
