document.addEventListener("DOMContentLoaded", function() {

  const yearSelect = document.querySelector(".year-select");
  const ctx = document.getElementById("adsByMonthChart");
  let chart;

  // ===== โหลดปีจาก DB =====
  function loadYears() {
    return fetch("/api/advert-years")
      .then(res => res.json())
      .then(data => {

        yearSelect.innerHTML = "";

        if (!data.years || data.years.length === 0) {
          const option = document.createElement("option");
          option.textContent = "ไม่มีข้อมูล";
          yearSelect.appendChild(option);
          return null;
        }

        data.years.forEach(year => {
          const option = document.createElement("option");
          option.value = year;
          option.textContent = "ปี " + year;
          yearSelect.appendChild(option);
        });

        return data.years[0]; // ปีล่าสุด
      });
  }

  function loadDashboard(year) {
    fetch(`/api/advert-dashboard?year=${year}`)
      .then(res => res.json())
      .then(data => {

        document.getElementById("totalAdsYear").innerText = data.kpi.totalAdsYear;
        document.getElementById("approvedAds").innerText = data.kpi.approvedAds;
        document.getElementById("pendingAds").innerText = data.kpi.pendingAds;
        document.getElementById("totalCategories").innerText = data.kpi.totalCategories;

        const table = document.getElementById("topCustomerTable");
        table.innerHTML = "";

        if (!data.topCustomers || data.topCustomers.length === 0) {
          table.innerHTML = `
            <tr>
              <td colspan="4" class="text-center text-muted">
                ยังไม่มีข้อมูล
              </td>
            </tr>`;
        } else {
          data.topCustomers.forEach((c, index) => {
            table.innerHTML += `
              <tr>
                <td><strong>${index + 1}</strong></td>
                <td>${c.cus_fname} ${c.cus_lname}</td>
                <td>${c.total_ads}</td>
                <td>฿ ${Number(c.total_amount).toLocaleString()}</td>
              </tr>`;
          });
        }

        if (chart) chart.destroy();

        chart = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
                     "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."],
            datasets: [
              {
                label: "ปี " + data.monthlyAds.year,
                data: data.monthlyAds.current,
                backgroundColor: "#dc3545",
                borderRadius: 6,
                barThickness: 12
              },
              {
                label: "ปี " + data.monthlyAds.lastYear,
                data: data.monthlyAds.last,
                backgroundColor: "#212529",
                borderRadius: 6,
                barThickness: 12
              }
            ]
          },
            options: {
            responsive: true,
            maintainAspectRatio: false,   // สำคัญมาก
            plugins: {
                legend: { position: "top" }
            },
            scales: {
                y: {
                beginAtZero: true,
                ticks: { stepSize: 1 }
                }
            }
            }
        });
      });
  }

  // ===== เริ่มระบบ =====
  loadYears().then(latestYear => {
    if (latestYear) {
      loadDashboard(latestYear);
    }
  });

  yearSelect.addEventListener("change", function() {
    loadDashboard(this.value);
  });

});
