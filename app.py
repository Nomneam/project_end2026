from flask import Flask
from dotenv import load_dotenv
import os
import omise


load_dotenv()



# import blueprints 
from view.login_emp import login_emp_bp
from view.dashboard_admin import dashboard_admin_bp
from view.dashboard_reporter import dashboard_reporter_bp
from view.dashboard_owner import dashboard_owner_bp
from view.write_news_reporter import write_news_reporter_bp
from view.news_list import news_list_bp
from view.advert_review import advert_review_bp
from view.user_role import user_role_bp
from view.category_management import category_management_bp
from view.news_management import news_management_bp
from view.index import index_bp
from view.news_detail import news_detail_bp
from view.page_category import page_cat_bp
from view.navbar import load_nav_categories
from view.packages import packages_bp
from view.login_customer import login_customer_bp
from view.profile_cus import profile_cus_bp
from view.ADS.icon import icon_ads_bp
from view.ADS.sidebar import sidebar_ads_bp
from view.ADS.footer_ads import footer_ads_bp
from view.ADS.bighero import bighero_ads_bp
from view.ads_overview import ads_overview_bp
from view.admin_writenew import admin_writenew_bp
from view.admin_profile import admin_profile_bp
from view.Advertising_revenue import advertising_revenue_bp
from view.advert_dashbord import advert_dashbord_bp
from view.owner_profile import owner_profile_bp
from view.footer_context import load_footer_data
from view.setting_system import setting_system_bp
from view.payment_routes import payment_bp
from view.register_cus import register_cus_bp





app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY')
omise.api_public = os.getenv("OMISE_PUBLIC_KEY")
omise.api_secret = os.getenv("OMISE_SECRET_KEY")
# register blueprints
app.register_blueprint(login_emp_bp)
app.register_blueprint(dashboard_admin_bp)
app.register_blueprint(dashboard_reporter_bp)
app.register_blueprint(dashboard_owner_bp)
app.register_blueprint(write_news_reporter_bp)
app.register_blueprint(news_list_bp)
app.register_blueprint(advert_review_bp)
app.register_blueprint(user_role_bp)
app.register_blueprint(category_management_bp)
app.register_blueprint(news_management_bp)
app.register_blueprint(index_bp)
app.register_blueprint(news_detail_bp)
app.register_blueprint(page_cat_bp)
app.register_blueprint(packages_bp)
app.register_blueprint(login_customer_bp)
app.register_blueprint(profile_cus_bp)
app.register_blueprint(icon_ads_bp)
app.register_blueprint(sidebar_ads_bp)
app.register_blueprint(footer_ads_bp)
app.register_blueprint(bighero_ads_bp)
app.register_blueprint(ads_overview_bp)
app.register_blueprint(admin_writenew_bp)
app.register_blueprint(admin_profile_bp)
app.register_blueprint(advertising_revenue_bp)
app.register_blueprint(advert_dashbord_bp)
app.register_blueprint(owner_profile_bp)
app.register_blueprint(setting_system_bp)
app.register_blueprint(payment_bp, url_prefix="/payment")
app.register_blueprint(register_cus_bp)

@app.route('/')
def home():
    return "Hello, World!"

@app.context_processor
def inject_navbar():
    return {
        "categories": load_nav_categories(),
        **load_footer_data()
    }

if __name__ == '__main__':
    app.run(debug=True)