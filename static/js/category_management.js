$(document).ready(function () {

    // ======================================================
    // SweetAlert2 Preset (RED • CENTER • PROFESSIONAL)
    // ======================================================
    const SwalCenter = Swal.mixin({
        position: 'center',
        allowOutsideClick: false,
        allowEscapeKey: false,
        buttonsStyling: false,
        customClass: {
            popup: 'rounded-4 shadow-sm',
            confirmButton: 'btn btn-danger px-4',
            cancelButton: 'btn btn-outline-secondary px-4'
        }
    });

    const notifySuccess = (msg, timer = 1500) =>
        SwalCenter.fire({ icon: 'success', title: msg, showConfirmButton: false, timer });

    const notifyError = (msg) =>
        SwalCenter.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: msg });

    const notifyWarning = (msg) =>
        SwalCenter.fire({ icon: 'warning', title: 'แจ้งเตือน', text: msg });

    const showLoading = (msg = 'กำลังประมวลผล...') => {
        SwalCenter.fire({
            title: msg,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
    };

    const confirmAction = (title, text, confirmText = 'ยืนยัน') =>
        SwalCenter.fire({
            icon: 'warning',
            title,
            text,
            showCancelButton: true,
            confirmButtonText: confirmText,
            cancelButtonText: 'ยกเลิก'
        });

    // ======================================================
    // FIX: Close Swal before open modal
    // ======================================================
    $('[data-bs-toggle="modal"]').on('click', () => Swal.close());

    // ======================================================
    // Add Category
    // ======================================================
    $('#btnConfirmAdd').click(function () {
        const catName = $('input[name="cat_name"]').val().trim();
        if (!catName) return notifyWarning('กรุณาระบุชื่อหมวดหมู่หลัก');

        confirmAction(
            'ยืนยันการบันทึก',
            `ต้องการเพิ่มหมวดหมู่ "${catName}" ใช่หรือไม่?`,
            'บันทึกข้อมูล'
        ).then(res => {
            if (!res.isConfirmed) return;

            showLoading('กำลังบันทึกข้อมูล...');

            $.post('/add-category', { cat_name: catName })
                .done(res => {
                    res.success
                        ? notifySuccess('บันทึกข้อมูลเรียบร้อย')
                        : notifyError(res.message);

                    if (res.success) setTimeout(() => location.reload(), 1200);
                })
                .fail(() => notifyError('ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'));
        });
    });

    // ======================================================
    // Edit Category Modal
    // ======================================================
    $('#editCategoryModal').on('show.bs.modal', function (event) {
        const btn = $(event.relatedTarget);
        const catId = btn.data('id');
        const catName = btn.data('name');

        $('#editCatId').val(catId);
        $('#editCategoryName').val(catName).prop('readonly', true).addClass('bg-light');
        $('#unlockEditName').html('<i class="bi bi-pencil-fill text-danger"></i>');
        $('#newSubRowsContainer').empty();

        const $list = $('#editSubCategoriesList').html(`
            <div class="text-center py-3">
                <div class="spinner-border spinner-border-sm text-danger"></div>
            </div>
        `);

        $.getJSON(`/get-subcategories/${catId}`)
            .done(data => {
                $list.empty();
                if (!data || !data.length) {
                    $list.append('<p class="text-muted small text-center no-data-msg">ไม่มีประเภทย่อย</p>');
                } else {
                    data.forEach(sub => appendSubItem($list, sub.subcat_name, sub.subcat_id));
                }
            })
            .fail(() => notifyError('โหลดข้อมูลประเภทย่อยไม่สำเร็จ'));
    });

    // ======================================================
    // Unlock Category Name
    // ======================================================
    $(document).on('click', '#unlockEditName', function () {
        const $input = $('#editCategoryName');
        const locked = $input.prop('readonly');

        $input.prop('readonly', !locked).toggleClass('bg-light bg-white');
        $(this).html(
            locked
                ? '<i class="bi bi-unlock-fill text-danger"></i>'
                : '<i class="bi bi-pencil-fill text-danger"></i>'
        );

        if (locked) notifySuccess('ปลดล็อกการแก้ไขชื่อแล้ว');
    });

    // ======================================================
    // ADD NEW SUB ROW  ✅ (FIXED)
    // ======================================================
    $(document).on('click', '.add-row-btn', function () {
        $('#newSubRowsContainer').append(`
            <div class="input-group mb-2 dynamic-sub-row animate__animated animate__fadeIn">
                <input type="text" class="form-control new-sub-input" placeholder="ชื่อประเภทย่อยใหม่">
                <button type="button" class="btn btn-light text-danger confirm-row-btn">
                    <i class="bi bi-check-circle-fill"></i>
                </button>
                <button type="button" class="btn btn-light text-danger remove-row-btn">
                    <i class="bi bi-trash3-fill"></i>
                </button>
            </div>
        `);
        $('.new-sub-input').last().focus();
    });

    // Confirm new sub row
    $(document).on('click', '.confirm-row-btn', function () {
        const val = $(this).siblings('.new-sub-input').val().trim();
        if (!val) return notifyWarning('กรุณาระบุชื่อประเภทย่อย');

        $('.no-data-msg').remove();
        appendNewSubItem($('#editSubCategoriesList'), val);
        $(this).closest('.dynamic-sub-row').remove();
        notifySuccess(`เพิ่ม "${val}" แล้ว`);
    });

    // Remove row
    $(document).on('click', '.remove-row-btn', function () {
        $(this).closest('.dynamic-sub-row').remove();
    });

    // Delete existing sub
    $(document).on('click', '.delete-sub-btn', function () {
        $(this).closest('.sub-item-card').fadeOut(200, function () {
            $(this).remove();
        });
    });

    // ======================================================
    // Update Category
    // ======================================================
    $('#btnConfirmUpdate').click(function () {
        const data = {
            cat_id: $('#editCatId').val(),
            cat_name: $('#editCategoryName').val().trim(),
            'subs[]': $('#editSubCategoriesList .sub-text-val').map(function () {
                return $(this).text().trim();
            }).get()
        };

        if (!data.cat_name) return notifyWarning('ชื่อหมวดหมู่ต้องไม่ว่าง');

        confirmAction('บันทึกการเปลี่ยนแปลง', 'คุณต้องการอัปเดตข้อมูลใช่หรือไม่?', 'บันทึก')
            .then(res => {
                if (!res.isConfirmed) return;

                showLoading('กำลังอัปเดตข้อมูล...');

                $.post('/update-category', data)
                    .done(res => {
                        res.success
                            ? notifySuccess('อัปเดตข้อมูลเรียบร้อย')
                            : notifyError(res.message);

                        if (res.success) setTimeout(() => location.reload(), 1200);
                    })
                    .fail(() => notifyError('ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'));
            });
    });
});

// ======================================================
// Global Helpers
// ======================================================
function appendSubItem($container, text, id) {
    $container.append(`
        <div class="sub-item-card d-flex justify-content-between align-items-center p-3 mb-2 border rounded shadow-sm">
            <span class="sub-text-val fw-bold">
                <i class="bi bi-layers me-2 text-danger"></i>${text}
            </span>
            <button class="btn btn-sm text-danger delete-sub-btn p-0 border-0" data-id="${id}">
                <i class="bi bi-trash3-fill"></i>
            </button>
        </div>
    `);
}

function appendNewSubItem($container, text) {
    $container.append(`
        <div class="sub-item-card d-flex justify-content-between align-items-center p-3 mb-2 border border-danger rounded">
            <span class="sub-text-val fw-bold text-danger">
                <i class="bi bi-plus-square-fill me-2"></i>${text}
            </span>
            <small class="text-danger">รอการบันทึก</small>
        </div>
    `);
}

function deleteCategory(id) {
    Swal.fire({
        icon: 'warning',
        title: 'ยืนยันการลบหมวดหมู่',
        text: 'หมวดหมู่และประเภทย่อยทั้งหมดจะถูกซ่อนจากระบบ',
        showCancelButton: true,
        confirmButtonText: 'ลบข้อมูล',
        cancelButtonText: 'ยกเลิก',
        buttonsStyling: false,
        customClass: {
            confirmButton: 'btn btn-danger px-4',
            cancelButton: 'btn btn-outline-secondary px-4'
        }
    }).then(res => {
        if (!res.isConfirmed) return;

        Swal.fire({ title: 'กำลังลบ...', didOpen: () => Swal.showLoading() });

        $.post('/delete-category', { cat_id: id })
            .done(res => {
                res.success
                    ? Swal.fire({ icon: 'success', title: 'ลบเรียบร้อย', timer: 1200, showConfirmButton: false })
                          .then(() => location.reload())
                    : Swal.fire({ icon: 'error', title: 'ล้มเหลว', text: res.message });
            })
            .fail(() => Swal.fire({ icon: 'error', title: 'Error', text: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้' }));
    });
}
