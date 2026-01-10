from flask import Flask, Blueprint, request, session, render_template, redirect, url_for
from dotenv import load_dotenv
import os
import pymysql
import pymysql.cursors
import bcrypt

# โหลด .env
load_dotenv()

login_emp_bp = Blueprint('login_emp', __name__)

# ฟังก์ชันเชื่อม DB
def connect_db():
    return pymysql.connect(
        host=os.environ.get('HOST'),
        user=os.environ.get('USER'),
        password=os.environ.get('PASSWORD'),
        database=os.environ.get('DB'),
        port=int(os.environ.get('PORT')),
        cursorclass=pymysql.cursors.DictCursor
    )


@login_emp_bp.route('/login_emp', methods=['GET', 'POST'])
def login_emp():
    error = None

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()

        if not username or not password:
            error = "กรุณากรอก Username และ Password"
            return render_template('login_emp.html', error=error)

        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                emp_id,
                emp_username,
                emp_password_hash,
                role_id
            FROM employee
            WHERE emp_username = %s
              AND del_flg = 0
            LIMIT 1
        """, (username,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if user and user['emp_password_hash']:
            # ลบ space หรือ newline ก่อนตรวจสอบ
            stored_hash = user['emp_password_hash'].strip().encode('utf-8')
            password_bytes = password.encode('utf-8')


            if bcrypt.checkpw(password_bytes, stored_hash):
                # บันทึก session
                session['user'] = {
                    'id': user['emp_id'],
                    'username': user['emp_username'],
                    'role_id': user['role_id']
                }

                # Redirect ตาม role
                if user['role_id'] == 1:
                    return redirect(url_for('dashboard_admin.admin_dashboard'))
                elif user['role_id'] == 2:
                    return redirect(url_for('dashboard_reporter.reporter_dashboard'))
                elif user['role_id'] == 3:
                    return redirect(url_for('dashboard_owner.owner_dashboard'))

                else:
                    error = "Role ไม่ถูกต้อง"
            else:
                error = "Username หรือ Password ไม่ถูกต้อง"
        else:
            error = "Username หรือ Password ไม่ถูกต้อง"
    

    return render_template('login_emp.html', error=error)




@login_emp_bp.route('/logout_emp')
def logout_emp():
    session.clear()
    return redirect(url_for('login_emp.login_emp'))


