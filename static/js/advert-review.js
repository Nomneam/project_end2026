$(function () {

    let currentAd = null;
    let currentRow = null;

    // เปิด modal
    $(document).on('click', '.btn-view', function () {
        currentAd = $(this).data('ad');
        currentRow = $(this).closest('tr');

        if (currentAd.status === 'submitted') {
            // modal สำหรับรอตรวจสอบ
            $('#modalImage').attr(`src`, `https://picsum.photos/seed/ad${currentAd.adv_id}/600/300`);
            $('#modalName').text(currentAd.adv_name);
            $('#modalCustomer').text(`${currentAd.cus_fname} ${currentAd.cus_lname}`);
            $('#modalCategory').text(currentAd.adc_cat_name || '-');
            $('#modalArea').text(currentAd.advert_area_name || '-');
            $('#modalPrice').text((currentAd.total_amount || 0).toLocaleString());
            $('#modalDate').text(formatDate(currentAd.valid_from) + ' - ' + formatDate(currentAd.valid_to));

            new bootstrap.Modal('#adDetailModal').show();

        } else {
            // modal สำหรับอนุมัติ/ปฏิเสธแล้ว
            $('#approvedModalImage').attr(`src`, `https://picsum.photos/seed/ad${currentAd.adv_id}/600/300`);
            $('#approvedModalName').text(currentAd.adv_name);
            $('#approvedModalCustomer').text(`${currentAd.cus_fname} ${currentAd.cus_lname}`);
            $('#approvedModalCategory').text(currentAd.adc_cat_name || '-');
            $('#approvedModalArea').text(currentAd.advert_area_name || '-');
            $('#approvedModalPrice').text((currentAd.total_amount || 0).toLocaleString());
            $('#approvedModalDate').text(formatDate(currentAd.valid_from) + ' - ' + formatDate(currentAd.valid_to));

            let statusBadge = '';
            switch(currentAd.status) {
                case 'approved': statusBadge = '<span class="badge bg-success">อนุมัติ</span>'; break;
                case 'rejected': statusBadge = '<span class="badge bg-danger">ปฏิเสธ</span>'; break;
                case 'running': statusBadge = '<span class="badge bg-info text-dark">กำลังแสดง</span>'; break;
                case 'paused': statusBadge = '<span class="badge bg-dark">หยุดชั่วคราว</span>'; break;
                case 'expired': statusBadge = '<span class="badge bg-secondary">หมดอายุ</span>'; break;
                default: statusBadge = '<span class="badge bg-secondary">ร่าง</span>'; break;
            }
            $('#approvedModalStatus').html(statusBadge);

            new bootstrap.Modal('#adApprovedModal').show();
        }
    });

    // Approve
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
                method: 'POST',
                data: JSON.stringify({ adv_id: currentAd.adv_id }),
                contentType: 'application/json',
                dataType: 'json',
                success: function(res){
                    if(res.status === 'success'){
                        Swal.fire('สำเร็จ','อนุมัติโฆษณาเรียบร้อย','success')
                        .then(() => {
                            // reload หน้าอัตโนมัติ
                            location.reload();
                        });
                    } else {
                        Swal.fire('ผิดพลาด',res.message||'เกิดข้อผิดพลาด','error');
                    }
                }
            });

        });
    });

    // Reject
    $('#btnReject').on('click', function () {
        if (!currentAd) return;

        Swal.fire({
            title: 'ปฏิเสธโฆษณา',
            html: `<textarea id="rejectReason" class="swal2-textarea" placeholder="ระบุเหตุผล"></textarea>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันปฏิเสธ',
            confirmButtonColor: '#dc3545',
            preConfirm: () => {
                const reason = $('#rejectReason').val().trim();
                if(!reason) Swal.showValidationMessage('กรุณาระบุเหตุผล');
                return reason;
            }
        }).then(result => {
            if(!result.isConfirmed) return;

            $.ajax({
                url: '/ad-review/reject',
                method: 'POST',
                data: JSON.stringify({ adv_id: currentAd.adv_id, reason: result.value }),
                contentType: 'application/json',
                dataType: 'json',
                success: function(res){
                    if(res.status === 'success'){
                        Swal.fire('สำเร็จ','ปฏิเสธโฆษณาเรียบร้อย','success')
                        .then(() => {
                            // reload หน้าอัตโนมัติ
                            location.reload();
                        });
                    } else {
                        Swal.fire('ผิดพลาด',res.message||'เกิดข้อผิดพลาด','error');
                    }
                }
            });

        });
    });

    // Helper format date
    function formatDate(dateStr){
        if(!dateStr) return '-';
        const d = new Date(dateStr.replace(' ','T'));
        return d.toLocaleDateString('th-TH');
    }

});
