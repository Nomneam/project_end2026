from flask import Blueprint, render_template, request, jsonify, abort
from dotenv import load_dotenv
from view.navbar import load_nav_categories
import pymysql
import os

load_dotenv()

profile_cus_bp = Blueprint("profile_cus", __name__)

# =============================
# DB
# =============================
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
    
    
@profile_cus_bp.route("/profile_customer")
def profile_cus():
    return render_template("profile_cus.html")