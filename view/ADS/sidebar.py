from flask import Blueprint, render_template, request, jsonify, session ,redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime

load_dotenv()

sidebar_ads_bp = Blueprint('sidebar_ads', __name__)

def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor
    )
    
@sidebar_ads_bp.route('/sidebar_ads')
def sidebar_ads_page ():
    return render_template('package/sidebar.html')