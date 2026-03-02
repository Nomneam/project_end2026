/*!
 * user-role.js
 * Version 1.6 (Production Ready - Fixed Duplicate Check)
 */

$(document).ready(function () {

    // ===============================
    // 1. Validation Logic
    // ===============================

    function validatePhone(phone) {
        return /^[0-9]{10}$/.test(phone);
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
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
        $('#addUserForm')[0].reset();
        $('#addUserForm').data('id', null);
    };

    window.openEditModal = function (btn) {

        const $btn = $(btn);

        $('#edit_username').val($btn.attr('data-username') || '');
        $('#edit_fname').val($btn.attr('data-fname') || '');
        $('#edit_lname').val($btn.attr('data-lname') || '');
        $('#edit_email').val($btn.attr('data-email') || '');
        $('#edit_role').val($btn.attr('data-role') || '');
        $('#edit_phone').val($btn.attr('data-phone') || '');
        $('#edit_idcard').val($btn.attr('data-idcard') || '');
        $('#edit_address').val($btn.attr('data-address') || '');

        $('#editUserForm')
            .attr('action', '/user-role/edit/' + $btn.attr('data-id'))
            .data('id', $btn.attr('data-id'));

        $('#editModal').modal('show');
    };

    // ===============================
    // 3. Smart Real-time ID Check
    // ===============================

    let idCardAlertShown = false;

    $('input[name="emp_idcard"]').on('input', function () {

        const idcard = $(this).val().trim();

        if (!idcard) {
            idCardAlertShown = false;
            return;
        }

        if (idcard.length === 13 && !validateIDCard(idcard)) {

            if (!idCardAlertShown) {
                idCardAlertShown = true;

                Swal.fire({
                    icon: 'error',
                    title: 'เลขบัตรประชาชนไม่ถูกต้อง',
                    text: 'กรุณาตรวจสอบเลข 13 หลักอีกครั้ง'
                });
            }

        } else {
            idCardAlertShown = false;
        }
    });

    // ===============================
    // 4. Strict Form Validation
    // ===============================

    let isSubmitting = false;

    function validateForm($form) {

        const phone  = ($form.find('input[name="emp_phone"]').val() || '').trim();
        const idcard = ($form.find('input[name="emp_idcard"]').val() || '').trim();
        const email  = ($form.find('input[name="emp_email"]').val() || '').trim().toLowerCase();
        const empId  = $form.data('id') || null;

        if (!email) {
            Swal.fire('ผิดพลาด', 'กรุณากรอกอีเมล', 'error');
            return false;
        }

        if (!validateEmail(email)) {
            Swal.fire('ผิดพลาด', 'รูปแบบอีเมลไม่ถูกต้อง', 'error');
            return false;
        }

        if (phone && !validatePhone(phone)) {
            Swal.fire('ผิดพลาด', 'เบอร์โทรศัพท์ต้อง 10 หลัก', 'error');
            return false;
        }

        if (idcard && (idcard.length !== 13 || !validateIDCard(idcard))) {
            Swal.fire('ผิดพลาด', 'เลขบัตรประชาชนไม่ถูกต้อง', 'error');
            return false;
        }

        // ===============================
        // FIXED: Email Duplicate Check
        // ===============================

        let emailExists = false;

        $('button[data-email]').each(function () {

            const rowEmail = ($(this).attr('data-email') || '').trim().toLowerCase();
            const rowId = $(this).attr('data-id');

            if (email === rowEmail && String(empId) !== String(rowId)) {
                emailExists = true;
                return false;
            }
        });

        if (emailExists) {
            Swal.fire('ผิดพลาด', 'มีผู้ใช้งานใช้อีเมลนี้แล้ว', 'error');
            return false;
        }

        return true;
    }

    // ===============================
    // 5. Submit Lock
    // ===============================

    $('#addModal form, #editModal form').on('submit', function (e) {

        e.preventDefault();
        e.stopImmediatePropagation();

        if (isSubmitting) return false;

        const $form = $(this);

        if (!validateForm($form)) return false;

        isSubmitting = true;

        Swal.fire({
            title: 'ยืนยันการบันทึกข้อมูล?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {

            if (!result.isConfirmed) {
                isSubmitting = false;
                return;
            }

            Swal.fire({
                title: 'กำลังบันทึก...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            $.ajax({
                url: $form.attr('action'),
                method: $form.attr('method') || 'POST',
                data: $form.serialize(),
                success: function () {
                    Swal.fire('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว', 'success')
                        .then(() => location.reload());
                },
                error: function (xhr) {
                    isSubmitting = false;
                    Swal.fire('ผิดพลาด', xhr.responseText || 'ไม่สามารถบันทึกได้', 'error');
                }
            });

        });

    });

    // ===============================
    // 6. Delete User
    // ===============================

    window.deleteUser = function (empId) {

        Swal.fire({
            title: 'คุณแน่ใจหรือไม่?',
            text: 'ผู้ใช้งานนี้จะถูกระงับการเข้าถึงระบบทันที',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ใช่, ลบเลย',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {

            if (result.isConfirmed) {

                $.post('/user-role/delete/' + empId)
                    .done(function (res) {
                        if (res.status === 'success') {
                            Swal.fire('สำเร็จ!', 'ข้อมูลถูกลบเรียบร้อยแล้ว', 'success')
                                .then(() => location.reload());
                        } else {
                            Swal.fire('ผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
                        }
                    })
                    .fail(function () {
                        Swal.fire('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
                    });
            }
        });
    };

    // ===============================
    // 7. Restrict Numeric Input
    // ===============================

    $('input[name="emp_phone"], input[name="emp_idcard"]').on('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

});