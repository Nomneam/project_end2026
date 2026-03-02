/*!
 * user-role.js
 * Version 1.4 (Stable Production Ready)
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

        $('#edit_username').val($btn.data('username'));
        $('#edit_fname').val($btn.data('fname'));
        $('#edit_lname').val($btn.data('lname'));
        $('#edit_email').val($btn.data('email'));
        $('#edit_role').val($btn.data('role'));
        $('#edit_phone').val($btn.data('phone'));
        $('#edit_idcard').val($btn.data('idcard'));
        $('#edit_address').val($btn.data('address'));

        $('#editUserForm')
            .attr('action', '/user-role/edit/' + $btn.data('id'))
            .data('id', $btn.data('id'));

        $('#editModal').modal('show');
    };

    // ===============================
    // 3. Smart Real-time ID Card Check
    // ===============================

    let idCardAlertShown = false;

    $('input[name="emp_idcard"]').on('input', function () {

        const idcard = $(this).val().trim();

        if (idcard.length < 13) {
            idCardAlertShown = false;
            return;
        }

        if (idcard.length === 13 && !validateIDCard(idcard)) {

            if (!idCardAlertShown) {
                idCardAlertShown = true;

                Swal.fire({
                    icon: 'error',
                    title: 'เลขบัตรประชาชนไม่ถูกต้อง',
                    text: 'กรุณาตรวจสอบเลข 13 หลักอีกครั้ง',
                    confirmButtonColor: '#2563eb'
                });
            }

        } else {
            idCardAlertShown = false;
        }
    });

    // ===============================
    // 4. Form Submit with Validation
    // ===============================

    let isSubmitting = false;

    function validateForm($form) {

        const phone  = $form.find('input[name="emp_phone"]').val().trim();
        const idcard = $form.find('input[name="emp_idcard"]').val().trim();
        const email  = $form.find('input[name="emp_email"]').val().trim().toLowerCase();
        const empId  = $form.data('id') || null;

        // Email Required
        if (!email) {
            Swal.fire({
                icon: 'error',
                title: 'กรุณากรอกอีเมล',
                confirmButtonColor: '#2563eb'
            });
            return false;
        }

        // Email Format
        if (!validateEmail(email)) {
            Swal.fire({
                icon: 'error',
                title: 'รูปแบบอีเมลไม่ถูกต้อง',
                text: 'ตัวอย่างที่ถูกต้อง เช่น example@email.com',
                confirmButtonColor: '#2563eb'
            });
            return false;
        }

        // Phone Validate
        if (phone && phone !== "-" && !validatePhone(phone)) {
            Swal.fire({
                icon: 'error',
                title: 'เบอร์โทรศัพท์ไม่ถูกต้อง',
                text: 'กรุณากรอกให้ครบ 10 หลัก',
                confirmButtonColor: '#2563eb'
            });
            return false;
        }

        // ID Card Validate
        if (idcard.length !== 13 || !validateIDCard(idcard)) {
            Swal.fire({
                icon: 'error',
                title: 'เลขบัตรประชาชนไม่ถูกต้อง',
                text: 'กรุณากรอกเลข 13 หลักให้ถูกต้อง',
                confirmButtonColor: '#2563eb'
            });
            return false;
        }

        // Email Duplicate Check
        let emailExists = false;

        $('#userTable tbody tr').each(function () {
            const rowEmail = $(this).find('.user-email').text().trim().toLowerCase();
            const rowId = $(this).data('id');

            if (email === rowEmail && String(empId) !== String(rowId)) {
                emailExists = true;
                return false;
            }
        });

        if (emailExists) {
            Swal.fire({
                icon: 'error',
                title: 'Email ซ้ำ',
                text: 'มีผู้ใช้งานใช้อีเมลนี้แล้ว',
                confirmButtonColor: '#2563eb'
            });
            return false;
        }

        return true;
    }

    // 🔥 จับ form ใน modal ทั้งหมด ป้องกัน submit หลุด
    $('#addModal form, #editModal form').on('submit', function (e) {

        e.preventDefault();
        e.stopImmediatePropagation();

        if (isSubmitting) return false;

        const form = this;
        const $form = $(form);

        if (!validateForm($form)) return false;

        isSubmitting = true;

        Swal.fire({
            title: 'ยืนยันการบันทึกข้อมูล?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'ตกลง, บันทึก',
            cancelButtonText: 'ยกเลิก',
            reverseButtons: true
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
                    Swal.fire({
                        icon: 'success',
                        title: 'บันทึกสำเร็จ!',
                        showConfirmButton: false,
                        timer: 1500
                    }).then(() => location.reload());
                },
                error: function (xhr) {
                    isSubmitting = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'เกิดข้อผิดพลาด',
                        text: xhr.responseText || 'ไม่สามารถดำเนินการได้',
                        confirmButtonColor: '#2563eb'
                    });
                }
            });

        });

    });

    // ===============================
    // 5. Delete User
    // ===============================

    window.deleteUser = function (empId) {

        Swal.fire({
            title: 'คุณแน่ใจหรือไม่?',
            text: 'ผู้ใช้งานนี้จะถูกระงับการเข้าถึงระบบทันที',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'ใช่, ลบเลย',
            cancelButtonText: 'ยกเลิก',
            reverseButtons: true
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
    // 6. Restrict Numeric Input
    // ===============================

    $('input[name="emp_phone"], input[name="emp_idcard"]').on('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

});