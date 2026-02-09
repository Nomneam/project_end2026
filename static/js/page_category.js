(() => {
  /* =========================
   * CONFIG
   * ========================= */
  const MAIN = {
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
    page: 1,
    pageSize: 15, // ⭐ 15 ข่าว / หน้า
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
    newsGrid: document.getElementById("newsGrid"),
    pagination: document.getElementById("pagination"),
    pageInfo: document.getElementById("pageInfo"),
  };

  const NEWS = makeMockNews();

  initFromUrl();
  renderAll();

  /* =========================
   * URL
   * ========================= */
  function initFromUrl() {
    const u = new URL(window.location.href);
    state.sub = u.searchParams.get("sub");
    state.page = parseInt(u.searchParams.get("page") || "1", 10);
  }

  function syncUrl() {
    const u = new URL(window.location.href);
    state.sub ? u.searchParams.set("sub", state.sub) : u.searchParams.delete("sub");
    u.searchParams.set("page", state.page);
    window.history.replaceState({}, "", u.toString());
  }

  /* =========================
   * RENDER
   * ========================= */
  function renderAll(scrollTop = false) {
    el.mainTitle.textContent = MAIN.name;
    el.bcMain.textContent = MAIN.name;

    if (state.sub) {
      const sn = getSubName(state.sub);
      el.bcSub.textContent = sn;
      el.subTitle.textContent = sn;
      el.bcSubWrap.classList.remove("d-none");
      el.subTitleWrap.classList.remove("d-none");
      el.moreSubChips.classList.remove("d-none");
    } else {
      el.bcSubWrap.classList.add("d-none");
      el.subTitleWrap.classList.add("d-none");
      el.moreSubChips.classList.add("d-none");
    }

    renderChips();

    const rows = state.sub ? NEWS.filter(n => n.subId === state.sub) : NEWS.slice();
    el.resultInfo.textContent = `พบ ${rows.length.toLocaleString("th-TH")} ข่าว`;

    const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    state.page = Math.min(state.page, totalPages);

    const start = (state.page - 1) * state.pageSize;
    renderGrid(rows.slice(start, start + state.pageSize));
    renderPagination(totalPages);

    if (scrollTop) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderChips() {
    el.subChips.innerHTML = "";
    el.moreSubChips.innerHTML = "";

    MAIN.subs.forEach(s => {
      const b = document.createElement("button");
      b.className = "cat-chip" + (state.sub === s.id ? " active-red" : "");
      b.textContent = s.name;
      b.onclick = () => {
        state.sub = s.id;
        state.page = 1;
        syncUrl();
        renderAll(true);
      };
      el.subChips.appendChild(b);
    });
  }

  /* =========================
   * NEWS CARD (เหมือนหน้า index)
   * ========================= */
  function renderGrid(items) {
    el.newsGrid.innerHTML = "";

    items.forEach(n => {
      el.newsGrid.insertAdjacentHTML("beforeend", `
        <div class="col-md-6 col-xl-4">
          <article class="cat-card h-100">
            <div class="position-relative">
              <img class="cat-card-img" src="${n.cover}" alt="">
              <span class="position-absolute top-0 start-0 m-2 badge rounded-pill bg-primary">
                NEWS
              </span>
            </div>

            <div class="cat-card-body">
              <div class="cat-tag-row">
                <span class="cat-tag">${getSubName(n.subId)}</span>
              </div>

              <h3 class="cat-card-title line-clamp-2">${n.title}</h3>
              <p class="cat-card-desc line-clamp-3">${n.desc}</p>

              <div class="cat-meta">
                <span>${fmtDateTH(n.createdAt)}</span>
                <span class="dot"></span>
                <span>${timeAgo(n.createdAt)}</span>
              </div>
            </div>
          </article>
        </div>
      `);
    });
  }

  function renderPagination(totalPages) {
    el.pagination.innerHTML = "";
    el.pageInfo.textContent = `หน้า ${state.page} / ${totalPages}`;

    if (totalPages <= 1) return;

    const btn = (t, p) => {
      const b = document.createElement("button");
      b.className = "btn-page" + (p === state.page ? " active" : "");
      b.textContent = t;
      b.onclick = () => {
        state.page = p;
        syncUrl();
        renderAll(true);
      };
      return b;
    };

    if (state.page > 1) el.pagination.appendChild(btn("◀", state.page - 1));
    for (let i = 1; i <= totalPages; i++) el.pagination.appendChild(btn(i, i));
    if (state.page < totalPages) el.pagination.appendChild(btn("▶", state.page + 1));
  }

  /* =========================
   * HELPERS
   * ========================= */
  function getSubName(id) {
    return MAIN.subs.find(s => s.id === id)?.name || "ข่าว";
  }

  function fmtDateTH(d) {
    const date = new Date(d);
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function timeAgo(d) {
    const diff = Math.floor((Date.now() - new Date(d)) / 1000);
    if (diff < 60) return `${diff} วินาทีที่แล้ว`;
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    return `${Math.floor(diff / 86400)} วันที่แล้ว`;
  }

  /* =========================
   * MOCK DATA
   * ========================= */
  function makeMockNews() {
    return Array.from({ length: 48 }).map((_, i) => {
      const hoursAgo = Math.floor(Math.random() * 72);
      return {
        id: i,
        subId: MAIN.subs[i % MAIN.subs.length].id,
        title: `ข่าวตัวอย่างลำดับที่ ${i + 1}`,
        desc: "สรุปข่าวแบบ mock สำหรับออกแบบ UI ให้เหมือนหน้า index มากที่สุด",
        cover: `https://picsum.photos/600/400?random=${i + 20}`,
        createdAt: Date.now() - hoursAgo * 3600 * 1000,
      };
    });
  }
})();
