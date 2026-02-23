$(function () {

  const placeSelect = document.getElementById("heroPlace");

  const PRICE_INDEX = Number(placeSelect.dataset.priceHome);
  const PRICE_PAGECAT = Number(placeSelect.dataset.priceCategory);

  function updateTotal() {
    const months = +$("#heroMonth").val();
    const place = $("#heroPlace").val();

    const price = place === "home"
      ? PRICE_INDEX
      : PRICE_PAGECAT;

    $("#heroTotal").text(`รวม ${price * months} บาท`);
  }

  $("#heroPlace, #heroMonth").on("change", updateTotal);
  updateTotal();
});

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

// =======================
// SUBMIT HERO AD
// =======================
$("#submitHeroAd").click(function () {

  const file = $("#heroImage")[0].files[0];
  const title = $("#heroTitle").val();
  const desc = $("#heroSub").val();
  const url = $("#heroUrl").val();
  const month = $("#heroMonth").val();
  const place = $("#heroPlace").val();

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
  formData.append("place", place);

  Swal.fire({
    title: "กำลังอัปโหลด...",
    text: "กรุณารอสักครู่",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  fetch("/api/bighero_ads", {
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
        window.location.href = "/?auth=required";
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
        text: data.error || ""
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
