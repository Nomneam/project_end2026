// index.js
$(function () {
  // ======================================================
  // Config (⭐ หมวดละ 3 หน้า)
  // - ใช้ "pagination เดียว" คุมทั้ง ข่าวล่าสุด + ข่าวเพิ่มเติม
  // - ลบ Global pagination (ล่างสุด) ออกแล้ว
  // ======================================================
  const CATEGORIES = [
    "ทั้งหมด",
    "การเมือง",
    "เศรษฐกิจ",
    "สังคม",
    "อาชญากรรม",
    "บันเทิง",
    "เทคโนโลยี",
    "กีฬา",
    "ไลฟ์สไตล์",
    "ดูดวง",
  ];

  const PAGE_SIZE = 12;           // ⭐ 12 ข่าว/หน้า (6 ล่าสุด + 6 เพิ่มเติม)
  const MAX_PAGES = 3;            // ⭐ 3 หน้า/หมวด
  const MAX_ITEMS_PER_CAT = PAGE_SIZE * MAX_PAGES; // 36 ข่าว/หมวด

  const LATEST_TOP_COUNT = 6;     // ข่าวล่าสุดโชว์ 6
  const POPULAR_COUNT = 7;

  // ======================================================
  // Utils
  // ======================================================
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[rand(0, arr.length - 1)];

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ======================================================
  // Mock Data
  // ======================================================
  const AUTHORS = [
    "ทีมข่าวบางกอก",
    "กองบรรณาธิการ",
    "ศูนย์ข่าวเศรษฐกิจ",
    "ข่าวกีฬา",
    "สายสังคม",
    "โต๊ะบันเทิง",
    "Tech Desk",
    "Bangkok Today",
  ];

  const TIMES = [
    "10 นาทีที่แล้ว",
    "25 นาทีที่แล้ว",
    "1 ชม. ที่แล้ว",
    "2 ชม. ที่แล้ว",
    "4 ชม. ที่แล้ว",
    "เมื่อวานนี้",
  ];

  const TITLES_BY_CAT = {
    "การเมือง": [
      "สภาถกเดือด! งบประมาณปี 2569 ประเด็นไหนประชาชนจับตา",
      "ครม. ถกมาตรการเร่งด่วน รับมือค่าครองชีพ-ค่าไฟรอบใหม่",
      "โผปรับ ครม. สะเทือนการเมือง? วิเคราะห์แรงกระเพื่อม",
      "ฝ่ายค้านยื่นญัตติซักฟอก ประเด็นร้อนมีอะไรบ้าง",
    ],
    "เศรษฐกิจ": [
      "SET แกว่งแรง นักลงทุนจับตาหุ้น AI-ชิป จ่อทำจุดสูงใหม่",
      "ทองพุ่งแรงต่อเนื่อง นักลงทุนแห่ซื้อสินทรัพย์ปลอดภัย",
      "เศรษฐกิจโลกชะลอ? นักวิเคราะห์คาดน้ำมันอ่อนตัวต่อเนื่อง",
      "ค่าเงินบาทแข็ง-อ่อนวันนี้ กระทบส่งออกแค่ไหน",
    ],
    "สังคม": [
      "สังคมจับตา: เคสหลอกลวงออนไลน์พุ่ง ตำรวจเร่งกวาดล้าง",
      "ชีวิตในเมือง: 7 วิธีรับมือฝุ่นและภูมิแพ้ในฤดูนี้",
      "รถไฟฟ้า-ถนนเส้นหลัก ปี 2569 โครงการไหนเสร็จก่อน",
      "ดราม่าบนโซเชียล: ประเด็นร้อนที่ถกกันทั้งวัน",
    ],
    "อาชญากรรม": [
      "อาชญากรรมข้ามชาติ: รวบแก๊งคอลเซ็นเตอร์ ยึดของกลางเพียบ",
      "แตกตื่นกลางดึก! เพลิงไหม้โกดังย่านชานเมือง เร่งอพยพ",
      "ตำรวจแถลงคดีดัง หลักฐานใหม่ชี้มุมมองเปลี่ยน",
      "เตือนภัย: มิจฉาชีพปลอมเป็นขนส่ง โทรหลอกเอา OTP",
    ],
    "บันเทิง": [
      "ดราม่าลิขสิทธิ์เพลงดัง: ค่าย-ศิลปินชี้แจงคนละมุม",
      "วงการบันเทิง: เปิดลิสต์หนังไทยทำเงินสูงสุดไตรมาสแรก",
      "เผยโฉมชุดประจำชาติ “สุวรรณมณี” พร้อมลุยเวทีโลก",
      "ไอดอลดังประกาศคัมแบ็ก แฟนคลับแห่ติดแฮชแท็ก",
    ],
    "เทคโนโลยี": [
      "เปิดตัวมือถือรุ่นใหม่ กล้องเทพ-แบตอึด พร้อมฟีเจอร์ AI",
      "เทรนด์ทำงานปี 2026: Hybrid, AI, ทักษะที่บริษัทแย่งตัว",
      "รีวิวแว่น AR รุ่นใหม่ ใส่แล้วเหมือนหลุดไปโลกอนาคต",
      "เตือนภัยไซเบอร์: วิธีตั้งค่าความปลอดภัยบัญชีให้รอด",
    ],
    "กีฬา": [
      "กีฬาไทย: สรุปผลลีกวันนี้ ทีมไหนฟอร์มแรงต่อเนื่อง",
      "ทีมชาติไทยเตรียมอุ่นเครื่อง ฟีฟ่าเดย์ มีนาคม ลุ้นดาวรุ่ง",
      "วิเคราะห์ก่อนเกม: แท็กติก-ตัวจริงที่คาดว่าจะลงสนาม",
      "ดราม่า VAR: จังหวะปัญหาที่ทำแฟนบอลเดือด",
    ],
    "ไลฟ์สไตล์": [
      "ไลฟ์สไตล์: คาเฟ่โทนแดง-น้ำเงินในกรุงเทพฯ ที่ห้ามพลาด",
      "สูตรส้มตำปูปลาร้าแซ่บนัว! ทำง่ายใน 10 นาที",
      "ทริคแต่งตัวโทนสีให้ดูแพง (แต่ไม่ต้องแพง)",
      "กินยังไงให้ไม่อ้วน: แนวทางง่ายๆที่ทำได้จริง",
    ],
    "ดูดวง": [
      "เช็คดวง 12 ราศี กุมภาพันธ์: งาน เงิน ความรัก ใครปังสุด",
      "สีมงคลวันนี้: เสริมงาน-เงิน-ความรัก ตามวันเกิด",
      "เลขเด็ด-วันดี: สายมูเตรียมจด!",
      "ไพ่ทาโรต์รายสัปดาห์: ระวังเรื่องไหนเป็นพิเศษ",
    ],
  };

  function buildMockNews() {
    const out = [];
    let id = 1000;

    CATEGORIES.slice(1).forEach((cat) => {
      const titles = TITLES_BY_CAT[cat] || ["ข่าวอัปเดตประจำวัน"];
      for (let i = 0; i < MAX_ITEMS_PER_CAT; i++) {
        const minutesAgo = rand(5, 900) + i;
        out.push({
          id: id++,
          cat,
          title: `${pick(titles)} #${i + 1}`,
          excerpt:
            "สรุปเนื้อหาแบบย่อเพื่อโชว์ภาพรวมหน้าเว็บ (mock) ในอนาคตจะดึงจากฐานข้อมูลจริง...",
          imgId: rand(100, 320),
          dateText: "3 ก.พ. 2569",
          author: pick(AUTHORS),
          timeAgo: pick(TIMES),
          minutesAgo,
          popularScore: rand(10, 999),
          trendingScore: rand(10, 999),
        });
      }
    });

    return out;
  }

  const ALL_NEWS = buildMockNews();

  const SLIDES = [
    {
      tag: "BREAKING NEWS",
      tagStyle: `background:${getComputedStyle(document.documentElement).getPropertyValue("--bkk-red")}`,
      title: "วิกฤตฝุ่นพิษ PM 2.5 วันนี้พุ่งสูง 10 เขต กทม. แนะประชาชนสวมแมสก์ N95",
      desc: "ศูนย์ข้อมูลคุณภาพอากาศแจ้งเตือนค่าฝุ่นเข้าขั้นสีแดง คาดอากาศนิ่งต่อเนื่องหลายวัน...",
      img: "https://images.unsplash.com/photo-1571366992791-2ad20fe25a04?auto=format&fit=crop&w=1400&q=80",
    },
    {
      tag: "ECONOMY",
      tagStyle: `background:#2563eb`,
      title: "นักวิเคราะห์คาด SET Index ปีนี้มีลุ้นแตะ 1,600 จุด รับกระแสลงทุนกลุ่ม AI",
      desc: "หุ้นเทคฯ นำตลาด นักลงทุนต่างชาติกลับเข้ามา จับตานโยบายเศรษฐกิจดิจิทัลภาครัฐ...",
      img: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1400&q=80",
    },
    {
      tag: "SPORT",
      tagStyle: `background:#059669`,
      title: "ทีมชาติไทยเตรียมประกาศรายชื่อ ฟีฟ่าเดย์ มีนาคม แฟนบอลรอลุ้นดาวรุ่ง",
      desc: "สมาคมฯ เดินหน้าวางแผนเกมอุ่นเครื่องเพื่อทดสอบระบบ ก่อนลุยทัวร์นาเมนต์สำคัญ...",
      img: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1400&q=80",
    },
  ];

  const MUST_READ = [
    { cat: "บันเทิง", title: "เผยโฉมชุดประจำชาติ “สุวรรณมณี” พร้อมลุยประกวดเวทีโลก", img: "101", time: "2 ชม. ที่แล้ว" },
    { cat: "สังคม", title: "สรุปดราม่าแฮชแท็กร้อน: ลิขสิทธิ์เพลงดัง ใครผิดใครถูก?", img: "102", time: "4 ชม. ที่แล้ว" },
    { cat: "การเมือง", title: "สภาถกเดือด! ประเด็นค่าแรง-สวัสดิการ ประชาชนจับตา", img: "103", time: "5 ชม. ที่แล้ว" },
    { cat: "เศรษฐกิจ", title: "ทองพุ่งแรงต่อเนื่อง นักลงทุนแห่ซื้อสินทรัพย์ปลอดภัย", img: "104", time: "6 ชม. ที่แล้ว" },
  ];

  const EDITOR_PICKS = [
    { cat: "ไลฟ์สไตล์", title: "7 วิธีรับมือฝุ่นและภูมิแพ้ในเมือง แบบไม่พังสุขภาพ", img: 166 },
    { cat: "เทคโนโลยี", title: "เทรนด์งานปี 2026: AI + Hybrid ทักษะไหนบริษัทแย่งตัว", img: 170 },
    { cat: "สังคม", title: "หลอกลวงออนไลน์พุ่ง: วิธีเช็คก่อนโอนเงิน ลดความเสี่ยง", img: 172 },
  ];

  const SPONSORS = [
    { name: "KBank", mark: "K", color: "#10b981", url: "https://www.kasikornbank.com", tag: "Banking" },
    { name: "True", mark: "T", color: "#ef4444", url: "https://www.true.th", tag: "Telecom" },
    { name: "AIS", mark: "A", color: "#22c55e", url: "https://www.ais.th", tag: "5G" },
    { name: "PTT", mark: "P", color: "#2563eb", url: "https://www.pttplc.com", tag: "Energy" },
    { name: "SCB", mark: "S", color: "#7c3aed", url: "https://www.scb.co.th", tag: "Finance" },
    { name: "Lazada", mark: "L", color: "#f97316", url: "https://www.lazada.co.th", tag: "E-commerce" },
    { name: "Shopee", mark: "S", color: "#fb7185", url: "https://shopee.co.th", tag: "E-commerce" },
    { name: "Grab", mark: "G", color: "#16a34a", url: "https://www.grab.com/th", tag: "Delivery" },
  ];

  const FOOTER_ADS = [
    {
      title: "โปรแรง! ส่วนลดตั๋วเครื่องบิน",
      sub: "ดีลพิเศษวันนี้เท่านั้น • 3 ก.พ. 2569",
      img: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1400&q=80",
      url: "https://example.com",
    },
    {
      title: "มือถือใหม่ + แพ็กเน็ตสุดคุ้ม",
      sub: "ผ่อน 0% • ของแถมเพียบ",
      img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1400&q=80",
      url: "https://example.com",
    },
    {
      title: "คูปองส่วนลดร้านดัง",
      sub: "รับส่วนลดเพิ่ม • จำกัดเวลา",
      img: "https://images.unsplash.com/photo-1520975958225-1baf0af5f3f1?auto=format&fit=crop&w=1400&q=80",
      url: "https://example.com",
    },
  ];

  // ======================================================
  // State
  // ======================================================
  let page = 1; // ⭐ หน้าเดียวคุม "ข่าวล่าสุด" + "ข่าวเพิ่มเติม"
  let state = { q: "", cat: "ทั้งหมด" };

  // ======================================================
  // Filter + Paging
  // ======================================================
  function getFilteredNews() {
    let items = [...ALL_NEWS];

    const q = (state.q || "").trim().toLowerCase();
    if (q) items = items.filter((n) => (n.title + " " + n.excerpt).toLowerCase().includes(q));

    const cat = (state.cat || "ทั้งหมด").trim();
    if (cat && cat !== "ทั้งหมด") items = items.filter((n) => n.cat === cat);

    // ล่าสุดก่อน
    items.sort((a, b) => a.minutesAgo - b.minutesAgo);

    // ⭐ จำกัดหมวดละ 3 หน้า (36 ข่าว)
    // - ถ้า "ทั้งหมด" ก็ยังจำกัด 3 หน้าเช่นกัน เพื่อกันเลื่อนยาว (ตามแนวที่คุณตั้งไว้)
    items = items.slice(0, MAX_ITEMS_PER_CAT);

    return items;
  }

  function getSearchOnlyNews() {
    let items = [...ALL_NEWS];
    const q = (state.q || "").trim().toLowerCase();
    if (q) items = items.filter((n) => (n.title + " " + n.excerpt).toLowerCase().includes(q));
    items.sort((a, b) => a.minutesAgo - b.minutesAgo);
    return items;
  }

  function getPageItems() {
    const items = getFilteredNews();
    const totalPages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(items.length / PAGE_SIZE)));
    if (page > totalPages) page = totalPages;

    const start = (page - 1) * PAGE_SIZE;
    const pageItems = items.slice(start, start + PAGE_SIZE);
    return { itemsAll: items, pageItems, totalPages, start };
  }

  // ======================================================
  // Hero Swiper
  // ======================================================
  let mainSwiper = null;

  function renderSwiper() {
    const html = SLIDES.map((s) => `
      <div class="swiper-slide position-relative">
        <img src="${s.img}" class="w-100 h-100" style="object-fit:cover" alt="">
        <div class="position-absolute top-0 start-0 w-100 h-100 news-gradient d-flex flex-column justify-content-end p-4 p-md-5 text-white">
          <span class="small fw-bold px-2 py-1 rounded" style="${s.tagStyle}">${escapeHtml(s.tag)}</span>
          <h2 class="font-kanit fw-bold mt-2" style="font-size: clamp(22px, 3vw, 38px); line-height:1.15">
            ${escapeHtml(s.title)}
          </h2>
          <p class="text-white-75 mt-2 line-clamp-2" style="max-width: 720px">
            ${escapeHtml(s.desc)}
          </p>
          <div class="mt-3 d-flex align-items-center gap-3 flex-wrap">
            <button class="btn fw-bold text-white" style="background: var(--bkk-red); border-radius: 12px">
              อ่านต่อ
            </button>
            <span class="small text-white-50">อัปเดต • 3 ก.พ. 2569</span>
          </div>
        </div>
      </div>
    `).join("");

    $("#swiper-wrapper").html(html);

    if (mainSwiper) {
      mainSwiper.destroy(true, true);
      mainSwiper = null;
    }

    mainSwiper = new Swiper(".mainSwiper", {
      loop: true,
      effect: "fade",
      fadeEffect: { crossFade: true },
      autoplay: { delay: 6000, disableOnInteraction: false },
      pagination: { el: ".swiper-pagination", clickable: true },
    });
  }

  // ======================================================
  // Must Read
  // ======================================================
  function renderMustRead() {
    const html = MUST_READ.map((x, idx) => `
      <div class="bg-white p-3 shadow-sm d-flex gap-3 border rounded-4 ${idx === 1 ? "border-start border-4" : ""}"
           style="${idx === 1 ? "border-left-color: var(--bkk-navy) !important;" : ""}">
        <img src="https://picsum.photos/id/${x.img}/120/120" class="rounded-3" style="width:96px;height:96px;object-fit:cover" alt="">
        <div class="flex-grow-1" style="min-width: 0">
          <div class="fw-bold small line-clamp-2">${escapeHtml(x.title)}</div>
          <div class="small text-muted mt-1">${escapeHtml(x.cat)} • ${escapeHtml(x.time)}</div>
        </div>
      </div>
    `).join("");

    $("#must-read").html(html);
  }

  // ======================================================
  // Latest (⭐ เปลี่ยนตาม "page" ด้วย)
  // ======================================================
  function renderNewsGrid() {
    const { pageItems } = getPageItems();
    const topItems = pageItems.slice(0, LATEST_TOP_COUNT);

    const html = topItems.map((n) => `
      <div class="col-md-6">
        <div class="bg-white rounded-4 overflow-hidden shadow-sm border h-100">
          <div class="position-relative">
            <img src="https://picsum.photos/id/${n.imgId}/900/520" class="w-100" style="height:180px;object-fit:cover" alt="">
            <div class="position-absolute top-0 start-0 p-3">
              <span class="ad-badge" style="background: rgba(0,45,98,.75)">news</span>
            </div>
          </div>
          <div class="p-3" style="border-top: 4px solid var(--bkk-navy)">
            <div class="d-flex align-items-center justify-content-between gap-2">
              <span class="text-red-bkk fw-bold text-uppercase" style="font-size: 12px">${escapeHtml(n.cat)}</span>
              <span class="small text-muted">${escapeHtml(n.timeAgo)}</span>
            </div>
            <div class="fw-bold mt-1 line-clamp-2">${escapeHtml(n.title)}</div>
            <div class="text-secondary small mt-2 line-clamp-2">${escapeHtml(n.excerpt)}</div>
            <div class="small text-muted mt-3">${escapeHtml(n.dateText)} • โดย ${escapeHtml(n.author)}</div>
          </div>
        </div>
      </div>
    `).join("");

    $("#news-grid").html(html);
  }

  // ======================================================
  // More (⭐ เหลือ 6 ข่าวท้ายของหน้าเดียวกัน)
  // ======================================================
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

        if (p === "prev") {
          return `<button class="btn-page" id="btnPagePrev" ${cur === 1 ? "disabled" : ""}>ก่อนหน้า</button>`;
        }
        if (p === "next") {
          return `<button class="btn-page" id="btnPageNext" ${cur === totalPages ? "disabled" : ""}>ถัดไป</button>`;
        }

        return `<button class="btn-page ${cur === p ? "active" : ""}" data-page="${p}">${p}</button>`;
      })
      .join("");

    $("#more-pagination").html(html);

    $("#btnPagePrev").off("click").on("click", function () {
      if (page > 1) {
        page--;
        renderLatestAndMore(); // ⭐ ให้ "ข่าวล่าสุด" เปลี่ยนด้วย
        document.getElementById("news-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    $("#btnPageNext").off("click").on("click", function () {
      if (page < totalPages) {
        page++;
        renderLatestAndMore(); // ⭐ ให้ "ข่าวล่าสุด" เปลี่ยนด้วย
        document.getElementById("news-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    $("#more-pagination").find("button[data-page]").off("click").on("click", function () {
      const p = parseInt($(this).attr("data-page"), 10);
      if (!Number.isFinite(p)) return;
      page = p;
      renderLatestAndMore(); // ⭐ ให้ "ข่าวล่าสุด" เปลี่ยนด้วย
      document.getElementById("news-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function renderMoreNews() {
    const { pageItems, itemsAll, totalPages, start } = getPageItems();

    const moreItems = pageItems.slice(LATEST_TOP_COUNT);
    const total = itemsAll.length;

    const html = moreItems.map((n) => `
      <div class="col-md-6 col-lg-4">
        <div class="bg-white rounded-4 overflow-hidden shadow-sm border h-100">
          <div class="position-relative">
            <img src="https://picsum.photos/id/${n.imgId}/900/520" class="w-100" style="height:160px;object-fit:cover" alt="">
            <div class="position-absolute top-0 start-0 p-3">
              <span class="ad-badge" style="background: rgba(0,45,98,.75)">news</span>
            </div>
          </div>
          <div class="p-3" style="border-top: 4px solid var(--bkk-navy)">
            <div class="d-flex align-items-center justify-content-between gap-2">
              <span class="text-red-bkk fw-bold text-uppercase" style="font-size: 12px">${escapeHtml(n.cat)}</span>
              <span class="small text-muted">${escapeHtml(n.timeAgo)}</span>
            </div>
            <div class="fw-bold mt-1 line-clamp-2">${escapeHtml(n.title)}</div>
            <div class="text-secondary small mt-2 line-clamp-2">${escapeHtml(n.excerpt)}</div>
            <div class="small text-muted mt-3">${escapeHtml(n.dateText)} • โดย ${escapeHtml(n.author)}</div>
          </div>
        </div>
      </div>
    `).join("");

    $("#more-news-grid").html(html || `<div class="text-muted small">ไม่มีข่าวเพิ่มเติมในหน้านี้</div>`);

    const from = total === 0 ? 0 : start + 1;
    const to = Math.min(start + PAGE_SIZE, total);
    $("#more-pagination-info").text(
      `แสดง ${from} - ${to} จากทั้งหมด ${total} ข่าว • หน้า ${page} / ${totalPages}` +
      (state.cat && state.cat !== "ทั้งหมด" ? ` • หมวด: ${state.cat} (มี 3 หน้า)` : ` • (รวม)`)
    );

    renderMorePagination(totalPages);
  }

  function renderLatestAndMore() {
    renderNewsGrid();
    renderMoreNews();
  }

  // ======================================================
  // Popular (ไม่กรองตามหมวด)
  // ======================================================
  function renderPopular() {
    const top = [...getSearchOnlyNews()]
      .sort((a, b) => b.popularScore - a.popularScore)
      .slice(0, POPULAR_COUNT);

    const html = top.map((n, idx) => `
      <div class="d-flex align-items-start gap-3 p-3 rounded-4 border bg-white">
        <div class="fw-bold text-white d-flex align-items-center justify-content-center"
             style="width: 32px; height: 32px; border-radius: 10px; background: var(--bkk-red)">
          ${idx + 1}
        </div>
        <div style="min-width:0" class="flex-grow-1">
          <div class="small text-muted mb-1">${escapeHtml(n.cat)} • ${escapeHtml(n.timeAgo)}</div>
          <div class="fw-bold small line-clamp-2">${escapeHtml(n.title)}</div>
        </div>
      </div>
    `).join("");

    $("#popular-list").html(html);
  }

  // ======================================================
  // Editors Picks
  // ======================================================
  function renderEditorsPicks() {
    const html = EDITOR_PICKS.map((p) => `
      <div class="col-md-4">
        <div class="rounded-4 overflow-hidden border bg-white h-100">
          <img src="https://picsum.photos/id/${p.img}/800/600" class="w-100" style="height:160px;object-fit:cover" alt="">
          <div class="p-3">
            <div class="text-red-bkk fw-bold" style="font-size: 12px">${escapeHtml(p.cat)}</div>
            <div class="fw-bold mt-1 line-clamp-2">${escapeHtml(p.title)}</div>
            <div class="small text-muted mt-2">3 ก.พ. 2569 • แนะนำโดยกองบรรณาธิการ</div>
          </div>
        </div>
      </div>
    `).join("");

    $("#editors-picks").html(html);
  }

  // ======================================================
  // Topic Sections (ถ้าเลือกหมวดเดียว จะโชว์หมวดนั้น)
  // ======================================================
  function buildMiniCard(n) {
    return `
      <article class="mini-card h-100">
        <img class="mini-img" src="https://picsum.photos/id/${n.imgId}/900/520" alt="">
        <div class="mini-body">
          <div class="d-flex align-items-center justify-content-between gap-2">
            <span class="mini-cat">${escapeHtml(n.cat)}</span>
            <span class="small text-muted">${escapeHtml(n.timeAgo)}</span>
          </div>
          <div class="fw-bold mt-2 line-clamp-2">${escapeHtml(n.title)}</div>
          <div class="text-secondary small mt-2 line-clamp-2">${escapeHtml(n.excerpt)}</div>
          <div class="small text-muted mt-3">${escapeHtml(n.dateText)} • ${escapeHtml(n.author)}</div>
        </div>
      </article>
    `;
  }

  function renderTopicSections() {
    const items = getFilteredNews();
    const cats = (state.cat && state.cat !== "ทั้งหมด") ? [state.cat] : CATEGORIES.slice(1);

    const html = cats.map((cat) => {
      const list = items.filter((x) => x.cat === cat).slice(0, 6);

      const grid = list.map((n) => `
        <div class="col-md-6 col-lg-4">
          ${buildMiniCard(n)}
        </div>
      `).join("");

      return `
        <section>
          <div class="d-flex align-items-end justify-content-between gap-3 mb-2 flex-wrap">
            <div>
              <div class="bbc-kicker">${escapeHtml(cat)}</div>
              <div class="bbc-section-title">${escapeHtml(cat)}</div>
            </div>
            <a href="#" class="fw-bold small text-red-bkk text-decoration-none">ดูทั้งหมด ></a>
          </div>

          <div class="row g-3">
            ${grid || `<div class="text-muted small">ไม่มีข้อมูลในหมวดนี้ (mock)</div>`}
          </div>
        </section>
      `;
    }).join("");

    $("#topicSections").html(html);
  }

  // ======================================================
  // In Pictures (กรองตามหมวด)
  // ======================================================
  function renderInPictures() {
    const items = getFilteredNews();
    const hero = items[0] || ALL_NEWS[0];

    $("#pictureHeroImg").attr("src", `https://picsum.photos/id/${hero.imgId}/1600/900`);
    $("#pictureHeroCat").text(hero.cat);
    $("#pictureHeroTime").text(hero.timeAgo);
    $("#pictureHeroTitle").text(hero.title);
    $("#pictureHeroDesc").text(hero.excerpt);

    const minis = items.slice(1, 4);
    const html = minis.map((n) => `
      <div class="col-md-4">
        <div class="bg-white rounded-4 border overflow-hidden h-100">
          <img src="https://picsum.photos/id/${n.imgId}/900/520" class="w-100" style="height:160px;object-fit:cover" alt="">
          <div class="p-3">
            <div class="d-flex align-items-center justify-content-between gap-2">
              <span class="text-red-bkk fw-bold text-uppercase" style="font-size: 12px">${escapeHtml(n.cat)}</span>
              <span class="small text-muted">${escapeHtml(n.timeAgo)}</span>
            </div>
            <div class="fw-bold mt-1 line-clamp-2">${escapeHtml(n.title)}</div>
            <div class="text-secondary small mt-2 line-clamp-2">${escapeHtml(n.excerpt)}</div>
          </div>
        </div>
      </div>
    `).join("");

    $("#pictureMiniGrid").html(html);
  }

  // ======================================================
  // Watch rail (ไม่กรองตามหมวด)
  // ======================================================
  let watchSwiper = null;

  function renderWatchRail() {
    const items = [...getSearchOnlyNews()]
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 10);

    const list = [...items, ...items];

    const html = list.map((n) => `
      <div class="swiper-slide">
        <div class="rail-card">
          <div class="rail-thumb">
            <img src="https://picsum.photos/id/${n.imgId}/900/520" alt="">
            <div class="play-badge">▶ watch</div>
          </div>
          <div class="p-3">
            <div class="small text-white-50 mb-2">${escapeHtml(n.cat)} • ${escapeHtml(n.timeAgo)}</div>
            <div class="fw-bold text-white line-clamp-2">${escapeHtml(n.title)}</div>
            <div class="small text-white-50 mt-2">Mock video • 2:34</div>
          </div>
        </div>
      </div>
    `).join("");

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

  // ======================================================
  // Footer ads
  // ======================================================
  let footerAdSwiper = null;

  function renderFooterAds() {
    const list = [...FOOTER_ADS, ...FOOTER_ADS];

    const html = list.map((ad) => `
      <div class="swiper-slide">
        <a class="ad-banner" href="${ad.url}" target="_blank" rel="noopener noreferrer" aria-label="โฆษณา">
          <img src="${ad.img}" alt="">
          <div class="ad-meta">
            <div style="min-width:0">
              <div class="ad-title line-clamp-2">${escapeHtml(ad.title)}</div>
              <div class="ad-sub line-clamp-2">${escapeHtml(ad.sub)}</div>
            </div>
            <span class="ad-badge" style="background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.18)">ad</span>
          </div>
        </a>
      </div>
    `).join("");

    $("#footerAdWrapper").html(html);

    if (footerAdSwiper) {
      footerAdSwiper.destroy(true, true);
      footerAdSwiper = null;
    }

    footerAdSwiper = new Swiper(".footerAdSwiper", {
      slidesPerView: 1,
      spaceBetween: 12,
      loop: true,
      speed: 900,
      autoplay: { delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true },
      navigation: { prevEl: "#adPrev", nextEl: "#adNext" },
      breakpoints: { 768: { slidesPerView: 2 } },
    });
  }

  // ======================================================
  // Auth (Mock)
  // ======================================================
  const AUTH_KEY = "bkk_today_user";

  function getUser() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); }
    catch { return null; }
  }
  function setUser(user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    renderAuthUI();
  }
  function clearUser() {
    localStorage.removeItem(AUTH_KEY);
    renderAuthUI();
  }

  function showAuthMsg(msg) {
    if (!msg) { $("#authMsg").addClass("d-none").text(""); return; }
    $("#authMsg").removeClass("d-none").text(msg);
  }

  function setAuthTab(tab) {
    if (tab === "register") {
      $("#tabLogin").removeClass("active");
      $("#tabRegister").addClass("active");
      $("#loginForm").addClass("d-none");
      $("#registerForm").removeClass("d-none");
    } else {
      $("#tabRegister").removeClass("active");
      $("#tabLogin").addClass("active");
      $("#registerForm").addClass("d-none");
      $("#loginForm").removeClass("d-none");
    }
    showAuthMsg("");
  }

  function openAuthModal(mode) {
    $("#authModal").addClass("show");
    $("body").css("overflow", "hidden");
    setAuthTab(mode || "login");
  }
  function closeAuthModal() {
    $("#authModal").removeClass("show");
    $("body").css("overflow", "");
    showAuthMsg("");
  }

  function renderAuthUI() {
    const user = getUser();
    if (user) {
      $("#authButtons").addClass("d-none");
      $("#userMenu").removeClass("d-none").addClass("d-flex");
      $("#userName").text(user.name || "Member");

      const ch = (user.name || "U").trim().slice(0, 1).toUpperCase();
      $("#userAvatar").text(ch || "U");
    } else {
      $("#userMenu").addClass("d-none").removeClass("d-flex");
      $("#authButtons").removeClass("d-none");
      $("#userAvatar").text("U");
    }
  }

  function bindAuth() {
    $("#btnOpenLogin").on("click", () => openAuthModal("login"));
    $("#btnOpenRegister").on("click", () => openAuthModal("register"));
    $("#btnCloseAuth").on("click", closeAuthModal);

    $("#authModal").on("click", function (e) {
      if (e.target.id === "authModal") closeAuthModal();
    });
    $(document).on("keydown", function (e) {
      if (e.key === "Escape") closeAuthModal();
    });

    $("#tabLogin").on("click", () => setAuthTab("login"));
    $("#tabRegister").on("click", () => setAuthTab("register"));

    $("#btnLogout").on("click", () => clearUser());

    $("#loginForm").on("submit", function (e) {
      e.preventDefault();
      const email = $("#loginEmail").val().trim();
      const pwd = $("#loginPassword").val().trim();
      if (!email || !pwd) return showAuthMsg("กรุณากรอกอีเมลและรหัสผ่าน");

      const name = email.split("@")[0].slice(0, 12);
      setUser({ name, email });
      closeAuthModal();
    });

    $("#registerForm").on("submit", function (e) {
      e.preventDefault();
      const first = $("#regFirst").val().trim();
      const last = $("#regLast").val().trim();
      const email = $("#regEmail").val().trim();
      const p1 = $("#regPassword").val().trim();
      const p2 = $("#regPassword2").val().trim();

      if (!first || !last || !email || !p1 || !p2) return showAuthMsg("กรุณากรอกข้อมูลให้ครบ");
      if (p1.length < 6) return showAuthMsg("รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร");
      if (p1 !== p2) return showAuthMsg("รหัสผ่านไม่ตรงกัน");

      setUser({ name: `${first} ${last}`, email });
      closeAuthModal();
    });
  }

  // ======================================================
  // Sponsors (marquee)
  // ======================================================
  function buildSponsorPill(s) {
    return `
      <a class="sponsor-pill" href="${s.url}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(s.name)}">
        <span class="sponsor-mark" style="background:${s.color}">${escapeHtml(s.mark)}</span>
        <span style="min-width:0">
          <div class="sponsor-name">${escapeHtml(s.name)}</div>
          <div class="sponsor-sub">${escapeHtml(s.tag)}</div>
        </span>
      </a>
    `;
  }

  function renderLogoMarquee() {
    const list = [...SPONSORS, ...SPONSORS];
    $("#logoTrack").html(list.map(buildSponsorPill).join(""));
  }

  // ======================================================
  // Scroll-follow ad
  // ======================================================
  function bindScrollAd() {
    const DISMISS_KEY = "bkk_scroll_ad_dismissed";
    let dismissed = localStorage.getItem(DISMISS_KEY) === "1";

    const sponsor = pick(SPONSORS);
    $("#scrollAdLink").attr("href", sponsor.url);

    $("#closeScrollAd").on("click", function () {
      $("#scrollAd").removeClass("show");
      dismissed = true;
      localStorage.setItem(DISMISS_KEY, "1");
    });

    const onScroll = () => {
      if (dismissed) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? scrollTop / docHeight : 0;

      if (pct >= 0.3) $("#scrollAd").addClass("show");
      else $("#scrollAd").removeClass("show");
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ======================================================
  // Top Search
  // ======================================================
  function bindTopSearch() {
    $("#topSearch").on("input", function () {
      state.q = ($(this).val() || "").toString();
      page = 1;
      renderAll();
    });
  }

  // ======================================================
  // Navbar Category filter
  // ======================================================
  function setActiveNav(cat) {
    const c = cat || "ทั้งหมด";
    const $links = $("nav a.nav-cat");
    $links.removeClass("active");
    $links.each(function () {
      const linkCat = $(this).attr("data-cat") || "ทั้งหมด";
      if (linkCat === c) $(this).addClass("active");
      if (c === "ทั้งหมด" && $(this).text().includes("หน้าแรก")) $(this).addClass("active");
    });
  }

  function bindNavbarCategories() {
    setActiveNav(state.cat);

    $("nav").off("click.navcat").on("click.navcat", "a.nav-cat", function (e) {
      e.preventDefault();
      const cat = $(this).attr("data-cat") || "ทั้งหมด";

      state.cat = cat;
      page = 1;

      setActiveNav(cat);
      renderAll();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ======================================================
  // Render all
  // ======================================================
  function renderAll() {
    renderLatestAndMore(); // ⭐ ข่าวล่าสุด + ข่าวเพิ่มเติม เปลี่ยนพร้อมกัน
    renderPopular();
    renderEditorsPicks();
    renderInPictures();
    renderWatchRail();
    renderFooterAds();
    renderTopicSections();
  }

  // ======================================================
  // Date header
  // ======================================================
  function renderHeaderDate() {
    const d = new Date();
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    $("#dayName").text(days[d.getDay()]);
    $("#dayDate").text(d.toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" }));
  }

  // ======================================================
  // Init
  // ======================================================
  renderHeaderDate();
  renderLogoMarquee();
  bindScrollAd();

  renderSwiper();
  renderMustRead();
  bindTopSearch();

  bindNavbarCategories();
  renderAll();

  bindAuth();
  renderAuthUI();
});
