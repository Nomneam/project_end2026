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
  // Navbar Active
  // ----------------------
  function setActiveNav() {
    const $navLinks = $("nav a.nav-cat, nav a.sub-cat");
    $navLinks.removeClass("active");

    if (navState.type === "home") {
      $(`nav a.nav-cat[data-type="home"]`).addClass("active");
      return;
    }
    if (navState.type === "cat" && navState.cat_id) {
      $(`nav a.nav-cat[data-type="cat"][data-cat="${navState.cat_id}"]`).addClass("active");
      return;
    }
    if (navState.type === "subcat" && navState.cat_id && navState.subcat_id) {
      $(`nav a.nav-cat[data-type="cat"][data-cat="${navState.cat_id}"]`).addClass("active");
      $(`nav a.sub-cat[data-type="subcat"][data-cat="${navState.cat_id}"][data-subcat="${navState.subcat_id}"]`).addClass("active");
    }
  }

  function bindNavbarCategories() {
    setActiveNav();

    $("nav")
      .off("click.nav")
      .on("click.nav", "a.nav-cat, a.sub-cat", function (e) {
        // ปล่อยให้ลิงก์ที่มี href จริงทำงานได้ (เช่น url_for พร้อม query)
        // แต่ถ้าคุณต้องการ AJAX ทั้งหมด ค่อย preventDefault
        // ตอนนี้: ถ้า href เป็น # เท่านั้นค่อยกัน
        const href = ($(this).attr("href") || "").trim();
        if (href === "#" || href === "") e.preventDefault();

        const $a = $(this);
        const type = ($a.attr("data-type") || "home").toString();

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
        emit("bkk:nav-change", { ...navState });
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
  }

  // ----------------------
  // Dropdown fix
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
  // Auth (mock)
  // ----------------------
  const AUTH_KEY = "bkk_today_user";

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    } catch {
      return null;
    }
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
    const $m = $("#authMsg");
    if (!$m.length) return;

    if (!msg) {
      $m.addClass("d-none").text("");
      return;
    }
    $m.removeClass("d-none").text(msg);
  }

  function setAuthTab(tab) {
    if (!$("#tabLogin").length) return;

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

  function renderAuthUI() {
    const user = getUser();

    const $authButtons = $("#authButtons");
    const $userMenu = $("#userMenu");
    if (!$authButtons.length || !$userMenu.length) return;

    if (user) {
      $authButtons.addClass("d-none");
      $userMenu.removeClass("d-none").addClass("d-flex");
      $("#userName").text(user.name || "Member");

      const ch = (user.name || "U").trim().slice(0, 1).toUpperCase();
      $("#userAvatar").text(ch || "U");
    } else {
      $userMenu.addClass("d-none").removeClass("d-flex");
      $authButtons.removeClass("d-none");
      $("#userAvatar").text("U");
    }
  }

  function bindAuth() {
    // ปุ่มเปิด
    $("#btnOpenLogin").off("click.auth").on("click.auth", () => openAuthModal("login"));
    $("#btnOpenRegister").off("click.auth").on("click.auth", () => openAuthModal("register"));

    // ปิด
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

    // tabs
    $("#tabLogin").off("click.auth").on("click.auth", () => setAuthTab("login"));
    $("#tabRegister").off("click.auth").on("click.auth", () => setAuthTab("register"));

    // logout
    $("#btnLogout").off("click.auth").on("click.auth", () => clearUser());

    // login
    $("#loginForm")
      .off("submit.auth")
      .on("submit.auth", function (e) {
        e.preventDefault();
        const email = ($("#loginEmail").val() || "").toString().trim();
        const pwd = ($("#loginPassword").val() || "").toString().trim();
        if (!email || !pwd) return showAuthMsg("กรุณากรอกอีเมลและรหัสผ่าน");

        const name = email.split("@")[0].slice(0, 12);
        setUser({ name, email });
        closeAuthModal();
      });

    // register
    $("#registerForm")
      .off("submit.auth")
      .on("submit.auth", function (e) {
        e.preventDefault();
        const first = ($("#regFirst").val() || "").toString().trim();
        const last = ($("#regLast").val() || "").toString().trim();
        const email = ($("#regEmail").val() || "").toString().trim();
        const p1 = ($("#regPassword").val() || "").toString().trim();
        const p2 = ($("#regPassword2").val() || "").toString().trim();

        if (!first || !last || !email || !p1 || !p2) return showAuthMsg("กรุณากรอกข้อมูลให้ครบ");
        if (p1.length < 6) return showAuthMsg("รหัสผ่านต้องอย่างน้อย 6 ตัวอักษร");
        if (p1 !== p2) return showAuthMsg("รหัสผ่านไม่ตรงกัน");

        setUser({ name: `${first} ${last}`, email });
        closeAuthModal();
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
