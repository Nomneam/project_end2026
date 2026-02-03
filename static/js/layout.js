// static/js/layout.js
// Layout (Navbar dropdown + Sidebar mobile) - BangkokToday

(function () {
  "use strict";

  // ---------- helpers ----------
  function $(sel) {
    return document.querySelector(sel);
  }
  function $all(sel) {
    return Array.from(document.querySelectorAll(sel));
  }

  // ---------- sidebar (mobile) ----------
  function initSidebar() {
    const sidebar = $("#sidebar");
    const backdrop = $("#sidebarBackdrop");
    const btnToggle = $("#btnToggleSidebar");

    if (!sidebar || !backdrop || !btnToggle) return;

    function openSidebar() {
      sidebar.classList.add("show");
      backdrop.classList.add("show");
    }

    function closeSidebar() {
      sidebar.classList.remove("show");
      backdrop.classList.remove("show");
    }

    btnToggle.addEventListener("click", function (e) {
      e.preventDefault();
      if (sidebar.classList.contains("show")) closeSidebar();
      else openSidebar();
    });

    backdrop.addEventListener("click", function () {
      closeSidebar();
    });

    // ถ้ากดเมนู sidebar (บนมือถือ) ให้ปิด
    $all(".side-link").forEach((a) => {
      a.addEventListener("click", function () {
        closeSidebar();
      });
    });

    // expose (ถ้าหน้าอื่นอยากเรียก)
    window.__closeSidebar = closeSidebar;
  }

  // ---------- dropdown (navbar user menu) ----------
  function initNavbarDropdown() {
    const ddBtn = document.querySelector('.user-menu [data-bs-toggle="dropdown"]');
    if (!ddBtn) return;

    // ต้องมี bootstrap bundle
    if (typeof window.bootstrap === "undefined" || !window.bootstrap.Dropdown) {
      console.warn("[layout.js] bootstrap.Dropdown not found. Check bootstrap.bundle.min.js is loaded.");
      return;
    }

    // ✅ สร้าง instance เฉย ๆ แล้วปล่อยให้ Bootstrap จัดการ toggle ด้วย data-bs-toggle
    window.bootstrap.Dropdown.getOrCreateInstance(ddBtn, {
      autoClose: true,
      boundary: "viewport",
    });

    // ✅ กันกรณีมี handler อื่นชอบ stop/close แบบแปลก ๆ
    // ไม่ preventDefault ไม่ toggle เอง (อันนี้แหละที่ทำให้บางหน้าพัง)
    ddBtn.addEventListener(
      "click",
      function (e) {
        // ไม่ให้ event วิ่งไปโดนตัวอื่นที่อาจจะ “ปิดทันที”
        e.stopPropagation();
      },
      true
    );

    const menu = document.querySelector(".user-menu .dropdown-menu");
    if (menu) {
      menu.addEventListener(
        "click",
        function (e) {
          // คลิกในเมนู ไม่ให้ bubble ไปโดนตัวอื่นที่ปิด dropdown
          e.stopPropagation();
        },
        true
      );
    }

    // (Optional) ถ้าคลิกที่อื่น ให้ bootstrap ปิดเองตามปกติ
  }

  // ---------- dropdown actions ----------
  function initMenuActions() {
    const profile = $("#ddProfile");
    if (profile) {
      profile.addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "/profile";
      });
    }

    const logout = $("#ddLogout");
    if (logout) {
      logout.addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "/logout_emp";
      });
    }
  }

  // ---------- active menu (optional) ----------
  // ของเดิมคุณใช้ hash (#/dashboard) แต่ลิงก์ตอนนี้เป็น path (/reporter/dashboard)
  // เลยเปลี่ยนให้ไฮไลท์ตาม pathname จะตรงกว่า
  function initActiveMenu() {
    const links = $all(".side-link");
    if (!links.length) return;

    function setActiveByPath() {
      const path = window.location.pathname || "";
      links.forEach((a) => a.classList.remove("active"));

      // match แบบเริ่มต้นด้วย path (กัน query)
      const hit =
        links.find((a) => {
          const href = a.getAttribute("href") || "";
          return href && href !== "#" && path.startsWith(href);
        }) || null;

      if (hit) hit.classList.add("active");
    }

    setActiveByPath();

    // ถ้า app คุณเปลี่ยนหน้าแบบ SPA ค่อยเปิดอันนี้
    // window.addEventListener("popstate", setActiveByPath);
  }

  // ---------- init ----------
  document.addEventListener("DOMContentLoaded", function () {
    initSidebar();
    initNavbarDropdown();
    initMenuActions();
    initActiveMenu();
  });
})();
