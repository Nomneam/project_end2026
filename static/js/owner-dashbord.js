document.addEventListener('DOMContentLoaded', () => {
  setCurrentMonthLabel();   // 👈 เพิ่มบรรทัดนี้
  loadOwnerDashboard();
});

// ======================
// แสดงชื่อเดือนปัจจุบัน (ภาษาไทย)
// ======================
function setCurrentMonthLabel() {
  const monthsTH = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
    "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
    "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const now = new Date();
  const monthName = monthsTH[now.getMonth()];

  const revenueLabel = document.getElementById("labelRevenueMonth");
  const adsLabel = document.getElementById("labelAdsMonth");

  if (revenueLabel) revenueLabel.textContent = monthName;
  if (adsLabel) adsLabel.textContent = monthName;
}

// ======================
// Main Loader
// ======================
async function loadOwnerDashboard() {
  try {
    const res = await fetch("/api/owner/dashboard");
    const data = await res.json();

    if (!data || !data.success) {
      console.warn("โหลดข้อมูล Dashboard ไม่สำเร็จ");
      return;
    }

    renderTopStats(data);
    renderRevenueByCategoryTable(data.revenue_by_cat);
    renderEmployeeTable(data.employees);

    renderRoleChart(data.emp_by_role);
    renderRevenueDailyChart(data.revenue_daily);
    renderRevenueMonthlyChart(data.revenue_monthly);
    renderRevenueYearlyChart(data.revenue_yearly);
    renderNewsViewsDailyChart(data.news_views_daily);
    renderNewsByCategoryTable(data.news_by_category);

  } catch (err) {
    console.error("โหลด Dashboard Owner ล้มเหลว:", err);
  }
}

// ======================
// Render: การ์ดด้านบน (แก้แล้วให้ตรง Backend)
// ======================
function renderTopStats(data) {
  const statRevenue =
    document.getElementById("statRevenueMonth") ||
    document.querySelectorAll(".stat-value")[0];

  const statAdsApprovedMonth =
    document.getElementById("statAdsApprovedMonth") ||
    document.querySelectorAll(".stat-value")[1];

  const statEmp =
    document.getElementById("statEmpTotal") ||
    document.querySelectorAll(".stat-value")[2];

  const statRole =
    document.getElementById("statRoleTotal") ||
    document.querySelectorAll(".stat-value")[3];

  if (statRevenue) {
    statRevenue.innerText =
      "฿" + Number(data.revenue_month || 0).toLocaleString();
  }

  if (statAdsApprovedMonth) {
    statAdsApprovedMonth.innerText = Number(
      data.total_ads_approved_month || 0
    ).toLocaleString();
  }

  if (statEmp) statEmp.innerText = data.total_emp ?? 0;
  if (statRole) statRole.innerText = data.total_role ?? 0;
}

// ======================
// Render: ตารางรายรับตามประเภทโฆษณา
// ======================
function renderRevenueByCategoryTable(rows = []) {
  const advTableBody =
    document.querySelector("#revenueByCatTable tbody") ||
    document.querySelectorAll(".table")[0]?.querySelector("tbody");

  if (!advTableBody) return;

  const data = Array.isArray(rows) ? rows : [];

  advTableBody.innerHTML = data.length
    ? data
        .map(
          (i, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${i.name || "-"}</td>
            <td>฿${Number(i.total || 0).toLocaleString()}</td>
          </tr>
        `
        )
        .join("")
    : `
      <tr>
        <td colspan="3" class="text-center text-muted">ไม่มีข้อมูล</td>
      </tr>
    `;
}

// ======================
// Render: ตารางพนักงาน
// ======================
function renderEmployeeTable(rows = []) {
  const empTableBody =
    document.querySelector("#employeeTable tbody") ||
    document.querySelectorAll(".table")[2]?.querySelector("tbody");

  if (!empTableBody) return;

  const emps = Array.isArray(rows) ? rows : [];

  empTableBody.innerHTML = emps.length
    ? emps
        .map(
          (emp) => `
          <tr>
            <td>${emp.fullname || "-"}</td>
            <td>${emp.role_name || "-"}</td>
            <td>
              <span class="badge ${
                emp.status === "online" ? "bg-success" : "bg-secondary"
              }">
                ${emp.status === "online" ? "ออนไลน์" : "ออฟไลน์"}
              </span>
            </td>
          </tr>
        `
        )
        .join("")
    : `
      <tr>
        <td colspan="3" class="text-center text-muted">ไม่มีข้อมูลพนักงาน</td>
      </tr>
    `;
}

// ======================
// Render: ตารางประเภทข่าวที่มีข่าวมากที่สุด
// ======================
function renderNewsByCategoryTable(rows = []) {
  const tbody = document.querySelector("#newsByCategoryTable tbody");
  if (!tbody) return;

  const data = Array.isArray(rows) ? rows : [];

  tbody.innerHTML = data.length
    ? data
        .map(
          (i, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${i.category_name || "-"}</td>
            <td>${Number(i.total || 0).toLocaleString()}</td>
          </tr>
        `
        )
        .join("")
    : `
      <tr>
        <td colspan="3" class="text-center text-muted">ไม่มีข้อมูลประเภทข่าว</td>
      </tr>
    `;
}



document.addEventListener("DOMContentLoaded", async function () {
  try {
    const res = await fetch("/api/owner/dashboard");
    const data = await res.json();

    if (!data || !data.success) {
      console.warn("โหลดข้อมูล Dashboard ไม่สำเร็จ");
      return;
    }

    // ======================
    // Stat Cards
    // ======================
    setText("statRevenueMonth", formatNumber(data.revenue_month || 0));
    setText("statAdsApprovedMonth", formatNumber(data.total_ads_approved_month || 0));
    setText("statEmpTotal", formatNumber(data.total_emp || 0));
    setText("statRoleTotal", formatNumber(data.total_role || 0));

    setText("labelRevenueMonth", getCurrentMonthTH());
    setText("labelAdsMonth", getCurrentMonthTH());

    // ======================
    // Revenue by Category Table
    // ======================
    renderRevenueByCategoryTable(data.revenue_by_cat || []);

    // ======================
    // News by Category Table
    // ======================
    renderNewsByCategoryTable(data.news_by_category || []);

    // ======================
    // Employee Table
    // ======================
    renderEmpStatusTable(data.employees || []);

    // ======================
    // Role Chart (เหลือแค่อันนี้)
    // ======================
    renderRoleChart(data.emp_by_role || []);

  } catch (err) {
    console.error("Dashboard error:", err);
  }
});

/* ======================
   Utils
====================== */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function formatNumber(num) {
  return Number(num || 0).toLocaleString("th-TH");
}

function getCurrentMonthTH() {
  const months = [
    "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
    "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"
  ];
  const d = new Date();
  return months[d.getMonth()];
}

/* ======================
   Tables
====================== */
function renderRevenueByCategoryTable(list = []) {
  const tbody = document.querySelector("#revenueByCatTable tbody");
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">ไม่มีข้อมูล</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((i, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${i.name}</td>
      <td>${formatNumber(i.total)}</td>
    </tr>
  `).join("");
}

function renderNewsByCategoryTable(list = []) {
  const tbody = document.querySelector("#newsByCategoryTable tbody");
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">ไม่มีข้อมูล</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((i, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${i.category_name}</td>
      <td>${i.total}</td>
    </tr>
  `).join("");
}

function renderEmpStatusTable(list = []) {
  const tbody = document.querySelector("#empStatusTable tbody");
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">ไม่มีข้อมูล</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((i) => `
    <tr>
      <td>${i.fullname}</td>
      <td>${i.role_name || "-"}</td>
      <td>
        <span class="badge bg-secondary">
          ${i.status || "offline"}
        </span>
      </td>
    </tr>
  `).join("");
}

/* ======================
   Charts (เหลือแค่ Role Chart)
====================== */
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


