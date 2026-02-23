from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime
from dateutil.relativedelta import relativedelta   # ⭐ สำคัญ

load_dotenv()

sidebar_ads_bp = Blueprint('sidebar_ads', __name__)

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
        cursorclass=pymysql.cursors.DictCursor
    )

# ===============================
# PAGE ROUTE
# ===============================
@sidebar_ads_bp.route('/sidebar_ads')
def sidebar_ads_page():
    if "front_user" not in session:
        return redirect(url_for("index.index_news", auth="required"))
    return render_template('package/sidebar.html')

# ===============================
# CREATE SIDEBAR AD
# ===============================
@sidebar_ads_bp.route('/api/sidebar_ads', methods=['POST'])
def create_sidebar_ad():

    # 🔐 ต้อง login
    if "front_user" not in session:
        return jsonify({"error": "กรุณาเข้าสู่ระบบก่อน"}), 401

    image = request.files.get("image")
    name = request.form.get("title")
    description = request.form.get("description", "")  # optional
    url = request.form.get("url")
    months = request.form.get("months")

    # ตรวจข้อมูล
    if not image or not name or not url or not months:
        return jsonify({"error": "กรอกข้อมูลไม่ครบ"}), 400

    try:
        months = int(months)
        if months < 1 or months > 12:
            return jsonify({"error": "เลือกได้ 1-12 เดือน"}), 400
        
        SIDEBAR_PRICE = 150
        total_price = SIDEBAR_PRICE * months
    except:
        return jsonify({"error": "จำนวนเดือนไม่ถูกต้อง"}), 400

    # ===============================
    # UPLOAD IMAGE
    # ===============================
    folder = "static/uploads/ads"
    os.makedirs(folder, exist_ok=True)

    filename = f"{int(datetime.now().timestamp())}_{image.filename}"
    path = os.path.join(folder, filename)
    image.save(path)

    image_url = f"/static/uploads/ads/{filename}"

    # ===============================
    # DATE RANGE
    # ===============================
    valid_from = datetime.now()
    valid_to = valid_from + relativedelta(months=months)

    conn = None
    try:
        conn = connect_db()

        with conn.cursor() as cur:
            sql = """
            INSERT INTO advert
            (
                cus_id,
                adc_cat_id,
                adv_name,
                adv_description,
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
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'draft',NOW(),0)
            """

            cur.execute(sql, (
                session["front_user"]["id"],
                1,   # ⭐ SIDEBAR CATEGORY
                name,
                description,
                image_url,
                url,
                total_price,       # ⭐ ราคาที่คำนวณ
                "SIDEBAR",
                valid_from,
                valid_to
            ))

            conn.commit()

    except Exception as e:
        print("DB ERROR:", e)
        return jsonify({"error": "บันทึกข้อมูลไม่สำเร็จ"}), 500

    finally:
        if conn:
            conn.close()

    return jsonify({
        "success": True,
        "message": "ส่งโฆษณาเรียบร้อย รออนุมัติ"
    })
