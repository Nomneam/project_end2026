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