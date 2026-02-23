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

/* =========================================================
   Utils
========================================================= */
function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = reject;
    img.src = src;
  });
}

function buildImageSrc(raw) {
  if (!raw) return null;

  // ถ้าเป็น base64
  if (raw.startsWith("data:image")) return raw;

  // ถ้าเป็น path ที่มี /static อยู่แล้ว
  if (raw.startsWith("/static/")) return raw;

  // ถ้าเป็น uploads/...
  if (raw.startsWith("uploads/")) {
    return "/static/" + raw;
  }

  return raw;
}
/* =========================================================
   View Modal Helpers
========================================================= */
function resetViewModal() {
  if (!viewModalEl) return;

  setText("v-title", "กำลังโหลด...");
  setText("v-author", "-");
  setText("v-category", "-");
  setText("v-date-thai", "-");
  setText("v-time-thai", "");

  setHTML("v-status-container", `<span class="badge bg-secondary w-100">กำลังโหลด</span>`);
  setHTML("v-content", `
    <div class="text-center text-muted py-4">
      <div class="spinner-border spinner-border-sm me-2"></div>
      กำลังโหลดข้อมูล...
    </div>
  `);

  hideImage("v-cover-image");
}

function showViewError(message) {
  setHTML("v-content", `<div class="alert alert-danger mb-0">${message}</div>`);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function hideImage(id) {
  const img = document.getElementById(id);
  if (!img) return;
  img.style.display = "none";
  img.src = "";
}

/* =========================================================
   View News
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
      showViewError(result.message || "ไม่พบข้อมูลข่าว");
      return;
    }

    await renderViewModal(result.data);

  } catch (err) {
    if (err.name !== "AbortError") {
      console.error(err);
      showViewError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    }
  }
}

async function renderViewModal(news) {
  setText("v-title", news.news_title || "ไม่มีหัวข้อ");
  setText("v-author", `${news.emp_fname || ""} ${news.emp_lname || ""}`.trim() || "-");
  setText("v-category", [news.cat_name, news.subcat_name].filter(Boolean).join(" / ") || "-");

  setHTML("v-content", news.news_content || `<span class="text-muted fst-italic">ไม่มีเนื้อหา</span>`);

  hideImage("v-cover-image");

  if (news.cover_image) {
    const src = buildImageSrc(news.cover_image);
    try {
      await preloadImage(src);
      const img = document.getElementById("v-cover-image");
      img.src = src;
      img.style.display = "block";
    } catch {
      console.warn("โหลดรูปไม่สำเร็จ:", src);
    }
  }

  renderThaiDate(news.created_at);
  renderStatus(news.status);
}

function renderThaiDate(createdAt) {
  if (!createdAt) {
    setText("v-date-thai", "-");
    setText("v-time-thai", "");
    return;
  }

  const d = new Date(createdAt);
  setText("v-date-thai", d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" }));
  setText("v-time-thai", d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
}

function renderStatus(status) {
  setHTML(
    "v-status-container",
    status === "publish"
      ? `<span class="badge bg-success w-100">เผยแพร่แล้ว</span>`
      : `<span class="badge bg-secondary w-100">ฉบับร่าง</span>`
  );
}

/* =========================================================
   Subcategories
========================================================= */
async function loadSubcategories(catId, selectedSubcatId = null) {
  const subSelect = document.getElementById("editSubCategory");
  if (!subSelect) return;

  // ถ้าไม่เลือกหมวดหลัก
  if (!catId) {
    subSelect.innerHTML = `<option value="">-- ไม่มีหมวดย่อย --</option>`;
    subSelect.disabled = true;
    return;
  }

  subSelect.disabled = true;
  subSelect.innerHTML = `<option value="">กำลังโหลด...</option>`;

  try {
    const res = await fetch(`/admin/categories/${catId}/subcategories`);
    const result = await res.json();

    // reset
    subSelect.innerHTML = "";

    if (result.success && Array.isArray(result.data) && result.data.length) {
      // มีหมวดย่อย
      subSelect.disabled = false;
      subSelect.innerHTML = `<option value="">-- เลือกหมวดย่อย (ไม่บังคับ) --</option>`;

      result.data.forEach(sub => {
        const opt = document.createElement("option");
        opt.value = sub.subcat_id;
        opt.textContent = sub.subcat_name;
        if (String(selectedSubcatId) === String(sub.subcat_id)) {
          opt.selected = true;
        }
        subSelect.appendChild(opt);
      });
    } else {
      // ไม่มีหมวดย่อย
      subSelect.innerHTML = `<option value="">-- หมวดนี้ไม่มีหมวดย่อย --</option>`;
      subSelect.disabled = true;
    }

  } catch (err) {
    console.error(err);
    subSelect.innerHTML = `<option value="">โหลดหมวดย่อยไม่สำเร็จ</option>`;
    subSelect.disabled = true;
  }
}


/* =========================================================
   Edit News
========================================================= */
async function editNews(newsId) {
  if (!newsId || !editModal) return;

  try {
    const res = await fetch(`/news-management/${newsId}`);
    if (!res.ok) throw new Error("Network error");

    const result = await res.json();
    if (!result.success) {
      Swal?.fire("ผิดพลาด", result.message || "ไม่พบข้อมูลข่าว", "error");
      return;
    }

    fillEditForm(result.data);
    await loadSubcategories(result.data.cat_id, result.data.subcat_id);
    renderEditPreview(result.data.cover_image);

    editModal.show();

  } catch (err) {
    console.error(err);
    Swal?.fire("เกิดข้อผิดพลาด", "ไม่สามารถโหลดข้อมูลข่าวได้", "error");
  }
}

function fillEditForm(n) {
  setValue("editNewsId", n.news_id || "");
  setValue("editTitle", n.news_title || "");
  setValue("editContent", n.news_content || "");
  setValue("editCategory", n.cat_id || "");
  setValue("editStatus", n.status || "draft");
  setValue("editFeatured", n.is_featured ? "1" : "0");
  setValue("editVideoUrl", n.video_url || "");
}

function renderEditPreview(rawImage) {
  const preview = document.getElementById("editPreview");
  if (!preview) return;

  if (!rawImage) {
    preview.style.display = "none";
    return;
  }

  preview.src = buildImageSrc(rawImage);
  preview.style.display = "block";
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

/* =========================================================
   Submit Edit Form
========================================================= */
document.getElementById("editNewsForm")?.addEventListener("submit", submitEditForm);

async function submitEditForm(e) {
  e.preventDefault();

  const id = document.getElementById("editNewsId")?.value;
  if (!id) return;

  const formData = new FormData(e.target);

  try {
    const res = await fetch(`/admin/news/${id}/update`, {
      method: "POST",
      body: formData
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      Swal?.fire("ผิดพลาด", result.message || "บันทึกไม่สำเร็จ", "error");
      return;
    }

    Swal?.fire({ icon: "success", title: "บันทึกสำเร็จ", timer: 1200, showConfirmButton: false });
    editModal?.hide();

    if (typeof fetchNewsAjax === "function") {
      fetchNewsAjax(window.currentPage || 1);
    } else {
      location.reload();
    }

  } catch (err) {
    console.error(err);
    Swal?.fire("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้", "error");
  }
}

/* =========================================================
   Delete News
========================================================= */
function deleteNews(id, btn) {
  if (!id || !window.Swal) return;

  Swal.fire({
    title: "ยืนยันการลบข่าว",
    text: "คุณแน่ใจหรือไม่ว่าต้องการลบข่าวนี้?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ลบข่าว",
    cancelButtonText: "ยกเลิก",
    reverseButtons: true
  }).then((result) => {
    if (!result.isConfirmed) return;

    btn && (btn.disabled = true);

    fetch(`/admin/news/delete/${id}`, { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 1200, showConfirmButton: false });
          const row = btn?.closest("tr");
          row && fadeOutAndRemove(row);
        } else {
          Swal.fire("ลบไม่สำเร็จ", data.message || "", "error");
        }
      })
      .catch(err => {
        console.error(err);
        Swal.fire("เกิดข้อผิดพลาด", "ลบข้อมูลไม่สำเร็จ", "error");
      })
      .finally(() => {
        btn && (btn.disabled = false);
      });
  });
}

function fadeOutAndRemove(row) {
  row.style.transition = "opacity .2s";
  row.style.opacity = "0";
  setTimeout(() => row.remove(), 200);
}

/* =========================================================
   Event Binding
========================================================= */
document.addEventListener("click", function (e) {
  const editBtn = e.target.closest(".btn-edit");
  if (editBtn) {
    e.preventDefault();
    editNews(editBtn.dataset.id);
  }

  const viewBtn = e.target.closest(".btn-view");
  if (viewBtn) {
    e.preventDefault();
    viewNews(viewBtn.dataset.id);
  }

  const deleteBtn = e.target.closest(".btn-delete");
  if (deleteBtn) {
    e.preventDefault();
    deleteNews(deleteBtn.dataset.id, deleteBtn);
  }
});

document.getElementById("editCategory")?.addEventListener("change", function () {
  loadSubcategories(this.value);
});


/* =========================================================
   Chart: News by Category (เลือกวัน/สัปดาห์/เดือน/ปี)
========================================================= */
let newsChartInstance = null;

function rangeLabel(range) {
  return {
    day: "วันนี้",
    week: "7 วันล่าสุด",
    month: "30 วันล่าสุด",
    year: "1 ปีล่าสุด",
    all: "ทั้งหมด"
  }[range] || "วันนี้";
}

function loadNewsChart(range = "day") {
  const canvas = document.getElementById("newsTodayChart");
  const legendContainer = document.getElementById("newsLegend");
  const badge = document.querySelector(".stat-card .badge");

  if (!canvas) return;

  if (badge) badge.innerText = rangeLabel(range);

  const url = range === "all"
    ? "/api/news/today-by-category"
    : `/api/news/today-by-category?range=${range}`;

  fetch(url)
    .then(res => res.json())
    .then(res => {
      if (!res.success || !res.labels?.length) {
        if (legendContainer) {
          legendContainer.innerHTML = `<div class="text-muted text-center">ยังไม่มีข่าวในช่วงนี้</div>`;
        }
        if (newsChartInstance) {
          newsChartInstance.destroy();
          newsChartInstance = null;
        }
        return;
      }

      const ctx = canvas.getContext("2d");
      const palette = [
        "#d61f26", "#ff6384", "#e91e63", "#9c27b0", "#673ab7",
        "#3f51b5", "#2196f3", "#00bcd4", "#009688", "#4caf50",
        "#8bc34a", "#ff9800", "#ffc107"
      ];

      const total = res.values.reduce((a, b) => a + Number(b || 0), 0);

      // ===== Legend =====
      if (legendContainer) {
        legendContainer.innerHTML = res.labels.map((label, i) => `
          <div class="legend-item">
            <span class="dot" style="background-color:${palette[i % palette.length]}"></span>
            <span class="name">${label}</span>
            <span class="value">${res.values[i]}</span>
          </div>
        `).join("");
      }

      // ===== Plugin วาดเลขกลาง =====
      const centerTextPlugin = {
        id: "centerText",
        beforeDraw(chart) {
          const { ctx, width, height } = chart;
          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = "bold 28px sans-serif";
          ctx.fillStyle = "#d32f2f";
          ctx.fillText(total, width / 2, height / 2 - 8);
          ctx.font = "500 13px sans-serif";
          ctx.fillStyle = "#777";
          ctx.fillText("ข่าวทั้งหมด", width / 2, height / 2 + 18);
          ctx.restore();
        }
      };

      if (newsChartInstance) newsChartInstance.destroy();

      newsChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: res.labels,
          datasets: [{
            data: res.values,
            backgroundColor: palette.slice(0, res.labels.length),
            borderColor: "#fff",
            borderWidth: 2,
            hoverOffset: 12
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "70%",
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.raw} ข่าว`
              }
            }
          }
        },
        plugins: [centerTextPlugin]
      });
    })
    .catch(err => console.error("โหลดกราฟล้มเหลว:", err));
}

document.addEventListener("DOMContentLoaded", function () {
  // โหลดค่าเริ่มต้น = ทั้งหมด
  loadNewsChart("all");

  // ปุ่มเปลี่ยนช่วงเวลา
  document.querySelectorAll(".btn-range").forEach(btn => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".btn-range").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      loadNewsChart(this.dataset.range);
    });
  });
});