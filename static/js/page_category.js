(() => {
  const state = {
    cat_id: window.PAGE_STATE.cat_id,
    subcat_id: window.PAGE_STATE.subcat_id || null,
    page: 1,
    pageSize: 15, // จะถูก sync จาก API
    total: 0,
    categoryName: "",
    subcatName: "",
    subs: [],
    items: [],
  };

  const el = {
    mainTitle: document.getElementById("mainTitle"),
    subTitleWrap: document.getElementById("subTitleWrap"),
    subTitle: document.getElementById("subTitle"),
    bcMain: document.getElementById("bcMain"),
    bcSubWrap: document.getElementById("bcSubWrap"),
    bcSub: document.getElementById("bcSub"),
    subChips: document.getElementById("subChips"),
    resultInfo: document.getElementById("resultInfo"),
    newsGrid: document.getElementById("newsGrid"),
    pagination: document.getElementById("pagination"),
    pageInfo: document.getElementById("pageInfo"),
  };

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


  loadData();
  loadCatHeroAd();

  // =============================
  // LOAD
  // =============================
  async function loadData(scrollTop = false) {
    const params = new URLSearchParams({
      cat_id: state.cat_id,
      page: state.page,
    });

    if (state.subcat_id) {
      params.append("subcat_id", state.subcat_id);
    }

    const res = await fetch(`/api/page_category?${params}`);
    const data = await res.json();

    state.items = data.items;
    state.subs = data.subs;
    state.total = data.total;
    state.pageSize = data.pageSize;
    state.categoryName = data.category_name;
    state.subcatName = data.subcat_name;

    renderAll();
    renderPagination();

    if (scrollTop) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }


  let bigCatHeroAdSwiper = null;

  async function loadCatHeroAd() {
  const container = document.getElementById("bigCatHeroAd");
  const wrapper = document.getElementById("bigCatHeroAdWrapper");
  if (!container || !wrapper) return;

  try {
    const res = await fetch("/api/ads/cathero");
    const data = await res.json();

    const items = data?.items || [];
    if (!data.ok || !items.length) {
      container.style.display = "none";
      return;
    }

    wrapper.innerHTML = items
      .map((ad) => `
        <div class="swiper-slide">
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
        </div>
      `)
      .join("");

    if (bigCatHeroAdSwiper) {
      bigCatHeroAdSwiper.destroy(true, true);
      bigCatHeroAdSwiper = null;
    }

    bigCatHeroAdSwiper = new Swiper(".bigCatHeroAdSwiper", {
      slidesPerView: 1,
      loop: items.length > 1,
      autoplay: { delay: 4500, disableOnInteraction: false },
      navigation: {
        nextEl: "#bigCatHeroAdNext",
        prevEl: "#bigCatHeroAdPrev",
      },
    });

  } catch (err) {
    console.error("Hero Ad Load Error:", err);
    container.style.display = "none";
  }
}


  // =============================
  // RENDER
  // =============================
  function renderAll() {
    el.mainTitle.textContent = state.subcatName || state.categoryName;
    el.bcMain.textContent = state.categoryName;

    if (state.subcat_id) {
      el.bcSub.textContent = state.subcatName;
      el.subTitle.textContent = state.subcatName;
      el.bcSubWrap.classList.remove("d-none");
      el.subTitleWrap.classList.remove("d-none");
    } else {
      el.bcSubWrap.classList.add("d-none");
      el.subTitleWrap.classList.add("d-none");
    }

    renderChips();
    renderGrid();

  }

  function renderChips() {
    el.subChips.innerHTML = "";

    state.subs.forEach((s) => {
      const btn = document.createElement("button");
      btn.className =
        "cat-chip" + (state.subcat_id == s.subcat_id ? " active-red" : "");
      btn.textContent = s.subcat_name;

      btn.onclick = () => {
        state.subcat_id = s.subcat_id;
        state.page = 1;
        updateUrl();
        loadData(true);
      };

      el.subChips.appendChild(btn);
    });
  }

  function renderGrid() {
    el.newsGrid.innerHTML = "";

    if (!state.items.length) {
      el.newsGrid.innerHTML =
        `<div class="text-center text-muted py-5">ไม่พบข่าว</div>`;
      return;
    }

    state.items.forEach((n) => {
      el.newsGrid.insertAdjacentHTML(
        "beforeend",
        `
        <div class="col-md-6 col-xl-4">
        <a href="/news/${n.news_id}"
            class="text-decoration-none text-dark d-block h-100">
          <article class="cat-card h-100">
            <img
              class="cat-card-img"
              src="${
                n.cover_image
                  ? '/static/' + n.cover_image
                  : '/static/img/no-image.jpg'
              }"
              alt="${n.title}"
            />
            <div class="position-absolute top-0 start-0 p-3">
                  <span class="ad-badge ad-badge-news">news</span>
                </div>
          <div class="cat-card-body">
            <div class="d-flex align-items-center justify-content-between gap-2">
              <span class="text-red-bkk fw-bold text-uppercase latest-cat">${escapeHtml(safeText(n.subcat_name || state.categoryName))}</span>
              <span class="small text-muted">
                ${escapeHtml(n.time_ago || "—")}
              </span>
            </div>
              <div class="fw-bold mt-1 line-clamp-2">${escapeHtml(safeText(n.title))}</div>
              <div class="text-secondary small mt-2 line-clamp-2">${escapeHtml(safeText(n.summary || ""))}</div>
              <div class="small text-muted mt-3">${escapeHtml(fmtDateTH(n.published_at))}</div>
          </div>
          </article>
          </a>
        </div>
        `
      );
    });
  }

  // =============================
  // PAGINATION (style เดียวกับ index)
  // =============================
  function renderPagination() {
  el.pagination.innerHTML = "";
  el.pageInfo.textContent = "";

  const totalPages = Math.ceil(state.total / state.pageSize);
  if (totalPages < 1) return;

  const cur = state.page;
  const pages = [];

  pages.push("prev");

  const start = Math.max(1, cur - 1);
  const end = Math.min(totalPages, cur + 1);

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("...");
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);
  }

  pages.push("next");

    el.pagination.innerHTML = pages
      .map((p) => {
        if (p === "...") {
          return `<span class="px-2 text-muted">…</span>`;
        }

        if (p === "prev") {
          return `
            <button class="btn-page" id="btnPagePrev" ${
              cur === 1 ? "disabled" : ""
            }>ก่อนหน้า</button>`;
        }

        if (p === "next") {
          return `
            <button class="btn-page" id="btnPageNext" ${
              cur === totalPages ? "disabled" : ""
            }>ถัดไป</button>`;
        }

        return `
          <button class="btn-page ${cur === p ? "active" : ""}"
            data-page="${p}">${p}</button>`;
      })
      .join("");

    document.getElementById("btnPagePrev")?.addEventListener("click", () => {
      if (state.page > 1) {
        state.page--;
        loadData(true);
      }
    });

    document.getElementById("btnPageNext")?.addEventListener("click", () => {
      if (state.page < totalPages) {
        state.page++;
        loadData(true);
      }
    });

    el.pagination.querySelectorAll("button[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = parseInt(btn.dataset.page, 10);
        if (!Number.isFinite(p)) return;
        state.page = p;
        loadData(true);
      });
    });

    el.pageInfo.textContent = `หน้า ${state.page} / ${totalPages}`;
  }

  // =============================
  // URL
  // =============================
  function updateUrl() {
    const u = new URL(window.location.href);
    u.searchParams.set("cat_id", state.cat_id);

    state.subcat_id
      ? u.searchParams.set("subcat_id", state.subcat_id)
      : u.searchParams.delete("subcat_id");

    window.history.replaceState({}, "", u);
  }
})();
