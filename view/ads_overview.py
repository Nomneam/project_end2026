from flask import Blueprint, render_template, session, redirect, url_for
import pymysql
from flask import request, jsonify
import os
from werkzeug.utils import secure_filename
from datetime import datetime

ads_overview_bp = Blueprint("ads_overview", __name__)

def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT")),
        cursorclass=pymysql.cursors.DictCursor
    )

@ads_overview_bp.route("/ads_overview")
def ads_page():
    front_user = session.get("front_user")
    if not front_user:
        # ยังไม่ล็อกอิน -> ส่งกลับไปหน้าแรก หรือหน้า login ที่คุณใช้
        return redirect(url_for("index.index_news"))

    cus_id = front_user["id"]

    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            adv_id,
            cus_id,
            adc_cat_id,
            adv_name,
            adv_description,
            adv_price,
            adv_position,
            adv_image_url,
            adv_video_url,
            target_url,
            valid_from,
            valid_to,
            status,
            reviewed_by_emp_id,
            reviewed_at,
            rejected_reason,
            created_at,
            updated_at
        FROM advert
        WHERE cus_id = %s
          AND del_flg = 0
        ORDER BY created_at DESC
    """, (cus_id,))

    adverts = cursor.fetchall()

    cursor.close()
    conn.close()

    # ส่ง list adverts ไปให้ template ใช้ render
    return render_template("ads-overview.html", adverts=adverts)


@ads_overview_bp.route("/ads/update", methods=["POST"])
def update_ad():
    front_user = session.get("front_user")
    if not front_user:
        return jsonify({"error": "unauthorized"}), 401

    adv_id = request.form.get("id")
    name = request.form.get("name")
    desc = request.form.get("desc")
    url = request.form.get("url")

    image = request.files.get("image")
    image_url = None

    try:
        conn = connect_db()
        cursor = conn.cursor()

        # ===============================
        # ✅ ถ้ามีอัปโหลดรูปใหม่
        # ===============================
        if image and image.filename:

            upload_folder = "static/uploads/ads"
            os.makedirs(upload_folder, exist_ok=True)

            filename = f"{int(datetime.now().timestamp())}_{secure_filename(image.filename)}"
            filepath = os.path.join(upload_folder, filename)
            image.save(filepath)

            image_url = f"/static/uploads/ads/{filename}"

            cursor.execute("""
                UPDATE advert
                SET
                    adv_name=%s,
                    adv_description=%s,
                    target_url=%s,
                    adv_image_url=%s,
                    status='draft',
                    rejected_reason=NULL,
                    reviewed_by_emp_id=NULL,
                    reviewed_at=NULL,
                    updated_at=NOW()
                WHERE adv_id=%s AND cus_id=%s
            """, (
                name, desc, url, image_url,
                adv_id, front_user["id"]
            ))

        else:
            # ไม่มีรูปใหม่ → ไม่แก้รูป
            cursor.execute("""
                UPDATE advert
                SET
                    adv_name=%s,
                    adv_description=%s,
                    target_url=%s,
                    status='draft',
                    rejected_reason=NULL,
                    reviewed_by_emp_id=NULL,
                    reviewed_at=NULL,
                    updated_at=NOW()
                WHERE adv_id=%s AND cus_id=%s
            """, (
                name, desc, url,
                adv_id, front_user["id"]
            ))

        conn.commit()

    except Exception as e:
        print("UPDATE ERROR:", e)
        return jsonify({"error": "update failed"}), 500

    finally:
        conn.close()

    return jsonify(success=True)