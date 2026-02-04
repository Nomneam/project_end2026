/* =========================================================
   Bootstrap Modal (View + Edit)
========================================================= */
const viewModalEl = document.getElementById('viewNewsModal');
const viewModal = viewModalEl ? new bootstrap.Modal(viewModalEl) : null;

const editModalEl = document.getElementById('editNewsModal');
const editModal = editModalEl ? new bootstrap.Modal(editModalEl) : null;

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
   Reset view modal
========================================================= */
function resetViewModal() {
  if (!viewModalEl) return;

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
  if (coverImg) {
    coverImg.style.display = 'none';
    coverImg.src = '';
  }
}

/* =========================================================
   แสดง error ใน view modal
========================================================= */
function showError(message) {
  const el = document.getElementById('v-content');
  if (!el) return;
  el.innerHTML = `<div class="alert alert-danger mb-0">${message}</div>`;
}

/* =========================================================
   View news
========================================================= */
async function viewNews(newsId) {
  if (!newsId || !viewModal) return;

  if (currentAbortController) currentAbortController.abort();
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
   Open view modal
========================================================= */
async function openViewModal(news) {
  document.getElementById('v-title').innerText = news.news_title || 'ไม่มีหัวข้อ';
  document.getElementById('v-author').innerText =
    `${news.emp_fname || ''} ${news.emp_lname || ''}`.trim() || '-';
  document.getElementById('v-category').innerText =
    [news.cat_name, news.subcat_name].filter(Boolean).join(" / ") || '-';

  document.getElementById('v-content').innerHTML =
    news.news_content || '<span class="text-muted fst-italic">ไม่มีเนื้อหา</span>';

  const coverImg = document.getElementById('v-cover-image');
  if (coverImg) {
    coverImg.style.display = 'none';
    coverImg.src = '';
  }

  if (news.cover_image && coverImg) {
    let imageSrc = news.cover_image.startsWith('data:image')
      ? news.cover_image
      : news.cover_image.length > 100
        ? 'data:image/jpeg;base64,' + news.cover_image
        : '/static/' + news.cover_image;

    try {
      await preloadImage(imageSrc);
      coverImg.src = imageSrc;
      coverImg.style.display = 'block';
    } catch {
      console.warn('Image load failed:', imageSrc);
    }
  }

  if (news.created_at) {
    const d = new Date(news.created_at);
    document.getElementById('v-date-thai').innerText =
      d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
    document.getElementById('v-time-thai').innerText =
      d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
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
   Load subcategories by category
========================================================= */
async function loadSubcategories(catId, selectedSubcatId = null) {
  const subSelect = document.getElementById("editSubCategory");
  if (!subSelect) return;

  if (!catId) {
    subSelect.innerHTML = `<option value="">-- เลือกหมวดย่อย --</option>`;
    return;
  }

  subSelect.innerHTML = `<option value="">กำลังโหลด...</option>`;

  try {
    const res = await fetch(`/admin/categories/${catId}/subcategories`);
    const result = await res.json();

    subSelect.innerHTML = `<option value="">-- เลือกหมวดย่อย --</option>`;

    if (result.success && Array.isArray(result.data)) {
      result.data.forEach(sub => {
        const opt = document.createElement("option");
        opt.value = sub.subcat_id;
        opt.textContent = sub.subcat_name;
        if (selectedSubcatId && String(selectedSubcatId) === String(sub.subcat_id)) {
          opt.selected = true;
        }
        subSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error(err);
    subSelect.innerHTML = `<option value="">โหลดหมวดย่อยไม่สำเร็จ</option>`;
  }
}

/* =========================================================
   Edit news (เปิด Modal + โหลดข้อมูล + subcategory)
========================================================= */
async function editNews(newsId) {
  if (!newsId || !editModal) return;

  try {
    const res = await fetch(`/news-management/${newsId}`);
    if (!res.ok) throw new Error("Network error");

    const result = await res.json();
    if (!result.success) {
      if (window.Swal) Swal.fire("ผิดพลาด", result.message || "ไม่พบข้อมูลข่าว", "error");
      return;
    }

    const n = result.data;

    document.getElementById("editNewsId").value = n.news_id || '';
    document.getElementById("editTitle").value = n.news_title || '';
    document.getElementById("editContent").value = n.news_content || '';
    document.getElementById("editCategory").value = n.cat_id || '';
    document.getElementById("editStatus").value = n.status || 'draft';
    document.getElementById("editFeatured").value = n.is_featured ? "1" : "0";
    document.getElementById("editVideoUrl").value = n.video_url || '';

    await loadSubcategories(n.cat_id, n.subcat_id);

    const preview = document.getElementById("editPreview");
    if (preview) {
      if (n.cover_image) {
        let imageSrc = n.cover_image.startsWith('data:image')
          ? n.cover_image
          : n.cover_image.length > 100
            ? 'data:image/jpeg;base64,' + n.cover_image
            : '/static/' + n.cover_image;

        preview.src = imageSrc;
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
      }
    }

    editModal.show();

  } catch (err) {
    console.error(err);
    if (window.Swal) Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลข่าวได้", "error");
  }
}

/* =========================================================
   เปลี่ยนหมวดหลัก → โหลดหมวดย่อยใหม่
========================================================= */
document.getElementById("editCategory")?.addEventListener("change", function () {
  loadSubcategories(this.value, null);
});

/* =========================================================
   Submit Edit News Form (AJAX)
========================================================= */

document.getElementById("editNewsForm")?.addEventListener("submit", async function (e) {
  e.preventDefault();

  const id = document.getElementById("editNewsId")?.value;
  if (!id) return;

  const formData = new FormData(this);

  try {
    const res = await fetch(`/admin/news/${id}/update`, {
      method: "POST",
      body: formData
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      if (window.Swal) {
        Swal.fire("ผิดพลาด", result.message || "บันทึกไม่สำเร็จ", "error");
      }
      return;
    }

    if (window.Swal) {
      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        timer: 1200,
        showConfirmButton: false
      });
    }

    editModal?.hide();

    if (typeof fetchNewsAjax === "function") {
      fetchNewsAjax(currentPage || 1);
    } else {
      location.reload();
    }

  } catch (err) {
    console.error("Update error:", err);
    if (window.Swal) {
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้", "error");
    }
  }
});

/* =========================================================
   Delete news (SweetAlert2)
========================================================= */
function deleteNews(id, btn) {
  if (!id || !window.Swal) return;

  Swal.fire({
    title: 'ยืนยันการลบข่าว',
    text: 'คุณแน่ใจหรือไม่ว่าต้องการลบข่าวนี้?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ลบข่าว',
    cancelButtonText: 'ยกเลิก',
    reverseButtons: true
  }).then((result) => {
    if (!result.isConfirmed) return;

    if (btn) btn.disabled = true;

    fetch(`/admin/news/delete/${id}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1200, showConfirmButton: false });
          const row = btn?.closest('tr');
          if (row) {
            row.style.transition = 'opacity .2s';
            row.style.opacity = '0';
            setTimeout(() => row.remove(), 200);
          }
        } else {
          Swal.fire('ลบไม่สำเร็จ', data.message || '', 'error');
        }
      })
      .catch(err => {
        console.error(err);
        Swal.fire('เกิดข้อผิดพลาด', 'ลบข้อมูลไม่สำเร็จ', 'error');
      })
      .finally(() => {
        if (btn) btn.disabled = false;
      });
  });
}

/* =========================================================
   Event binding ปุ่มในตาราง
========================================================= */
document.addEventListener("click", function (e) {
  const editBtn = e.target.closest(".btn-edit");
  if (editBtn) {
    e.preventDefault();
    const id = editBtn.dataset.id;
    if (id) editNews(id);
  }

  const viewBtn = e.target.closest(".btn-view");
  if (viewBtn) {
    e.preventDefault();
    const id = viewBtn.dataset.id;
    if (id) viewNews(id);
  }

  const deleteBtn = e.target.closest(".btn-delete");
  if (deleteBtn) {
    e.preventDefault();
    const id = deleteBtn.dataset.id;
    if (id) deleteNews(id, deleteBtn);
  }
});
