$(function () {
  // -------- SweetAlert helpers --------
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

  // -------- View helpers --------
  function safeSetImg($img, $empty, src) {
    if (src && String(src).trim() !== "") {
      $img.attr("src", src).show();
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
      return String(raw).split(",").map(s => s.trim()).filter(Boolean);
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
      const img = $(
        `<img src="${src}" alt="sub"
              style="height:90px;width:auto;border-radius:8px;border:1px solid #ddd;background:#fff;padding:2px;">`
      );
      container.append(img);
    });
  }

  // -------- Soft delete handler --------
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
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      await swalFire({ icon: "error", title: "ลบไม่สำเร็จ", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    }
  });

  // -------- View modal --------
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

  // -------- Edit modal: subcategories --------
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
    rows.forEach(x => {
      const sel = String(x.subcat_id) === String(selectedSubcatId) ? "selected" : "";
      html += `<option value="${x.subcat_id}" ${sel}>${x.subcat_name}</option>`;
    });

    $sub.html(html).prop("disabled", false);
  }

  // -------- Edit modal: image preview helpers --------
  function setCoverPreviewFromUrl(url) {
    const $img = $("#e_cover_preview");
    const $empty = $("#e_cover_empty");

    if (url && String(url).trim() !== "") {
      $img.attr("src", url).show();
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
      $wrap.append(
        `<img src="${src}" alt="sub"
              style="height:90px;width:auto;border-radius:8px;border:1px solid #ddd;background:#fff;padding:2px;">`
      );
    });
  }

  // file input preview
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
    setSubPreviewFromUrls(files.map(f => URL.createObjectURL(f)));
  });

  // remove buttons
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

  // -------- Open edit modal --------
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

      // Fill fields
      $("#e_news_id").val(d.news_id);
      $("#e_title").val(d.news_title || "");
      $("#e_content").val(d.news_content || "");
      $("#e_video_url").val(d.video_url || "");
      $("#e_status").val(d.status || "draft");
      $("#e_kind").val(String(Number(d.is_featured || 0)));

      // ✅ สำคัญ: ต้องมี cat_id/subcat_id จาก API detail
      $("#e_cat_id").val(d.cat_id || "");
      await loadSubcats(d.cat_id, d.subcat_id);

      // Reset flags + inputs
      $("#e_remove_cover").val("0");
      $("#e_remove_subs").val("0");
      $("#e_cover_file").val("");
      $("#e_sub_files").val("");

      // Show old images
      setCoverPreviewFromUrl(d.cover_image || "");
      setSubPreviewFromUrls(parseSubImages(d.sub_images));

      const m = bsModal("editNewsModal");
      if (m) m.show();

    } catch (err) {
      await swalFire({ icon: "error", title: "โหลดข้อมูลไม่ได้", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    }
  });

  // change cat -> reload subcats
  $(document).on("change", "#e_cat_id", async function () {
    const catId = $(this).val();
    await loadSubcats(catId, "");
  });

  // -------- Submit edit --------
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
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      await swalFire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    }
  });
});
