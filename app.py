from flask import Flask
from dotenv import load_dotenv
import os


load_dotenv()



# import blueprints 
from view.login_emp import login_emp_bp
from view.dashboard_admin import dashboard_admin_bp
from view.dashboard_reporter import dashboard_reporter_bp
from view.dashboard_owner import dashboard_owner_bp
from view.advert_review import advert_review_bp
from view.user_role import user_role_bp
from view.category_management import category_management_bp



app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY')
# register blueprints
app.register_blueprint(login_emp_bp)
app.register_blueprint(dashboard_admin_bp)
app.register_blueprint(dashboard_reporter_bp)
app.register_blueprint(dashboard_owner_bp)
app.register_blueprint(advert_review_bp)
app.register_blueprint(user_role_bp)
app.register_blueprint(category_management_bp)

@app.route('/')
def home():
    return "Hello, World!"

if __name__ == '__main__':
    app.run(debug=True)