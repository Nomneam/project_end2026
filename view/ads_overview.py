from flask import Blueprint, render_template, request, jsonify, abort

ads_overview_bp = Blueprint("ads_overview",__name__)

@ads_overview_bp.route("/ads_overview")
def ads_page():
    return render_template("ads-overview.html")