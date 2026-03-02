$(function () {

    const modalElement = document.getElementById('adsPolicyModal');
    const modal = new bootstrap.Modal(modalElement);

    const accepted = Number($("body").data("policy")) === 1;

    const checkbox = $("#acceptPolicy");
    const confirmBtn = $("#confirmPolicy");

    // ==============================
    // 🟢 ถ้ายังไม่เคยยอมรับ (บังคับ)
    // ==============================
    if (!accepted) {

        // บังคับปิด modal ไม่ได้
        modalElement.setAttribute("data-bs-backdrop", "static");
        modalElement.setAttribute("data-bs-keyboard", "false");

        modal.show();

        confirmBtn.prop("disabled", true);
        checkbox.prop("checked", false);

    }
    // ==============================
    // 🔵 ถ้าเคยยอมรับแล้ว
    // ==============================
    else {

        // เปิดดูเฉย ๆ ได้
        modalElement.removeAttribute("data-bs-backdrop");
        modalElement.removeAttribute("data-bs-keyboard");

        // ซ่อน checkbox + ปุ่มยอมรับ
        checkbox.closest(".form-check").hide();
        confirmBtn.hide();

        $(".btn-close").show();

    }

    // ==============================
    // ปุ่มดูเงื่อนไขอีกครั้ง
    // ==============================
    $("#openPolicyBtn").on("click", function () {
        modal.show();
    });

    // ==============================
    // เปิดปุ่มเมื่อ checkbox ถูกติ๊ก
    // ==============================
    checkbox.on("change", function () {
        confirmBtn.prop("disabled", !this.checked);
    });

    // ==============================
    // กดยอมรับครั้งแรก
    // ==============================
    confirmBtn.on("click", function () {

        $.post("/accept-ads-policy", function (res) {
            if (res.success) {
                modal.hide();

                // ซ่อน checkbox + ปุ่มหลังจากยอมรับแล้ว
                checkbox.closest(".form-check").hide();
                confirmBtn.hide();
            }
        });

    });

});