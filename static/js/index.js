// static/js/index.js
$(function () {
  // ======================================================
  // Config
  // ======================================================
  const PAGE_SIZE = 12;        // 12 ข่าว/หน้า (6 ล่าสุด + 6 เพิ่มเติม)
  const MAX_PAGES = 3;         // เผื่อคุณใช้ใน API
  const LATEST_TOP_COUNT = 6;  // ข่าวล่าสุดโชว์ 6
  const POPULAR_COUNT = 7;     // ยอดนิยมโชว์ 7
  const SLIDE_COUNT = 3;       // สไลด์โชว์ 3
  const MUST_READ_COUNT = 4;   // ไม่ควรพลาดโชว์ 4
  // ======================================================
  // Utils
  // ======================================================
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeText(s, fallback = "—") {
    const t = String(s ?? "").trim();
    return t ? t : fallback;
  }

  function toDate(ts) {
    if (!ts) return null;
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function fmtDateTH(ts) {
    const d = toDate(ts);
    if (!d) return "—";
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  }


  function buildNewsUrl(id) {
    return `/news/${encodeURIComponent(id)}`;
  }

  function apiGet(url, data) {
    return $.ajax({
      url,
      method: "GET",
      data: data || {},
      dataType: "json",
      timeout: 20000,
    });
  }

  function setLoading($el, html) {
    if (!$el || !$el.length) return;
    $el.html(html || `<div class="text-muted small">กำลังโหลด...</div>`);
  }

  function safeCall(fn) {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  }

  // ✅ แปลง cover_image ที่เป็น path ใน DB -> URL ที่ browser โหลดได้
  // DB เก็บ: uploads/news/cover/xxx.webp
  // หน้าเว็บต้องใช้: /static/uploads/news/cover/xxx.webp
  function coverUrl(path) {
    const p = String(path || "").trim();
    if (!p) return "https://picsum.photos/seed/bkktoday/1400/800"; // fallback กันรูปหาย

    // รองรับกรณีพิเศษ: ถ้าเป็น data uri หรือ url เต็ม
    if (p.startsWith("data:image")) return p;
    if (p.startsWith("http://") || p.startsWith("https://")) return p;

    // กันกรณีมีคนเผลอเก็บ /static/... หรือ static/...
    let clean = p.replace(/^\/+/, "");
    clean = clean.replace(/^static\//, "");
    return "/static/" + clean;
  }

  // ======================================================
  // State (✅ ล็อกหน้า index เป็น HOME เสมอ ไม่เปลี่ยนตามหมวด)
  // ======================================================
  let page = 1;
  let state = {
    q: "",
    type: "home",     // ✅ index จะเป็น home ตลอด
    cat_id: null,     // ✅ ไม่ใช้ใน index แล้ว
    subcat_id: null,  // ✅ ไม่ใช้ใน index แล้ว
  };

  // ======================================================
  // ✅ หน้า index ไม่ฟังการเปลี่ยนหมวดจาก navbar.js แล้ว
  // (คุณจะไปทำหน้าใหม่สำหรับหมวดข่าวทีหลัง)
  // ======================================================
  // window.addEventListener("bkk:nav-change", (e) => {
  //   const s = e.detail || {};
  //   state.type = s.type || "home";
  //   state.cat_id = s.cat_id || null;
  //   state.subcat_id = s.subcat_id || null;
  //   page = 1;
  //   renderAll();
  // });

  // ✅ ค้นหายังใช้ได้ (ถ้าไม่อยากให้ค้นหาเปลี่ยนข่าวใน index ด้วย ก็คอมเมนต์บล็อกนี้ได้)
  window.addEventListener("bkk:search", (e) => {
    state.q = (e.detail?.q || "").toString();
    page = 1;
    renderAll();
  });

  // ======================================================
  // API params helper (✅ ตัด cat/subcat ออก ไม่ให้ index กรองตามหมวด)
  // ======================================================
  function buildListParams() {
    return {
      page,
      page_size: PAGE_SIZE,
      q: (state.q || "").trim(),
      // ✅ ไม่มี cat_id / subcat_id ในหน้า index
    };
  }


  async function loadSponsorIcons() {
  const res = await fetch("/api/ads/icons");
  const data = await res.json();

  if (!data.items || !data.items.length) return;

  const track = document.getElementById("logoTrack");

  track.innerHTML = data.items.map(s => `
  <a class="sponsor-pill" href="${s.target_url}" target="_blank">
    
    <img src="${s.adv_image_url}" 
         class="sponsor-logo" 
         alt="${s.adv_name}">
    
    <div class="sponsor-name">
      ${s.adv_name}
    </div>

  </a>
`).join("");

  track.innerHTML += track.innerHTML; // scroll smooth
}


async function loadHeroAd() {
  const container = document.getElementById("bigHeroAd");
  if (!container) return;

  try {
    const res = await fetch("/api/ads/hero");
    const data = await res.json();

    if (!data.ok || !data.item) {
      container.style.display = "none";
      return;
    }

    const ad = data.item;

    container.innerHTML = `
      <a href="${ad.target_url}" target="_blank" rel="noopener noreferrer"
         class="big-ad-wrap text-decoration-none">

        <img src="${ad.adv_image_url}" 
             class="big-ad-img"
             loading="lazy"
             onerror="this.style.display='none'">

        <div class="big-ad-overlay"></div>

        <div class="big-ad-content">
          <span class="ad-badge ad-badge-ad mb-2">ad</span>
          <h2 class="font-kanit fw-bold big-ad-title">
            ${ad.adv_name}
          </h2>
          <p class="big-ad-desc">
            ${ad.adv_description || ""}
          </p>
          <div class="mt-3">
            <span class="btn btn-bkk-red px-4">ดูรายละเอียด</span>
          </div>
        </div>

      </a>
    `;

  } catch (err) {
    console.error("Hero Ad Load Error:", err);
    container.style.display = "none";
  }
}

async function loadFooterAds() {
  const wrapper = document.getElementById("footerAdWrapper");
  if (!wrapper) return;

  const res = await fetch("/api/ads/footer");
  const data = await res.json();

  if (!data.ok || !data.items.length) {
    wrapper.innerHTML = "<div class='p-3 text-muted'>ไม่มีโฆษณา</div>";
    return;
  }

  wrapper.innerHTML = data.items.map(ad => `
    <div class="swiper-slide">
      <a class="ad-banner" href="${ad.target_url}" target="_blank">
        <img src="${ad.adv_image_url}">
        <div class="ad-meta"> 
        <div class="ad-meta-body">
        <div class="ad-title line-clamp-2">${ad.adv_name}</div>
        <div class="ad-sub line-clamp-2">${ad.adv_description}</div>
         </div>
         <span class="ad-badge ad-badge-ad">ad</span>
      </div>
      </a>
    </div>
  `).join("");

  new Swiper(".footerAdSwiper", {
    slidesPerView: 2,
    spaceBetween: 20,
    loop: true,
    autoplay: { delay: 3500 },
    navigation: {
      nextEl: "#adNext",
      prevEl: "#adPrev"
    }
  });
}


  // ======================================================
  // Hero Swiper (ข่าวยอดฮิต)
  // ======================================================
  let mainSwiper = null;

  function renderSwiperFromItems(items) {
    const html = (items || [])
      .map((s) => {
        const tag = safeText(s.cat_name || "HOT");
        const title = safeText(s.news_title);
        const desc = safeText(s.excerpt || "");
        const img = coverUrl(s.cover_image || "");
        const url = buildNewsUrl(s.news_id);

        return `
          <div class="swiper-slide position-relative">
            <a href="${url}" class="d-block text-decoration-none">
              <img src="${escapeHtml(img)}" class="hero-img" alt="">
              <div class="hero-overlay news-gradient d-flex flex-column justify-content-end p-4 p-md-5 text-white">
                <span class="slide-tag slide-tag-breaking">${escapeHtml(tag)}</span>
                <h2 class="font-kanit fw-bold mt-2 hero-title">${escapeHtml(title)}</h2>
                <p class="text-white-75 mt-2 line-clamp-2 hero-desc">${escapeHtml(desc)}</p>
                <div class="mt-3 d-flex align-items-center gap-3 flex-wrap">
                  <span class="btn btn-bkk-red hero-cta">อ่านต่อ</span>
                  <span class="small text-white-50">อัปเดต • ${escapeHtml(fmtDateTH(s.published_at))}</span>
                </div>
              </div>
            </a>
          </div>
        `;
      })
      .join("");

    $("#swiper-wrapper").html(html || `<div class="p-4 text-muted small">ยังไม่มีข่าวยอดฮิต (featured)</div>`);

    if (mainSwiper) {
      mainSwiper.destroy(true, true);
      mainSwiper = null;
    }

    mainSwiper = new Swiper(".mainSwiper", {
      loop: (items || []).length > 1,
      effect: "fade",
      fadeEffect: { crossFade: true },
      autoplay: { delay: 6000, disableOnInteraction: false },
      pagination: { el: ".swiper-pagination", clickable: true },
    });
  }

  function loadSwiper() {
    return apiGet("/api/news/featured", { limit: SLIDE_COUNT })
      .then((res) => {
        if (!res || !res.ok) throw new Error(res?.message || "โหลดข่าวยอดฮิตไม่สำเร็จ");
        renderSwiperFromItems(res.items || []);
      })
      .catch((err) => {
        $("#swiper-wrapper").html(
          `<div class="p-4 text-danger small">โหลดสไลด์ไม่สำเร็จ: ${escapeHtml(err.message || err)}</div>`
        );
      });
  }

  // ======================================================
  // Must Read
  // ======================================================
  function renderMustRead(items) {
    const html = (items || [])
      .slice(0, MUST_READ_COUNT)
      .map((x, idx) => {
        const url = buildNewsUrl(x.news_id);
        const img = coverUrl(x.cover_image || "");
        return `
          <a href="${url}" class="must-read-card bg-white p-3 shadow-sm d-flex gap-3 border rounded-4 text-decoration-none text-dark ${
            idx === 1 ? "must-read-accent" : ""
          }">
            <img src="${escapeHtml(img)}" class="rounded-3 must-read-img" alt="">
            <div class="flex-grow-1 must-read-body">
              <div class="fw-bold small line-clamp-2">${escapeHtml(safeText(x.news_title))}</div>
              <div class="small text-muted mt-1">${escapeHtml(safeText(x.cat_name))} • ${escapeHtml(x.time_ago)}</div>
            </div>
          </a>
        `;
      })
      .join("");

    $("#must-read").html(html || `<div class="text-muted small">ยังไม่มีข่าว</div>`);
  }

  function loadMustRead() {
    setLoading($("#must-read"));
    return apiGet("/api/news/must-read", { limit: MUST_READ_COUNT })
      .then((res) => {
        if (!res || !res.ok) throw new Error(res?.message || "โหลดไม่ควรพลาดไม่สำเร็จ");
        renderMustRead(res.items || []);
      })
      .catch((err) => {
        $("#must-read").html(
          `<div class="text-danger small">โหลดไม่ควรพลาดไม่สำเร็จ: ${escapeHtml(err.message || err)}</div>`
        );
      });
  } 

  // ======================================================
  // Latest + More
  // ======================================================
  function renderNewsGrid(items) {
    const topItems = (items || []).slice(0, LATEST_TOP_COUNT);

    const html = topItems
      .map((n) => {
        const url = buildNewsUrl(n.news_id);
        const img = coverUrl(n.cover_image || "");
        return `
          <div class="col-md-6">
            <a href="${url}" class="bg-white rounded-4 overflow-hidden shadow-sm border h-100 d-block text-decoration-none text-dark">
              <div class="position-relative">
                <img src="${escapeHtml(img)}" class="w-100 latest-img" alt="">
                <div class="position-absolute top-0 start-0 p-3">
                  <span class="ad-badge ad-badge-news">news</span>
                </div>
              </div>
              <div class="p-3 latest-body">
                <div class="d-flex align-items-center justify-content-between gap-2">
                  <span class="text-red-bkk fw-bold text-uppercase latest-cat">${escapeHtml(safeText(n.cat_name))}</span>
                  <span class="small text-muted">${escapeHtml(n.time_ago)}</span>
                </div>
                <div class="fw-bold mt-1 line-clamp-2">${escapeHtml(safeText(n.news_title))}</div>
                <div class="text-secondary small mt-2 line-clamp-2">${escapeHtml(safeText(n.excerpt || ""))}</div>
                <div class="small text-muted mt-3">${escapeHtml(fmtDateTH(n.published_at))}</div>
              </div>
            </a>
          </div>
        `;
      })
      .join("");

    $("#news-grid").html(html || `<div class="text-muted small">ไม่มีข่าวล่าสุด</div>`);
  }

  function renderMorePagination(totalPages) {
    const cur = page;

    const pages = [];
    pages.push("prev");

    if (totalPages <= 5) {
      for (let p = 1; p <= totalPages; p++) pages.push(p);
    } else {
      pages.push(1, 2, 3, "...", totalPages);
    }

    pages.push("next");

    const html = pages
      .map((p) => {
        if (p === "...") return `<span class="px-2 text-muted">…</span>`;
        if (p === "prev") return `<button class="btn-page" id="btnPagePrev" ${cur === 1 ? "disabled" : ""}>ก่อนหน้า</button>`;
        if (p === "next") return `<button class="btn-page" id="btnPageNext" ${cur === totalPages ? "disabled" : ""}>ถัดไป</button>`;
        return `<button class="btn-page ${cur === p ? "active" : ""}" data-page="${p}">${p}</button>`;
      })
      .join("");

    $("#more-pagination").html(html);

    $("#btnPagePrev").off("click").on("click", function () {
      if (page > 1) {
        page--;
        loadLatestAndMore(true);
      }
    });

    $("#btnPageNext").off("click").on("click", function () {
      if (page < totalPages) {
        page++;
        loadLatestAndMore(true);
      }
    });

    $("#more-pagination")
      .find("button[data-page]")
      .off("click")
      .on("click", function () {
        const p = parseInt($(this).attr("data-page"), 10);
        if (!Number.isFinite(p)) return;
        page = p;
        loadLatestAndMore(true);
      });
  }

  function renderMoreNews(items, meta) {
    const moreItems = (items || []).slice(LATEST_TOP_COUNT);
    const total = meta?.total ?? 0;
    const totalPages = meta?.total_pages ?? 1;
    const from = total === 0 ? 0 : (meta.page - 1) * meta.page_size + 1;
    const to = Math.min(meta.page * meta.page_size, total);

    const html = moreItems
      .map((n) => {
        const url = buildNewsUrl(n.news_id);
        const img = coverUrl(n.cover_image || "");
        return `
          <div class="col-md-6 col-lg-4">
            <a href="${url}" class="bg-white rounded-4 overflow-hidden shadow-sm border h-100 d-block text-decoration-none text-dark">
              <div class="position-relative">
                <img src="${escapeHtml(img)}" class="w-100 more-img" alt="">
                <div class="position-absolute top-0 start-0 p-3">
                  <span class="ad-badge ad-badge-news">news</span>
                </div>
              </div>
              <div class="p-3 latest-body">
                <div class="d-flex align-items-center justify-content-between gap-2">
                  <span class="text-red-bkk fw-bold text-uppercase latest-cat">${escapeHtml(safeText(n.cat_name))}</span>
                  <span class="small text-muted">${escapeHtml(n.time_ago)}</span>
                </div>
                <div class="fw-bold mt-1 line-clamp-2">${escapeHtml(safeText(n.news_title))}</div>
                <div class="text-secondary small mt-2 line-clamp-2">${escapeHtml(safeText(n.excerpt || ""))}</div>
                <div class="small text-muted mt-3">${escapeHtml(fmtDateTH(n.published_at))}</div>
              </div>
            </a>
          </div>
        `;
      })
      .join("");

    $("#more-news-grid").html(html || `<div class="text-muted small">ไม่มีข่าวเพิ่มเติมในหน้านี้</div>`);

    // ✅ หน้า index เป็น home เสมอ
    const label = "หน้าแรก";

    $("#more-pagination-info").text(`แสดง ${from} - ${to} จากทั้งหมด ${total} ข่าว • หน้า ${page} / ${totalPages} • ${label}`);
    renderMorePagination(totalPages);
  }

  function loadLatestAndMore(scrollToTop) {
    setLoading($("#news-grid"));
    setLoading($("#more-news-grid"));
    $("#more-pagination").empty();
    $("#more-pagination-info").text("—");

    const params = buildListParams();

    return apiGet("/api/news/list", params)
      .then((res) => {
        if (!res || !res.ok) throw new Error(res?.message || "โหลดข่าวไม่สำเร็จ");
        const items = res.items || [];

        renderNewsGrid(items);
        renderMoreNews(items, {
          page: res.page,
          page_size: res.page_size,
          total: res.total,
          total_pages: res.total_pages,
        });

        if (scrollToTop) {
          document.getElementById("news-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      })
      .catch((err) => {
        const msg = escapeHtml(err.message || err);
        $("#news-grid").html(`<div class="text-danger small">โหลดข่าวล่าสุดไม่สำเร็จ: ${msg}</div>`);
        $("#more-news-grid").html(`<div class="text-danger small">โหลดข่าวเพิ่มเติมไม่สำเร็จ: ${msg}</div>`);
      });
  }

  // ======================================================
  // Popular
  // ======================================================
  function renderPopular(items) {
    const filtered = (items || []).filter((n) => (n.view_count || 0) > 0);

    const html = filtered
      .slice(0, POPULAR_COUNT)
      .map((n, idx) => {
        const url = buildNewsUrl(n.news_id);
        return `
          <a href="${url}" class="d-flex align-items-start gap-3 p-3 rounded-4 border bg-white text-decoration-none text-dark">
            <div class="popular-rank">${idx + 1}</div>
            <div class="flex-grow-1 popular-body">
              <div class="small text-muted mb-1">
                ${escapeHtml(n.cat_name)} • ${escapeHtml(n.time_ago)}• ${escapeHtml(n.view_count)} วิว
              </div>
              <div class="fw-bold small line-clamp-2">
                ${escapeHtml(n.news_title)}
              </div>
            </div>
          </a>
        `;
      })
      .join("");

    $("#popular-list").html(html || `<div class="text-muted small">ยังไม่มีข่าวยอดนิยมในช่วง 24 ชม.</div>`);
  }

  function loadPopular() {
    setLoading($("#popular-list"));
    return apiGet("/api/news/popular", { limit: POPULAR_COUNT })
      .then((res) => {
        if (!res || !res.ok) throw new Error(res?.message || "โหลดข่าวยอดนิยมไม่สำเร็จ");
        renderPopular(res.items || []);
      })
      .catch((err) => {
        $("#popular-list").html(`<div class="text-danger small">โหลดยอดนิยมไม่สำเร็จ: ${escapeHtml(err.message || err)}</div>`);
      });
  }

  // ======================================================
  // MOCK sections
  // ======================================================
  const EDITOR_PICKS = [
    { cat: "ไลฟ์สไตล์", title: "7 วิธีรับมือฝุ่นและภูมิแพ้ในเมือง แบบไม่พังสุขภาพ", img: 166 },
    { cat: "เทคโนโลยี", title: "เทรนด์งานปี 2026: AI + Hybrid ทักษะไหนบริษัทแย่งตัว", img: 170 },
    { cat: "สังคม", title: "หลอกลวงออนไลน์พุ่ง: วิธีเช็คก่อนโอนเงิน ลดความเสี่ยง", img: 172 },
  ];

  function renderEditorsPicks() {
    const $el = $("#editors-picks");
    if (!$el.length) return;

    const html = EDITOR_PICKS.map(
      (p) => `
        <div class="col-md-4">
          <div class="rounded-4 overflow-hidden border bg-white h-100">
            <img src="https://picsum.photos/id/${p.img}/800/600" class="w-100 editors-img" alt="">
            <div class="p-3">
              <div class="text-red-bkk fw-bold editors-cat">${escapeHtml(p.cat)}</div>
              <div class="fw-bold mt-1 line-clamp-2">${escapeHtml(p.title)}</div>
              <div class="small text-muted mt-2">แนะนำโดยกองบรรณาธิการ</div>
            </div>
          </div>
        </div>
      `
    ).join("");
    $el.html(html);
  }

  function renderInPictures() {
    if (!$("#pictureHeroImg").length) return;

    $("#pictureHeroImg").attr("src", `https://picsum.photos/id/301/1600/900`);
    $("#pictureHeroCat").text("PHOTO");
    $("#pictureHeroTime").text("วันนี้");
    $("#pictureHeroTitle").text("ภาพข่าวเด่นประจำวัน (mock)");
    $("#pictureHeroDesc").text("โซนนี้ยังเป็น mock อยู่ ถ้าจะดึงจาก DB จริง เดี๋ยวผมทำให้เป็นชุดเดียวกันได้เลย");

    const html = [302, 303, 304]
      .map(
        (id) => `
          <div class="col-md-4">
            <div class="bg-white rounded-4 border overflow-hidden h-100">
              <img src="https://picsum.photos/id/${id}/900/520" class="w-100 picture-mini-img" alt="">
              <div class="p-3">
                <div class="fw-bold mt-1 line-clamp-2">ภาพประกอบ (mock)</div>
                <div class="text-secondary small mt-2 line-clamp-2">คำอธิบายสั้นๆ</div>
              </div>
            </div>
          </div>
        `
      )
      .join("");
    $("#pictureMiniGrid").html(html);
  }

  let watchSwiper = null;
  function renderWatchRail() {
    if (!$("#watchWrapper").length) return;

    const list = [210, 211, 212, 213, 214, 215];
    const html = list
      .map(
        (imgId) => `
          <div class="swiper-slide">
            <div class="rail-card">
              <div class="rail-thumb">
                <img src="https://picsum.photos/id/${imgId}/900/520" alt="">
                <div class="play-badge">▶ watch</div>
              </div>
              <div class="p-3">
                <div class="small text-white-50 mb-2">Mock • วันนี้</div>
                <div class="fw-bold text-white line-clamp-2">วิดีโอแนะนำ (mock)</div>
                <div class="small text-white-50 mt-2">Mock video • 2:34</div>
              </div>
            </div>
          </div>
        `
      )
      .join("");
    $("#watchWrapper").html(html);

    if (watchSwiper) {
      watchSwiper.destroy(true, true);
      watchSwiper = null;
    }

    watchSwiper = new Swiper(".watchSwiper", {
      slidesPerView: "auto",
      spaceBetween: 14,
      loop: true,
      speed: 4500,
      autoplay: { delay: 0, disableOnInteraction: false, pauseOnMouseEnter: true },
      navigation: { prevEl: "#watchPrev", nextEl: "#watchNext" },
    });
  }



  async function loadCategories() {
  try {
    const res = await fetch("/api/categories");
    const data = await res.json();

    if (!data.ok) return [];

    return data.items; // [{cat_id, cat_name}]
  } catch (err) {
    console.error("โหลดหมวดข่าวล้มเหลว", err);
    return [];
  }
}


  // ข่าวตามประเภท
  async function renderCategorySections() {
  const container = $("#categorySections");
  if (!container.length) return;

  container.html("");

  const categories = await loadCategories(); // ⭐ โหลดจาก API

  for (const cat of categories) {
    const res = await fetch(`/api/news/by-category?cat_id=${cat.cat_id}&limit=12`);
    const data = await res.json();
    const items = data.items || [];

    const grid = items.map(n => {
      const url = `/news/${n.news_id}`;
      const img = coverUrl(n.cover_image || "");

      return `
        <div class="col-md-6 col-lg-4">
          <a href="${url}" 
             class="bg-white rounded-4 overflow-hidden shadow-sm border h-100 d-block text-decoration-none text-dark">

            <div class="position-relative">
              <img src="${escapeHtml(img)}" class="w-100 more-img" alt="">
              
              <div class="position-absolute top-0 start-0 p-3">
                <span class="ad-badge ad-badge-news">NEWS</span>
              </div>
            </div>

            <div class="p-3 latest-body">
              <div class="d-flex align-items-center justify-content-between gap-2">
                <span class="text-red-bkk fw-bold text-uppercase latest-cat">
                  ${escapeHtml(cat.cat_name)}
                </span>
                <span class="small text-muted">
                  ${escapeHtml(n.time_ago)}
                </span>
              </div>

              <div class="fw-bold mt-1 line-clamp-2">
                ${escapeHtml(n.news_title)}
              </div>

              <div class="text-secondary small mt-2 line-clamp-2">
                ${escapeHtml(n.excerpt || "")}
              </div>

              <div class="small text-muted mt-3">
                ${escapeHtml(fmtDateTH(n.published_at))}
              </div>
            </div>

          </a>
        </div>
      `;
    }).join("");

    container.append(`
      <div class="mb-5">
        <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
          <h2 class="font-kanit fw-bold text-navy-bkk m-0">${cat.cat_name}</h2>
        </div>
        <div class="row g-3">
          ${grid}
        </div>
      </div>
    `);
  }
}


  

  // ======================================================
  // Render all
  // ======================================================
  function renderAll() {
    // DB sections
    safeCall(() => loadSwiper());
    safeCall(() => loadMustRead());
    safeCall(() => loadLatestAndMore(false));
    safeCall(() => loadPopular());
    safeCall(() => loadSponsorIcons());
    safeCall(() => loadFooterAds());
    safeCall(() => loadHeroAd());
    safeCall(() => renderCategorySections());

    // Mock sections
    safeCall(() => renderWatchRail());

  }

  // ======================================================
  // Init (index only)
  // ======================================================
  renderAll();
});
