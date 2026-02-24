from flask import Blueprint, render_template, request, jsonify, abort, session, redirect, url_for
import base64
from dotenv import load_dotenv
from view.navbar import load_nav_categories
import pymysql
import os
import re


load_dotenv()

setting_system_bp = Blueprint("setting_system", __name__)

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
# ============================
# Route สำหรับหน้า Setting System
# ============================
@setting_system_bp.route("/setting_system")
def setting_system():

    user = session.get("user")
    if not user or not user.get("id"):
        return redirect(url_for("login_emp.login_emp"))

    conn = connect_db()
    cursor = conn.cursor()

    # =============================
    # 1. ดึงราคาโฆษณา (เฉพาะที่ไม่ลบ)
    # =============================
    cursor.execute("""
        SELECT 
            ap.app_id,
            ap.adc_cat_id,
            ac.adc_cat_name,
            ap.position_name,
            ap.price_per_month
        FROM advert_position_price ap
        JOIN advert_category ac ON ap.adc_cat_id = ac.adc_cat_id
        WHERE ac.del_flg = 0
        ORDER BY ap.adc_cat_id
    """)
    advert_prices = cursor.fetchall()

    # =============================
    # 2. ดึงข้อมูลติดต่อเว็บไซต์
    # =============================
    cursor.execute("""
        SELECT * FROM site_contact
        ORDER BY contact_id DESC
        LIMIT 1
    """)
    site_contact = cursor.fetchone()

    # =============================
    # 3. ดึงเบอร์โทร
    # =============================
    cursor.execute("""
        SELECT * FROM contact_phones
        WHERE del_flg = 0
        ORDER BY display_order
    """)
    contact_phones = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template(
        "admin/setting-system.html",
        advert_prices=advert_prices,
        site_contact=site_contact,
        contact_phones=contact_phones
    )

# =============================
# API: อัพเดทราคาโฆษณา
# =============================
@setting_system_bp.route("/setting_system/update_ads", methods=["POST"])
def update_ads():

    user = session.get("user")
    if not user or not user.get("id"):
        return jsonify(success=False, message="Unauthorized"), 401

    conn = connect_db()
    conn.autocommit(False)
    cursor = conn.cursor()

    try:
        for key, value in request.form.items():

            if key.startswith("price_"):

                try:
                    price = float(value)
                except:
                    return jsonify(success=False, message="ราคาต้องเป็นตัวเลข")

                if price < 0:
                    return jsonify(success=False, message="ราคาห้ามติดลบ")

                app_id = key.split("_")[1]

                cursor.execute("""
                    UPDATE advert_position_price
                    SET price_per_month=%s,
                        updated_at=NOW()
                    WHERE app_id=%s
                """, (price, app_id))

        conn.commit()
        return jsonify(success=True)

    except Exception as e:
        conn.rollback()
        return jsonify(success=False, message=str(e))

    finally:
        cursor.close()
        conn.close()


# =============================
# API สำหรับอัปเดตข้อมูลติดต่อเว็บไซต์
# =============================
@setting_system_bp.route("/setting_system/update_contact", methods=["POST"])
def update_contact():

    user = session.get("user")
    if not user or not user.get("id"):
        return jsonify(success=False, message="Unauthorized"), 401

    conn = connect_db()
    conn.autocommit(False)
    cursor = conn.cursor()

    try:
        email = request.form.get("email", "").strip()
        address = request.form.get("address", "").strip()
        contact_id = request.form.get("contact_id")

        # ตรวจ email
        if not email or "@" not in email:
            return jsonify(success=False, message="อีเมลไม่ถูกต้อง")

        # Update site_contact
        if contact_id:
            cursor.execute("""
                UPDATE site_contact
                SET email=%s,
                    address=%s,
                    updated_at=NOW(),
                    updated_by=%s
                WHERE contact_id=%s
            """, (email, address, user["id"], contact_id))

        # regex รองรับ 9 หรือ 10 หลัก และต้องขึ้นต้นด้วย 0
        phone_pattern = re.compile(r'^0\d{8,9}$')

        # Update phone
        for key, value in request.form.items():

            if key.startswith("phone_"):

                phone = value.strip()

                # ตรวจว่าเป็นตัวเลขล้วน + 9 หรือ 10 หลัก + ขึ้นต้น 0
                if not phone_pattern.match(phone):
                    return jsonify(
                        success=False,
                        message="เบอร์โทรต้องเป็น 9 หรือ 10 หลัก และขึ้นต้นด้วย 0"
                    )

                phone_id = key.split("_")[1]

                cursor.execute("""
                    UPDATE contact_phones
                    SET phone_number=%s,
                        updated_at=NOW(),
                        updated_by=%s
                    WHERE contact_phone_id=%s
                """, (phone, user["id"], phone_id))

        conn.commit()
        return jsonify(success=True)

    except Exception as e:
        conn.rollback()
        return jsonify(success=False, message=str(e))

    finally:
        cursor.close()
        conn.close()