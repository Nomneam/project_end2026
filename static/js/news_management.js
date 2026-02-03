/* =========================================================
   Bootstrap Modal (สร้างครั้งเดียว)
========================================================= */
const viewModalEl = document.getElementById('viewNewsModal');
const viewModal = new bootstrap.Modal(viewModalEl);

/* =========================================================
   Abort controller (กันกดรัว)
========================================================= */
let currentAbortController = null;

/* =========================================================
   Image preload helper
========================================================= */
function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = reject;
        img.src = src;
    });
}

/* =========================================================
   Reset modal (ก่อนโหลดข้อมูลใหม่)
========================================================= */
function resetViewModal() {
    document.getElementById('v-title').innerText = 'กำลังโหลด...';
    document.getElementById('v-author').innerText = '-';
    document.getElementById('v-category').innerText = '-';
    document.getElementById('v-date-thai').innerText = '-';
    document.getElementById('v-time-thai').innerText = '';

    document.getElementById('v-status-container').innerHTML =
        '<span class="badge bg-secondary w-100">กำลังโหลด</span>';

    document.getElementById('v-content').innerHTML = `
        <div class="text-center text-muted py-4">
            <div class="spinner-border spinner-border-sm me-2"></div>
            กำลังโหลดข้อมูล...
        </div>
    `;

    const coverImg = document.getElementById('v-cover-image');
    coverImg.style.display = 'none';
    coverImg.src = '';
}

/* =========================================================
   แสดง error ใน modal
========================================================= */
function showError(message) {
    document.getElementById('v-content').innerHTML = `
        <div class="alert alert-danger mb-0">
            ${message}
        </div>
    `;
}

/* =========================================================
   โหลดข่าวตาม ID และเปิด modal
========================================================= */
async function viewNews(newsId) {
    if (!newsId) return;

    // cancel request เก่า
    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();

    resetViewModal();
    viewModal.show();

    try {
        const res = await fetch(`/news-management/${newsId}`, {
            signal: currentAbortController.signal
        });

        const result = await res.json();

        if (!result.success) {
            showError(result.message || 'ไม่พบข้อมูลข่าว');
            return;
        }

        await openViewModal(result.data);

    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error(err);
            showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        }
    }
}

/* =========================================================
   เปิด modal พร้อมข้อมูลข่าว
========================================================= */
async function openViewModal(news) {
    document.getElementById('v-title').innerText =
        news.news_title || 'ไม่มีหัวข้อ';

    document.getElementById('v-author').innerText =
        `${news.emp_fname || ''} ${news.emp_lname || ''}`.trim() || '-';

    document.getElementById('v-category').innerText =
        news.cat_name || '-';

    document.getElementById('v-content').innerHTML =
        news.news_content ||
        '<span class="text-muted fst-italic">ไม่มีเนื้อหา</span>';

    /* ---------- รูปปก ---------- */
    const coverImg = document.getElementById('v-cover-image');
    coverImg.style.display = 'none';
    coverImg.src = '';

    if (news.cover_image) {
        let imageSrc = null;

        if (news.cover_image.startsWith('data:image')) {
            imageSrc = news.cover_image;
        } else if (news.cover_image.length > 100) {
            imageSrc = 'data:image/jpeg;base64,' + news.cover_image;
        } else {
            imageSrc = '/static/' + news.cover_image;
        }

        try {
            await preloadImage(imageSrc);
            coverImg.src = imageSrc;
            coverImg.style.display = 'block';
        } catch {
            console.warn('Image load failed:', imageSrc);
        }
    }

    /* ---------- วันที่ / เวลา ---------- */
    if (news.created_at) {
        const dateObj = new Date(news.created_at);
        document.getElementById('v-date-thai').innerText =
            dateObj.toLocaleDateString('th-TH', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        document.getElementById('v-time-thai').innerText =
            dateObj.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit'
            });
    } else {
        document.getElementById('v-date-thai').innerText = '-';
        document.getElementById('v-time-thai').innerText = '';
    }

    /* ---------- สถานะ ---------- */
    document.getElementById('v-status-container').innerHTML =
        news.status === 'publish'
            ? '<span class="badge bg-success w-100">เผยแพร่แล้ว</span>'
            : '<span class="badge bg-secondary w-100">ฉบับร่าง</span>';
}

/* =========================================================
   ลบข่าวแบบไม่ reload หน้า
========================================================= */
function deleteNews(id, btn) {
    if (!id) return;
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข่าวนี้?')) return;

    fetch(`/admin/news/delete/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const row = btn.closest('tr');
                row.style.transition = 'opacity .2s';
                row.style.opacity = '0';
                setTimeout(() => row.remove(), 200);
            } else {
                alert(data.message || 'ไม่สามารถลบข้อมูลได้');
            }
        })
        .catch(err => {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        });
}
