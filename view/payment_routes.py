from flask import Blueprint, request, jsonify
import pymysql
from dotenv import load_dotenv
import os
import requests

load_dotenv()

payment_bp = Blueprint("payment", __name__)

BASE_URL = "https://tmwallet.thaighost.net/apipp.php"

USERNAME = os.getenv("TMW_USER")
PASSWORD = os.getenv("TMW_PASS")
CON_ID = os.getenv("TMW_CON_ID")
ACCODE = os.getenv("TMW_ACCODE")
ACCOUNT_NO = os.getenv("TMW_ACCOUNT_NO")
PROMPTPAY_ID = os.getenv("TMW_PROMPTPAY_ID")


# =========================
# DB CONNECTION (ใช้ transaction)
# =========================
def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT", 3306)),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,  # 🔥 ปิด autocommit
        charset="utf8mb4",
    )


# =========================
# STEP 1: CREATE PAYMENT
# =========================
@payment_bp.route("/tmw-create/<int:adv_id>")
def tmw_create(adv_id):

    conn = connect_db()
    cur = conn.cursor()

    try:
        # 🔎 ดึง advert
        cur.execute("""
            SELECT adv_price, cus_id, adc_cat_id, status
            FROM advert
            WHERE adv_id=%s
            FOR UPDATE
        """, (adv_id,))
        ad = cur.fetchone()

        if not ad:
            conn.rollback()
            return jsonify({"error": "ไม่พบโฆษณา"}), 404

        if ad["status"] != "approved":
            conn.rollback()
            return jsonify({"error": "โฆษณายังไม่พร้อมชำระเงิน"}), 400

        amount = int(float(ad["adv_price"]))

        # 🔥 เคลียร์ order เก่าทั้งหมด
        cur.execute("""
            SELECT adv_order_id
            FROM advert_order
            WHERE adv_id=%s AND order_status='pending'
            FOR UPDATE
        """, (adv_id,))
        old_orders = cur.fetchall()

        for row in old_orders:
            order_id = row["adv_order_id"]

            cur.execute("""
                UPDATE advert_payment
                SET status='expired'
                WHERE adv_order_id=%s AND status='pending'
            """, (order_id,))

            cur.execute("""
                UPDATE advert_order
                SET order_status='cancelled'
                WHERE adv_order_id=%s
            """, (order_id,))

        # 🔥 สร้าง order ใหม่
        cur.execute("""
            INSERT INTO advert_order
            (adv_id, cus_id, adc_cat_id, start_date, end_date, total_amount, order_status)
            VALUES (%s,%s,%s,NOW(),DATE_ADD(NOW(), INTERVAL 30 DAY),%s,'pending')
        """, (adv_id, ad["cus_id"], ad["adc_cat_id"], amount))

        new_order_id = cur.lastrowid

        # 🔥 ยิง TMW create_pay
        params = {
            "username": USERNAME,
            "password": PASSWORD,
            "con_id": CON_ID,
            "amount": amount,
            "ref1": new_order_id,
            "method": "create_pay"
        }

        r = requests.get(BASE_URL, params=params, timeout=15)
        data = r.json()

        if data.get("status") != 1:
            conn.rollback()
            return jsonify({"error": data.get("msg")}), 400

        id_pay = data.get("id_pay")

        # 🔥 บันทึก payment
        cur.execute("""
            INSERT INTO advert_payment
            (adv_order_id, amount, id_pay, currency, method, status)
            VALUES (%s,%s,%s,'THB','promptpay','pending')
        """, (new_order_id, amount, id_pay))

        conn.commit()

        return jsonify({"id_pay": id_pay})

    except Exception as e:
        conn.rollback()
        print("CREATE ERROR:", e)
        return jsonify({"error": "Payment server error"}), 500

    finally:
        conn.close()


# =========================
# STEP 2: GET QR
# =========================
@payment_bp.route("/tmw-qr", methods=["POST"])
def tmw_qr():

    id_pay = request.json.get("id_pay")
    if not id_pay:
        return jsonify({"error": "missing id_pay"}), 400

    params = {
        "username": USERNAME,
        "password": PASSWORD,
        "con_id": CON_ID,
        "id_pay": id_pay,
        "promptpay_id": PROMPTPAY_ID,
        "type": "03",
        "method": "detail_pay"
    }

    try:
        r = requests.get(BASE_URL, params=params, timeout=15)
        data = r.json()

        if data.get("status") != 1:
            return jsonify({"error": data.get("msg")}), 400

        return jsonify({
            "qr_image": data.get("qr_image_base64"),
            "timeout": data.get("time_out")
        })

    except Exception:
        return jsonify({"error": "Payment server error"}), 500


# =========================
# STEP 3: CONFIRM PAYMENT
# =========================
@payment_bp.route("/tmw-confirm", methods=["POST"])
def tmw_confirm():

    id_pay = request.json.get("id_pay")
    if not id_pay:
        return jsonify({"status": "invalid"}), 400

    conn = connect_db()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT adv_order_id, status, amount
            FROM advert_payment
            WHERE id_pay=%s
            FOR UPDATE
        """, (id_pay,))
        payment = cur.fetchone()

        if not payment:
            conn.rollback()
            return jsonify({"status": "invalid"}), 400

        # 🔥 กัน confirm ของ expired
        if payment["status"] != "pending":
            conn.rollback()
            return jsonify({"status": payment["status"]})

        # ยิง confirm ไป TMW
        params = {
            "username": USERNAME,
            "password": PASSWORD,
            "con_id": CON_ID,
            "id_pay": id_pay,
            "accode": ACCODE,
            "account_no": ACCOUNT_NO,
            "ip": request.remote_addr,
            "method": "confirm"
        }

        r = requests.get(BASE_URL, params=params, timeout=15)
        data = r.json()

        if data.get("status") != 1:
            conn.rollback()
            return jsonify({"status": "not_paid"})

        # 🔥 เช็ค amount จาก API (กันยอดเพี้ยน)
        api_amount = float(data.get("amount", payment["amount"]))
        if api_amount != float(payment["amount"]):
            conn.rollback()
            return jsonify({"status": "amount_mismatch"})

        order_id = payment["adv_order_id"]

        # update payment
        cur.execute("""
            UPDATE advert_payment
            SET status='paid',
                paid_amount=%s,
                paid_at=NOW()
            WHERE id_pay=%s
        """, (payment["amount"], id_pay))

        # update order
        cur.execute("""
            UPDATE advert_order
            SET order_status='paid'
            WHERE adv_order_id=%s
        """, (order_id,))

        # update advert
        cur.execute("""
            UPDATE advert
            SET status='running'
            WHERE adv_id = (
                SELECT adv_id FROM advert_order WHERE adv_order_id=%s
            )
        """, (order_id,))

        conn.commit()

        return jsonify({"status": "paid"})

    except Exception as e:
        conn.rollback()
        print("CONFIRM ERROR:", e)
        return jsonify({"error": "Payment server error"}), 500

    finally:
        conn.close()