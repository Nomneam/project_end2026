from flask import Blueprint, render_template, session, redirect, url_for
import pymysql
from flask import request, jsonify
from dotenv import load_dotenv
import os
from werkzeug.utils import secure_filename
from datetime import datetime
from flask import send_file
import io
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import uuid


load_dotenv()

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
        return jsonify(success=False, message="กรุณาเข้าสู่ระบบ")

    adv_id = request.form.get("id")
    name = request.form.get("name")
    desc = request.form.get("desc")
    url = request.form.get("url")
    old_status = request.form.get("status")

    image = request.files.get("image")

    # กำหนดสถานะใหม่
    if old_status == "paused":
        new_status = "running"
    else:
        new_status = "draft"

    conn = connect_db()
    cursor = conn.cursor()

    try:

        # ถ้ามีการอัปโหลดรูปใหม่
        if image and image.filename != "":

            ext = os.path.splitext(image.filename)[1]
            filename = f"ad_{uuid.uuid4().hex}{ext}"

            upload_folder = os.path.join("static", "uploads")
            os.makedirs(upload_folder, exist_ok=True)

            filepath = os.path.join(upload_folder, filename)

            image.save(filepath)

            cursor.execute("""
                UPDATE advert
                SET
                    adv_name=%s,
                    adv_description=%s,
                    target_url=%s,
                    adv_image_url=%s,
                    status=%s,
                    rejected_reason=NULL,
                    updated_at=NOW()
                WHERE adv_id=%s AND cus_id=%s
            """, (
                name,
                desc,
                url,
                f"/static/uploads/{filename}",
                new_status,
                adv_id,
                front_user["id"]
            ))

        else:

            cursor.execute("""
                UPDATE advert
                SET
                    adv_name=%s,
                    adv_description=%s,
                    target_url=%s,
                    status=%s,
                    rejected_reason=NULL,
                    updated_at=NOW()
                WHERE adv_id=%s AND cus_id=%s
            """, (
                name,
                desc,
                url,
                new_status,
                adv_id,
                front_user["id"]
            ))

        conn.commit()

        return jsonify(success=True)

    except Exception as e:
        conn.rollback()
        return jsonify(success=False, message=str(e))

    finally:
        cursor.close()
        conn.close()



@ads_overview_bp.route("/ads/receipt/<int:adv_id>")
def generate_receipt(adv_id):

    front_user = session.get("front_user")
    if not front_user:
        return redirect(url_for("index.index_news"))

    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT adv_name, adv_price, valid_from, valid_to
        FROM advert
        WHERE adv_id=%s AND del_flg=0
    """, (adv_id,))

    ad = cursor.fetchone()

    cursor.close()
    conn.close()

    if not ad:
        return "Advertisement not found", 404

    buffer = io.BytesIO()

    font_path = os.path.join("static", "fonts", "THSarabun.ttf")

    pdfmetrics.registerFont(
        TTFont("THSarabun", font_path)
    )

    pdf = canvas.Canvas(buffer)

    # ===== HEADER =====
    pdf.setFont("THSarabun", 22)
    pdf.drawCentredString(300, 780, "Bangkok Today")

    pdf.setFont("THSarabun", 16)
    pdf.drawCentredString(300, 755, "ใบเสร็จค่าโฆษณา")

    pdf.line(50, 735, 550, 735)

    # ===== INFO =====
    invoice_no = f"BT-{adv_id}-{datetime.now().strftime('%Y%m%d')}"
    date_now = datetime.now().strftime("%d/%m/%Y")

    pdf.setFont("THSarabun", 14)
    pdf.drawString(60, 710, f"เลขที่ใบเสร็จ: {invoice_no}")
    pdf.drawString(420, 710, f"วันที่: {date_now}")

    # ===== TABLE HEADER =====
    pdf.line(50, 690, 550, 690)

    pdf.setFont("THSarabun", 14)
    pdf.drawString(60, 670, "รายการโฆษณา")
    pdf.drawRightString(520, 670, "ราคา")

    pdf.line(50, 660, 550, 660)

    # ===== DATA =====
    price = "{:,.2f}".format(ad["adv_price"])

    pdf.setFont("THSarabun", 14)
    pdf.drawString(60, 640, ad["adv_name"])
    pdf.drawRightString(520, 640, f"{price} บาท")

    if ad["valid_from"] and ad["valid_to"]:
        start = ad["valid_from"].strftime("%d/%m/%Y")
        end = ad["valid_to"].strftime("%d/%m/%Y")

        pdf.drawString(
            60,
            610,
            f"ระยะเวลาโฆษณา: {start} - {end}"
        )

    pdf.line(50, 590, 550, 590)

    pdf.setFont("THSarabun", 16)
    pdf.drawRightString(520, 560, f"รวมทั้งหมด: {price} บาท")

    pdf.setFont("THSarabun", 14)
    pdf.drawCentredString(
        300,
        520,
        "ขอบคุณที่ใช้บริการโฆษณากับ Bangkok Today"
    )

    pdf.showPage()
    pdf.save()

    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=False,
        download_name=f"receipt_{adv_id}.pdf",
        mimetype="application/pdf"
    )
    
    
@ads_overview_bp.route("/ads/resume", methods=["POST"])
def resume_ad():

    front_user = session.get("front_user")
    if not front_user:
        return jsonify({"error": "unauthorized"}), 401

    adv_id = request.form.get("id")

    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE advert
        SET status='running',
            updated_at=NOW()
        WHERE adv_id=%s AND cus_id=%s
    """, (adv_id, front_user["id"]))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify(success=True)