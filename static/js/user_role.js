$(document).ready(function () {
    // --- 1. ฟังก์ชันตรวจสอบความถูกต้อง (Validation Logic) ---

    // ตรวจสอบเบอร์โทรศัพท์ (ต้องเป็นตัวเลข 10 หลัก)
    function validatePhone(phone) {
        return /^[0-9]{10}$/.test(phone);
    }

    // ตรวจสอบเลขบัตรประชาชน (Algorithm Checksum 13 หลัก)
    function validateIDCard(id) {
        if (!/^[0-9]{13}$/.test(id)) return false;
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(id.charAt(i)) * (13 - i);
        }
        let check = (11 - (sum % 11)) % 10;
        return check === parseInt(id.charAt(12));
    }

    // --- 2. การจัดการ Modal ---

    window.showAddModal = function () {
        $('#addModal').modal('show');
    };

    window.openEditModal = function (btn) {
        const $btn = $(btn);
        
        // เติมข้อมูลจาก Data Attributes ลงในฟิลด์ Edit Modal
        $('#edit_username').val($btn.data('username'));
        $('#edit_fname').val($btn.data('fname'));
        $('#edit_lname').val($btn.data('lname'));
        $('#edit_email').val($btn.data('email'));
        $('#edit_role').val($btn.data('role'));
        $('#edit_phone').val($btn.data('phone'));
        $('#edit_idcard').val($btn.data('idcard'));
        $('#edit_address').val($btn.data('address'));

        // กำหนด Action URL สำหรับ Update
        $('#editUserForm').attr('action', '/user-role/edit/' + $btn.data('id'));
        $('#editModal').modal('show');
    };

    // --- 3. การส่งข้อมูลพร้อมการตรวจสอบ (Swal Submit) ---

    $('.swal-submit').on('submit', function (e) {
        e.preventDefault();
        const form = this;
        const $form = $(form);

        const phone = $form.find('input[name="emp_phone"]').val();
        const idcard = $form.find('input[name="emp_idcard"]').val();

        // Check Phone: ถ้ากรอกต้องครบ 10 หลัก
        if (phone && phone !== "-" && !validatePhone(phone)) {
            Swal.fire({
                icon: 'error',
                title: 'เบอร์โทรศัพท์ไม่ถูกต้อง',
                text: 'กรุณากรอกตัวเลขให้ครบ 10 หลัก',
                confirmButtonColor: '#2563eb'
            });
            return false;
        }

        // Check ID Card: ตรวจสอบความถูกต้องของเลข 13 หลัก
        if (idcard && idcard !== "" && !validateIDCard(idcard)) {
            Swal.fire({
                icon: 'error',
                title: 'เลขบัตรประชาชนไม่ถูกต้อง',
                text: 'กรุณาตรวจสอบความถูกต้องของเลข 13 หลักตามรูปแบบมาตรฐาน',
                confirmButtonColor: '#2563eb'
            });
            return false;
        }

        // ยืนยันการบันทึก
        Swal.fire({
            title: 'ยืนยันการบันทึกข้อมูล?',
            text: "โปรดตรวจสอบข้อมูลให้ถูกต้องก่อนดำเนินการ",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'ตกลง, บันทึก',
            cancelButtonText: 'ยกเลิก',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'กำลังบันทึก...',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });
                form.submit();
            }
        });
    });

    // --- 4. ฟังก์ชันลบผู้ใช้งาน (AJAX Delete) ---

    window.deleteUser = function (empId) {
        Swal.fire({
            title: 'คุณแน่ใจหรือไม่?',
            text: "ผู้ใช้งานนี้จะถูกระงับการเข้าถึงระบบทันที",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'ใช่, ฉันต้องการลบ',
            cancelButtonText: 'ยกเลิก',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: '/user-role/delete/' + empId,
                    type: 'POST',
                    success: function (res) {
                        if (res.status === 'success') {
                            Swal.fire('สำเร็จ!', 'ข้อมูลถูกลบเรียบร้อยแล้ว', 'success')
                                .then(() => { location.reload(); });
                        }
                    },
                    error: function() {
                        Swal.fire('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
                    }
                });
            }
        });
    };

    // บังคับพิมพ์ได้เฉพาะตัวเลขในช่อง Phone และ ID Card
    $('input[name="emp_phone"], input[name="emp_idcard"]').on('keypress', function(e) {
        if (e.which < 48 || e.which > 57) return false;
    });
});