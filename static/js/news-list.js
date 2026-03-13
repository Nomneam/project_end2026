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

    loadPage(1);

  }, 300);

});

// ======================================
// reset search
// ======================================
$(document).on("click", "#btnReset", function () {

  $("#searchInput").val("");   // ล้างช่องค้นหา
  loadPage(1);                 // โหลดข่าวทั้งหมดใหม่

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



async function loadPage(page){

  if(page < 1) return;

  const q = $("#searchInput").val().trim();

  try{

    const r = await fetch(`/reporter/news/pagination?page=${page}&q=${encodeURIComponent(q)}`);

    const j = await r.json();

    if(!j.ok) return;

    renderRows(j.rows);
    renderPagination(page, j.total_pages);

  }catch(err){
    console.error(err);
  }

}


function renderRows(rows){

  const tbody = $("#newsTableBody");

  tbody.empty();

  if(!rows.length){
    tbody.append(`
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
        ไม่พบข่าว
        </td>
      </tr>
    `);
    return;
  }

  rows.forEach(n=>{

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
        <td class="text-center">${n.category_name||"-"}</td>
        <td class="text-center">${date}</td>
        <td class="text-center">
          <span class="status-badge status-published">เผยแพร่แล้ว</span>
        </td>
        <td class="text-center">
          ${(n.author_fname||"")} ${(n.author_lname||"")}
        </td>
        <td class="text-center">
          <button
          class="btn btn-outline-primary btn-sm rounded-circle btn-view-public"
          data-id="${n.news_id}">
          <i class="bi bi-eye"></i>
          </button>
        </td>
      </tr>
    `)

  })

}


$(document).on("click",".page-btn",function(e){

  e.preventDefault();

  const page = parseInt($(this).data("page"));

  if(!page || page < 1) return; // ✅ ป้องกัน error

  loadPage(page);

});



function renderPagination(currentPage, totalPages){

  const container = $(".pagination");
  container.empty();

  // prev
  container.append(`
  <li class="page-item ${currentPage==1?"disabled":""}">
    <a class="page-link page-btn" data-page="${currentPage-1}">&laquo;</a>
  </li>`);

  let start = Math.max(1, currentPage-2);
  let end = Math.min(totalPages, currentPage+2);

  if(start > 1){

    container.append(`
    <li class="page-item">
      <a class="page-link page-btn" data-page="1">1</a>
    </li>`);

    if(start > 2){
      container.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
    }

  }

  for(let i=start;i<=end;i++){

    container.append(`
    <li class="page-item ${i==currentPage?"active":""}">
      <a class="page-link page-btn" data-page="${i}">${i}</a>
    </li>`);

  }

  if(end < totalPages){

    if(end < totalPages-1){
      container.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
    }

    container.append(`
    <li class="page-item">
      <a class="page-link page-btn" data-page="${totalPages}">${totalPages}</a>
    </li>`);

  }

  // next
  container.append(`
  <li class="page-item ${currentPage==totalPages?"disabled":""}">
    <a class="page-link page-btn" data-page="${currentPage+1}">&raquo;</a>
  </li>`);

}



$(function(){

  // โหลดหน้าแรกทันที
  loadPage(1);

});