$(function () {

  if ($("#iconMonth").length === 0) return;

  const ICON_PRICE = 300;

  // =========================
  // คำนวณราคารวม
  // =========================
  function updateIconTotal() {
    const month = +$("#iconMonth").val();
    $("#iconTotal").text(`รวม ${ICON_PRICE * month} บาท`);
  }

  $("#iconMonth").on("change", updateIconTotal);
  updateIconTotal();


  // =========================
  // Preview Logo
  // =========================
  $("#iconName, #iconImage, #iconUrl").on("change input", function () {

    const file = $("#iconImage")[0].files[0];
    if (!file) return;

    const name = $("#iconName").val() || "แบรนด์ของคุณ";
    const url = $("#iconUrl").val() || "#";

    const reader = new FileReader();

    reader.onload = e => {
      $("#iconPreview").html(`
        <a class="sponsor-pill" href="${url}" target="_blank">
          <img src="${e.target.result}">
          <div>
            <div style="font-weight:700">${name}</div>
            <div style="font-size:12px;color:#6b7280">Sponsor</div>
          </div>
        </a>
      `);
    };

    reader.readAsDataURL(file);
  });


  // =========================
  // SUBMIT ICON ADS
  // =========================
  $("#submitIcon").click(function () {

    const image = $("#iconImage")[0].files[0];
    const name = $("#iconName").val().trim();
    const url = $("#iconUrl").val().trim();
    const months = $("#iconMonth").val();

    // ตรวจสอบข้อมูล
    if (!image || !name || !url) {
      Swal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณาใส่รูป ชื่อแบรนด์ และลิงก์เว็บไซต์"
      });
      return;
    }

    const formData = new FormData();
    formData.append("image", image);
    formData.append("name", name);
    formData.append("url", url);
    formData.append("months", months);

    Swal.fire({
      title: "กำลังส่งโฆษณา...",
      text: "กรุณารอสักครู่",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    fetch("/api/icon_ads", {
  method: "POST",
  body: formData
})
.then(res => {

  // 🔒 ถ้า session หมดอายุ → กลับหน้าแรก
  if (res.status === 401) {
    window.location.href = "/";
    return Promise.reject("unauthorized");
  }

  return res.json();
})
.then(data => {

  if (data.success) {
    Swal.fire({
      icon: "success",
      title: "ส่งโฆษณาเรียบร้อย",
      text: "ระบบได้รับข้อมูลแล้ว กรุณารอการอนุมัติ",
      confirmButtonText: "ตกลง"
    }).then(() => location.reload());

  } else {
    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: data.error || "ไม่สามารถส่งข้อมูลได้"
    });
  }

})
.catch(err => {

  // ❌ ไม่ต้องแจ้ง error ซ้ำถ้า redirect แล้ว
  if (err === "unauthorized") return;

  Swal.fire({
    icon: "error",
    title: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้",
    text: "กรุณาลองใหม่อีกครั้ง"
  });

});

  });

});
