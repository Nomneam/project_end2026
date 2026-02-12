$(function () {
  const PRICE = 150;

  function updateTotal() {
    const m = +$("#sideMonth").val();
    $("#sideTotal").text(`รวม ${PRICE * m} บาท`);
  }
  updateTotal();
  $("#sideMonth").on("change", updateTotal);

  $("#sideImage, #sideTitle, #sideUrl").on("change input", function () {
    const file = $("#sideImage")[0].files[0];
    if (!file) return;

    const url = $("#sideUrl").val() || "#";

    const reader = new FileReader();
    reader.onload = e => {
      $("#sidePreview")
        .attr("href", url)
        .html(`
          <div class="sidebar-ad">
            <img src="${e.target.result}" alt="">
          </div>
        `);
    };
    reader.readAsDataURL(file);
  });
});