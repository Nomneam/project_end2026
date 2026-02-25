// static/js/ads-overview.js

$(document).ready(function () {
  const pageSize = 5;
  let currentPage = 1;
  let filteredItems = [];

  function updatePagination() {
    const $items = $(".ad-card-item");
    const term = $("#searchInput").val().toLowerCase().trim();
    const statusFilter = $("#statusFilter").val();

    // 1. กรองข้อมูล (Filtering)
    filteredItems = $items.filter(function () {
      const $card = $(this);
      const name = $card.data("name") || "";
      const status = $card.data("status") || "";
      
      // แมปสถานะจาก DB ให้ตรงกับ Filter
      // running -> running
      // submitted, approved, draft -> pending
      // rejected, paused, expired -> ended
      let mappedStatus = "";
      if (["running"].includes(status)) mappedStatus = "running";
      else if (["submitted", "approved", "draft"].includes(status)) mappedStatus = "pending";
      else if (["rejected", "paused", "expired"].includes(status)) mappedStatus = "ended";

      const matchesSearch = !term || name.includes(term);
      const matchesStatus = !statusFilter || mappedStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // 2. จัดการการแสดงผล (Visibility)
    $items.hide();
    const total = filteredItems.length;
    const totalPages = Math.ceil(total / pageSize) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;

    $(filteredItems).slice(start, end).show();

    // 3. แสดง/ซ่อน Empty State
    if (total === 0) {
      if ($("#emptyState").length === 0) {
        $("#adsContainer").append('<div id="emptyState" class="text-center text-muted py-5">ไม่พบข้อมูลที่ค้นหา</div>');
      } else {
        $("#emptyState").text("ไม่พบข้อมูลที่ค้นหา").show();
      }
      $("#paginationWrapper").hide();
    } else {
      $("#emptyState").hide();
      $("#paginationWrapper").show();
      renderPaginationControls(total, totalPages);
    }
  }

  function renderPaginationControls(total, totalPages) {
    const $pagination = $("#pagination");
    const $pageInfo = $("#pageInfo");
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, total);

    $pageInfo.text(`แสดง ${startItem}-${endItem} จากทั้งหมด ${total} แคมเปญ`);

    let html = "";
    // ปุ่มก่อนหน้า
    html += `<li class="page-item ${currentPage === 1 ? "disabled" : ""}">
              <a class="page-link" href="#" data-page="prev">ก่อนหน้า</a>
            </li>`;

    // เลขหน้า
    for (let i = 1; i <= totalPages; i++) {
      html += `<li class="page-item ${i === currentPage ? "active" : ""}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
              </li>`;
    }

    // ปุ่มถัดไป
    html += `<li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
              <a class="page-link" href="#" data-page="next">ถัดไป</a>
            </li>`;

    $pagination.html(html);
  }


  $(document).on("click", ".pay-btn", function () {
    const advId = $(this).data("id");

    $("#paymentModal").modal("show");

    // โหลดข้อมูล QR จาก backend
    $.get(`/payment/${advId}`, function (res) {
        $("#qrImage").attr("src", res.qr_url);
        $("#payAmount").text(res.amount + " บาท");
        $("#confirmPayment").data("id", advId);
    });
});


$("#confirmPayment").click(function () {
    const advId = $(this).data("id");

    $.post(`/payment/confirm/${advId}`, function () {
        alert("ชำระเงินเรียบร้อย");
        location.reload();
    });
});



  // Event Listeners
  $("#searchInput").on("input", function () {
    currentPage = 1;
    updatePagination();
  });

  $("#statusFilter").on("change", function () {
    currentPage = 1;
    updatePagination();
  });

  $(document).on("click", ".page-link", function (e) {
    e.preventDefault();
    const page = $(this).data("page");
    const totalPages = Math.ceil(filteredItems.length / pageSize);

    if (page === "prev") {
      if (currentPage > 1) currentPage--;
    } else if (page === "next") {
      if (currentPage < totalPages) currentPage++;
    } else {
      currentPage = parseInt(page);
    }
    updatePagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Initial Run
  updatePagination();
});
