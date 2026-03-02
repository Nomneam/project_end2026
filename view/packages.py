from flask import Blueprint, render_template, session, redirect, url_for,jsonify,request
import pymysql
import os

packages_bp = Blueprint("packages", __name__)

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

@packages_bp.route("/package")
def packages_page():

    if "front_user" not in session:
        return redirect(url_for("login_customer.login_page"))

    user_id = session["front_user"]["id"]

    conn = connect_db()
    cursor = conn.cursor()

    # ดึงราคาตามเดิม
    cursor.execute("""
        SELECT position_name, price_per_month
        FROM advert_position_price
    """)
    rows = cursor.fetchall()

    # ดึงสถานะ policy ของ user
    cursor.execute("""
        SELECT ads_policy_accepted
        FROM customer
        WHERE cus_id = %s
    """, (user_id,))

    user = cursor.fetchone()
    conn.close()

    ads_policy_accepted = user["ads_policy_accepted"] if user else 0

    prices = {}

    for row in rows:
        name = row["position_name"].strip().lower()
        price = float(row["price_per_month"])

        if name == "sidebar":
            prices["sidebar"] = price
        elif name == "icon":
            prices["icon"] = price
        elif name == "footer":
            prices["footer"] = price
        elif name in ("index_page", "category_page"):
            if "bighero" not in prices or price < prices["bighero"]:
                prices["bighero"] = price

    return render_template(
        "package/packages.html",
        prices=prices,
        ads_policy_accepted=ads_policy_accepted
    )




@packages_bp.route("/accept-ads-policy", methods=["POST"])
def accept_ads_policy():

    if "front_user" not in session:
        return jsonify({"success": False}), 401

    user_id = session["front_user"]["id"]
    ip = request.remote_addr

    conn = connect_db()
    cursor = conn.cursor()

    # 1️⃣ อัปเดตสถานะ policy
    cursor.execute("""
        UPDATE customer
        SET ads_policy_accepted = 1,
            ads_policy_accepted_at = NOW()
        WHERE cus_id = %s
    """, (user_id,))

    # 2️⃣ บันทึก audit log
    cursor.execute("""
        INSERT INTO audit_logs_cus
        (cus_id, action, pages, detail, ip_address)
        VALUES (%s, %s, %s, %s, %s)
    """, (
        user_id,
        "AcceptRule",
        request.referrer or "/package",
        "Customer accepted advertisement policy",
        ip
    ))

    conn.commit()
    conn.close()

    return jsonify({"success": True})