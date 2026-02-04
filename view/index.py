from flask import Blueprint, render_template, session, jsonify, request
from dotenv import load_dotenv

index_bp = Blueprint("index",__name__)

@index_bp.route("/index")
def index_news():
    return render_template("index.html")
