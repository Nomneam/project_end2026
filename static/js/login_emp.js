$(document).ready(function () {

    const error = $("body").data("error");
    const success = $("body").data("success");
    const redirectUrl = $("body").data("redirect");

    // ❌ กรณี Login ผิด
    if (error) {
        Swal.fire({
            icon: "error",
            title: "เข้าสู่ระบบไม่สำเร็จ",
            text: error,
            confirmButtonColor: "#d33"
        });
    }

    // ✅ กรณี Login สำเร็จ
    if (success) {
        Swal.fire({
            icon: "success",
            title: "เข้าสู่ระบบสำเร็จ",
            text: "กำลังพาคุณไปยังหน้าหลัก...",
            timer: 1500,
            showConfirmButton: false
        }).then(function () {
            if (redirectUrl) {
                window.location.href = redirectUrl;
            }
        });
    }

});