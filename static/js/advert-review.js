$(function () {

    let currentAd = null;
    let currentRow = null;

    // เปิด modal
    $(document).on('click', '.btn-view', function () {

        currentAd = $(this).data('ad');
        currentRow = $(this).closest('tr');

        const imageUrl = currentAd.adv_image_url
            ? currentAd.adv_image_url
            : '/static/images/no-image.png';

        const price = (currentAd.adv_price || 0).toLocaleString();

        // ===============================
        // โฆษณารอตรวจสอบ (draft)
        // ===============================
        if (currentAd.status === 'draft') {

            $('#modalImage').attr('src', imageUrl);
            $('#modalName').text(currentAd.adv_name);
            $('#modalCustomer').text(`${currentAd.cus_fname} ${currentAd.cus_lname}`);
            $('#modalArea').text(currentAd.adc_cat_name || '-');
            $('#modalPrice').text(
                Number(currentAd.adv_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })
            );
            $('#modalDate').text(
                formatDate(currentAd.valid_from) + ' - ' +
                formatDate(currentAd.valid_to)
            );

            new bootstrap.Modal('#adDetailModal').show();

        } else {

            // ===============================
            // โฆษณาที่อนุมัติ / ปฏิเสธแล้ว
            // ===============================

            $('#approvedModalImage').attr('src', imageUrl);
            $('#approvedModalName').text(currentAd.adv_name);
            $('#approvedModalCustomer').text(`${currentAd.cus_fname} ${currentAd.cus_lname}`);
            $('#approvedModalArea').text(currentAd.adc_cat_name || '-');
            $('#approvedModalPrice').text(
                    Number(currentAd.adv_price || 0)
                        .toLocaleString('th-TH', { minimumFractionDigits: 2 })
                );

            let statusBadge = '';

            switch(currentAd.status) {
                case 'approved':
                    statusBadge = '<span class="badge bg-success">อนุมัติ</span>';
                    break;
                case 'rejected':
                    statusBadge = '<span class="badge bg-danger">ปฏิเสธ</span>';
                    break;
                case 'running':
                    statusBadge = '<span class="badge bg-info text-dark">กำลังแสดง</span>';
                    break;
                case 'paused':
                    statusBadge = '<span class="badge bg-dark">หยุดชั่วคราว</span>';
                    break;
                case 'expired':
                    statusBadge = '<span class="badge bg-secondary">หมดอายุ</span>';
                    break;
                default:
                    statusBadge = '<span class="badge bg-secondary">ร่าง</span>';
                    break;
            }

            $('#approvedModalStatus').html(statusBadge);

            new bootstrap.Modal('#adApprovedModal').show();
        }
    });

    // ===============================
    // Approve
    // ===============================
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
                        .then(() => location.reload());
                    } else {
                        Swal.fire('ผิดพลาด',res.message || 'เกิดข้อผิดพลาด','error');
                    }
                }
            });

        });
    });

    // ===============================
    // Reject
    // ===============================
    $('#btnReject').on('click', function () {

        if (!currentAd) return;

        // ✅ ปิด modal ด้านหลังก่อน
        const modalEl = document.getElementById('adDetailModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        setTimeout(() => {

            Swal.fire({
                title: 'ปฏิเสธโฆษณา',
                input: 'textarea',
                inputLabel: 'เหตุผลในการปฏิเสธ',
                inputPlaceholder: 'กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร...',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'ยืนยันปฏิเสธ',
                cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#dc3545',
                inputValidator: (value) => {
                    if (!value || value.trim().length < 5) {
                        return 'กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร';
                    }
                }
            }).then((result) => {

                if (!result.isConfirmed) return;

                fetch('/ad-review/reject', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        adv_id: currentAd.adv_id,
                        reason: result.value.trim()
                    })
                })
                .then(res => res.json())
                .then(res => {
                    if (res.status === 'success') {
                        Swal.fire('สำเร็จ','ปฏิเสธโฆษณาเรียบร้อย','success')
                        .then(() => location.reload());
                    } else {
                        Swal.fire('ผิดพลาด', res.message || 'เกิดข้อผิดพลาด','error');
                    }
                });

            });

        }, 300); // รอ modal ปิด animation
    });
    // ===============================
    // Helper format date
    // ===============================
    function formatDate(dateStr){
        if(!dateStr) return '-';
        const d = new Date(dateStr.replace(' ','T'));
        return d.toLocaleDateString('th-TH');
    }

});


$(document).on("click",".btn-pause",function(){

    const advId = $(this).data("id");

    Swal.fire({
        title: "หยุดโฆษณา?",
        text: "โฆษณาจะหยุดแสดงชั่วคราว",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "หยุดโฆษณา",
        cancelButtonText: "ยกเลิก"
    }).then(result=>{

        if(!result.isConfirmed) return;

        fetch("/ad-review/pause",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                adv_id:advId
            })
        })
        .then(res=>res.json())
        .then(res=>{

            if(res.status==="success"){
                Swal.fire(
                    "สำเร็จ",
                    "หยุดโฆษณาเรียบร้อย",
                    "success"
                ).then(()=>{
                    location.reload()
                })
            }

        })

    })

})