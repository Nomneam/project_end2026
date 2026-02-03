/* =========================================================
   Bootstrap Modal (สร้างครั้งเดียว)
========================================================= */
const viewModalEl = document.getElementById('viewNewsModal');
const viewModal = new bootstrap.Modal(viewModalEl);

/* =========================================================
   Abort controller (กันกดรัว)
========================================================= */
let currentAbortController = null;
let ajaxAbortController = null;

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

        if (!res.ok) throw new Error("Network error");

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

/* =========================================================
   AJAX Search + Pagination (ไม่ reload หน้า)
========================================================= */
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("searchFormAjax");
    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        fetchNewsAjax(1);
    });
});

function fetchNewsAjax(page = 1) {
    currentPage = page;

    if (ajaxAbortController) {
        ajaxAbortController.abort();
    }
    ajaxAbortController = new AbortController();

    const q = document.querySelector('input[name="q"]')?.value || '';
    const category = document.querySelector('select[name="category"]')?.value || '';
    const status = document.querySelector('select[name="status"]')?.value || '';

    const params = new URLSearchParams({ q, category, status, page });

    const tbody = document.querySelector("table tbody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-muted">
                    <span class="spinner-border spinner-border-sm me-2"></span>
                    กำลังค้นหา...
                </td>
            </tr>
        `;
    }

    fetch(`/news-management/ajax-search?${params.toString()}`, {
        signal: ajaxAbortController.signal
    })
        .then(res => {
            if (!res.ok) throw new Error("Network error");
            return res.json();
        })
        .then(res => {
            if (!res || !res.success) return;
            renderNewsTableAjax(res.data || []);
            renderPaginationAjax(res.page || 1, res.total_pages || 1);
        })
        .catch(err => {
            if (err.name !== "AbortError") {
                console.error("AJAX Search error:", err);
            }
        });
}

function renderNewsTableAjax(list) {
    const tbody = document.querySelector("table tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!list.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5 text-muted">
                    ไม่พบข้อมูลข่าวสาร
                </td>
            </tr>
        `;
        return;
    }

    list.forEach(news => {
        const statusBadge = news.status === 'publish'
            ? `<span class="badge bg-success text-white">เผยแพร่แล้ว</span>`
            : `<span class="badge bg-secondary text-white">ฉบับร่าง</span>`;

        const date = news.created_at
            ? new Date(news.created_at).toLocaleDateString('th-TH')
            : '-';

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><div class="fw-bold text-dark">${news.news_title || '-'}</div></td>
            <td>${(news.emp_fname || '')} ${(news.emp_lname || '')}</td>
            <td>${news.cat_name || '-'}</td>
            <td>${statusBadge}</td>
            <td class="text-muted small">${date}</td>
            <td class="text-end">
                <button class="btn-action btn-delete" onclick="deleteNews('${news.news_id}', this)">
                    <i class="bi bi-trash3"></i>
                </button>
                <button class="btn-action btn-view" onclick="viewNews('${news.news_id}')">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPaginationAjax(page, totalPages) {
    const ul = document.querySelector(".pagination");
    if (!ul) return;

    let html = `
        <li class="page-item ${page === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="fetchNewsAjax(${page - 1}); return false;">Previous</a>
        </li>
    `;

    for (let p = 1; p <= totalPages; p++) {
        html += `
            <li class="page-item ${p === page ? 'active' : ''}">
                <a class="page-link" href="#" onclick="fetchNewsAjax(${p}); return false;">${p}</a>
            </li>
        `;
    }

    html += `
        <li class="page-item ${page === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="fetchNewsAjax(${page + 1}); return false;">Next</a>
        </li>
    `;

    ul.innerHTML = html;
}
