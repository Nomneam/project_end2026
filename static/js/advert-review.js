$(function () {

    let currentAd = null;   // โฆษณาที่กำลังดู
    let currentRow = null; // แถวในตารางที่กดมา

    /* ==========================
       เปิด Modal ดูรายละเอียด
    ========================== */
    $(document).on('click', '.btn-view', function () {
        currentAd = $(this).data('ad');
        currentRow = $(this).closest('tr');

        // รูปตัวอย่าง
        $('#modalImage').attr(
            'src',
            `https://picsum.photos/seed/ad${currentAd.adv_id}/600/300`
        );

        // ข้อมูลโฆษณา
        $('#modalName').text(currentAd.adv_name);
        $('#modalCustomer').text(
            `${currentAd.cus_fname} ${currentAd.cus_lname}`
        );
        $('#modalCategory').text(currentAd.adc_cat_name || '-');
        $('#modalArea').text(currentAd.advert_area_name || '-');
        $('#modalPrice').text(
            (currentAd.total_amount || 0).toLocaleString()
        );
        $('#modalDate').text(
            formatDate(currentAd.valid_from) +
            ' - ' +
            formatDate(currentAd.valid_to)
        );

        new bootstrap.Modal('#adDetailModal').show();
    });


    /* ==========================
       อนุมัติโฆษณา
    ========================== */
    $('#btnApprove').on('click', function () {
        if (!currentAd) return;

        Swal.fire({
            title: 'ยืนยันการอนุมัติ',
            html: `อนุมัติโฆษณา <b>${currentAd.adv_name}</b> ใช่หรือไม่`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'อนุมัติ',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#198754'
        }).then(result => {
            if (!result.isConfirmed) return;

            $.ajax({
                url: '/ad-review/approve',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    adv_id: currentAd.adv_id
                }),
                success: (res) => {
                    if (res.status === 'success') {
                        Swal.fire('สำเร็จ', 'อนุมัติโฆษณาเรียบร้อย', 'success');

                        bootstrap.Modal
                            .getInstance(document.getElementById('adDetailModal'))
                            .hide();

                        currentRow.fadeOut(300, function () {
                            $(this).remove();
                        });
                    } else {
                        Swal.fire('ผิดพลาด', res.message || 'เกิดข้อผิดพลาด', 'error');
                    }
                },
                error: () => {
                    Swal.fire('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
                }
            });
        });
    });


    /* ==========================
       ปฏิเสธโฆษณา
    ========================== */
    $('#btnReject').on('click', function () {
        if (!currentAd) return;

        Swal.fire({
            title: 'ปฏิเสธโฆษณา',
            html: `
                <p>ปฏิเสธ <b>${currentAd.adv_name}</b></p>
                <textarea id="rejectReason"
                    class="swal2-textarea"
                    placeholder="ระบุเหตุผล"></textarea>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันปฏิเสธ',
            confirmButtonColor: '#dc3545',
            preConfirm: () => {
                const reason = $('#rejectReason').val().trim();
                if (!reason) {
                    Swal.showValidationMessage('กรุณาระบุเหตุผล');
                }
                return reason;
            }
        }).then(result => {
            if (!result.isConfirmed) return;

            $.ajax({
                url: '/ad-review/reject',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    adv_id: currentAd.adv_id,
                    reason: result.value
                }),
                success: (res) => {
                    if (res.status === 'success') {
                        Swal.fire('สำเร็จ', 'ปฏิเสธโฆษณาเรียบร้อย', 'success');

                        bootstrap.Modal
                            .getInstance(document.getElementById('adDetailModal'))
                            .hide();

                        currentRow.fadeOut(300, function () {
                            $(this).remove();
                        });
                    } else {
                        Swal.fire('ผิดพลาด', res.message || 'เกิดข้อผิดพลาด', 'error');
                    }
                },
                error: () => {
                    Swal.fire('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
                }
            });
        });
    });


    /* ==========================
       Helper: format date
    ========================== */
    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr.replace(' ', 'T'));
        return d.toLocaleDateString('th-TH');
    }

});
