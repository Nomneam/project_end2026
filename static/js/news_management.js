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
let deletedSubImages = [];
let subFiles = [];

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
  if (raw.startsWith("data:image")) return raw;
  if (raw.startsWith("/static/")) return raw;
  if (raw.startsWith("uploads/")) return "/static/" + raw;
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
  setHTML("v-sub-images", "");
  setHTML("v-video-container", "");
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

  renderSubImages(news.sub_images);
  renderVideo(news.video_path);
  renderThaiDate(news.created_at);
  renderStatus(news.status);
}

/* =========================================================
   Sub Images (View)
========================================================= */
function renderSubImages(subImagesRaw) {
  const container = document.getElementById("v-sub-images");
  if (!container) return;

  container.innerHTML = "";

  if (!subImagesRaw) {
    container.innerHTML = `<small class="text-muted">ไม่มีรูปเพิ่มเติม</small>`;
    return;
  }

  try {
    const images = JSON.parse(subImagesRaw);

    if (!Array.isArray(images) || !images.length) {
      container.innerHTML = `<small class="text-muted">ไม่มีรูปเพิ่มเติม</small>`;
      return;
    }

    images.forEach(raw => {
      const src = buildImageSrc(raw);
      const img = document.createElement("img");
      img.src = src;
      img.className = "rounded shadow-sm";
      img.style.width = "90px";
      img.style.height = "90px";
      img.style.objectFit = "cover";
      img.style.cursor = "pointer";

      img.onclick = () => {
        const cover = document.getElementById("v-cover-image");
        cover.src = src;
        cover.style.display = "block";
      };

      container.appendChild(img);
    });

  } catch {
    container.innerHTML = `<small class="text-muted">ไม่มีรูปเพิ่มเติม</small>`;
  }
}

/* =========================================================
   Video (View)
========================================================= */
function renderVideo(videoUrl) {
  const container = document.getElementById("v-video-container");
  if (!container) return;

  container.innerHTML = "";
  if (!videoUrl) return;

  container.innerHTML = `
    <div class="ratio ratio-16x9 mt-3">
      <iframe src="${videoUrl}" allowfullscreen frameborder="0"></iframe>
    </div>
  `;
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
    
    // Reset states
    subFiles = [];
    deletedSubImages = [];
    document.getElementById("e_remove_cover").value = "0";
    document.getElementById("e_remove_subs").value = "0";
    document.getElementById("e_cover_file").value = "";
    document.getElementById("editSubImages").value = "";
    document.getElementById("deletedSubImages").value = "";

    setCoverPreviewFromUrl(result.data.cover_image);
    renderEditSubImages(result.data.sub_images);

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
  loadSubcategories(n.cat_id, n.subcat_id);
  setValue("editStatus", n.status || "draft");
  setValue("editFeatured", n.is_featured ? "1" : "0");
  setValue("editVideoUrl", n.video_path || "");
}

/* =========================================================
   Cover Image Handling
========================================================= */
function setCoverPreviewFromUrl(url) {
  const $img = document.getElementById("editPreview");
  if (!$img) return;

  if (url && String(url).trim() !== "") {
    let finalUrl = url;
    if (!url.startsWith("http") && !url.startsWith("blob") && !url.startsWith("data:")) {
      finalUrl = "/static/" + url;
    }
    $img.src = finalUrl;
    $img.style.display = "block";
  } else {
    $img.style.display = "none";
  }
}

document.getElementById("e_cover_file")?.addEventListener("change", function () {
  const f = this.files && this.files[0];
  document.getElementById("e_remove_cover").value = "0";
  if (!f) return;
  setCoverPreviewFromUrl(URL.createObjectURL(f));
});

document.getElementById("btnRemoveCover")?.addEventListener("click", function (e) {
  e.preventDefault();
  const fileInput = document.getElementById("e_cover_file");
  if (fileInput) fileInput.value = "";
  document.getElementById("e_remove_cover").value = "1";
  setCoverPreviewFromUrl("");
});

/* =========================================================
   Sub Images Handling
========================================================= */
function renderSubPreview() {
  const $wrap = document.getElementById("editSubPreview");
  if (!$wrap) return;
  
  $wrap.innerHTML = "";

  subFiles.forEach((file, index) => {
    let url;

    if (typeof file === "string") {
      url = file.startsWith("http") || file.startsWith("/static/") || file.startsWith("data:")
        ? file
        : "/static/" + file;
    } else {
      url = URL.createObjectURL(file);
    }

    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";

    const img = document.createElement("img");
    img.src = url;
    img.className = "rounded shadow-sm";
    img.style.width = "90px";
    img.style.height = "90px";
    img.style.objectFit = "cover";

    const btn = document.createElement("button");
    btn.innerHTML = "×";
    btn.type = "button";
    btn.className = "btn btn-danger btn-sm remove-sub";
    btn.dataset.index = index;
    btn.style.position = "absolute";
    btn.style.top = "-8px";
    btn.style.right = "-8px";
    btn.style.borderRadius = "50%";
    btn.style.width = "28px";
    btn.style.height = "28px";
    btn.style.padding = "0";
    btn.style.fontSize = "18px";
    btn.style.lineHeight = "1";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const i = Number(this.dataset.index);
      const item = subFiles[i];

      if (typeof item === "string") {
        deletedSubImages.push(item);
      }

      subFiles.splice(i, 1);
      const hiddenInput = document.getElementById("deletedSubImages");
      if (hiddenInput) {
        hiddenInput.value = JSON.stringify(deletedSubImages);
      }

      renderSubPreview();
    });

    wrapper.appendChild(img);
    wrapper.appendChild(btn);
    $wrap.appendChild(wrapper);
  });
}

document.getElementById("editSubImages")?.addEventListener("change", function () {
  const f = this.files && this.files[0];
  document.getElementById("e_remove_subs").value = "0";

  if (!f) return;

  if (subFiles.length >= 5) {
    Swal?.fire({
      icon: "warning",
      title: "เพิ่มรูปไม่ได้",
      text: "สามารถเพิ่มรูปได้สูงสุด 5 รูป"
    });
    this.value = "";
    return;
  }

  subFiles.push(f);
  renderSubPreview();
  this.value = "";
});

document.getElementById("btnRemoveSubs")?.addEventListener("click", function (e) {
  e.preventDefault();
  subFiles = [];
  const fileInput = document.getElementById("editSubImages");
  if (fileInput) fileInput.value = "";
  document.getElementById("e_remove_subs").value = "1";
  renderSubPreview();
});

function renderEditSubImages(subImagesRaw) {
  const container = document.getElementById("editSubPreview");
  const hiddenInput = document.getElementById("deletedSubImages");

  if (!container) return;

  container.innerHTML = "";
  
  // ล้าง subFiles และ deletedSubImages ก่อน เพื่อให้ button remove sub ทำงานถูกต้อง
  subFiles = [];
  deletedSubImages = [];
  if (hiddenInput) hiddenInput.value = "";

  if (!subImagesRaw) return;

  try {
    const images = JSON.parse(subImagesRaw);

    images.forEach(raw => {

      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.display = "inline-flex";
      wrapper.style.alignItems = "center";
      wrapper.style.justifyContent = "center";

      const img = document.createElement("img");
      img.src = buildImageSrc(raw);
      img.className = "rounded shadow-sm";
      img.style.width = "90px";
      img.style.height = "90px";
      img.style.objectFit = "cover";

      // 🔥 ปุ่มลบ
      const btn = document.createElement("button");
      btn.innerHTML = "×";
      btn.type = "button";
      btn.style.position = "absolute";
      btn.style.top = "-8px";
      btn.style.right = "-8px";
      btn.style.background = "red";
      btn.style.color = "white";
      btn.style.border = "none";
      btn.style.borderRadius = "50%";
      btn.style.width = "28px";
      btn.style.height = "28px";
      btn.style.fontSize = "18px";
      btn.style.cursor = "pointer";
      btn.style.lineHeight = "1";
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.className = "btn btn-danger btn-sm";

      btn.onclick = (e) => {
        e.preventDefault();
        deletedSubImages.push(raw);
        if (hiddenInput) {
          hiddenInput.value = JSON.stringify(deletedSubImages);
        }
        // ลบออกจาก subFiles เมื่อกดปุ่มลบ (ทีละรูป)
        const idx = subFiles.indexOf(raw);
        if (idx > -1) {
          subFiles.splice(idx, 1);
        }
        wrapper.remove();
      };

      wrapper.appendChild(img);
      wrapper.appendChild(btn);
      container.appendChild(wrapper);
      
      // เพิ่มในอาร์เรย์เพื่อติดตามสถานะ
      subFiles.push(raw);
    });

  } catch {}
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

/* =========================================================
   Submit Edit
========================================================= */
document.getElementById("editNewsForm")?.addEventListener("submit", async function (e) {
  e.preventDefault();

  const id = document.getElementById("editNewsId")?.value;
  if (!id) return;

  const formData = new FormData(this);
  
  // ลบ sub_images[] ที่เก่า
  formData.delete("sub_images[]");

  // เพิ่ม sub_images ใหม่จาก subFiles array
  subFiles.forEach(f => {
    formData.append("sub_images", f);
  });

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

    await Swal.fire({
      icon: "success",
      title: "บันทึกสำเร็จ",
      text: "แก้ไขข่าวเรียบร้อยแล้ว",
      timer: 2500,               // อยู่ 2.5 วินาที
      timerProgressBar: true,    // มีแถบเวลาวิ่ง
      showConfirmButton: false,
      allowOutsideClick: false
    });
    editModal?.hide();
    location.reload();

  } catch (err) {
    console.error(err);
    Swal?.fire("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้", "error");
  }
});

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

async function loadSubcategories(catId, selectedId = null) {

  const subSelect = document.getElementById("editSubCategory");
  if (!subSelect || !catId) return;

  subSelect.innerHTML = `<option>กำลังโหลด...</option>`;

  try {

    const res = await fetch(`/admin/categories/${catId}/subcategories`);
    const result = await res.json();

    if (!result.success) {
      subSelect.innerHTML = `<option value="">-- ไม่มีหมวดย่อย --</option>`;
      return;
    }

    subSelect.innerHTML = `<option value="">-- เลือกหมวดย่อย --</option>`;

    result.data.forEach(sub => {

      const opt = document.createElement("option");
      opt.value = sub.subcat_id;
      opt.textContent = sub.subcat_name;

      if (selectedId && Number(selectedId) === Number(sub.subcat_id)) {
        opt.selected = true;
      }

      subSelect.appendChild(opt);

    });

  } catch (err) {
    console.error(err);
    subSelect.innerHTML = `<option value="">-- โหลดไม่สำเร็จ --</option>`;
  }

}


// preview sub images ใหม่ - DEPRECATED (ถูกแทนที่ด้วย renderSubPreview ด้านบน)

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