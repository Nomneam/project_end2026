from flask import Blueprint, render_template, request, jsonify
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime

load_dotenv()

advert_dashbord_bp = Blueprint('advert_dashbord', __name__)

def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False
    )

# ======================================================
# 1) หน้า Dashboard
# ======================================================
@advert_dashbord_bp.route('/advert-dashbord')
def advert_dashbord_page():
    return render_template('owner/advert-dashbord.html')