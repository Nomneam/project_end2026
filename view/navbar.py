# view/navbar.py
import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

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

def load_nav_categories():
    conn = connect_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT cat_id, cat_name
                FROM news_category
                WHERE is_active=1 AND del_flg=0
                ORDER BY cat_id ASC
            """)
            cats = cur.fetchall() or []

            cur.execute("""
                SELECT subcat_id, cat_id, subcat_name
                FROM news_subcategory
                WHERE is_active=1 AND del_flg=0
                ORDER BY cat_id ASC, subcat_id ASC
            """)
            subs = cur.fetchall() or []

        sub_map = {}
        for s in subs:
            sub_map.setdefault(s["cat_id"], []).append(s)

        return [{
            "cat_id": c["cat_id"],
            "cat_name": c["cat_name"],
            "subs": sub_map.get(c["cat_id"], [])
        } for c in cats]

    finally:
        conn.close()
