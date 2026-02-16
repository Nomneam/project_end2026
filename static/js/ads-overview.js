const pageSize = 5;
    let currentPage = 1;

    const adsData = [
      { id: 1,  name: "PTT Energy Hero Banner", brand: "PTT", placement: "Hero Banner", status: "running", start: "2026-02-01", end: "2026-02-29", impressions: 980000, clicks: 34500, thumb: "https://images.pexels.com/photos/3855962/pexels-photo-3855962.jpeg?auto=compress&cs=tinysrgb&w=1200" },
      { id: 2,  name: "SCB Finance Top Bar", brand: "SCB", placement: "Top Strip", status: "running", start: "2026-01-20", end: "2026-03-20", impressions: 720000, clicks: 22000, thumb: "https://images.pexels.com/photos/4968391/pexels-photo-4968391.jpeg?auto=compress&cs=tinysrgb&w=1200" },
      { id: 3,  name: "Lazada Mega Sale", brand: "Lazada", placement: "Homepage Carousel", status: "pending", start: "2026-02-18", end: "2026-03-05", impressions: 0, clicks: 0, thumb: "https://images.pexels.com/photos/5632405/pexels-photo-5632405.jpeg?auto=compress&cs=tinysrgb&w=1200" },
      { id: 4,  name: "Shopee 2.2 Flash Deal", brand: "Shopee", placement: "In-Article", status: "running", start: "2026-02-02", end: "2026-02-16", impressions: 450000, clicks: 18000, thumb: "https://images.pexels.com/photos/4464438/pexels-photo-4464438.jpeg?auto=compress&cs=tinysrgb&w=1200" },
      { id: 5,  name: "Grab Weekend Ride", brand: "Grab", placement: "Sidebar Right", status: "ended", start: "2025-12-01", end: "2026-01-15", impressions: 390000, clicks: 9500, thumb: "https://images.pexels.com/photos/8422763/pexels-photo-8422763.jpeg?auto=compress&cs=tinysrgb&w=1200" },
      { id: 6,  name: "KBank SME Loan", brand: "KBank", placement: "Hero Banner", status: "running", start: "2026-01-10", end: "2026-03-10", impressions: 610000, clicks: 20500, thumb: "https://images.pexels.com/photos/6802044/pexels-photo-6802044.jpeg?auto=compress&cs=tinysrgb&w=1200" },
      { id: 7,  name: "True 5G Network", brand: "True", placement: "Homepage Spotlight", status: "pending", start: "2026-02-20", end: "2026-03-20", impressions: 0, clicks: 0, thumb: "https://images.pexels.com/photos/373543/pexels-photo-373543.jpeg?auto=compress&cs=tinysrgb&w=1200" },
      { id: 8,  name: "AIS Fibre New Pack", brand: "AIS", placement: "In-Article", status: "running", start: "2026-01-28", end: "2026-02-28", impressions: 530000, clicks: 16000, thumb: "https://images.pexels.com/photos/3735431/pexels-photo-3735431.jpeg?auto=compress&cs=tinysrgb&w=1200" },
      { id: 9,  name: "PTT Station Member Day", brand: "PTT", placement: "Sidebar Right", status: "ended", start: "2025-11-01", end: "2025-12-31", impressions: 260000, clicks: 6200, thumb: "https://images.pexels.com/photos/221047/pexels-photo-221047.jpeg?auto=compress&cs=tinysrgb&w=1200" },
      { id: 10, name: "Bangkok Hospital Health Check", brand: "Bangkok Hospital", placement: "Health Section Banner", status: "running", start: "2026-02-05", end: "2026-03-05", impressions: 310000, clicks: 8700, thumb: "https://images.pexels.com/photos/247786/pexels-photo-247786.jpeg?auto=compress&cs=tinysrgb&w=1200" },
      { id: 11, name: "Tourism Authority Songkran", brand: "TAT", placement: "Travel Section Hero", status: "pending", start: "2026-03-15", end: "2026-04-20", impressions: 0, clicks: 0, thumb: "https://images.pexels.com/photos/7214460/pexels-photo-7214460.jpeg?auto=compress&cs=tinysrgb&w=1200" },
      { id: 12, name: "Local SME Coffee Brand", brand: "Blue Roaster", placement: "Lifestyle In-Article", status: "ended", start: "2025-10-10", end: "2025-11-10", impressions: 120000, clicks: 3100, thumb: "https://images.pexels.com/photos/373888/pexels-photo-373888.jpeg?auto=compress&cs=tinysrgb&w=1200" },
      { id: 13, name: "University Open House", brand: "Bangkok University", placement: "Education Spotlight", status: "running", start: "2026-02-01", end: "2026-02-20", impressions: 205000, clicks: 6400, thumb: "https://images.pexels.com/photos/1184579/pexels-photo-1184579.jpeg?auto=compress&cs=tinysrgb&w=1200" }
    ];

    function formatNumber(num) {
      if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
      if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
      return String(num);
    }

    function getStatusBadge(status) {
      if (status === "running") return { text: "กำลังรัน", cls: "status-running", icon: "bi-play-circle-fill" };
      if (status === "pending") return { text: "รอตรวจ", cls: "status-pending", icon: "bi-clock-fill" };
      return { text: "หมดอายุ", cls: "status-ended", icon: "bi-stop-circle-fill" };
    }

    function getFilteredSortedAds() {
      const term = $("#searchInput").val().trim().toLowerCase();
      const status = $("#statusFilter").val();
      const sort = $("#sortSelect").val();

      let arr = adsData.filter(ad => {
        const matchTerm = !term ||
          ad.name.toLowerCase().includes(term) ||
          ad.brand.toLowerCase().includes(term) ||
          ad.placement.toLowerCase().includes(term);
        const matchStatus = !status || ad.status === status;
        return matchTerm && matchStatus;
      });

      if (sort === "impressions") {
        arr = arr.slice().sort((a, b) => b.impressions - a.impressions);
      } else if (sort === "clicks") {
        arr = arr.slice().sort((a, b) => b.clicks - a.clicks);
      } else {
        arr = arr.slice().sort((a, b) => b.id - a.id);
      }
      return arr;
    }

    function renderAds() {
      const listEl = $("#adsList");
      const all = getFilteredSortedAds();
      const total = all.length;

      if (!total) {
        listEl.html(
          '<div class="empty-state-box">' +
            '<i class="bi bi-broadcast"></i>' +
            '<div>ยังไม่มีโฆษณาที่ตรงกับเงื่อนไขค้นหา</div>' +
          '</div>'
        );
        $("#paginationWrapper").hide();
        return;
      }

      const totalPages = Math.ceil(total / pageSize) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * pageSize;
      const pageItems = all.slice(start, start + pageSize);

      const html = pageItems.map(ad => {
        const badge = getStatusBadge(ad.status);
        const ctr = ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : "0.00";
        return (
          '<div class="ads-card">' +
            '<div class="row g-2 g-md-3 align-items-center">' +
              '<div class="col-12 col-md-4 col-lg-3">' +
                '<div class="thumb-wrapper mb-2 mb-md-0">' +
                  '<img src="' + ad.thumb + '" alt="thumb" loading="lazy" />' +
                  '<div class="thumb-badge"><i class="bi bi-megaphone"></i><span>' + ad.placement + '</span></div>' +
                '</div>' +
              '</div>' +
              '<div class="col-12 col-md-8 col-lg-6">' +
                '<div class="d-flex justify-content-between align-items-start mb-1 flex-wrap gap-1">' +
                  '<div>' +
                    '<div class="campaign-title">' + ad.name + '</div>' +
                    '<div class="campaign-meta">' + ad.brand + ' • ' + ad.start + ' - ' + ad.end + '</div>' +
                  '</div>' +
                  '<span class="status-badge ' + badge.cls + '"><i class="bi ' + badge.icon + '"></i>' + badge.text + '</span>' +
                '</div>' +
                '<div class="d-flex flex-wrap gap-2 mt-1">' +
                  '<div class="metric-pill"><i class="bi bi-eye"></i><span>Impressions</span><span class="value">' + formatNumber(ad.impressions) + '</span></div>' +
                  '<div class="metric-pill"><i class="bi bi-hand-index"></i><span>Clicks</span><span class="value">' + formatNumber(ad.clicks) + '</span></div>' +
                  '<div class="metric-pill"><i class="bi bi-activity"></i><span>CTR</span><span class="value">' + ctr + '%</span></div>' +
                '</div>' +
              '</div>' +
              '<div class="col-12 col-lg-3 text-lg-end mt-2 mt-lg-0 d-flex d-lg-block flex-wrap gap-2">' +
                '<button class="btn btn-ghost btn-ghost-primary w-100 w-lg-auto" data-action="preview" data-id="' + ad.id + '"><i class="bi bi-eye me-1"></i>ดูตัวอย่าง</button>' +
                '<button class="btn btn-ghost btn-ghost-danger w-100 w-lg-auto" data-action="detail" data-id="' + ad.id + '"><i class="bi bi-list-ul me-1"></i>รายละเอียด</button>' +
              '</div>' +
            '</div>' +
          '</div>'
        );
      }).join("");

      listEl.html(html);

      renderPagination(total, totalPages);
    }

    function renderPagination(total, totalPages) {
      const paginationEl = $("#pagination");
      const pageInfoEl = $("#pageInfo");
      const startItem = (currentPage - 1) * pageSize + 1;
      const endItem = Math.min(currentPage * pageSize, total);

      pageInfoEl.text(`แสดง ${startItem}-${endItem} จากทั้งหมด ${total} แคมเปญ`);

      let html = "";
      const disabledPrev = currentPage === 1 ? " disabled" : "";
      html += `<li class="page-item${disabledPrev}"><button class="page-link" data-page="prev">ก่อนหน้า</button></li>`;

      for (let i = 1; i <= totalPages; i++) {
        const active = i === currentPage ? " active-page" : "";
        html += `<li class="page-item"><button class="page-link${active}" data-page="${i}">${i}</button></li>`;
      }

      const disabledNext = currentPage === totalPages ? " disabled" : "";
      html += `<li class="page-item${disabledNext}"><button class="page-link" data-page="next">ถัดไป</button></li>`;

      paginationEl.html(html);
      $("#paginationWrapper").show();
    }

    function findAd(id) {
      return adsData.find(a => a.id === Number(id));
    }

    function openPreview(ad) {
      Swal.fire({
        title: ad.name,
        html: `<div style="text-align:left; font-size:0.9rem;">
          <div style="border-radius:14px; overflow:hidden; margin-bottom:0.75rem;">
            <img src="${ad.thumb}" alt="preview" style="width:100%; height:auto; object-fit:cover;" />
          </div>
          <div><strong>แบรนด์:</strong> ${ad.brand}</div>
          <div><strong>ตำแหน่งโฆษณา:</strong> ${ad.placement}</div>
          <div><strong>ช่วงเวลา:</strong> ${ad.start} - ${ad.end}</div>
        </div>`,
        showConfirmButton: true,
        confirmButtonText: "ปิด",
        width: 600
      });
    }

    function openDetail(ad) {
      const ctr = ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : "0.00";
      Swal.fire({
        title: "รายละเอียดแคมเปญ",
        html: `<div style="text-align:left; font-size:0.9rem;">
          <div style="font-weight:600; margin-bottom:0.25rem;">${ad.name}</div>
          <div style="color:#6b7280; margin-bottom:0.75rem;">${ad.brand} • ${ad.placement}</div>
          <div><strong>สถานะ:</strong> ${getStatusBadge(ad.status).text}</div>
          <div><strong>ช่วงเวลา:</strong> ${ad.start} - ${ad.end}</div>
          <hr />
          <div><strong>Impressions:</strong> ${ad.impressions.toLocaleString()}</div>
          <div><strong>Clicks:</strong> ${ad.clicks.toLocaleString()}</div>
          <div><strong>CTR:</strong> ${ctr}%</div>
          <hr />
          <div style="color:#6b7280;">หมายเหตุ: ข้อมูลทั้งหมดเป็นตัวอย่างเพื่อการออกแบบเท่านั้น</div>
        </div>`,
        confirmButtonText: "ปิด",
        width: 520
      });
    }

    $(document).ready(function () {
      renderAds();

      $("#searchInput, #statusFilter, #sortSelect").on("input change", function () {
        currentPage = 1;
        renderAds();
      });

      $("#pagination").on("click", ".page-link", function () {
        const page = $(this).data("page");
        const all = getFilteredSortedAds();
        const totalPages = Math.ceil(all.length / pageSize) || 1;

        if (page === "prev" && currentPage > 1) currentPage--;
        else if (page === "next" && currentPage < totalPages) currentPage++;
        else if (typeof page === "number") currentPage = page;

        renderAds();
      });

      $("#adsList").on("click", "button[data-action]", function () {
        const id = $(this).data("id");
        const action = $(this).data("action");
        const ad = findAd(id);
        if (!ad) return;

        if (action === "preview") openPreview(ad);
        if (action === "detail") openDetail(ad);
      });

      $("#btnNewAd").on("click", function () {
        Swal.fire({
          icon: "info",
          title: "จะมีในเวอร์ชันต่อไป",
          text: "ปุ่มนี้เป็นตัวอย่าง UI สำหรับสร้างแคมเปญใหม่",
          confirmButtonText: "เข้าใจแล้ว"
        });
      });
    });