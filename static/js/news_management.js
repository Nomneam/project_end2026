/* =========================================================
   Bootstrap Modal (สร้างครั้งเดียว)
========================================================= */
const viewModalEl = document.getElementById('viewNewsModal');
const viewModal = new bootstrap.Modal(viewModalEl);

/* =========================================================
   Image preload helper (กันกระตุก + กัน retry)
========================================================= */
function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = () => reject();
        img.src = src;
    });
}

/**
 * เปิด Modal เพื่อแสดงรายละเอียดข่าว
 * @param {Object} news
 */
async function openViewModal(news) {
    console.log('openViewModal:', news);

    /* ---------- 1. ข้อมูลพื้นฐาน ---------- */
    document.getElementById('v-title').innerText =
        news.news_title || 'ไม่มีหัวข้อ';

    document.getElementById('v-author').innerText =
        `${news.emp_fname || ''} ${news.emp_lname || ''}`.trim() || '-';

    document.getElementById('v-category').innerText =
        news.cat_name || '-';

    /* ---------- 2. เนื้อหา ---------- */
    const contentArea = document.getElementById('v-content');
    contentArea.innerHTML =
        news.news_content ||
        '<span class="text-muted fst-italic">ไม่มีเนื้อหา</span>';

    /* ---------- 3. รูปปก ---------- */
    const coverImg = document.getElementById('v-cover-image');
    coverImg.style.display = 'none';
    coverImg.src = '';

    let imageSrc = null;

    if (news.cover_image && news.cover_image.trim() !== '') {
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

    /* ---------- 4. วันที่ / เวลา ---------- */
    const dateEl = document.getElementById('v-date-thai');
    const timeEl = document.getElementById('v-time-thai');

    if (news.created_at) {
        const dateObj = new Date(news.created_at);
        dateEl.innerText = dateObj.toLocaleDateString('th-TH', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        timeEl.innerText = dateObj.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        dateEl.innerText = '-';
        timeEl.innerText = '';
    }

    /* ---------- 5. สถานะ ---------- */
    document.getElementById('v-status-container').innerHTML =
        news.status === 'publish'
            ? '<span class="badge bg-success w-100">เผยแพร่แล้ว</span>'
            : '<span class="badge bg-secondary w-100">ฉบับร่าง</span>';

    /* ---------- 6. เปิด modal ---------- */
    viewModal.show();
}

/* =========================================================
   ลบข่าวแบบไม่ reload หน้า (เร็วขึ้นมาก)
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
                // ลบแถวออกจาก table ทันที
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
