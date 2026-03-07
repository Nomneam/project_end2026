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

  function renderThaiDate(dateStr){

  if(!dateStr){
    $("#pv_date_thai").text("-");
    $("#pv_time_thai").text("");
    return;
  }

  const d = new Date(dateStr);

  const date = d.toLocaleDateString("th-TH",{
    day:"2-digit",
    month:"short",
    year:"numeric",
    timeZone:"Asia/Bangkok"
  });

  const time = d.toLocaleTimeString("th-TH",{
    hour:"2-digit",
    minute:"2-digit",
    hour12:false,
    timeZone:"Asia/Bangkok"
  });

  $("#pv_date_thai").text(date);
  $("#pv_time_thai").text(time);
}

  // ======================================
  // auto search (ajax)
  // ======================================
  let searchTimer = null;

  $(document).on("input", "#searchInput", function () {

    clearTimeout(searchTimer);

    searchTimer = setTimeout(function () {

      const q = $("#searchInput").val().trim();
      searchNews(q);

    }, 300);

  });

  async function searchNews(keyword) {

  try {

    const r = await fetch(`/reporter/news/search?q=${encodeURIComponent(keyword)}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" }
    });

    const j = await r.json();

    if (!j.ok) return;

    const rows = j.rows || [];
    const tbody = $("#newsTableBody");

    tbody.empty();

    if (!rows.length) {

      tbody.append(`
        <tr>
          <td colspan="7" class="text-center text-muted py-4">
            ไม่พบข่าว
          </td>
        </tr>
      `);

      return;
    }

    rows.forEach(n => {

      const kind = n.is_featured == 1
        ? `<span class="badge bg-danger">ข่าวยอดฮิต</span>`
        : `<span class="badge bg-secondary">ข่าวทั่วไป</span>`;

      const date = n.published_at
        ? new Date(n.published_at).toLocaleDateString("th-TH")
        : "-";

      tbody.append(`
        <tr>

          <td class="fw-semibold">${n.news_title}</td>

          <td class="text-center">${kind}</td>

          <td class="text-center">${n.category_name || "-"}</td>

          <td class="text-center">${date}</td>

          <td class="text-center">
            <span class="status-badge status-published">เผยแพร่แล้ว</span>
          </td>

          <td class="text-center">
            ${(n.author_fname || "")} ${(n.author_lname || "")}
          </td>

          <td class="text-center">

            <button
              class="btn btn-outline-primary btn-sm rounded-circle btn-view-public"
              data-id="${n.news_id}">
              <i class="bi bi-eye"></i>
            </button>

          </td>

        </tr>
      `);

    });

  } catch (err) {
    console.error(err);
  }

}

// ======================================
// reset search
// ======================================
$(document).on("click", "#btnReset", function () {

  // ล้าง input
  $("#searchInput").val("");

  // โหลดข่าวทั้งหมดใหม่
  searchNews("");

});

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

  const finalSrc = src.startsWith("http")
    ? src
    : "/static/" + src;

  container.append(`<img src="${finalSrc}" alt="sub" style="max-height:120px;">`);
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

      $("#pv_title").text(d.news_title || "-");

      $("#pv_category").text(d.category_name || "-");

      $("#pv_status").text("เผยแพร่แล้ว");

      renderThaiDate(d.published_at);

      $("#pv_author").text(
        (d.author_fname || "") + " " + (d.author_lname || "")
      );

      $("#pv_content").html(d.news_content || "-");

      $("#pv_video_url").val(d.video_path || "");

      safeSetImg($("#pv_cover_img"), $("#pv_cover_empty"), d.cover_image);
      renderSubImages($("#pv_sub_images"), $("#pv_sub_images_empty"), d.sub_images);

      const m = bsModal("publicViewModal");
      if (m) m.show();

    } catch (e) {
      await swalFire({ icon: "error", title: "ดูข้อมูลไม่ได้", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    }
  });
});
