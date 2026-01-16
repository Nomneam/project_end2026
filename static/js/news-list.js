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

    let arr = [];
    try {
      const parsed = JSON.parse(subImagesRaw);
      if (Array.isArray(parsed)) arr = parsed;
      else if (typeof parsed === "string") arr = [parsed];
    } catch {
      arr = String(subImagesRaw).split(",").map(s => s.trim()).filter(Boolean);
    }

    if (!arr.length) {
      emptyEl.show();
      return;
    }

    arr.forEach((src) => {
      container.append(`<img src="${src}" alt="sub">`);
    });
  }

  // ✅ click ดูรายละเอียด
  $(document).on("click", ".btn-view-public", async function () {
    const newsId = $(this).data("id");

    try {
      const r = await fetch(`/reporter/news/public-detail/${newsId}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        await swalFire({ icon: "error", title: "ดูข้อมูลไม่ได้", text: j.message || "เกิดข้อผิดพลาด" });
        return;
      }

      const d = j.data || {};

      $("#pv_title").val(d.news_title || "-");
      $("#pv_kind").val(Number(d.is_featured || 0) === 1 ? "ข่าวยอดฮิต (Featured)" : "ข่าวทั่วไป");
      $("#pv_category").val(d.category_name || "-");
      $("#pv_subcategory").val(d.subcategory_name || "-");
      $("#pv_status").val("เผยแพร่แล้ว");
      $("#pv_published_at").val(fmtDateTime(d.published_at));
      $("#pv_author").val((d.author_fname || "") + " " + (d.author_lname || ""));
      $("#pv_content").val(d.news_content || "");
      $("#pv_video_url").val(d.video_url || "");

      safeSetImg($("#pv_cover_img"), $("#pv_cover_empty"), d.cover_image);
      renderSubImages($("#pv_sub_images"), $("#pv_sub_images_empty"), d.sub_images);

      const m = bsModal("publicViewModal");
      if (m) m.show();

    } catch (e) {
      await swalFire({ icon: "error", title: "ดูข้อมูลไม่ได้", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    }
  });
});
