$(function () {
  const PRICE = Number($("#priceBox").data("price"));

  function updateTotal() {
    const m = +$("#sideMonth").val();
    $("#sideTotal").text(`รวม ${PRICE * m} บาท`);
  }
  updateTotal();
  $("#sideMonth").on("change", updateTotal);

  // =========================
  // PREVIEW
  // =========================
  $("#sideImage, #sideTitle, #sideUrl, #sideDesc").on("change input", function () {

    const file = $("#sideImage")[0].files[0];
    if (!file) return;

    const url = $("#sideUrl").val() || "#";

    const reader = new FileReader();
    reader.onload = e => {
      $("#sidePreview")
        .attr("href", url)
        .html(`
          <div class="sidebar-ad">
            <img src="${e.target.result}">
          </div>
        `);
    };
    reader.readAsDataURL(file);
  });

  // =========================
  // SUBMIT
  // =========================
  $("#submitSidebarAd").click(function () {

  const file = $("#sideImage")[0].files[0];
  const title = $("#sideTitle").val();
  const desc = $("#sideDesc").val();
  const url = $("#sideUrl").val();
  const month = $("#sideMonth").val();

  if (!file || !title || !url) {
    Swal.fire({
      icon: "warning",
      title: "กรอกข้อมูลไม่ครบ",
      text: "กรุณาใส่รูป หัวข้อ และลิงก์"
    });
    return;
  }

  const formData = new FormData();
  formData.append("image", file);
  formData.append("title", title);
  formData.append("description", desc);
  formData.append("url", url);
  formData.append("months", month);

  Swal.fire({
    title: "กำลังอัปโหลด...",
    text: "กรุณารอสักครู่",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  fetch("/api/sidebar_ads", {
    method: "POST",
    body: formData
  })
  .then(res => {

    if (res.status === 401) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเข้าสู่ระบบก่อน",
        confirmButtonText: "สมัครสมาชิก"
      }).then(() => {
        window.location.href="/?auth=required";
      });
      return null;
    }

    return res.json();
  })
  .then(data => {

    if (!data) return;

    if (data.success) {
      Swal.fire({
        icon: "success",
        title: "ส่งโฆษณาเรียบร้อย",
        text: "ระบบได้รับข้อมูลแล้ว กรุณารออนุมัติ"
      }).then(() => location.reload());
    } else {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: data.error || "ไม่สามารถบันทึกข้อมูลได้"
      });
    }

  })
  .catch(() => {
    Swal.fire({
      icon: "error",
      title: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"
    });
  });

});


});
