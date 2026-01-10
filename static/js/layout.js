(function(){
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const btnToggle = document.getElementById("btnToggleSidebar");

  const routeEcho = document.getElementById("routeEcho");
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");

  const user = window.__USER__ || {
    name: "Sajud Air",
    avatarUrl: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&h=200&fit=crop&crop=faces",
    roleLabel: document.body.dataset.roleLabel || "—"
  };

  // เติมข้อมูล user
  const navAvatar = document.getElementById("navAvatar");
  const sideAvatar = document.getElementById("sideAvatar");
  const navUserName = document.getElementById("navUserName");
  const sideUserName = document.getElementById("sideUserName");
  const rolePill = document.getElementById("rolePill");
  const sideUserRole = document.getElementById("sideUserRole");

  if(navAvatar) navAvatar.src = user.avatarUrl;
  if(sideAvatar) sideAvatar.src = user.avatarUrl;
  if(navUserName) navUserName.textContent = user.name;
  if(sideUserName) sideUserName.textContent = user.name;
  if(rolePill) rolePill.textContent = user.roleLabel;
  if(sideUserRole) sideUserRole.textContent = `สิทธิ์: ${user.roleLabel}`;

  // Mobile Sidebar
  function openSidebar(){
    sidebar?.classList.add("show");
    backdrop?.classList.add("show");
  }
  function closeSidebar(){
    sidebar?.classList.remove("show");
    backdrop?.classList.remove("show");
  }
  btnToggle?.addEventListener("click", () => {
    if(sidebar?.classList.contains("show")) closeSidebar();
    else openSidebar();
  });
  backdrop?.addEventListener("click", closeSidebar);

  function setActive(){
    const hash = window.location.hash || "#/dashboard";
    if(routeEcho) routeEcho.textContent = hash;

    const m = meta[hash] || meta["#/dashboard"];
    if(pageTitle) pageTitle.textContent = m.t;
    if(pageSubtitle) pageSubtitle.textContent = m.s;

    document.querySelectorAll(".side-link").forEach(a => a.classList.remove("active"));
    const active = document.querySelector(`.side-link[href="${hash}"]`);
    if(active) active.classList.add("active");
  }

  window.addEventListener("hashchange", () => {
    setActive();
    closeSidebar();
  });

  // Dropdown actions (ขวาบน)
  document.getElementById("ddProfile")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.hash = "/profile";
  });

  document.getElementById("ddLogout")?.addEventListener("click", (e) => {
    e.preventDefault();
    // ของจริง: เปลี่ยนเป็น window.location.href = "/logout"
    window.location.hash = "/logout";
  });

  // init
  if(!window.location.hash) window.location.hash = "/dashboard";
  setActive();
})();
