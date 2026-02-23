from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime
from dateutil.relativedelta import relativedelta

load_dotenv()

footer_ads_bp = Blueprint('footer_ads', __name__)

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
# PAGE
# ===============================
@footer_ads_bp.route('/footer_ads')
def footer_ads_page():
    if "front_user" not in session:
        return redirect(url_for("index.index_news", auth="required"))

    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT price_per_month
        FROM advert_position_price
        WHERE LOWER(position_name) = 'footer'
        LIMIT 1
    """)

    result = cursor.fetchone()
    conn.close()

    footer_price = result["price_per_month"] if result else 0

    return render_template(
        'package/footer.html',
        footer_price=footer_price
    )

# ===============================
# CREATE FOOTER SLIDE AD
# ===============================
@footer_ads_bp.route('/api/footer_ads', methods=['POST'])
def create_footer_ad():

    if "front_user" not in session:
        return jsonify({"error": "กรุณาเข้าสู่ระบบก่อน"}), 401

    image = request.files.get("image")
    title = request.form.get("title")
    description = request.form.get("description", "")
    url = request.form.get("url")
    months = request.form.get("months")

    if not image or not title or not url or not months:
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

        # ✅ ดึงราคาจริงจาก DB
        cursor.execute("""
            SELECT price_per_month
            FROM advert_position_price
            WHERE LOWER(position_name) = 'footer'
            LIMIT 1
        """)
        result = cursor.fetchone()

        if not result:
            return jsonify({"error": "ไม่พบราคาจากระบบ"}), 500

        footer_price = float(result["price_per_month"])
        total_price = footer_price * months

        # ===============================
        # อัปโหลดรูป
        # ===============================
        folder = "static/uploads/ads"
        os.makedirs(folder, exist_ok=True)

        filename = f"{int(datetime.now().timestamp())}_{image.filename}"
        filepath = os.path.join(folder, filename)
        image.save(filepath)

        image_url = f"/static/uploads/ads/{filename}"

        # ===============================
        # DATE RANGE
        # ===============================
        valid_from = datetime.now()
        valid_to = valid_from + relativedelta(months=months)

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

        cursor.execute(sql, (
            session["front_user"]["id"],
            3,
            title,
            description,
            image_url,
            url,
            total_price,
            "FOOTER_HOME",
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
        "message": "ส่งโฆษณาเรียบร้อย รออนุมัติ",
        "total_price": total_price
    })