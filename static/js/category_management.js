$(document).ready(function() {
    /**
     * === 1. การจัดการ Modal แก้ไข (โหลดข้อมูลเดิมเข้าสู่ส่วนบน) ===
     * ดึงข้อมูลชื่อหมวดหมู่และรายการประเภทย่อยปัจจุบันมาแสดงผล
     */
    $('#editCategoryModal').on('show.bs.modal', function(event) {
        const button = $(event.relatedTarget);
        const catId = button.data('id');
        const catName = button.data('name');
        
        const modal = $(this);
        modal.find('#editCatId').val(catId);
        modal.find('#editCategoryName').val(catName);

        const $list = $('#editSubCategoriesList');
        // แสดง Spinner ระหว่างรอโหลดข้อมูลจาก API
        $list.html('<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-danger"></div></div>');
        
        // ล้างแถวกรอกข้อมูลใหม่ที่อาจค้างอยู่ในส่วนล่าง
        $('#newSubRowsContainer').empty(); 

        // เรียกข้อมูลจาก API (Flask Route)
        $.getJSON(`/get-subcategories/${catId}`)
            .done(function(data) {
                $list.empty();
                let subData = data.subcategories || data;

                if (!subData || subData.length === 0) {
                    $list.append('<p class="text-muted small text-center py-2">ไม่มีประเภทย่อยในขณะนี้</p>');
                } else {
                    subData.forEach(sub => {
                        const name = sub.subcat_name || sub.name || '';
                        const id = sub.subcat_id || sub.id || null;
                        // แสดงรายการเดิมพร้อมไอคอนถังขยะสีแดง
                        appendSubItem($list, name, id);
                    });
                }
            })
            .fail(function() {
                $list.html('<p class="text-danger small text-center py-2">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>');
            });
    });

    /**
     * === 2. การจัดการส่วนเพิ่มข้อมูลใหม่ (Dynamic Rows ในส่วนล่าง) ===
     * สร้างแถวสำหรับกรอกข้อมูลใหม่พร้อมปุ่ม ยืนยัน และ ลบทิ้ง
     */
    $('.add-row-btn').click(function() {
        const rowHtml = `
            <div class="input-group mb-2 dynamic-sub-row animate__animated animate__fadeIn">
                <input type="text" class="form-control shadow-none new-sub-input" 
                       placeholder="ระบุชื่อประเภทย่อยใหม่..." 
                       style="border-radius: 12px 0 0 12px; border: 1px solid #e9ecef; background-color: #f8f9fa; padding: 12px 20px;">
                <button class="btn btn-light text-success border-top border-bottom px-3 confirm-row-btn shadow-none" 
                        type="button" style="background-color: #f8f9fa; border-color: #e9ecef;">
                    <i class="bi bi-check-circle-fill" style="font-size: 1.1rem;"></i>
                </button>
                <button class="btn btn-light text-danger border px-3 remove-row-btn shadow-none" 
                        type="button" style="border-radius: 0 12px 12px 0; background-color: #f8f9fa; border-color: #e9ecef;">
                    <i class="bi bi-trash3-fill"></i>
                </button>
            </div>`;
        $('#newSubRowsContainer').append(rowHtml);
        $('#newSubRowsContainer .new-sub-input').last().focus();
    });

    // ลบแถวกรอกข้อมูลที่เพิ่งสร้างขึ้นใหม่ (เฉพาะในหน้า UI)
    $(document).on('click', '.remove-row-btn', function() {
        $(this).closest('.dynamic-sub-row').fadeOut(200, function() { 
            $(this).remove(); 
        });
    });

    // เมื่อกดยืนยัน (เช็คถูก) หรือกด Enter จะย้ายข้อมูลจากส่วนล่างขึ้นไปส่วนบน
    $(document).on('click', '.confirm-row-btn', function() {
        const $input = $(this).siblings('.new-sub-input');
        const val = $input.val().trim();
        if (val) {
            // ส่งข้อมูลขึ้นไปแสดงใน List ส่วนบนพร้อมสถานะเตรียมบันทึก
            appendNewSubItem($('#editSubCategoriesList'), val);
            $(this).closest('.dynamic-sub-row').remove();
        }
    });

    $(document).on('keypress', '.new-sub-input', function(e) {
        if(e.which == 13) { // ปุ่ม Enter
            e.preventDefault();
            $(this).siblings('.confirm-row-btn').click();
        }
    });

    /**
     * === 3. การส่งข้อมูลไปบันทึกที่ Backend ===
     * รวบรวมข้อมูลทั้งหมดทั้งของเดิมและของใหม่ส่งไปที่ Flask
     */
    $('#btnConfirmUpdate').click(function() {
        const subs = [];
        // เก็บรายชื่อประเภทย่อยทั้งหมดจาก List หลักด้านบน
        $('#editSubCategoriesList .sub-text-val').each(function() {
            subs.push($(this).text().trim());
        });

        const data = {
            id: $('#editCatId').val(),
            name: $('#editCategoryName').val(),
            'subs[]': subs // ส่งเป็น Array เพื่อให้ง่ายต่อการบันทึกข้อมูล
        };

        Swal.fire({ 
            title: 'กำลังบันทึกข้อมูล...', 
            allowOutsideClick: false, 
            didOpen: () => Swal.showLoading() 
        });

        $.post('/update-category', data)
            .done(function() {
                Swal.fire({ 
                    icon: 'success', 
                    title: 'อัปเดตข้อมูลสำเร็จ', 
                    timer: 1500, 
                    showConfirmButton: false 
                }).then(() => location.reload());
            })
            .fail(() => {
                Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับระบบได้', 'error');
            });
    });

    /**
     * === 4. ฟังก์ชันจัดการรายการประเภทย่อย (UI) ===
     */
    $(document).on('click', '.delete-sub-btn', function() {
        const $item = $(this).closest('.sub-item-card');
        Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "ประเภทย่อยนี้จะหายไปหลังจากกดบันทึกการเปลี่ยนแปลง",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#db3741',
            confirmButtonText: 'ลบรายการ',
            cancelButtonText: 'ยกเลิก'
        }).then(res => {
            if (res.isConfirmed) {
                $item.fadeOut(300, function() { $(this).remove(); });
            }
        });
    });
});

/**
 * ฟังก์ชันสร้างรายการ "เดิม" (สไตล์การ์ดสีขาว พร้อมไอคอนถังขยะสีแดง)
 */
function appendSubItem($container, text, id) {
    const html = `
        <div class="sub-item-card animate__animated animate__fadeIn shadow-sm" 
             style="background-color: #ffffff; border: 1px solid #f1f2f4; border-radius: 12px; padding: 12px 18px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span class="sub-text-val fw-bold" style="color: #40444d; font-size: 0.9rem;">${text}</span>
            <button type="button" class="btn btn-sm text-danger border-0 p-0 delete-sub-btn" data-id="${id}">
                <i class="bi bi-trash3-fill" style="font-size: 1.1rem;"></i>
            </button>
        </div>`;
    $container.append(html);
}

/**
 * ฟังก์ชันสร้างรายการ "ใหม่" (สไตล์การ์ดสีเขียว แสดงสถานะเตรียมเพิ่ม)
 */
function appendNewSubItem($container, text) {
    const html = `
        <div class="sub-item-card animate__animated animate__fadeIn" 
             style="border-left: 5px solid #48bb78; background-color: #f0fff4; border-radius: 12px; padding: 12px 18px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span class="sub-text-val fw-bold" style="color: #2f855a; font-size: 0.9rem;">${text}</span>
            <div class="text-success d-flex align-items-center">
                <small class="me-2 fw-bold" style="font-size: 0.75rem;">เตรียมเพิ่ม</small>
                <i class="bi bi-check-circle-fill" style="font-size: 1.2rem;"></i>
            </div>
        </div>`;
    $container.append(html);
}