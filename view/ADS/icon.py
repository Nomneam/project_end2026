from flask import Blueprint, render_template, request, jsonify, session,redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime
from dateutil.relativedelta import relativedelta

load_dotenv()

icon_ads_bp = Blueprint('icon_ads', __name__)

# ===============================
# DATABASE CONNECTION
# ===============================
def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor,
    )

# ===============================
# PAGE ROUTE
# ===============================
@icon_ads_bp.route('/icon_ads')
def icon_ads_page():
    if "front_user" not in session:
        return redirect(url_for("index.index_news", auth="required"))

    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT price_per_month
        FROM advert_position_price
        WHERE position_name = 'Icon'
        LIMIT 1
    """)

    result = cursor.fetchone()
    conn.close()

    icon_price = result["price_per_month"] if result else 0

    return render_template(
        'package/icon.html',
        icon_price=icon_price
    )

# ===============================
# CREATE ICON AD (SUBMIT)
# ===============================
@icon_ads_bp.route("/api/icon_ads", methods=["POST"])
def create_icon_ad():

    # ✅ ต้อง login ก่อน
    if "front_user" not in session:
        return jsonify({"error": "กรุณาเข้าสู่ระบบก่อนลงโฆษณา"}), 401

    user_id = session["front_user"]["id"]

    name = (request.form.get("name") or "").strip()
    url = (request.form.get("url") or "").strip()
    months = request.form.get("months")
    image = request.files.get("image")

    # ===============================
    # VALIDATION
    # ===============================
    if not name or not url or not months or not image:
        return jsonify({"error": "กรอกข้อมูลไม่ครบ"}), 400

    try:
        months = int(months)
        if months < 1 or months > 12:
            return jsonify({"error": "เลือกได้ 1-12 เดือน"}), 400
    except:
        return jsonify({"error": "จำนวนเดือนไม่ถูกต้อง"}), 400

    conn = None

    try:
        conn = connect_db()
        cursor = conn.cursor()

        # ===============================
        # 1️⃣ ดึงราคา Icon จาก DB
        # ===============================
        cursor.execute("""
            SELECT price_per_month
            FROM advert_position_price
            WHERE LOWER(position_name) = 'icon'
            LIMIT 1
        """)
        result = cursor.fetchone()

        if not result:
            return jsonify({"error": "ไม่พบราคาจากระบบ"}), 500

        icon_price = float(result["price_per_month"])
        total_price = icon_price * months

        # ===============================
        # 2️⃣ อัปโหลดรูป
        # ===============================
        upload_folder = "static/uploads/ads"
        os.makedirs(upload_folder, exist_ok=True)

        filename = f"{int(datetime.now().timestamp())}_{image.filename}"
        filepath = os.path.join(upload_folder, filename)
        image.save(filepath)

        image_url = f"/static/uploads/ads/{filename}"

        # ===============================
        # 3️⃣ คำนวณวันหมดอายุ
        # ===============================
        valid_from = datetime.now()
        valid_to = valid_from + relativedelta(months=months)

        # ===============================
        # 4️⃣ INSERT ADVERT
        # ===============================
        sql = """
            INSERT INTO advert
            (
                cus_id,
                adc_cat_id,
                adv_name,
                adv_image_url,
                target_url,
                adv_price,
                adv_position,
                valid_from,
                valid_to,
                status,
                created_at,
                del_flg
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),0)
        """

        cursor.execute(sql, (
            user_id,
            2,
            name,
            image_url,
            url,
            total_price,
            "HOME_ICON",
            valid_from,
            valid_to,
            "draft"
        ))

        advert_id = cursor.lastrowid
        conn.commit()

        # ===============================
        # 5️⃣ WRITE AUDIT LOG
        # ===============================
        try:
            cursor.execute("""
                INSERT INTO audit_logs_cus
                (cus_id, action, pages, detail, ip_address)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                user_id,
                "Create",
                "icon_ads",
                f"Created HOME_ICON ad: {name} | {months} months | {total_price} บาท",
                request.remote_addr
            ))
            conn.commit()
        except Exception as e:
            print("Audit Log Error:", e)

    except Exception as e:
        print("DB ERROR:", e)
        return jsonify({"error": "บันทึกข้อมูลไม่สำเร็จ"}), 500

    finally:
        if conn:
            conn.close()

    return jsonify({
        "success": True,
        "message": "ส่งโฆษณาเรียบร้อย กรุณารอการอนุมัติ",
        "total_price": total_price
    })