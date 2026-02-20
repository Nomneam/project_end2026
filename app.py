from flask import Flask
from dotenv import load_dotenv
import os


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
from view.admin_writenew import admin_writenew_bp  
from view.admin_profile import admin_profile_bp
from view.Advertising_revenue import advertising_revenue_bp
from view.advert_dashbord import advert_dashbord_bp
from view.owner_profile import owner_profile_bp



app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY')
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
app.register_blueprint(admin_writenew_bp)
app.register_blueprint(admin_profile_bp)
app.register_blueprint(advertising_revenue_bp)
app.register_blueprint(advert_dashbord_bp)
app.register_blueprint(owner_profile_bp)

@app.route('/')
def home():
    return "Hello, World!"

if __name__ == '__main__':
    app.run(debug=True)