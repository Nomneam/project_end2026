from flask import Blueprint, render_template, session, redirect, url_for
import pymysql
import os

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