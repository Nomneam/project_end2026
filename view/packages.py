from flask import Blueprint, render_template, request, jsonify, abort

packages_bp = Blueprint("packages",__name__)

@packages_bp.route("/package")
def packages_page():
    return render_template("/package/packages.html")