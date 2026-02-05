from flask import Blueprint, render_template
import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

index_bp = Blueprint("index", __name__)

def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT") or 3306),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        charset="utf8mb4",
    )

@index_bp.route("/index")
def index_news():
    db = connect_db()
    try:
        with db.cursor() as cur:
            cur.execute("""
                SELECT cat_id, cat_name
                FROM news_category
                WHERE is_active=1 AND del_flg=0
                ORDER BY cat_id ASC
            """)
            cats = cur.fetchall()

            cur.execute("""
                SELECT subcat_id, cat_id, subcat_name
                FROM news_subcategory
                WHERE is_active=1 AND del_flg=0
                ORDER BY cat_id ASC, subcat_id ASC
            """)
            subs = cur.fetchall()
    finally:
        db.close()

    sub_map = {}
    for s in subs:
        sub_map.setdefault(s["cat_id"], []).append(s)

    categories = []
    for c in cats:
        categories.append({
            "cat_id": c["cat_id"],
            "cat_name": c["cat_name"],
            "subs": sub_map.get(c["cat_id"], [])
        })

    return render_template("index.html", categories=categories)
