from flask import Blueprint, render_template, session, jsonify, request
from dotenv import load_dotenv
import pymysql
import os
import pymysql.cursors
import math
import json
import uuid
from werkzeug.utils import secure_filename

load_dotenv()
dashboard_reporter_bp = Blueprint("dashboard_reporter", __name__)

# ======================================================
# Upload config (แยก cover / sub) ✅ เก็บลงโปรเจค + เก็บ DB เป็น path แบบ relative
# ======================================================
BASE_UPLOAD_DIR = os.path.join("static", "uploads", "news")
COVER_DIR = os.path.join(BASE_UPLOAD_DIR, "cover")
SUB_DIR = os.path.join(BASE_UPLOAD_DIR, "sub")

ALLOWED_EXT = {"png", "jpg", "jpeg", "webp", "gif"}


def allowed_file(filename: str) -> bool:
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_EXT


def save_image(file_storage, kind: str = "cover"):
    """
    เซฟรูปลง:
      - static/uploads/news/cover/   (kind=cover)
      - static/uploads/news/sub/     (kind=sub)

    คืนค่า path สำหรับเก็บลง DB:
      - uploads/news/cover/uuid.ext
      - uploads/news/sub/uuid.ext

    ✅ ไม่คืนค่าแบบ /static/... เพื่อให้หน้าอ่านข่าวใช้ url_for('static', filename=...) ได้ถูก
    """
    if not file_storage or not getattr(file_storage, "filename", ""):
        return None

    filename = secure_filename(file_storage.filename)
    if not allowed_file(filename):
        return None

    kind = (kind or "cover").lower().strip()
    if kind not in ("cover", "sub"):
        kind = "cover"

    target_dir = COVER_DIR if kind == "cover" else SUB_DIR
    os.makedirs(target_dir, exist_ok=True)

    ext = filename.rsplit(".", 1)[1].lower()
    new_name = f"{uuid.uuid4().hex}.{ext}"
    full_path = os.path.join(target_dir, new_name)
    file_storage.save(full_path)

    # ✅ เก็บ DB แบบ relative (ห้ามมี /static/)
    return f"uploads/news/{kind}/{new_name}"


def safe_int(v, default=None):
    try:
        if v is None or str(v).strip() == "":
            return default
        return int(v)
    except Exception:
        return default


def connect_db():
    return pymysql.connect(
        host=os.environ.get("HOST"),
        user=os.environ.get("USER"),
        password=os.environ.get("PASSWORD"),
        database=os.environ.get("DB"),
        port=int(os.environ.get("PORT") or 3306),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        charset="utf8mb4",
    )


def require_reporter():
    user = session.get("user")
    if not user:
        return None
    if int(user.get("role_id") or 0) != 2:
        return None
    if not user.get("id"):
        return None
    return user


# ---------------- Shared query builder ----------------
def build_news_filters(user_id: int):
    per_page = 7
    page = request.args.get("page", default=1, type=int)
    if page < 1:
        page = 1
    offset = (page - 1) * per_page

    cat_id = (request.args.get("cat_id") or "").strip()
    kind = (request.args.get("kind") or "all").strip()
    status = (request.args.get("status") or "all").strip()

    where = ["n.created_by = %s", "n.del_flg = 0"]
    params = [user_id]

    if cat_id:
        cat_id_int = safe_int(cat_id)
        if cat_id_int is not None:
            where.append("n.cat_id = %s")
            params.append(cat_id_int)
        else:
            cat_id = ""

    if kind == "featured":
        where.append("COALESCE(n.is_featured,0) = 1")
    elif kind == "normal":
        where.append("COALESCE(n.is_featured,0) = 0")

    if status == "publish":
        where.append("n.status = 'publish'")
    elif status == "draft":
        where.append("n.status <> 'publish'")

    return {
        "per_page": per_page,
        "page": page,
        "offset": offset,
        "cat_id": cat_id,
        "kind": kind,
        "status": status,
        "where_sql": " AND ".join(where),
        "params": params,
    }


# ==============================
# AUDIT LOG FUNCTION
# ==============================
def write_audit_log(emp_id: int, action: str, pages: str, detail: str):
    try:
        ip = request.headers.get("X-Forwarded-For", request.remote_addr)

        conn = connect_db()
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO audit_logs_emp
                (emp_id, action, pages, detail, ip_address, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                """,
                (emp_id, action, pages, detail, ip),
            )
        conn.commit()
        conn.close()
    except Exception as e:
        print("Audit log error:", e)
        
        

# ---------------- Dashboard (HTML render) ----------------
@dashboard_reporter_bp.route("/reporter/dashboard", methods=["GET"])
def reporter_dashboard():
    user = require_reporter()
    if not user:
        return "Forbidden", 403

    user_id = int(user["id"])
    f = build_news_filters(user_id)

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            # total news (all written, not deleted)
            cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM news
                WHERE created_by = %s AND del_flg = 0
                """,
                (user_id,),
            )
            total_news = int((cursor.fetchone() or {}).get("total") or 0)

            # categories
            cursor.execute(
                """
                SELECT cat_id, cat_name
                FROM news_category
                WHERE del_flg = 0
                ORDER BY cat_name
                """
            )
            categories = cursor.fetchall() or []

            # total rows (filtered)
            cursor.execute(
                f"""
                SELECT COUNT(*) AS total
                FROM news n
                WHERE {f["where_sql"]}
                """,
                tuple(f["params"]),
            )
            total_rows = int((cursor.fetchone() or {}).get("total") or 0)

            total_pages = max(1, math.ceil(total_rows / f["per_page"]))
            if f["page"] > total_pages:
                f["page"] = total_pages
                f["offset"] = (f["page"] - 1) * f["per_page"]

            # latest news (filtered)
            cursor.execute(
                f"""
                SELECT
                    n.news_id,
                    n.news_title,
                    n.is_featured,
                    n.status,
                    n.published_at,
                    n.created_at,
                    c.cat_name AS category_name
                FROM news n
                LEFT JOIN news_category c ON n.cat_id = c.cat_id
                WHERE {f["where_sql"]}
                ORDER BY n.created_at DESC
                LIMIT %s OFFSET %s
                """,
                tuple(f["params"] + [f["per_page"], f["offset"]]),
            )
            latest_news = cursor.fetchall() or []
    finally:
        conn.close()

    return render_template(
        "reporter/reporter-dashboard.html",
        user=user,
        total_news=total_news,
        latest_news=latest_news,
        page=f["page"],
        per_page=f["per_page"],
        total_rows=total_rows,
        total_pages=total_pages,
        categories=categories,
        f_cat_id=f["cat_id"],
        f_kind=f["kind"],
        f_status=f["status"],
    )


# ---------------- Dashboard Data (AJAX JSON) ----------------
@dashboard_reporter_bp.route("/reporter/dashboard/data", methods=["GET"])
def reporter_dashboard_data():
    user = require_reporter()
    if not user:
        return jsonify({"ok": False, "message": "Forbidden"}), 403

    user_id = int(user["id"])
    f = build_news_filters(user_id)

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT COUNT(*) AS total
                FROM news n
                WHERE {f["where_sql"]}
                """,
                tuple(f["params"]),
            )
            total_rows = int((cursor.fetchone() or {}).get("total") or 0)

            total_pages = max(1, math.ceil(total_rows / f["per_page"]))
            if f["page"] > total_pages:
                f["page"] = total_pages
                f["offset"] = (f["page"] - 1) * f["per_page"]

            cursor.execute(
                f"""
                SELECT
                    n.news_id,
                    n.news_title,
                    n.is_featured,
                    n.status,
                    n.published_at,
                    n.created_at,
                    c.cat_name AS category_name
                FROM news n
                LEFT JOIN news_category c ON n.cat_id = c.cat_id
                WHERE {f["where_sql"]}
                ORDER BY n.created_at DESC
                LIMIT %s OFFSET %s
                """,
                tuple(f["params"] + [f["per_page"], f["offset"]]),
            )
            rows = cursor.fetchall() or []

        out = []
        for r in rows:
            pub = r.get("published_at")
            published_date = pub.strftime("%d/%m/%Y") if pub else "-"
            out.append(
                {
                    "news_id": r.get("news_id"),
                    "news_title": r.get("news_title") or "",
                    "is_featured": int(r.get("is_featured") or 0),
                    "status": r.get("status") or "draft",
                    "category_name": r.get("category_name") or "-",
                    "published_date": published_date,
                }
            )

        return jsonify(
            {
                "ok": True,
                "rows": out,
                "paging": {
                    "page": f["page"],
                    "per_page": f["per_page"],
                    "total_rows": total_rows,
                    "total_pages": total_pages,
                },
            }
        ), 200
    finally:
        conn.close()


# ---------------- Soft Delete ----------------
@dashboard_reporter_bp.route("/reporter/news/delete/<int:news_id>", methods=["POST"])
def reporter_soft_delete(news_id):
    user = require_reporter()
    if not user:
        return jsonify({"ok": False, "message": "Forbidden"}), 403

    user_id = int(user["id"])

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT news_id
                FROM news
                WHERE news_id = %s AND created_by = %s AND del_flg = 0
                """,
                (news_id, user_id),
            )
            if not cursor.fetchone():
                return jsonify({"ok": False, "message": "ไม่พบข่าว หรือไม่มีสิทธิ์ลบ"}), 404

            cursor.execute(
                """
                UPDATE news
                SET del_flg = 1,
                    updated_by = %s,
                    updated_at = NOW()
                WHERE news_id = %s
                """,
                (user_id, news_id),
            )
            
         # ✅ เพิ่มตรงนี้
        write_audit_log(
            emp_id=user_id,
            action="Delete",
            pages="Reporter Dashboard",
            detail=f"ลบข่าว (ID {news_id})",
        )

        return jsonify({"ok": True, "message": "ลบข่าวเรียบร้อย"}), 200
    finally:
        conn.close()


# ---------------- Detail (ต้องมี cat_id/subcat_id + ส่งรูปเดิมกลับไป) ----------------
@dashboard_reporter_bp.route("/reporter/news/detail/<int:news_id>", methods=["GET"])
def reporter_news_detail(news_id):
    user = require_reporter()
    if not user:
        return jsonify({"ok": False, "message": "Forbidden"}), 403

    user_id = int(user["id"])

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    n.news_id,
                    n.news_title,
                    n.news_content,
                    n.is_featured,
                    n.status,
                    n.published_at,
                    n.updated_at,

                    n.cat_id,
                    n.subcat_id,

                    n.cover_image,
                    n.sub_images,
                    n.video_path,

                    c.cat_name AS category_name,
                    s.subcat_name AS subcategory_name,
                    
                    e.emp_fname AS author_fname,
                    e.emp_lname AS author_lname
                FROM news n
                LEFT JOIN news_category c ON n.cat_id = c.cat_id
                LEFT JOIN news_subcategory s ON n.subcat_id = s.subcat_id
                LEFT JOIN employee e ON n.created_by = e.emp_id
                WHERE n.news_id = %s
                  AND n.created_by = %s
                  AND n.del_flg = 0
                LIMIT 1
                """,
                (news_id, user_id),
            )
            row = cursor.fetchone()
            if not row:
                return jsonify({"ok": False, "message": "ไม่พบข่าว หรือไม่มีสิทธิ์ดู"}), 404

            # ให้แน่ใจว่า sub_images เป็น list ได้เสมอ (ฝั่งหน้าแก้ไขจะได้จัดการง่าย)
            raw = row.get("sub_images")
            try:
                arr = json.loads(raw) if raw else []
                if not isinstance(arr, list):
                    arr = []
            except Exception:
                arr = []
            row["sub_images"] = arr

            return jsonify({"ok": True, "data": row}), 200
    finally:
        conn.close()


# ---------------- Subcategories ----------------
@dashboard_reporter_bp.route("/reporter/subcategories", methods=["GET"])
def reporter_subcategories():
    user = require_reporter()
    if not user:
        return jsonify({"ok": False, "message": "Forbidden"}), 403

    cat_id = safe_int(request.args.get("cat_id"))
    if not cat_id:
        return jsonify({"ok": True, "data": []}), 200

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT subcat_id, subcat_name
                FROM news_subcategory
                WHERE del_flg = 0 AND cat_id = %s
                ORDER BY subcat_name
                """,
                (cat_id,),
            )
            rows = cursor.fetchall() or []
        return jsonify({"ok": True, "data": rows}), 200
    finally:
        conn.close()


# ---------------- Update (รองรับรูป + จำกัดรูปรอง 2 รูป + บันทึกเหมือนตอนเพิ่ม) ----------------
@dashboard_reporter_bp.route("/reporter/news/update/<int:news_id>", methods=["POST"])
def reporter_news_update(news_id):
    user = require_reporter()
    if not user:
        return jsonify({"ok": False, "message": "Forbidden"}), 403

    user_id = int(user["id"])

    news_title = (request.form.get("news_title") or "").strip()
    news_content = (request.form.get("news_content") or "").strip()

    cat_id = safe_int(request.form.get("cat_id"))
    subcat_id = safe_int(request.form.get("subcat_id"), default=None)
    is_featured = safe_int(request.form.get("is_featured"), default=0)
    status = (request.form.get("status") or "draft").strip()
    video_path = (request.form.get("video_url") or "").strip()

    if not news_title or not news_content or not cat_id:
        return jsonify({"ok": False, "message": "กรุณากรอกข้อมูลที่จำเป็นให้ครบ"}), 400
    
    if video_path and not video_path.startswith(("http://", "https://")):
        return jsonify(ok=False, message="Video URL ไม่ถูกต้อง"), 400


    if status not in ("draft", "publish"):
        status = "draft"
    if is_featured not in (0, 1):
        is_featured = 0

    # ชื่อไฟล์จากฟอร์มหน้า dashboard (ของคุณใช้ cover_image/sub_images)
    cover_file = request.files.get("cover_image")
    sub_files = request.files.getlist("sub_images")

    remove_cover = (request.form.get("remove_cover") or "0").strip() == "1"
    remove_subs = (request.form.get("remove_subs") or "0").strip() == "1"

    conn = connect_db()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT cover_image, sub_images, published_at
                FROM news
                WHERE news_id=%s AND created_by=%s AND del_flg=0
                """,
                (news_id, user_id),
            )
            old = cursor.fetchone()
            if not old:
                return jsonify({"ok": False, "message": "ไม่พบข่าว หรือไม่มีสิทธิ์แก้ไข"}), 404

            # ---------- cover ----------
            old_cover = (old.get("cover_image") or "").strip()
            if remove_cover:
                final_cover = None
            else:
                if cover_file and cover_file.filename:
                    new_cover = save_image(cover_file, "cover")
                    if not new_cover:
                        return jsonify({"ok": False, "message": "ไฟล์รูปปกไม่รองรับ"}), 400
                    final_cover = new_cover
                else:
                    final_cover = old_cover  # ไม่อัปโหลดใหม่ -> คงเดิม

            # ---------- sub images ----------
            old_sub_raw = old.get("sub_images")
            try:
                old_subs = json.loads(old_sub_raw) if old_sub_raw else []
                if not isinstance(old_subs, list):
                    old_subs = []
            except Exception:
                old_subs = []

            if remove_subs:
                final_subs = []
            else:
                picked = [f for f in (sub_files or []) if f and f.filename]
                if picked:
                    picked = picked[:5]
                    new_subs = []
                    for f in picked:
                        p = save_image(f, "sub")
                        if not p:
                            return jsonify({"ok": False, "message": "มีไฟล์รูปรองที่ไม่รองรับ"}), 400
                        new_subs.append(p)
                    final_subs = new_subs
                else:
                    final_subs = old_subs  # ไม่อัปโหลดใหม่ -> คงเดิม
            
            # ==============================
            # COMPARE CHANGES
            # ==============================
            changes = []

            def compare(field_name, old_val, new_val):
                if (old_val or "") != (new_val or ""):
                    changes.append(f"{field_name}: '{old_val}' → '{new_val}'")

            compare("หัวข้อข่าว", old.get("news_title"), news_title)
            compare("เนื้อหา", old.get("news_content"), news_content)
            compare("หมวดหลัก", old.get("cat_id"), cat_id)
            compare("หมวดย่อย", old.get("subcat_id"), subcat_id)
            compare("ประเภทข่าว", old.get("is_featured"), is_featured)
            compare("สถานะ", old.get("status"), status)
            compare("วิดีโอ", old.get("video_path"), video_path)

            if (old.get("cover_image") or "") != (final_cover or ""):
                changes.append("รูปปก: เปลี่ยนแปลง")

            old_sub_compare = json.dumps(old_subs, ensure_ascii=False)
            new_sub_compare = json.dumps(final_subs, ensure_ascii=False)

            if old_sub_compare != new_sub_compare:
                changes.append("รูปภาพรอง: เปลี่ยนแปลง")

            cursor.execute(
                """
                UPDATE news
                SET
                  news_title=%s,
                  news_content=%s,
                  cat_id=%s,
                  subcat_id=%s,
                  is_featured=%s,
                  status=%s,
                  video_path=%s,
                  cover_image=%s,
                  sub_images=%s,
                  updated_by=%s,
                  updated_at=NOW(),
                  published_at = CASE
                    WHEN %s = 'publish' AND published_at IS NULL THEN NOW()
                    WHEN %s <> 'publish' THEN NULL
                    ELSE published_at
                  END
                WHERE news_id=%s
                """,
                (
                    news_title,
                    news_content,
                    cat_id,
                    subcat_id,
                    is_featured,
                    status,
                    video_path if video_path else None,
                    final_cover,
                    json.dumps(final_subs, ensure_ascii=False),
                    user_id,
                    status,
                    status,
                    news_id,
                ),
            )
            
        if changes:
            detail_text = (
                f"แก้ไขข่าว '{news_title}' (ID {news_id})\n"
                + "\n".join(changes)
            )

            write_audit_log(
                emp_id=user_id,
                action="Update",
                pages="Reporter Dashboard",
                detail=detail_text,
            )

        return jsonify({"ok": True, "message": "บันทึกการแก้ไขเรียบร้อย"}), 200
    finally:
        conn.close()
