/*!
 * user-role.js
 * เวอร์ชัน 1.1
 * จัดการ User & Role: Add, Edit, Delete พร้อม Validation
 * เพิ่ม Check Email ซ้ำแบบไม่ต้อง AJAX
 */

$(document).ready(function () {

    // ===============================
    // 1. Validation Logic
    // ===============================
    function validatePhone(phone) {
        return /^[0-9]{10}$/.test(phone);
    }

    function validateIDCard(id) {
        if (!/^[0-9]{13}$/.test(id)) return false;

        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(id.charAt(i)) * (13 - i);
        }

        let check = (11 - (sum % 11)) % 10;
        return check === parseInt(id.charAt(12));
    }

    // ===============================
    // 2. Modal Management
    // ===============================
    window.showAddModal = function () {
        $('#addModal').modal('show');
        $('#addUserForm').data('id', null); // reset id for new user
    };

    window.openEditModal = function (btn) {
        const $btn = $(btn);

        // Fill edit modal with data
        $('#edit_username').val($btn.data('username'));
        $('#edit_fname').val($btn.data('fname'));
        $('#edit_lname').val($btn.data('lname'));
        $('#edit_email').val($btn.data('email'));
        $('#edit_role').val($btn.data('role'));
        $('#edit_phone').val($btn.data('phone'));
        $('#edit_idcard').val($btn.data('idcard'));
        $('#edit_address').val($btn.data('address'));

        // Set form action and data-id
        $('#editUserForm').attr('action', '/user-role/edit/' + $btn.data('id'));
        $('#editUserForm').data('id', $btn.data('id'));

        $('#editModal').modal('show');
    };

    // ===============================
    // 3. Form Submit with Validation & Email Check
    // ===============================
    $('.swal-submit').on('submit', function (e) {
        e.preventDefault();

        const form = this;
        const $form = $(form);
        const phone = $form.find('input[name="emp_phone"]').val();
        const idcard = $form.find('input[name="emp_idcard"]').val();
        const email = $form.find('input[name="emp_email"]').val().trim();
        const empId = $form.data('id') || null; // null if adding new user

        // --- Phone Validation ---
        if (phone && phone !== "-" && !validatePhone(phone)) {
            Swal.fire({
                icon: 'error',
                title: 'เบอร์โทรศัพท์ไม่ถูกต้อง',
                text: 'กรุณากรอกตัวเลขให้ครบ 10 หลัก',
                confirmButtonColor: '#2563eb'
            });
            return false;
        }

        // --- ID Card Validation ---
        if (idcard && idcard !== "" && !validateIDCard(idcard)) {
            Swal.fire({
                icon: 'error',
                title: 'เลขบัตรประชาชนไม่ถูกต้อง',
                text: 'กรุณาตรวจสอบความถูกต้องของเลข 13 หลักตามรูปแบบมาตรฐาน',
                confirmButtonColor: '#2563eb'
            });
            return false;
        }

        // --- Email Check from Table ---
        let emailExists = false;
        $('#userTable tbody tr').each(function () {
            const rowEmail = $(this).find('.user-email').text().trim();
            const rowId = $(this).data('id');

            if (email === rowEmail && empId != rowId) {
                emailExists = true;
                return false; // break loop
            }
        });

        if (emailExists) {
            Swal.fire({
                icon: 'error',
                title: 'Email ซ้ำ',
                text: 'มีผู้ใช้งานใช้อีเมลนี้แล้ว กรุณาเปลี่ยนใหม่',
                confirmButtonColor: '#2563eb'
            });
            return false;
        }

        // --- Confirm Submit ---
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

                // Show loading
                Swal.fire({
                    title: 'กำลังบันทึก...',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });

                // AJAX Submit
                $.ajax({
                    url: $form.attr('action'),
                    method: $form.attr('method') || 'POST',
                    data: $form.serialize(),
                    success: function(res) {
                        Swal.fire({
                            icon: 'success',
                            title: 'บันทึกสำเร็จ!',
                            showConfirmButton: false,
                            timer: 1500
                        }).then(() => {
                            location.reload();
                        });
                    },
                    error: function(xhr) {
                        Swal.fire({
                            icon: 'error',
                            title: 'ผิดพลาด',
                            text: xhr.responseText || 'เกิดข้อผิดพลาด',
                            confirmButtonColor: '#2563eb'
                        });
                    }
                });
            }
        });
    });

    // ===============================
    // 4. Delete User Function
    // ===============================
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
                    error: function () {
                        Swal.fire('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
                    }
                });
            }
        });
    };

    // ===============================
    // 5. Restrict input: Phone & ID Card
    // ===============================
    $('input[name="emp_phone"], input[name="emp_idcard"]').on('keypress', function (e) {
        if (e.which < 48 || e.which > 57) return false;
    });

});
