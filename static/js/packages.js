$(function () {

    const modal = new bootstrap.Modal(document.getElementById('adsPolicyModal'));

    // เช็คว่าเคยกดยอมรับแล้วหรือยัง
    const accepted = localStorage.getItem("ads_policy_accepted");

    if (!accepted) {
        modal.show();
    }

    // เปิดปุ่มเมื่อ checkbox ถูกติ๊ก
    $("#acceptPolicy").on("change", function () {
        $("#confirmPolicy").prop("disabled", !this.checked);
    });

    // กดยอมรับ
    $("#confirmPolicy").on("click", function () {
        localStorage.setItem("ads_policy_accepted", "true");
        modal.hide();
    });

});