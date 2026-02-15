$(function () {

  if ($("#slideMonth").length === 0) return;

  const SLIDE_PRICE = 500;

  const swiper = new Swiper(".footerAdSwiper", {
    loop: true,
    autoplay: {
      delay: 3000,
      disableOnInteraction: false
    }
  });

  function updateSlideTotal() {
    const month = +$("#slideMonth").val();
    $("#slideTotal").text(`รวม ${SLIDE_PRICE * month} บาท`);
  }

  $("#slideMonth").on("change", updateSlideTotal);
  updateSlideTotal();

  $("#slideImage, #slideTitle, #slideSub, #slideUrl").on("change input", function () {
    const file = $("#slideImage")[0].files[0];
    if (!file) return;

    const title = $("#slideTitle").val() || "หัวข้อโฆษณา";
    const sub = $("#slideSub").val() || "รายละเอียดโฆษณา";
    const url = $("#slideUrl").val() || "#";

    const reader = new FileReader();
    reader.onload = e => {
      $("#slidePreview").html(`
        <div class="swiper-slide">
          <a class="ad-banner" href="${url}" target="_blank">
            <img src="${e.target.result}">
            <div class="ad-meta">
              <div class="ad-title">${title}</div>
              <div class="small">${sub}</div>
            </div>
          </a>
        </div>
      `);
      swiper.update();
    };
    reader.readAsDataURL(file);
  });

});

// submit
// submit
$("#submitFooterAd").click(function () {

  const file = $("#slideImage")[0].files[0];
  const title = $("#slideTitle").val();
  const description = $("#slideSub").val();
  const url = $("#slideUrl").val();
  const months = $("#slideMonth").val();

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
  formData.append("description", description);
  formData.append("url", url);
  formData.append("months", months);

  // loading
  Swal.fire({
    title: "กำลังอัปโหลด...",
    text: "กรุณารอสักครู่",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  $.ajax({
    url: "/api/footer_ads",
    type: "POST",
    data: formData,
    contentType: false,
    processData: false,
    success: function (res) {

      Swal.fire({
        icon: "success",
        title: "ส่งโฆษณาเรียบร้อย",
        text: res.message,
        confirmButtonText: "ตกลง"
      }).then(() => {
        location.reload();
      });

    },
    error: function (xhr) {

      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: xhr.responseJSON?.error || "ไม่สามารถบันทึกข้อมูลได้"
      });

    }
  });

});
