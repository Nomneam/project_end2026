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
      

      const matchesSearch = !term || name.includes(term);
      const matchesStatus = !statusFilter || status === statusFilter;

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


// ====== PAYMENT FLOW (TMWEASY) ======

let currentIdPay = null;

$(document).on("click", ".pay-btn", function () {
  const advId = $(this).data("id");

  $("#qrImage").attr("src", "");
  $("#payAmount").text("กำลังสร้างรายการ...");

  // STEP 1: สร้าง id_pay
  $.get(`/tmw-create/${advId}`, function (res) {

    currentIdPay = res.id_pay;

    // STEP 2: ขอ QR
    $.ajax({
      url: "/tmw-qr",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ id_pay: currentIdPay }),
      success: function (qrRes) {

        $("#qrImage").attr(
          "src",
          "data:image/png;base64," + qrRes.qr_image
        );

        $("#payAmount").text("กรุณาชำระเงินภายใน " + qrRes.timeout + " วินาที");

        $("#paymentModal").modal("show");

        // เริ่มเช็คสถานะทุก 5 วิ
        startCheckingPayment();
      }
    });

  }).fail(function () {
    Swal.fire("ผิดพลาด", "ไม่สามารถสร้างรายการได้", "error");
  });
});


let checkInterval = null;

function startCheckingPayment() {

  if (checkInterval) clearInterval(checkInterval);

  checkInterval = setInterval(function () {

    $.ajax({
      url: "/tmw-confirm",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ id_pay: currentIdPay }),
      success: function (res) {

        if (res.status === "paid") {

          clearInterval(checkInterval);

          Swal.fire({
            icon: "success",
            title: "ชำระเงินสำเร็จ",
            text: "โฆษณาของคุณกำลังเริ่มแสดงผล"
          }).then(() => location.reload());
        }
      }
    });

  }, 5000);
}


// หยุด polling ถ้าปิด modal
$('#paymentModal').on('hidden.bs.modal', function () {
  if (checkInterval) clearInterval(checkInterval);
  currentIdPay = null;
});


// เปิด modal แก้ไข
$(document).on("click", ".edit-ad-btn", function () {
  $("#editAdId").val($(this).data("id"));
  $("#editAdName").val($(this).data("name"));
  $("#editAdDesc").val($(this).data("desc"));
  $("#editAdUrl").val($(this).data("url"));

  $("#imagePreview").addClass("d-none").attr("src", "");

  const modal = new bootstrap.Modal(document.getElementById('editAdModal'));
  modal.show();
});



// preview รูป
$("#editAdImage").on("change", function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    $("#imagePreview")
      .attr("src", e.target.result)
      .removeClass("d-none");
  };
  reader.readAsDataURL(file);
});


$("#saveAdChanges").click(function () {

  const formData = new FormData();
  formData.append("id", $("#editAdId").val());
  formData.append("name", $("#editAdName").val());
  formData.append("desc", $("#editAdDesc").val());
  formData.append("url", $("#editAdUrl").val());

  const file = $("#editAdImage")[0].files[0];
  if (file) {
    formData.append("image", file);
  }

  $.ajax({
    url: "/ads/update",
    method: "POST",
    data: formData,
    processData: false,
    contentType: false,
    success: function () {
      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        text: "โฆษณาถูกส่งตรวจสอบอีกครั้ง"
      }).then(() => location.reload());
    },
    error: function () {
      Swal.fire("ผิดพลาด", "ไม่สามารถบันทึกได้", "error");
    }
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
