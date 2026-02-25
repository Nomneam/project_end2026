from flask import Blueprint, jsonify
import pymysql
from dotenv import load_dotenv
import os
import omise

load_dotenv()

payment_bp = Blueprint("payment", __name__)




def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT", 3306)),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        charset="utf8mb4",
    )


@payment_bp.route("/create-charge/<int:adv_id>")
def create_charge(adv_id):

    conn = connect_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT adv_price
        FROM advert
        WHERE adv_id=%s
    """, (adv_id,))

    ad = cur.fetchone()
    conn.close()

    if not ad or not ad["adv_price"]:
        return {"error": "ไม่พบราคา"}, 404

    # 🔥 Omise ต้องใช้หน่วยสตางค์
    amount_satang = int(ad["adv_price"] * 100)

    charge = omise.Charge.create(
        amount=amount_satang,
        currency="thb",
        source={"type": "promptpay"}
    )

    return jsonify({
        "qr": charge.source.scannable_code.image.download_uri,
        "amount": ad["adv_price"],
        "charge_id": charge.id
    })
    
    
    
    
@payment_bp.route("/confirm/<int:adv_id>", methods=["POST"])
def confirm_payment(adv_id):
    conn = connect_db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE advert
        SET status='running'
        WHERE adv_id=%s
    """, (adv_id,))

    conn.close()

    return {"success": True}