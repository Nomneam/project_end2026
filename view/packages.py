from flask import Blueprint, render_template
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
    conn = connect_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT position_name, price_per_month
        FROM advert_position_price
    """)

    rows = cursor.fetchall()
    conn.close()

    prices = {}

    for row in rows:
        name = row["position_name"].strip().lower()
        price = float(row["price_per_month"])

        # sidebar
        if name == "sidebar":
            prices["sidebar"] = price

        # icon
        elif name == "icon":
            prices["icon"] = price

        # footer
        elif name == "footer":
            prices["footer"] = price

        # bighero → เลือกราคาต่ำสุด
        elif "bighero" in name:
            if "bighero" not in prices or price < prices["bighero"]:
                prices["bighero"] = price

    return render_template("package/packages.html", prices=prices)