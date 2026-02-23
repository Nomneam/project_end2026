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

def load_footer_data():
    conn = connect_db()
    try:
        with conn.cursor() as cur:

            # ข้อมูลหลักเว็บ
            cur.execute("""
                SELECT address
                FROM site_contact
                LIMIT 1
            """)
            contact = cur.fetchone()

            # เบอร์โทร
            cur.execute("""
                SELECT phone_number, label
                FROM contact_phones
                WHERE del_flg = 0
                ORDER BY display_order
            """)
            phones = cur.fetchall() or []

        return {
            "contact": contact,
            "phones": phones
        }

    finally:
        conn.close()