from flask import Blueprint, render_template, request, jsonify, abort, session, redirect, url_for
import base64
from dotenv import load_dotenv
from view.navbar import load_nav_categories
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
    data = request.json

    conn = connect_db()
    with conn.cursor() as cursor:
        cursor.execute("""
            UPDATE customer
            SET cus_fname=%s,
                cus_lname=%s,
                cus_phone=%s,
                cus_email=%s,
                cus_address=%s,
                cus_idcard=%s,
                updated_by=%s
            WHERE cus_id=%s
        """, (
            data["fname"],
            data["lname"],
            data["phone"],
            data["email"],
            data["address"],
            data["idcard"],
            user_id,
            user_id
        ))

    conn.commit()
    conn.close()

    return jsonify(ok=True)


@profile_cus_bp.route("/update_profile_image", methods=["POST"])
def update_profile_image():

    if "front_user" not in session:
        return jsonify(ok=False), 401

    user_id = session["front_user"]["id"]
    data = request.json
    image_base64 = data.get("image")

    conn = connect_db()
    with conn.cursor() as cursor:
        cursor.execute("""
            UPDATE customer
            SET cus_profile=%s,
                updated_by=%s
            WHERE cus_id=%s
        """, (
            image_base64,
            user_id,
            user_id
        ))

    conn.commit()
    conn.close()

    # อัพเดต session avatar ด้วย
    session["front_user"]["avatar"] = image_base64

    return jsonify(ok=True)


@profile_cus_bp.route("/change_password", methods=["POST"])
def change_password():

    if "front_user" not in session:
        return jsonify(ok=False), 401

    user_id = session["front_user"]["id"]
    data = request.json
    old_password = data.get("old_password")
    new_password = data.get("new_password")

    conn = connect_db()
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT cus_password_hash
            FROM customer
            WHERE cus_id=%s
        """, (user_id,))
        user = cursor.fetchone()

        if not user:
            return jsonify(ok=False), 404

        if not bcrypt.checkpw(old_password.encode(), user["cus_password_hash"].encode()):
            return jsonify(ok=False, message="รหัสผ่านเดิมไม่ถูกต้อง"), 400

        new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()

        cursor.execute("""
            UPDATE customer
            SET cus_password_hash=%s,
                updated_by=%s
            WHERE cus_id=%s
        """, (new_hash, user_id, user_id))

    conn.commit()
    conn.close()

    return jsonify(ok=True)

