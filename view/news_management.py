from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime

# โหลดค่าคอนฟิกจากไฟล์ .env
load_dotenv()

news_management_bp = Blueprint('news_management', __name__)


def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor
    )
@news_management_bp.route('/news-management')
def news_management():
    return render_template('admin/news-management.html')