/* =========================================================
   Init
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  setCurrentMonthLabel();
  loadOwnerDashboard();
});

/* =========================================================
   Utils
========================================================= */
function setCurrentMonthLabel() {
  const monthsTH = [
    "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน",
    "พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม",
    "กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"
  ];

  const monthName = monthsTH[new Date().getMonth()];

  setText("labelRevenueMonth", monthName);
  setText("labelAdsMonth", monthName);
  setText("labelNewsMonth", monthName);
}

/* =========================================================
   API Loader
========================================================= */
async function loadOwnerDashboard() {
  try {
    const res = await fetch("/api/owner/dashboard");
    const data = await res.json();

    if (!data || !data.success) {
      console.warn("โหลดข้อมูล Dashboard ไม่สำเร็จ");
      return;
    }

    renderTopStats(data);
    renderRevenueByCategoryTable(data.revenue_by_cat || []);
    renderEmployeeTable(data.employees || []);
    renderNewsByCategoryTable(data.news_by_category || []);
    renderRoleChart(data.emp_by_role || []);

  } catch (err) {
    console.error("โหลด Dashboard Owner ล้มเหลว:", err);
  }
}

/* =========================================================
   Render: Top Stats Cards
========================================================= */
function renderTopStats(data) {
  setText("statRevenueMonth", "฿" + Number(data.revenue_month || 0).toLocaleString("th-TH"));
  setText("statAdsApprovedMonth", Number(data.total_ads_approved_month || 0).toLocaleString("th-TH"));
  setText("statEmpTotal", Number(data.total_emp || 0).toLocaleString("th-TH"));
  setText("statRoleTotal", Number(data.total_role || 0).toLocaleString("th-TH"));
  setText("statCustomerTotal", Number(data.total_customer || 0).toLocaleString("th-TH"));
  setText("statNewsMonth", Number(data.total_news_month || 0).toLocaleString("th-TH"));
  setText("statNewsCategoryTotal", Number(data.total_news_category || 0).toLocaleString("th-TH"));
}

/* =========================================================
   Render: Tables
========================================================= */
function renderRevenueByCategoryTable(rows = []) {
  const tbody = document.querySelector("#revenueByCatTable tbody");
  renderTable(tbody, rows, (i, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${i.name || "-"}</td>
      <td>฿${Number(i.total || 0).toLocaleString("th-TH")}</td>
    </tr>
  `);
}

function renderEmployeeTable(rows = []) {
  const tbody = document.querySelector("#empStatusTable tbody");
  renderTable(tbody, rows, (i) => `
    <tr>
      <td>${i.fullname || "-"}</td>
      <td>${i.role_name || "-"}</td>
      <td>
        <span class="badge ${i.status === "online" ? "bg-success" : "bg-secondary"}">
          ${i.status === "online" ? "ออนไลน์" : "ออฟไลน์"}
        </span>
      </td>
    </tr>
  `, 3);
}

function renderNewsByCategoryTable(rows = []) {
  const tbody = document.querySelector("#newsByCategoryTable tbody");
  renderTable(tbody, rows, (i, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${i.category_name || "-"}</td>
      <td>${Number(i.total || 0).toLocaleString("th-TH")}</td>
    </tr>
  `);
}

/* =========================================================
   Render: Chart
========================================================= */
function renderRoleChart(empByRole = []) {
  if (
    !window.initDoughnutChart ||
    !document.getElementById("roleChart") ||
    !Array.isArray(empByRole) ||
    !empByRole.length
  ) return;

  initDoughnutChart(
    "roleChart",
    empByRole.map((i) => i.name),
    empByRole.map((i) => i.total)
  );
}

/* =========================================================
   Helper Functions (Reusable)
========================================================= */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function renderTable(tbody, rows, rowRenderer, colSpan = 3) {
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-muted">ไม่มีข้อมูล</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(rowRenderer).join("");
}
