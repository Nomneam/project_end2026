$(function () {

    /* =========================
       AVATAR PREVIEW
    ========================== */
    $("#avatarInput").on("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function () {
            $("#avatarPreview")
                .attr("src", reader.result)
                .show();
            $("#defaultAvatar").hide();
        };
        reader.readAsDataURL(file);
    });


    /* =========================
       CHANGE PASSWORD (ยิง backend)
    ========================== */
    $("#changePasswordBtn").click(function () {

        Swal.fire({
            title: "ยืนยันรหัสผ่านปัจจุบัน",
            input: "password",
            inputPlaceholder: "กรอกรหัสผ่านปัจจุบัน",
            showCancelButton: true,
            confirmButtonText: "ยืนยัน",
            confirmButtonColor: "#0b1c3d"
        }).then(function (result) {

            if (!result.isConfirmed) return;

            const currentPass = result.value;

            Swal.fire({
                title: "ตั้งรหัสผ่านใหม่",
                html:
                    '<input type="password" id="newPass" class="swal2-input" placeholder="รหัสผ่านใหม่">' +
                    '<input type="password" id="confirmPass" class="swal2-input" placeholder="ยืนยันรหัสผ่านใหม่">',
                showCancelButton: true,
                confirmButtonText: "บันทึก",
                confirmButtonColor: "#0b1c3d",
                preConfirm: function () {

                    const newPass = $("#newPass").val();
                    const confirmPass = $("#confirmPass").val();

                    if (!newPass || !confirmPass)
                        return Swal.showValidationMessage("กรอกข้อมูลให้ครบ");

                    if (newPass.length < 6)
                        return Swal.showValidationMessage("รหัสผ่านต้องอย่างน้อย 6 ตัว");

                    if (newPass !== confirmPass)
                        return Swal.showValidationMessage("รหัสผ่านไม่ตรงกัน");

                    return { currentPass, newPass };
                }
            }).then(function (res2) {

                if (!res2.isConfirmed) return;

                $.post("/update_password", {
                    current_password: res2.value.currentPass,
                    new_password: res2.value.newPass
                }, function (res3) {

                    if (res3.ok) {
                        Swal.fire("สำเร็จ", "เปลี่ยนรหัสผ่านแล้ว", "success");
                    } else {
                        Swal.fire("ผิดพลาด", res3.message, "error");
                    }

                });

            });

        });

    });


    /* =========================
       SAVE PROFILE (FORM SUBMIT)
    ========================== */
    $("#profileForm").on("submit", function (e) {

        e.preventDefault();

        const formData = new FormData(this);

        $.ajax({
            url: "/update_profile",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function (res) {

                if (res.ok) {
                    Swal.fire({
                        icon: "success",
                        title: "บันทึกข้อมูลสำเร็จ",
                        confirmButtonColor: "#0b1c3d"
                    });
                } else {
                    Swal.fire("ผิดพลาด", res.message, "error");
                }

            },  
            error: function () {
                Swal.fire("ผิดพลาด", "เกิดข้อผิดพลาดของระบบ", "error");
            }
        });

    });

});
