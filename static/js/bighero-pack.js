$(function (){

  const PRICE_INDEX = 900;
  const PRICE_PAGECAT = 700;

  function updateTotal() {
    const months = +$("#heroMonth").val();
    const place = $("#heroPlace").val();
    const price = place === "home" ? PRICE_INDEX : PRICE_PAGECAT;
    $("#heroTotal").text(`รวม ${price * months} บาท`);
  }
  $("#heroPlace,#heroMonth").on("change", updateTotal);
  updateTotal();
})

$("#heroImage, #heroTitle, #heroSub, #heroUrl, #heroPlace").on("change input", function () {
  const file = $("#heroImage")[0].files[0];
  if (!file) return;

  const title = $("#heroTitle").val() || "หัวข้อโฆษณา";
  const sub = $("#heroSub").val() || "คำอธิบายเพิ่มเติม";
  const url = $("#heroUrl").val() || "#";
  const place = $("#heroPlace").val();

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = function () {

      $("#heroPreview").html(`
        <a href="${url}" target="_blank" class="big-ad-wrap text-decoration-none">
          <div class="bighero-img-wrap">
            <img src="${e.target.result}" class="big-ad-img">
            <div class="big-ad-overlay"></div>
            <div class="big-ad-content">
      <span class="ad-badge ad-badge-ad mb-2">ad</span>

      <h2 class="font-kanit fw-bold big-ad-title">
        ${title}
      </h2>

      <p class="big-ad-desc">
        ${sub}
      </p>

      <div class="mt-3">
        <span class="btn btn-bkk-red px-4">
          ดูรายละเอียด
        </span>
      </div>
          </div>
        </a>
      `);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});