from flask import Blueprint, render_template, abort, session, request, url_for
from dotenv import load_dotenv
from view.navbar import load_nav_categories
import pymysql
import os
import json

load_dotenv()

page_cat_bp = Blueprint("page_cat",__name__)

@page_cat_bp.route("/page_category")
def page_category():
    categories = load_nav_categories()
    return render_template("page_category.html",categories=categories)
