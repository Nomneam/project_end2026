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
       BLOCK NON-NUMERIC INPUT
    ========================== */
    $("input[name='phone'], input[name='citizen_id']").on("input", function () {
        this.value = this.value.replace(/\D/g, "");
    });


    /* =========================
       CHANGE PASSWORD
    ========================== */
    $("#changePasswordBtn").click(function () {

        Swal.fire({
            title: "ยืนยันรหัสผ่านปัจจุบัน",
            input: "password",
            showCancelButton: true,
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

                $.ajax({
                    url: "/change_password",
                    type: "POST",
                    contentType: "application/json",
                    data: JSON.stringify({
                        old_password: res2.value.currentPass,
                        new_password: res2.value.newPass
                    }),
                    success: function (res3) {
                        if (res3.ok) {
                            Swal.fire("สำเร็จ", "เปลี่ยนรหัสผ่านแล้ว", "success");
                        } else {
                            Swal.fire("ผิดพลาด", res3.message, "error");
                        }
                    }
                });

            });

        });

    });


    /* =========================
       SAVE PROFILE
    ========================== */
    $("#profileForm").on("submit", function (e) {

        e.preventDefault();
        const form = this;
        const formData = new FormData(form);

        const fname = formData.get("fname")?.trim();
        const lname = formData.get("lname")?.trim();
        const phone = formData.get("phone")?.trim();
        const email = formData.get("email")?.trim();
        const address = formData.get("address")?.trim();
        const citizen = formData.get("citizen_id")?.trim();
        const avatar = formData.get("avatar");

        /* ===== VALIDATION ===== */

        if (!fname || !lname || !phone || !email || !address || !citizen) {
            return Swal.fire("ข้อมูลไม่ครบ", "กรอกข้อมูลให้ครบทุกช่อง", "warning");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return Swal.fire("รูปแบบไม่ถูกต้อง", "กรอกอีเมลให้ถูกต้อง", "warning");
        }

        if (!/^\d{13}$/.test(citizen)) {
            return Swal.fire("ข้อมูลไม่ถูกต้อง", "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก", "warning");
        }

        if (!/^\d{10}$/.test(phone)) {
            return Swal.fire("ข้อมูลไม่ถูกต้อง", "เบอร์โทรต้องเป็นตัวเลข 10 หลัก", "warning");
        }

        /* ===== CHECK CHANGE ===== */

        let isChanged = false;

        $(form).find("input, textarea").each(function () {
            if ($(this).attr("type") !== "file") {
                if ($(this).data("original") != $(this).val()) {
                    isChanged = true;
                }
            }
        });

        if (avatar && avatar.size > 0) {
            isChanged = true;
        }

        if (!isChanged) {
            return Swal.fire("ไม่มีการเปลี่ยนแปลง", "คุณยังไม่ได้แก้ไขข้อมูล", "info");
        }

        /* ===== CONFIRM ===== */

        Swal.fire({
            title: "ยืนยันการบันทึก?",
            text: "คุณต้องการบันทึกการเปลี่ยนแปลงใช่หรือไม่",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "บันทึก",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#0b1c3d"
        }).then((result) => {

            if (!result.isConfirmed) return;

            $.ajax({
                url: "/update_profile",
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function () {
                    Swal.fire({
                        title: "กำลังบันทึก...",
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading()
                    });
                },
                success: function (res) {
                    if (res.ok) {
                        Swal.fire({
                            icon: "success",
                            title: "บันทึกข้อมูลสำเร็จ"
                        }).then(() => location.reload());
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

});
