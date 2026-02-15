from flask import Blueprint, render_template, request, jsonify, session ,redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
from datetime import datetime

load_dotenv()

footer_ads_bp = Blueprint('footer_ads', __name__)

def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor
    )
    
@footer_ads_bp.route('/footer_ads')
def footer_ads_page ():
    return render_template('package/footer.html')