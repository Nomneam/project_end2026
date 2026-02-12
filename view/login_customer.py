from flask import Blueprint, request, session, render_template, redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
import bcrypt

load_dotenv()

login_customer_bp = Blueprint("login_customer", __name__)

def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT")),
        cursorclass=pymysql.cursors.DictCursor
    )