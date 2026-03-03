from flask import Blueprint, render_template, request, jsonify, session ,redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from dateutil.relativedelta import relativedelta
from datetime import datetime

load_dotenv()

bighero_ads_bp = Blueprint('bighero_ads', __name__)

def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor
    )
    
@bighero_ads_bp.route('/bighero_ads')
def bighero_ads_page():
    if "front_user" not in session:
        return redirect(url_for("index.index_news", auth="required"))

    conn = connect_db()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT position_name, price_per_month
            FROM advert_position_price
            WHERE adc_cat_id = 4
        """)
        rows = cur.fetchall()
    conn.close()

    prices = {r["position_name"]: r["price_per_month"] for r in rows}

    return render_template(
        'package/bighero.html',
        prices=prices
    )
    

@bighero_ads_bp.route('/api/bighero_ads', methods=['POST'])
def create_bighero_ad():

    if "front_user" not in session:
        return jsonify({"error": "กรุณาเข้าสู่ระบบก่อน"}), 401

    user_id = session["front_user"]["id"]

    image = request.files.get("image")
    title = (request.form.get("title") or "").strip()
    description = (request.form.get("description") or "").strip()
    url = (request.form.get("url") or "").strip()
    months = request.form.get("months")
    place = request.form.get("place")

    # ===============================
    # VALIDATION
    # ===============================
    if not image or not title or not url or not months:
        return jsonify({"error": "กรอกข้อมูลไม่ครบ"}), 400

    try:
        months = int(months)
        if months < 1 or months > 12:
            return jsonify({"error": "เลือกได้ 1-12 เดือน"}), 400
    except:
        return jsonify({"error": "จำนวนเดือนไม่ถูกต้อง"}), 400

    # ===============================
    # MAP POSITION
    # ===============================
    if place == "home":
        position = "INDEX_PAGE"
    elif place == "category":
        position = "CATEGORY_PAGE"
    else:
        return jsonify({"error": "ตำแหน่งไม่ถูกต้อง"}), 400

    conn = None

    try:
        conn = connect_db()
        cursor = conn.cursor()

        # ===============================
        # 1️⃣ ดึงราคาจาก DB
        # ===============================
        cursor.execute("""
            SELECT price_per_month
            FROM advert_position_price
            WHERE position_name=%s
            LIMIT 1
        """, (position,))

        result = cursor.fetchone()

        if not result:
            return jsonify({"error": "ไม่พบราคาตำแหน่งโฆษณา"}), 500

        price = float(result["price_per_month"])
        total_price = price * months

        # ===============================
        # 2️⃣ Upload Image
        # ===============================
        folder = "static/uploads/ads"
        os.makedirs(folder, exist_ok=True)

        filename = f"{int(datetime.now().timestamp())}_{image.filename}"
        filepath = os.path.join(folder, filename)
        image.save(filepath)

        image_url = f"/static/uploads/ads/{filename}"

        # ===============================
        # 3️⃣ Date Range
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
            adv_description,
            adv_image_url,
            target_url,
            adv_position,
            adv_price,
            valid_from,
            valid_to,
            status,
            created_at,
            del_flg
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'draft',NOW(),0)
        """

        cursor.execute(sql, (
            user_id,
            4,
            title,
            description,
            image_url,
            url,
            position,
            total_price,
            valid_from,
            valid_to
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
                "bighero_ads",
                f"Created {position} BIGHERO ad: {title} | {months} months | {total_price} บาท",
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
        "message": "ส่งโฆษณาเรียบร้อย",
        "total_price": total_price
    })