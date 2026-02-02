$(function () {
  const $sidebar = $("#sidebar");
  const $backdrop = $("#sidebarBackdrop");
  const $btnToggle = $("#btnToggleSidebar");

  function openSidebar() {
    $sidebar.addClass("show");
    $backdrop.addClass("show");
  }

  function closeSidebar() {
    $sidebar.removeClass("show");
    $backdrop.removeClass("show");
  }

  // Sidebar toggle (mobile)
  $btnToggle.on("click", function () {
    $sidebar.hasClass("show") ? closeSidebar() : openSidebar();
  });

  $backdrop.on("click", closeSidebar);

  $(".side-link").on("click", function () {
    closeSidebar();
  });

  // ✅ Dropdown: บังคับให้กดแล้ว toggle แน่นอน
  const ddBtn = document.querySelector('.user-menu [data-bs-toggle="dropdown"]');
  if (ddBtn && typeof bootstrap !== "undefined" && bootstrap.Dropdown) {
    const inst = bootstrap.Dropdown.getOrCreateInstance(ddBtn);

    // กันบางเคส click ไม่ถึงเพราะมี handler อื่น
    ddBtn.addEventListener("click", function (e) {
      e.preventDefault();   // กัน anchor/submit
      e.stopPropagation();  // กัน event อื่นปิดทับ
      inst.toggle();
    });
  }

  // เมนูใน dropdown
  $("#ddProfile").on("click", function (e) {
    e.preventDefault();
    // ถ้ามีหน้าโปรไฟล์จริง เปลี่ยนเป็น route ของคุณ
    window.location.href = "/profile";
  });

  $("#ddLogout").on("click", function (e) {
    e.preventDefault();
    window.location.href = "/logout_emp";
  });

  // Active menu (hash)
  function setActive() {
    const hash = window.location.hash || "#/dashboard";
    $(".side-link").removeClass("active");
    $(`.side-link[href="${hash}"]`).addClass("active");
  }

  $(window).on("hashchange", function () {
    setActive();
    closeSidebar();
  });

  setActive();
});
