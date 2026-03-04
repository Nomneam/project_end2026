// static/js/reporter-dashboard.js
$(function () {
  // ======================================================
  // SweetAlert helpers
  // ======================================================
  function hasSwal() {
    return typeof window.Swal !== "undefined" && typeof window.Swal.fire === "function";
  }

  function swalFire(opts) {
    if (hasSwal()) return Swal.fire(opts);
    const ok = confirm((opts.title ? opts.title + "\n" : "") + (opts.text || ""));
    return Promise.resolve({ isConfirmed: ok });
  }

  function swalToast(icon, title) {
    if (!hasSwal()) return alert(title || "");
    return Swal.fire({ icon: icon || "info", title: title || "", timer: 1500, showConfirmButton: false });
  }

  function bsModal(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    return bootstrap.Modal.getOrCreateInstance(el);
  }

  function fmtDateTime(v) {
    if (!v) return "-";
    const d = new Date(String(v).replace(" ", "T"));
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleString("th-TH");
  }

  // ======================================================
  // tooltip init (สำคัญหลัง render DOM ใหม่)
  // ======================================================
  function initTooltips() {
    if (!window.bootstrap || !bootstrap.Tooltip) return;
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
      const t = bootstrap.Tooltip.getInstance(el);
      if (t) t.dispose();
      new bootstrap.Tooltip(el);
    });
  }
  initTooltips();

  // ======================================================
  // View helpers
  // ======================================================
  function safeSetImg($img, $empty, src) {
  if (src && String(src).trim() !== "") {
    const finalSrc = src.startsWith("http")
      ? src
      : "/static/" + src;

    $img.attr("src", finalSrc).show();
    $empty.hide();
  } else {
    $img.attr("src", "").hide();
    $empty.show();
  }
}

  function parseSubImages(raw) {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === "string" && parsed.trim()) return [parsed];
      return [];
    } catch {
      return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  function renderSubImages(container, emptyEl, subImagesRaw) {
    container.empty();
    emptyEl.hide();

    const arr = parseSubImages(subImagesRaw);
    if (!arr.length) {
      emptyEl.show();
      return;
    }

    arr.forEach((src) => {
  const finalSrc = src.startsWith("http")
    ? src
    : "/static/" + src;

  const img = $(`
    <img src="${finalSrc}" alt="sub"
      style="height:90px;width:auto;border-radius:8px;border:1px solid #ddd;background:#fff;padding:2px;">
  `);
  container.append(img);
});
}

  // ======================================================
  // AJAX Pagination + Filter (ไม่เปลี่ยน URL)
  // ======================================================
  let currentPage = 1;
  let isLoadingPage = false;

  function getFilters() {
    return {
      cat_id: $("#filter_cat_id").val() || "",
      kind: $("#filter_kind").val() || "all",
      status: $("#filter_status").val() || "all",
    };
  }

  function buildDataUrl(page) {
    const f = getFilters();
    const qs = new URLSearchParams({
      page: String(page || 1),
      cat_id: f.cat_id,
      kind: f.kind,
      status: f.status,
    });
    return "/reporter/dashboard/data?" + qs.toString();
  }

  // ใช้ escapeHtml จาก common.js ถ้ามี; ถ้าไม่มีทำ fallback
  function _escapeHtml(s) {
    if (typeof window.escapeHtml === "function") return window.escapeHtml(s);
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderRows(rows) {
    const $tbody = $("#newsTbody");
    $tbody.empty();

    if (!rows || !rows.length) {
      $tbody.append(`
        <tr>
          <td colspan="6" class="text-center text-muted py-4">ไม่พบข้อมูล</td>
        </tr>
      `);
      return;
    }

    rows.forEach((r) => {
      const isFeatured = Number(r.is_featured || 0) === 1;
      const kindBadge = isFeatured
        ? `<span class="badge bg-danger">ข่าวยอดฮิต</span>`
        : `<span class="badge bg-secondary">ข่าวทั่วไป</span>`;

      const statusBadge =
        String(r.status || "") === "publish"
          ? `<span class="status-badge status-published">เผยแพร่แล้ว</span>`
          : `<span class="status-badge status-draft">ฉบับร่าง</span>`;

      const published = r.published_date || "-";

      $tbody.append(`
        <tr>
          <td class="fw-semibold text-center">${_escapeHtml(r.news_title || "")}</td>
          <td class="text-center">${kindBadge}</td>
          <td class="text-center">${_escapeHtml(r.category_name || "-")}</td>
          <td class="text-center">${_escapeHtml(published)}</td>
          <td class="text-center">${statusBadge}</td>
          <td class="text-center">

            <button type="button"
              class="btn btn-outline-primary btn-sm rounded-circle btn-view-news"
              data-id="${r.news_id}"
              data-bs-toggle="tooltip"
              data-bs-title="ดูรายละเอียด">
              <i class="bi bi-eye"></i>
            </button>

            <button type="button"
              class="btn btn-outline-warning btn-sm rounded-circle btn-edit-news"
              data-id="${r.news_id}"
              data-bs-toggle="tooltip"
              data-bs-title="แก้ไขข่าว">
              <i class="bi bi-pencil-square"></i>
            </button>

            <button type="button"
              class="btn btn-outline-danger btn-sm rounded-circle btn-soft-delete"
              data-id="${r.news_id}"
              data-title="${_escapeHtml(r.news_title || "")}"
              data-bs-toggle="tooltip"
              data-bs-title="ลบรายการ">
              <i class="bi bi-trash3"></i>
            </button>

          </td>
        </tr>
      `);
    });

    initTooltips();
  }

  function renderPagination(paging) {
    const $wrap = $("#paginationWrap");
    const total = Number(paging.total_pages || 1);
    const page = Number(paging.page || 1);

    if (total <= 1) {
      $wrap.html("");
      return;
    }

    const prevDisabled = page <= 1 ? "disabled" : "";
    const nextDisabled = page >= total ? "disabled" : "";

    let html = `
      <div class="pagination-wrap mt-3">
        <nav aria-label="Pagination">
          <ul class="pagination mb-0">

            <li class="page-item ${prevDisabled}">
              <a class="page-link js-page" data-page="${page - 1}" href="#" aria-label="Previous">&laquo;</a>
            </li>
    `;

    for (let p = 1; p <= total; p++) {
      const active = p === page ? "active" : "";
      html += `
        <li class="page-item ${active}">
          <a class="page-link js-page" data-page="${p}" href="#">${p}</a>
        </li>
      `;
    }

    html += `
            <li class="page-item ${nextDisabled}">
              <a class="page-link js-page" data-page="${page + 1}" href="#" aria-label="Next">&raquo;</a>
            </li>

          </ul>
        </nav>
      </div>
    `;

    $wrap.html(html);
  }

  async function loadPage(page) {
    if (isLoadingPage) return;
    if (!page || page < 1) page = 1;
    isLoadingPage = true;

    try {
      const r = await fetch(buildDataUrl(page), {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        await swalFire({ icon: "error", title: "โหลดข้อมูลไม่ได้", text: j.message || "เกิดข้อผิดพลาด" });
        return;
      }

      currentPage = Number(j.paging?.page || page);
      renderRows(j.rows || []);
      renderPagination(j.paging || { page: currentPage, total_pages: 1 });
    } catch (e) {
      await swalFire({ icon: "error", title: "โหลดข้อมูลไม่ได้", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    } finally {
      isLoadingPage = false;
    }
  }

  // ✅ pagination: ไม่เปลี่ยน URL
  $(document).on("click", "a.js-page", function (e) {
    e.preventDefault();
    const $li = $(this).closest(".page-item");
    if ($li.hasClass("disabled") || $li.hasClass("active")) return;

    const p = Number($(this).data("page") || 1);
    loadPage(p);
  });

  // ✅ search: ไม่เปลี่ยน URL
  $(document).on("submit", "#filterForm", function (e) {
    e.preventDefault();
    loadPage(1);
  });

  // ✅ reset: ไม่เปลี่ยน URL
  $(document).on("click", "#btnReset", function () {
    $("#filter_cat_id").val("");
    $("#filter_kind").val("all");
    $("#filter_status").val("all");
    loadPage(1);
  });

  // ======================================================
  // Soft delete
  // ======================================================
  $(document).on("click", ".btn-soft-delete", async function () {
    const newsId = $(this).data("id");
    const title = $(this).data("title") || "";

    const rs = await swalFire({
      icon: "warning",
      title: "ยืนยันการลบข่าว?",
      text: title ? `ต้องการลบข่าว: "${title}" ใช่หรือไม่` : "ต้องการลบข่าวนี้ใช่หรือไม่",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!rs.isConfirmed) return;

    try {
      const r = await fetch(`/reporter/news/delete/${newsId}`, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        await swalFire({ icon: "error", title: "ลบไม่สำเร็จ", text: data.message || "เกิดข้อผิดพลาด" });
        return;
      }

      swalToast("success", data.message || "ลบแล้ว");
      setTimeout(() => loadPage(currentPage), 350);
    } catch (e) {
      await swalFire({ icon: "error", title: "ลบไม่สำเร็จ", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    }
  });

  // ======================================================
  // View modal
  // ======================================================
  $(document).on("click", ".btn-view-news", async function () {
    const newsId = $(this).data("id");

    try {
      const r = await fetch(`/reporter/news/detail/${newsId}`, {
        method: "GET",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) {
        await swalFire({ icon: "error", title: "ดูข้อมูลไม่ได้", text: json.message || "เกิดข้อผิดพลาด" });
        return;
      }

      const d = json.data || {};

      $("#v_title").val(d.news_title || "-");
      $("#v_kind").val(Number(d.is_featured || 0) === 1 ? "ข่าวยอดฮิต (Featured)" : "ข่าวทั่วไป");
      $("#v_category").val(d.category_name || "-");
      $("#v_subcategory").val(d.subcategory_name || "-");
      $("#v_status").val(d.status === "publish" ? "เผยแพร่แล้ว" : "ฉบับร่าง");
      $("#v_published_at").val(fmtDateTime(d.published_at));
      $("#v_updated_at").val(fmtDateTime(d.updated_at));
      $("#v_content").val(d.news_content || "");
      $("#v_video_url").val(d.video_url || "");

      safeSetImg($("#v_cover_img"), $("#v_cover_empty"), d.cover_image);
      renderSubImages($("#v_sub_images"), $("#v_sub_images_empty"), d.sub_images);

      const m = bsModal("viewNewsModal");
      if (m) m.show();
    } catch (e) {
      await swalFire({ icon: "error", title: "ดูข้อมูลไม่ได้", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    }
  });

  // ======================================================
  // Edit modal: load subcategories
  // ======================================================
  async function loadSubcats(catId, selectedSubcatId) {
    const $sub = $("#e_subcat_id");
    $sub.prop("disabled", true).html(`<option value="">-- เลือกประเภทย่อย --</option>`);

    if (!catId) return;

    const r = await fetch(`/reporter/subcategories?cat_id=${encodeURIComponent(catId)}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) return;

    const rows = j.data || [];
    let html = `<option value="">-- เลือกประเภทย่อย --</option>`;
    rows.forEach((x) => {
      const sel = String(x.subcat_id) === String(selectedSubcatId) ? "selected" : "";
      html += `<option value="${x.subcat_id}" ${sel}>${x.subcat_name}</option>`;
    });

    $sub.html(html).prop("disabled", false);
  }

  function setCoverPreviewFromUrl(url) {
  const $img = $("#e_cover_preview");
  const $empty = $("#e_cover_empty");

  if (url && String(url).trim() !== "") {
    const finalUrl = url.startsWith("http")
      ? url
      : "/static/" + url;

    $img.attr("src", finalUrl).show();
    $empty.hide();
  } else {
    $img.attr("src", "").hide();
    $empty.show();
  }
}

  function setSubPreviewFromUrls(urls) {
    const $wrap = $("#e_sub_preview");
    const $empty = $("#e_sub_empty");
    $wrap.empty();

    if (!urls || !urls.length) {
      $empty.show();
      return;
    }

    $empty.hide();
    urls.forEach((src) => {
    const finalSrc = src.startsWith("http")
      ? src
      : "/static/" + src;

    $wrap.append(`
      <img src="${finalSrc}" alt="sub"
        style="height:90px;width:auto;border-radius:8px;border:1px solid #ddd;background:#fff;padding:2px;">
    `);
  });
  }

  $("#e_cover_file").on("change", function () {
    const f = this.files && this.files[0];
    $("#e_remove_cover").val("0");
    if (!f) return;
    setCoverPreviewFromUrl(URL.createObjectURL(f));
  });

  $("#e_sub_files").on("change", function () {
    const files = Array.from(this.files || []);
    $("#e_remove_subs").val("0");
    if (!files.length) return;
    setSubPreviewFromUrls(files.map((f) => URL.createObjectURL(f)));
  });

  $("#btnRemoveCover").on("click", function () {
    $("#e_cover_file").val("");
    $("#e_remove_cover").val("1");
    setCoverPreviewFromUrl("");
  });

  $("#btnRemoveSubs").on("click", function () {
    $("#e_sub_files").val("");
    $("#e_remove_subs").val("1");
    setSubPreviewFromUrls([]);
  });

  // open edit modal
  $(document).on("click", ".btn-edit-news", async function (e) {
    e.preventDefault();
    e.stopPropagation();

    const newsId = $(this).data("id");

    try {
      const r = await fetch(`/reporter/news/detail/${newsId}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        await swalFire({ icon: "error", title: "โหลดข้อมูลไม่ได้", text: j.message || "เกิดข้อผิดพลาด" });
        return;
      }

      const d = j.data || {};

      $("#e_news_id").val(d.news_id);
      $("#e_title").val(d.news_title || "");
      $("#e_content").val(d.news_content || "");
      $("#e_video_url").val(d.video_url || "");
      $("#e_status").val(d.status || "draft");
      $("#e_kind").val(String(Number(d.is_featured || 0)));

      $("#e_cat_id").val(d.cat_id || "");
      await loadSubcats(d.cat_id, d.subcat_id);

      $("#e_remove_cover").val("0");
      $("#e_remove_subs").val("0");
      $("#e_cover_file").val("");
      $("#e_sub_files").val("");

      setCoverPreviewFromUrl(d.cover_image || "");
      setSubPreviewFromUrls(parseSubImages(d.sub_images));

      const m = bsModal("editNewsModal");
      if (m) m.show();
    } catch (err) {
      await swalFire({ icon: "error", title: "โหลดข้อมูลไม่ได้", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    }
  });

  $(document).on("change", "#e_cat_id", async function () {
    const catId = $(this).val();
    await loadSubcats(catId, "");
  });

  // submit edit
  $(document).on("submit", "#editNewsForm", async function (e) {
    e.preventDefault();

    const newsId = $("#e_news_id").val();
    const form = document.getElementById("editNewsForm");
    const fd = new FormData(form);

    const rs = await swalFire({
      icon: "question",
      title: "ยืนยันบันทึกการแก้ไข?",
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
    });
    if (!rs.isConfirmed) return;

    try {
      const r = await fetch(`/reporter/news/update/${newsId}`, {
        method: "POST",
        body: fd,
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        await swalFire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: j.message || "เกิดข้อผิดพลาด" });
        return;
      }

      swalToast("success", j.message || "บันทึกแล้ว");
      setTimeout(() => loadPage(currentPage), 350);
    } catch (err) {
      await swalFire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    }
  });

  // ✅ ไม่บังคับโหลดหน้า 1 ผ่าน API (ปล่อยให้ SSR แสดงก่อน แล้วค่อย AJAX ตอนกด)
  // loadPage(1);
});
