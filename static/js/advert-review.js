$(function () {
    let currentAd = null;
    let currentDraftPage = Number($('#draftCard').data('current-page')) || 1;
    let currentApprovedPage = Number($('#approvedCard').data('current-page')) || 1;

    function debounce(fn, delay) {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function getDraftFilters() {
        return {
            draft_name: ($('#draftSearchName').val() || '').trim(),
            draft_category: $('#draftSearchCategory').val() || '',
            page_draft: currentDraftPage,
            approved_name: ($('#approvedSearchName').val() || '').trim(),
            approved_category: $('#approvedSearchCategory').val() || '',
            approved_status: $('#approvedSearchStatus').val() || '',
            page_approved: currentApprovedPage
        };
    }

    function getApprovedFilters() {
        return {
            draft_name: ($('#draftSearchName').val() || '').trim(),
            draft_category: $('#draftSearchCategory').val() || '',
            page_draft: currentDraftPage,
            approved_name: ($('#approvedSearchName').val() || '').trim(),
            approved_category: $('#approvedSearchCategory').val() || '',
            approved_status: $('#approvedSearchStatus').val() || '',
            page_approved: currentApprovedPage
        };
    }

    let currentRequest = null;

    function captureInputState() {
        const activeEl = document.activeElement;
        if (!activeEl || !activeEl.id) return null;

        const isSearchInput = activeEl.id === 'draftSearchName' || activeEl.id === 'approvedSearchName';
        if (!isSearchInput) return null;

        return {
            id: activeEl.id,
            value: activeEl.value,
            selectionStart: activeEl.selectionStart,
            selectionEnd: activeEl.selectionEnd
        };
    }

    function restoreInputState(state) {
        if (!state) return;

        const input = document.getElementById(state.id);
        if (!input) return;

        input.focus();
        if (typeof state.selectionStart === 'number' && typeof state.selectionEnd === 'number') {
            input.setSelectionRange(state.selectionStart, state.selectionEnd);
        }
    }

    function fetchPage(params, section) {
        const inputState = captureInputState();

        if (currentRequest && currentRequest.readyState !== 4) {
            currentRequest.abort();
        }

        currentRequest = $.ajax({
            url: '/ad-review',
            method: 'GET',
            data: params,
            dataType: 'html',
            success: function (html) {
                const $html = $('<div>').html(html);

                if (section === 'draft' || section === 'all') {
                    const $newDraft = $html.find('#draftCard');
                    if ($newDraft.length) {
                        $('#draftCard').replaceWith($newDraft);
                        currentDraftPage = Number($newDraft.data('current-page')) || 1;
                    }
                }

                if (section === 'approved' || section === 'all') {
                    const $newApproved = $html.find('#approvedCard');
                    if ($newApproved.length) {
                        $('#approvedCard').replaceWith($newApproved);
                        currentApprovedPage = Number($newApproved.data('current-page')) || 1;
                    }
                }

                restoreInputState(inputState);
            },
            error: function (_xhr, status) {
                if (status === 'abort') return;
                Swal.fire('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง', 'error');
            }
        });
    }

    const debouncedDraftSearch = debounce(function () {
        currentDraftPage = 1;
        fetchPage(getDraftFilters(), 'draft');
    }, 350);

    const debouncedApprovedSearch = debounce(function () {
        currentApprovedPage = 1;
        fetchPage(getApprovedFilters(), 'approved');
    }, 350);

    function preventEnterSubmit(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    // ===============================
    // Draft filters + pagination
    // ===============================
    $(document).on('keydown', '#draftSearchName', preventEnterSubmit);
    $(document).on('input', '#draftSearchName', debouncedDraftSearch);

    $(document).on('change', '#draftSearchCategory', function () {
        currentDraftPage = 1;
        fetchPage(getDraftFilters(), 'draft');
    });

    $(document).on('click', '#draftClearFilters', function () {
        $('#draftSearchName').val('');
        $('#draftSearchCategory').val('');
        currentDraftPage = 1;
        fetchPage(getDraftFilters(), 'draft');
    });

    $(document).on('click', '.draft-page-link', function (e) {
        e.preventDefault();
        currentDraftPage = Number($(this).data('page')) || 1;
        fetchPage(getDraftFilters(), 'draft');
    });

    // ===============================
    // Approved filters + pagination
    // ===============================
    $(document).on('keydown', '#approvedSearchName', preventEnterSubmit);
    $(document).on('input', '#approvedSearchName', debouncedApprovedSearch);

    $(document).on('change', '#approvedSearchCategory, #approvedSearchStatus', function () {
        currentApprovedPage = 1;
        fetchPage(getApprovedFilters(), 'approved');
    });

    $(document).on('click', '#approvedClearFilters', function () {
        $('#approvedSearchName').val('');
        $('#approvedSearchCategory').val('');
        $('#approvedSearchStatus').val([]);
        currentApprovedPage = 1;
        fetchPage(getApprovedFilters(), 'approved');
    });

    $(document).on('click', '.approved-page-link', function (e) {
        e.preventDefault();
        currentApprovedPage = Number($(this).data('page')) || 1;
        fetchPage(getApprovedFilters(), 'approved');
    });

    // ===============================
    // เปิด modal
    // ===============================
    $(document).on('click', '.btn-view', function () {
        currentAd = $(this).data('ad');

        const imageUrl = currentAd.adv_image_url
            ? currentAd.adv_image_url
            : '/static/images/no-image.png';

        if (currentAd.status === 'draft') {
            $('#modalImage').attr('src', imageUrl);
            $('#modalName').text(currentAd.adv_name);
            $('#modalCustomer').text(`${currentAd.cus_fname} ${currentAd.cus_lname}`);
            $('#modalArea').text(currentAd.adc_cat_name || '-');
            $('#modalPrice').text(Number(currentAd.adv_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }));
            $('#modalDate').text(formatDate(currentAd.valid_from) + ' - ' + formatDate(currentAd.valid_to));

            new bootstrap.Modal('#adDetailModal').show();
        } else {
            $('#approvedModalImage').attr('src', imageUrl);
            $('#approvedModalName').text(currentAd.adv_name);
            $('#approvedModalCustomer').text(`${currentAd.cus_fname} ${currentAd.cus_lname}`);
            $('#approvedModalArea').text(currentAd.adc_cat_name || '-');
            $('#approvedModalPrice').text(Number(currentAd.adv_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }));

            let statusBadge = '';
            switch (currentAd.status) {
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
                    statusBadge = '<span class="badge bg-secondary">ไม่ทราบสถานะ</span>';
            }

            $('#approvedModalStatus').html(statusBadge);
            new bootstrap.Modal('#adApprovedModal').show();
        }
    });

    // ===============================
    // Approve
    // ===============================
    $(document).on('click', '#btnApprove', function () {
    if (!currentAd) return;

    // ปิด modal ก่อน
    const modalEl = document.getElementById('adDetailModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

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
            success: function (res) {
                if (res.status === 'success') {
                    Swal.fire('สำเร็จ', 'อนุมัติโฆษณาเรียบร้อย', 'success').then(() => {
                        fetchPage(getDraftFilters(), 'all');
                    });
                } else {
                    Swal.fire('ผิดพลาด', res.message || 'เกิดข้อผิดพลาด', 'error');
                }
            }
        });
    });
});

    // ===============================
    // Reject
    // ===============================
    $(document).on('click', '#btnReject', function () {
        if (!currentAd) return;

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
                            Swal.fire('สำเร็จ', 'ปฏิเสธโฆษณาเรียบร้อย', 'success').then(() => {
                                fetchPage(getDraftFilters(), 'all');
                            });
                        } else {
                            Swal.fire('ผิดพลาด', res.message || 'เกิดข้อผิดพลาด', 'error');
                        }
                    });
            });
        }, 300);
    });

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(String(dateStr).replace(' ', 'T'));
        return d.toLocaleDateString('th-TH');
    }

    $(document).on('click', '.btn-pause', function () {
    const advId = $(this).data('id');

    Swal.fire({
        title: 'หยุดโฆษณา',
        input: 'textarea',
        inputLabel: 'เหตุผลในการหยุด',
        inputPlaceholder: 'กรุณาระบุเหตุผล...',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'หยุดโฆษณา',
        cancelButtonText: 'ยกเลิก',
        inputValidator: (value) => {
            if (!value || value.trim().length < 3) {
                return 'กรุณาระบุเหตุผล';
            }
        }
    }).then(result => {
        if (!result.isConfirmed) return;

        fetch('/ad-review/pause', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                adv_id: advId,
                reason: result.value.trim()
            })
        })
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                Swal.fire('สำเร็จ', 'หยุดโฆษณาเรียบร้อย', 'success').then(() => {
                    fetchPage(getApprovedFilters(), 'approved');
                });
            }
        });
    });
});
});

