$(function () {

  if ($("#iconMonth").length === 0) return;

  const ICON_PRICE = 300;

  function updateIconTotal() {
    const month = +$("#iconMonth").val();
    $("#iconTotal").text(`รวม ${ICON_PRICE * month} บาท`);
  }

  $("#iconMonth").on("change", updateIconTotal);
  updateIconTotal();

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

});