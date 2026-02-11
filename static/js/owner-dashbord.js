document.addEventListener("DOMContentLoaded", () => {
  setCurrentMonthLabel();
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
    renderRevenueByCategoryTable(data.revenue_by_cat || []);
    renderEmployeeTable(data.employees || []);
    renderNewsByCategoryTable(data.news_by_category || []);
    renderRoleChart(data.emp_by_role || []);

  } catch (err) {
    console.error("โหลด Dashboard Owner ล้มเหลว:", err);
  }
}

// ======================
// Render: การ์ดด้านบน
// ======================
function renderTopStats(data) {
  const statRevenue = document.getElementById("statRevenueMonth");
  const statAdsApprovedMonth = document.getElementById("statAdsApprovedMonth");
  const statEmp = document.getElementById("statEmpTotal");
  const statRole = document.getElementById("statRoleTotal");

  if (statRevenue) {
    statRevenue.innerText = "฿" + Number(data.revenue_month || 0).toLocaleString("th-TH");
  }

  if (statAdsApprovedMonth) {
    statAdsApprovedMonth.innerText = Number(
      data.total_ads_approved_month || 0
    ).toLocaleString("th-TH");
  }

  if (statEmp) statEmp.innerText = Number(data.total_emp || 0).toLocaleString("th-TH");
  if (statRole) statRole.innerText = Number(data.total_role || 0).toLocaleString("th-TH");
}

// ======================
// ตารางรายรับตามประเภทโฆษณา
// ======================
function renderRevenueByCategoryTable(rows = []) {
  const tbody = document.querySelector("#revenueByCatTable tbody");
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">ไม่มีข้อมูล</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((i, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${i.name || "-"}</td>
      <td>฿${Number(i.total || 0).toLocaleString("th-TH")}</td>
    </tr>
  `).join("");
}

// ======================
// ตารางพนักงาน
// ======================
function renderEmployeeTable(rows = []) {
  const tbody = document.querySelector("#empStatusTable tbody");
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">ไม่มีข้อมูล</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((i) => `
    <tr>
      <td>${i.fullname || "-"}</td>
      <td>${i.role_name || "-"}</td>
      <td>
        <span class="badge ${i.status === "online" ? "bg-success" : "bg-secondary"}">
          ${i.status === "online" ? "ออนไลน์" : "ออฟไลน์"}
        </span>
      </td>
    </tr>
  `).join("");
}

// ======================
// ตารางประเภทข่าวที่มีข่าวมากที่สุด
// ======================
function renderNewsByCategoryTable(rows = []) {
  const tbody = document.querySelector("#newsByCategoryTable tbody");
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">ไม่มีข้อมูล</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((i, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${i.category_name || "-"}</td>
      <td>${Number(i.total || 0).toLocaleString("th-TH")}</td>
    </tr>
  `).join("");
}

// ======================
// Chart: Role
// ======================
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
