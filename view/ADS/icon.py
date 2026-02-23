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
    return render_template('package/icon.html')

# ===============================
# CREATE ICON AD (SUBMIT)
# ===============================
@icon_ads_bp.route("/api/icon_ads", methods=["POST"])
def create_icon_ad():

    # ✅ ต้อง login ก่อน
    if "front_user" not in session:
        return jsonify({"error": "กรุณาเข้าสู่ระบบก่อนลงโฆษณา"}), 401

    name = request.form.get("name")
    url = request.form.get("url")
    months = request.form.get("months")
    image = request.files.get("image")

    # ตรวจสอบข้อมูล
    if not name or not url or not months or not image:
        return jsonify({"error": "กรอกข้อมูลไม่ครบ"}), 400

    try:
        months = int(months)
        
        ICON_PRICE = 300
        total_price = ICON_PRICE * months
    
    except:
        return jsonify({"error": "จำนวนเดือนไม่ถูกต้อง"}), 400

    # ===============================
    # UPLOAD IMAGE
    # ===============================
    upload_folder = "static/uploads/ads"
    os.makedirs(upload_folder, exist_ok=True)

    filename = f"{int(datetime.now().timestamp())}_{image.filename}"
    filepath = os.path.join(upload_folder, filename)
    image.save(filepath)

    image_url = f"/static/uploads/ads/{filename}"

    # ===============================
    # DATE RANGE
    # ===============================
    valid_from = datetime.now()
    valid_to = valid_from + relativedelta(months=months)

    try:
        conn = connect_db()

        with conn.cursor() as cursor:
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
                session["front_user"]["id"],
                2,                  # ⭐ ICON CATEGORY
                name,
                image_url,
                url,
                total_price,
                "HOME_ICON",
                valid_from,
                valid_to,
                "draft"         
            ))
            
            conn.commit()

    except Exception as e:
        print("DB ERROR:", e)
        return jsonify({"error": "บันทึกข้อมูลไม่สำเร็จ"}), 500

    finally:
        conn.close()

    return jsonify({
        "success": True,
        "message": "ส่งโฆษณาเรียบร้อย กรุณารอการอนุมัติ"
    })
