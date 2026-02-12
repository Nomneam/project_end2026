// static/js/navbar.js
$(function () {
  // ถ้าไม่มี navbar จริงๆ ก็ไม่ต้องทำอะไร
  if (!$("header").length || !$("nav").length) return;

  // ----------------------
  // Shared state (navbar)
  // ----------------------
  let navState = {
    q: "",
    type: "home", // home | cat | subcat
    cat_id: null,
    subcat_id: null,
  };

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  // ----------------------
  // ✅ Helper: อ่าน query จาก URL เพื่อทำ active ให้ถูก
  // ----------------------
  function readStateFromUrl() {
    const url = new URL(window.location.href);
    const cat = url.searchParams.get("cat_id");
    const sub = url.searchParams.get("subcat_id");

    if (sub && cat) {
      navState.type = "subcat";
      navState.cat_id = cat;
      navState.subcat_id = sub;
      return;
    }
    if (cat) {
      navState.type = "cat";
      navState.cat_id = cat;
      navState.subcat_id = null;
      return;
    }

    navState.type = "home";
    navState.cat_id = null;
    navState.subcat_id = null;
  }

  // ----------------------
  // Navbar Active
  // ----------------------
  function setActiveNav() {
    const $navLinks = $("nav a.nav-cat, nav a.sub-cat");
    $navLinks.removeClass("active");

    // ✅ หน้าแรก: ถ้า path เป็นหน้า index หรือไม่มี query cat_id/subcat_id
    if (navState.type === "home") {
      $(`nav a.nav-cat[data-type="home"]`).addClass("active");
      return;
    }

    // ✅ หมวดหลัก
    if (navState.type === "cat" && navState.cat_id) {
      $(`nav a.nav-cat[data-type="cat"][data-cat="${navState.cat_id}"]`).addClass("active");
      return;
    }

    // ✅ หมวดย่อย
    if (navState.type === "subcat" && navState.cat_id && navState.subcat_id) {
      $(`nav a.nav-cat[data-type="cat"][data-cat="${navState.cat_id}"]`).addClass("active");
      $(
        `nav a.sub-cat[data-type="subcat"][data-cat="${navState.cat_id}"][data-subcat="${navState.subcat_id}"]`
      ).addClass("active");
    }
  }

  // ----------------------
  // ✅ Click behavior (สำคัญ)
  // - ถ้า href เป็น URL จริง => ปล่อยให้ไปหน้าใหม่ตาม link
  // - ถ้า href เป็น # => preventDefault แล้วค่อย emit (กรณี dropdown toggle)
  // ----------------------
  function bindNavbarCategories() {
    // set active จาก URL ทุกครั้งที่โหลดหน้า
    readStateFromUrl();
    setActiveNav();

    $("nav")
      .off("click.nav")
      .on("click.nav", "a.nav-cat, a.sub-cat", function (e) {
        const $a = $(this);
        const href = ($a.attr("href") || "").trim();
        const type = ($a.attr("data-type") || "home").toString();

        // ✅ กรณีเป็น dropdown toggle (href="#") ให้กันไว้
        if (href === "#" || href === "") {
          e.preventDefault();

          // อัปเดต state เฉยๆ เพื่อ active (แต่ไม่เปลี่ยนหน้า)
          if (type === "home") {
            navState.type = "home";
            navState.cat_id = null;
            navState.subcat_id = null;
          } else if (type === "cat") {
            navState.type = "cat";
            navState.cat_id = $a.attr("data-cat") || null;
            navState.subcat_id = null;
          } else if (type === "subcat") {
            navState.type = "subcat";
            navState.cat_id = $a.attr("data-cat") || null;
            navState.subcat_id = $a.attr("data-subcat") || null;
          }

          setActiveNav();

          // ✅ จะ emit หรือไม่ emit ก็ได้
          // แนะนำ: emit เฉพาะกรณี href="#" (ไม่ใช่ลิงก์จริง)
          emit("bkk:nav-change", { ...navState });
          return;
        }

        // ✅ ถ้าเป็นลิงก์จริง: ปล่อยให้ browser ไปตาม href
        // (ไม่ต้อง emit ไม่ต้อง scrollTo ไม่ต้อง prevent)
        // แต่เราทำ active ชั่วคราวให้เห็นทันทีได้
        if (type === "home") {
          navState.type = "home";
          navState.cat_id = null;
          navState.subcat_id = null;
        } else if (type === "cat") {
          navState.type = "cat";
          navState.cat_id = $a.attr("data-cat") || null;
          navState.subcat_id = null;
        } else if (type === "subcat") {
          navState.type = "subcat";
          navState.cat_id = $a.attr("data-cat") || null;
          navState.subcat_id = $a.attr("data-subcat") || null;
        }
        setActiveNav();
      });
  }

  // ----------------------
  // Dropdown fix (เดิม)
  // ----------------------
  (function initNavDropdownFix() {
    const nav = document.querySelector(".top-nav-sticky");
    if (!nav || !window.bootstrap) return;

    const isDesktop = () => window.matchMedia("(min-width: 992px)").matches;

    nav.querySelectorAll(".dropdown").forEach((dd) => {
      const toggle = dd.querySelector('[data-bs-toggle="dropdown"]');
      const menu = dd.querySelector(".dropdown-menu");
      if (!toggle || !menu) return;

      const inst = bootstrap.Dropdown.getOrCreateInstance(toggle, { autoClose: "outside" });
      let hoverTimer = null;

      function placeMenuFixed() {
        const r = toggle.getBoundingClientRect();
        menu.style.position = "fixed";
        menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8))}px`;
        menu.style.top = `${r.bottom + 6}px`;
        menu.style.zIndex = "10000";
      }

      toggle.addEventListener("shown.bs.dropdown", () => {
        if (!isDesktop()) return;
        placeMenuFixed();
      });

      window.addEventListener(
        "scroll",
        () => {
          if (!menu.classList.contains("show")) return;
          if (!isDesktop()) return;
          placeMenuFixed();
        },
        { passive: true }
      );

      window.addEventListener("resize", () => {
        if (!menu.classList.contains("show")) return;
        if (!isDesktop()) return;
        placeMenuFixed();
      });

      dd.addEventListener("mouseenter", () => {
        if (!isDesktop()) return;
        clearTimeout(hoverTimer);
        inst.show();
      });

      dd.addEventListener("mouseleave", () => {
        if (!isDesktop()) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => inst.hide(), 120);
      });

      menu.addEventListener("mouseenter", () => {
        if (!isDesktop()) return;
        clearTimeout(hoverTimer);
      });
      menu.addEventListener("mouseleave", () => {
        if (!isDesktop()) return;
        hoverTimer = setTimeout(() => inst.hide(), 120);
      });
    });
  })();

  // ----------------------
  // Top Search (emit event)
  // ----------------------
  function bindTopSearch() {
    const $top = $("#topSearch");
    if (!$top.length) return;

    $top.off("input.navSearch").on("input.navSearch", function () {
      navState.q = ($(this).val() || "").toString();
      emit("bkk:search", { q: navState.q });
    });
  }

  // ----------------------
// Auth (REAL - Flask session)
// ----------------------
function showAuthMsg(msg) {
  const $m = $("#authMsg");
  if (!$m.length) return;

  if (!msg) {
    $m.addClass("d-none").text("");
  } else {
    $m.removeClass("d-none").text(msg);
  }
}

function openAuthModal(mode) {
  if (!$("#authModal").length) return;
  $("#authModal").addClass("show");
  $("body").addClass("no-scroll");
  setAuthTab(mode || "login");
}

function closeAuthModal() {
  if (!$("#authModal").length) return;
  $("#authModal").removeClass("show");
  $("body").removeClass("no-scroll");
  showAuthMsg("");
}

// render จาก session ที่ Flask ส่งมา
function renderAuthUI() {
  fetch("/me")
    .then((r) => {
      if (!r.ok) throw new Error("not login");
      return r.json();
    })
    .then((res) => {
      const user = res.user;

      $("#authButtons").addClass("d-none");
      $("#userMenu").removeClass("d-none").addClass("d-flex");

      $("#userName").text(user.name || user.username);

      if (user.avatar) {
        $("#userAvatar").html(
          `<img src="${user.avatar}" class="avatar-img rounded-circle" />`
        );
      } else {
        $("#userAvatar").html(
          `<i class="bi bi-person-circle text-red-bkk"></i>`
        );
      }
    })
    .catch(() => {
      $("#userMenu").addClass("d-none").removeClass("d-flex");
      $("#authButtons").removeClass("d-none");
    });
}

function bindAuth() {
  $("#btnOpenLogin").off("click.auth").on("click.auth", () => openAuthModal("login"));
  $("#btnOpenRegister").off("click.auth").on("click.auth", () => openAuthModal("register"));
  $("#btnCloseAuth").off("click.auth").on("click.auth", closeAuthModal);

  $("#authModal")
    .off("click.auth")
    .on("click.auth", function (e) {
      if (e.target && e.target.id === "authModal") closeAuthModal();
    });

  $(document)
    .off("keydown.auth")
    .on("keydown.auth", function (e) {
      if (e.key === "Escape") closeAuthModal();
    });

  // LOGIN → Flask
  $("#loginForm")
    .off("submit.auth")
    .on("submit.auth", function (e) {
      e.preventDefault();

      const username = ($("#loginUsername").val() || "").trim();
      const password = ($("#loginPassword").val() || "").trim();

      if (!username || !password) {
        return showAuthMsg("กรุณากรอก Username และ Password");
      }

      fetch("/login_cus", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ username, password }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (!res.ok) {
            showAuthMsg(res.message || "เข้าสู่ระบบไม่สำเร็จ");
            return;
          }
          location.reload();
        })
        .catch(() => showAuthMsg("เกิดข้อผิดพลาด กรุณาลองใหม่"));
    });

  // LOGOUT
  $("#btnLogout")
    .off("click.auth")
    .on("click.auth", () => {
      window.location.href = "/logout_cus";
    });
}

// ----------------------
  // Date header
  // ----------------------
  function renderHeaderDate() {
    const $dayName = $("#dayName");
    const $dayDate = $("#dayDate");
    if (!$dayName.length || !$dayDate.length) return;

    const d = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    $dayName.text(days[d.getDay()]);
    $dayDate.text(d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
  }

  // ----------------------
  // Init
  // ----------------------
  renderHeaderDate();
  bindTopSearch();
  bindNavbarCategories();
  bindAuth();
  renderAuthUI();
});
