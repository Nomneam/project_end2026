$(document).ready(function(){

    // Avatar Preview
    $("#avatarInput").on("change", function(e){
        const file = e.target.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = function(){
            $("#avatarPreview")
                .attr("src", reader.result)
                .show();
            $("#defaultAvatar").hide();
        };
        reader.readAsDataURL(file);
    });

    // Change Password
    const correctPassword = "123456";

    $("#changePasswordBtn").click(function(){

        Swal.fire({
            title: "ยืนยันรหัสผ่านปัจจุบัน",
            icon: "question",
            input: "password",
            inputPlaceholder: "กรอกรหัสผ่านปัจจุบัน",
            showCancelButton: true,
            confirmButtonText: "ยืนยัน",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#0b1c3d"
        }).then(function(result){

            if(!result.isConfirmed) return;

            if(result.value !== correctPassword){
                Swal.fire({
                    icon: "error",
                    title: "รหัสผ่านไม่ถูกต้อง",
                    confirmButtonColor: "#0b1c3d"
                });
                return;
            }

            Swal.fire({
                title: "ตั้งรหัสผ่านใหม่",
                html:
                    '<input type="password" id="newPass" class="swal2-input" placeholder="รหัสผ่านใหม่">' +
                    '<input type="password" id="confirmPass" class="swal2-input" placeholder="ยืนยันรหัสผ่านใหม่">',
                confirmButtonText: "บันทึก",
                showCancelButton: true,
                cancelButtonText: "ยกเลิก",
                confirmButtonColor: "#0b1c3d",
                preConfirm: function(){
                    const newPass = $("#newPass").val();
                    const confirmPass = $("#confirmPass").val();

                    if(!newPass || !confirmPass){
                        Swal.showValidationMessage("กรุณากรอกข้อมูลให้ครบ");
                        return false;
                    }

                    if(newPass.length < 6){
                        Swal.showValidationMessage("รหัสผ่านต้องอย่างน้อย 6 ตัว");
                        return false;
                    }

                    if(newPass !== confirmPass){
                        Swal.showValidationMessage("รหัสผ่านไม่ตรงกัน");
                        return false;
                    }

                    return newPass;
                }
            }).then(function(result2){
                if(result2.isConfirmed){
                    Swal.fire({
                        icon: "success",
                        title: "เปลี่ยนรหัสผ่านสำเร็จ",
                        confirmButtonColor: "#0b1c3d"
                    });
                }
            });

        });

    });

    // ✅ Save Profile (ย้ายมาไว้ตรงนี้)
    $("#saveProfileBtn").click(function(){

        const firstName = $("input[placeholder='ชื่อ']").val();
        const lastName = $("input[placeholder='นามสกุล']").val();
        const phone = $("input[placeholder='เบอร์โทรศัพท์']").val();
        const email = $("input[type='email']").val();

        if(!firstName || !lastName || !phone || !email){
            Swal.fire({
                icon: "warning",
                title: "กรุณากรอกข้อมูลให้ครบ",
                confirmButtonColor: "#0b1c3d"
            });
            return;
        }

        Swal.fire({
            icon: "success",
            title: "บันทึกข้อมูลสำเร็จ",
            confirmButtonColor: "#0b1c3d"
        });

    });

});
