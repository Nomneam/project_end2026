$(function () {
  // -------- SweetAlert helpers --------
  function hasSwal() {
    return typeof window.Swal !== "undefined" && typeof window.Swal.fire === "function";
  }

  function swalFire(opts) {
    if (hasSwal()) return Swal.fire(opts);
    // fallback
    const ok = confirm((opts.title ? opts.title + "\n" : "") + (opts.text || ""));
    return Promise.resolve({ isConfirmed: ok });
  }

  function swalToast(icon, title) {
    if (!hasSwal()) return alert(title || "");
    return Swal.fire({ icon: icon || "info", title: title || "", timer: 1500, showConfirmButton: false });
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
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok || !data.ok) {
        await swalFire({
          icon: "error",
          title: "ลบไม่สำเร็จ",
          text: data.message || "เกิดข้อผิดพลาด",
        });
        return;
      }

      swalToast("success", data.message || "ลบแล้ว");
      // ✅ รีเฟรชหน้าเพื่อให้ข้อมูลหายจากตาราง (เพราะ del_flg=1 แล้ว)
      setTimeout(() => location.reload(), 600);

    } catch (e) {
      await swalFire({
        icon: "error",
        title: "ลบไม่สำเร็จ",
        text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้",
      });
    }
  });
});


// ดูข้อมูลใน modal

$(function () {
  function hasSwal() {
    return typeof window.Swal !== "undefined" && typeof window.Swal.fire === "function";
  }
  function swalFire(opts) {
    if (hasSwal()) return Swal.fire(opts);
    alert((opts.title ? opts.title + "\n" : "") + (opts.text || ""));
    return Promise.resolve();
  }

  function bsModal(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    return bootstrap.Modal.getOrCreateInstance(el);
  }

  function fmtDateTime(v) {
    if (!v) return "-";
    // รองรับทั้ง "2026-01-13T..." และ "2026-01-13 10:20:30"
    const d = new Date(String(v).replace(" ", "T"));
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleString("th-TH");
  }

  function safeSetImg($img, $empty, src) {
    if (src && String(src).trim() !== "") {
      $img.attr("src", src).show();
      $empty.hide();
    } else {
      $img.attr("src", "").hide();
      $empty.show();
    }
  }

  function renderSubImages(container, emptyEl, subImagesRaw) {
    container.empty();
    emptyEl.hide();

    if (!subImagesRaw) {
      emptyEl.show();
      return;
    }

    // sub_images อาจเป็น JSON array หรือ string คั่นด้วย , หรือ path เดียว
    let arr = [];
    try {
      const parsed = JSON.parse(subImagesRaw);
      if (Array.isArray(parsed)) arr = parsed;
      else if (typeof parsed === "string") arr = [parsed];
      else arr = [];
    } catch {
      // fallback: split comma
      arr = String(subImagesRaw)
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
    }

    if (!arr.length) {
      emptyEl.show();
      return;
    }

    arr.forEach((src) => {
      const img = $(`
        <img src="${src}" alt="sub"
             style="height:90px; width:auto; border-radius:8px; border:1px solid #ddd; background:#fff; padding:2px;">
      `);
      container.append(img);
    });
  }

  // ✅ click view modal
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
      $("#v_kind").val((Number(d.is_featured || 0) === 1) ? "ข่าวยอดฮิต (Featured)" : "ข่าวทั่วไป");
      $("#v_category").val(d.category_name || "-");
      $("#v_subcategory").val(d.subcategory_name || "-");
      $("#v_status").val(d.status === "publish" ? "เผยแพร่แล้ว" : "ฉบับร่าง");
      $("#v_published_at").val(fmtDateTime(d.published_at));
      $("#v_updated_at").val(fmtDateTime(d.updated_at));
      $("#v_content").val(d.news_content || "");
      $("#v_video_url").val(d.video_url || "");

      // images
      safeSetImg($("#v_cover_img"), $("#v_cover_empty"), d.cover_image);

      renderSubImages($("#v_sub_images"), $("#v_sub_images_empty"), d.sub_images);

      const m = bsModal("viewNewsModal");
      if (m) m.show();

    } catch (e) {
      await swalFire({ icon: "error", title: "ดูข้อมูลไม่ได้", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    }
  });
});
