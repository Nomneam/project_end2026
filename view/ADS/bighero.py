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
def bighero_ads_page ():
    if "front_user" not in session:
        return redirect(url_for("index.index_news", auth="required"))
    return render_template('package/bighero.html')

@bighero_ads_bp.route('/api/bighero_ads', methods=['POST'])
def create_bighero_ad():

    if "front_user" not in session:
        return jsonify({"error": "กรุณาเข้าสู่ระบบก่อน"}), 401

    image = request.files.get("image")
    title = request.form.get("title")
    description = request.form.get("description", "")
    url = request.form.get("url")
    months = request.form.get("months")
    place = request.form.get("place")

    if not image or not title or not url or not months:
        return jsonify({"error": "กรอกข้อมูลไม่ครบ"}), 400

    try:
        months = int(months)
    except:
        return jsonify({"error": "จำนวนเดือนไม่ถูกต้อง"}), 400

    # upload
    folder = "static/uploads/ads"
    os.makedirs(folder, exist_ok=True)

    filename = f"{int(datetime.now().timestamp())}_{image.filename}"
    filepath = os.path.join(folder, filename)
    image.save(filepath)

    image_url = f"/static/uploads/ads/{filename}"

    valid_from = datetime.now()
    valid_to = valid_from + relativedelta(months=months)

    # map ตำแหน่งโฆษณา
    if place == "home":
        position = "INDEX_PAGE"
    elif place == "category":
        position = "CATEGORY_PAGE"
    else:
        position = "UNKNOWN"


    conn = connect_db()

    try:
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
                adv_position,
                valid_from,
                valid_to,
                status,
                created_at,
                del_flg
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'draft',NOW(),0)
            """

            cur.execute(sql, (
                session["front_user"]["id"],
                4,  # ⭐ HERO CATEGORY
                title,
                description,
                image_url,
                url,
                position,
                valid_from,
                valid_to
            ))

            conn.commit()

    finally:
        conn.close()

    return jsonify({
        "success": True,
        "message": "ส่งโฆษณาเรียบร้อย"
    })