from flask import Blueprint, render_template

payment_bp = Blueprint("payment", __name__)

@payment_bp.route("/payment/<int:adv_id>")
def create_payment(adv_id):
    return f"Payment for advert {adv_id}"