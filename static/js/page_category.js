// category.js (Mock UI for Category/Subcategory)
(() => {
  const MAIN = {
    id: "thailand",
    name: "ทั่วไทย",
    subs: [
      { id: "latest", name: "ล่าสุด" },
      { id: "south", name: "ใต้" },
      { id: "bkk", name: "กทม." },
      { id: "north", name: "เหนือ" },
      { id: "central", name: "กลาง" },
      { id: "isan", name: "อีสาน" },
      { id: "east", name: "ตะวันออก" },
      { id: "local-econ", name: "เศรษฐกิจท้องถิ่น" },
    ],
  };

  const state = {
    sub: null,
    q: "",
    page: 1,
    pageSize: 9,
  };

  const el = {
    mainTitle: document.getElementById("mainTitle"),
    subTitleWrap: document.getElementById("subTitleWrap"),
    subTitle: document.getElementById("subTitle"),
    bcMain: document.getElementById("bcMain"),
    bcSubWrap: document.getElementById("bcSubWrap"),
    bcSub: document.getElementById("bcSub"),
    subChips: document.getElementById("subChips"),
    moreSubChips: document.getElementById("moreSubChips"),
    resultInfo: document.getElementById("resultInfo"),
    searchInput: document.getElementById("searchInput"),
    newsGrid: document.getElementById("newsGrid"),
    pagination: document.getElementById("pagination"),
    pageInfo: document.getElementById("pageInfo"),
    hotList: document.getElementById("hotList"),
    subPills: document.getElementById("subPills"),
  };

  const NEWS = makeMockNews();

  initFromUrl();
  bindEvents();
  renderAll();

  function initFromUrl() {
    const u = new URL(window.location.href);
    const sub = u.searchParams.get("sub");
    const q = u.searchParams.get("q");
    const page = parseInt(u.searchParams.get("page") || "1", 10);

    state.sub = sub || null;
    state.q = q || "";
    state.page = isNaN(page) ? 1 : Math.max(1, page);

    if (el.searchInput) el.searchInput.value = state.q;
  }

  function syncUrl() {
    const u = new URL(window.location.href);

    if (state.sub) u.searchParams.set("sub", state.sub);
    else u.searchParams.delete("sub");

    if (state.q.trim()) u.searchParams.set("q", state.q.trim());
    else u.searchParams.delete("q");

    u.searchParams.set("page", String(state.page));
    window.history.replaceState({}, "", u.toString());
  }

  function bindEvents() {
    if (!el.searchInput) return;
    el.searchInput.addEventListener("input", () => {
      state.q = el.searchInput.value || "";
      state.page = 1;
      syncUrl();
      renderAll();
    });
  }

  function renderAll(scrollTop = false) {
    el.mainTitle.textContent = MAIN.name;
    el.bcMain.textContent = MAIN.name;

    if (state.sub) {
      const sn = getSubName(state.sub);
      el.bcSub.textContent = sn;
      el.bcSubWrap.classList.remove("d-none");

      el.subTitle.textContent = sn;
      el.subTitleWrap.classList.remove("d-none");

      el.moreSubChips.classList.remove("d-none");
    } else {
      el.bcSubWrap.classList.add("d-none");
      el.subTitleWrap.classList.add("d-none");
      el.moreSubChips.classList.add("d-none");
    }

    renderChips();
    renderSubPills();

    const rows = getFilteredNews();
    el.resultInfo.textContent = `พบ ${rows.length.toLocaleString("th-TH")} ข่าว`;

    const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.pageSize;
    const items = rows.slice(start, start + state.pageSize);

    renderGrid(items);
    renderPagination(totalPages, rows.length);
    renderHot(rows.slice(0, 6));

    if (scrollTop) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderChips() {
    el.subChips.innerHTML = "";
    MAIN.subs.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cat-chip";
      b.textContent = s.name;
      if (state.sub === s.id) b.classList.add("active-red");

      b.addEventListener("click", () => {
        state.sub = s.id;
        state.page = 1;
        syncUrl();
        renderAll(true);
      });

      el.subChips.appendChild(b);
    });

    el.moreSubChips.innerHTML = "";
    if (!state.sub) return;

    MAIN.subs
      .filter((x) => x.id !== state.sub)
      .forEach((s) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "cat-chip";
        b.textContent = s.name;

        b.addEventListener("click", () => {
          state.sub = s.id;
          state.page = 1;
          syncUrl();
          renderAll(true);
        });

        el.moreSubChips.appendChild(b);
      });
  }

  function renderSubPills() {
    el.subPills.innerHTML = "";
    MAIN.subs.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sub-pill";
      b.textContent = s.name;
      if (state.sub === s.id) b.classList.add("active");

      b.addEventListener("click", () => {
        state.sub = s.id;
        state.page = 1;
        syncUrl();
        renderAll(true);
      });

      el.subPills.appendChild(b);
    });
  }

  function renderGrid(items) {
    el.newsGrid.innerHTML = "";

    if (!items.length) {
      el.newsGrid.innerHTML = `
        <div class="col-12">
          <div class="alert alert-light border rounded-4 mb-0">
            <div class="fw-bold text-navy-bkk">ไม่พบข่าว</div>
            <div class="small text-muted">ลองค้นหาใหม่หรือเปลี่ยนหัวข้อย่อยดูนะ</div>
          </div>
        </div>
      `;
      return;
    }

    items.forEach((n) => {
      const col = document.createElement("div");
      col.className = "col-md-6 col-xl-4";
      col.innerHTML = `
        <article class="cat-card" data-id="${n.id}">
          <img class="cat-card-img" src="${n.cover}" alt="${escapeHtml(n.title)}" />
          <div class="cat-card-body">
            <div class="cat-tag-row">
              <span class="cat-tag">${MAIN.name}</span>
              <span class="cat-tag-sub">${n.subName}</span>
              <span class="ms-auto small text-muted fw-bold">${n.dateText}</span>
            </div>

            <h3 class="cat-card-title line-clamp-2">${escapeHtml(n.title)}</h3>
            <p class="cat-card-desc line-clamp-3">${escapeHtml(n.desc)}</p>

            <div class="cat-meta">
              <span>👁 ${n.views.toLocaleString("th-TH")}</span>
              <span class="dot"></span>
              <span>⏱ ${n.readMin} นาที</span>
            </div>
          </div>
        </article>
      `;

      col.querySelector(".cat-card").addEventListener("click", () => {
        alert(`ไปหน้าอ่านข่าว: ${n.title}\n(ตอนนี้เป็น mock UI ยังไม่เชื่อมจริง)`);
      });

      el.newsGrid.appendChild(col);
    });
  }

  function renderPagination(totalPages, totalItems) {
    el.pagination.innerHTML = "";

    const from = totalItems ? (state.page - 1) * state.pageSize + 1 : 0;
    const to = Math.min(totalItems, state.page * state.pageSize);
    el.pageInfo.textContent = `แสดง ${from}-${to} จาก ${totalItems.toLocaleString("th-TH")} ข่าว`;

    if (totalPages <= 1) return;

    const mk = (label, page, active = false, disabled = false) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn-page";
      b.textContent = label;
      if (active) b.classList.add("active");
      if (disabled) b.disabled = true;

      b.addEventListener("click", () => {
        if (b.disabled) return;
        state.page = page;
        syncUrl();
        renderAll(true);
      });
      return b;
    };

    el.pagination.appendChild(mk("◀", Math.max(1, state.page - 1), false, state.page === 1));

    const win = 2;
    const start = Math.max(1, state.page - win);
    const end = Math.min(totalPages, state.page + win);

    if (start > 1) el.pagination.appendChild(mk("1", 1, state.page === 1));
    if (start > 2) el.pagination.appendChild(mk("…", start - 1));

    for (let p = start; p <= end; p++) {
      el.pagination.appendChild(mk(String(p), p, state.page === p));
    }

    if (end < totalPages - 1) el.pagination.appendChild(mk("…", end + 1));
    if (end < totalPages) el.pagination.appendChild(mk(String(totalPages), totalPages, state.page === totalPages));

    el.pagination.appendChild(mk("▶", Math.min(totalPages, state.page + 1), false, state.page === totalPages));
  }

  function renderHot(items) {
    el.hotList.innerHTML = "";
    if (!items.length) return;

    items.forEach((n) => {
      const row = document.createElement("div");
      row.className = "hot-item";
      row.innerHTML = `
        <div class="hot-thumb"><img src="${n.cover}" alt="${escapeHtml(n.title)}" /></div>
        <div>
          <div class="hot-title line-clamp-2">${escapeHtml(n.title)}</div>
          <div class="hot-meta">${n.subName} • 👁 ${n.views.toLocaleString("th-TH")}</div>
        </div>
      `;
      row.addEventListener("click", () => alert(`ไปหน้าอ่านข่าว (HOT): ${n.title}`));
      el.hotList.appendChild(row);
    });
  }

  function getFilteredNews() {
    const q = (state.q || "").trim().toLowerCase();
    let rows = NEWS.slice();

    if (state.sub) rows = rows.filter((n) => n.subId === state.sub);

    if (q) {
      rows = rows.filter((n) => {
        return (
          n.title.toLowerCase().includes(q) ||
          n.desc.toLowerCase().includes(q) ||
          n.subName.toLowerCase().includes(q)
        );
      });
    }

    rows.sort((a, b) => b.ts - a.ts); // default ใหม่สุด
    return rows;
  }

  function getSubName(id) {
    const s = MAIN.subs.find((x) => x.id === id);
    return s ? s.name : "—";
  }

  function makeMockNews() {
    const covers = [
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1544986581-efac024faf62?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1540648639573-1cae82f33fe0?auto=format&fit=crop&w=1200&q=70",
      "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=1200&q=70",
    ];

    const baseTitles = [
      "ชาวบ้านแตกตื่น! ฝนถล่มหนัก น้ำป่าไหลหลาก",
      "เร่งช่วยผู้ประสบภัย พื้นที่เสี่ยงเฝ้าระวังทั้งคืน",
      "จราจรติดสะสม เปิดเส้นทางเลี่ยงด่วน",
      "เตือนพายุเข้า กระทบหลายจังหวัด",
      "จับตาราคาอาหารสด ปรับขึ้นต่อเนื่อง",
      "อัปเดตเหตุการณ์ด่วน รายงานสดจากพื้นที่",
      "ชาวเน็ตแชร์คลิปวินาทีระทึก",
      "เจ้าหน้าที่ระดมกำลัง คุมสถานการณ์",
      "พบผู้สูญหาย เร่งค้นหาอย่างต่อเนื่อง",
      "ประกาศปิดโรงเรียนบางแห่งชั่วคราว",
    ];

    const now = Date.now();
    const out = [];
    let id = 1000;

    MAIN.subs.forEach((s, si) => {
      for (let i = 0; i < 12; i++) {
        const title = `${baseTitles[(i + si) % baseTitles.length]} (${s.name})`;
        const ts = now - (si * 7 + i) * 3600 * 1000;

        const dateText = new Date(ts).toLocaleString("th-TH", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        out.push({
          id: id++,
          subId: s.id,
          subName: s.name,
          title,
          desc: "สรุปสถานการณ์ล่าสุดแบบกระชับ อ่านต่อเพื่อรายละเอียด (mock).",
          cover: covers[(i + si) % covers.length],
          ts,
          dateText,
          views: Math.floor(500 + Math.random() * 80000),
          readMin: 2 + Math.floor(Math.random() * 7),
        });
      }
    });

    return out;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
