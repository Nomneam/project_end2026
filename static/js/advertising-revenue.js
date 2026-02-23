document.addEventListener('DOMContentLoaded', function () {

  const monthsTH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

  const totalRevenue = document.getElementById("totalRevenue");
  const totalOrders  = document.getElementById("totalOrders");
  const topCategory  = document.getElementById("topCategory");
  const monthlyRevenueSummary = document.getElementById("monthlyRevenueSummary");
  const revenueTypeDetail = document.getElementById("revenueTypeDetail");

  const revenueTrendChartEl = document.getElementById("revenueTrendChart");
  const revenueByTypeChartEl = document.getElementById("revenueByTypeChart");
  const compareMonthChartEl = document.getElementById("compareMonthChart");

  const selectYear = document.getElementById("selectYear");
  const compareYearA = document.getElementById("compareYearA");
  const compareMonthA = document.getElementById("compareMonthA");
  const compareYearB = document.getElementById("compareYearB");
  const compareMonthB = document.getElementById("compareMonthB");

  let trendChart, typeChart, compareChart;
  const baht = (v) => '฿' + Number(v || 0).toLocaleString();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  // ===============================
  // โหลดปีจาก DB (min/max)
  // ===============================
  async function loadYearsFromDB() {
    try {
      const res = await fetch("/api/owner/advertising-revenue/years");
      const json = await res.json();

      if (!json.success || !json.years.length) return null;

      const years = json.years;

      function fillSelect(selectEl) {
        if (!selectEl) return;
        selectEl.innerHTML = years
          .map(y => `<option value="${y}">${y}</option>`)
          .join('');
      }

      fillSelect(selectYear);
      fillSelect(compareYearA);
      fillSelect(compareYearB);

      return years[0]; // ปีล่าสุด (max year)

    } catch (err) {
      console.error("โหลดปีล้มเหลว:", err);
      return null;
    }
  }

  function fillMonthSelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = monthsTH
      .map((m, i) => `<option value="${i+1}">${m}</option>`)
      .join('');
  }

  fillMonthSelect(compareMonthA);
  fillMonthSelect(compareMonthB);

  if (compareMonthA) compareMonthA.value = currentMonth;
  if (compareMonthB) compareMonthB.value = currentMonth;

  function baseLineOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true } },
        tooltip: {
          callbacks: { label: ctx => ` ${baht(ctx.parsed.y)}` }
        }
      },
      scales: {
        y: {
          ticks: { callback: v => '฿' + v.toLocaleString() }
        }
      }
    };
  }

  // ===============================
  // โหลดข้อมูลปี
  // ===============================
  async function renderYear(year) {

    const sumRes = await fetch(`/api/owner/advertising-revenue/summary?year=${year}`);
    const sumData = await sumRes.json();

    if (sumData.success) {
      totalRevenue.textContent = baht(sumData.data.totalRevenue);
      topCategory.textContent = sumData.data.topCategory || "-";
      if (totalOrders) {
        totalOrders.textContent = Number(sumData.data.totalOrders || 0).toLocaleString();
      }
    }

    const monRes = await fetch(`/api/owner/advertising-revenue/monthly?year=${year}`);
    const monData = await monRes.json();

    const months = new Array(12).fill(0);
    if (monData.success) {
      Object.entries(monData.data).forEach(([m, v]) => {
        months[parseInt(m) - 1] = v;
      });
    }

    monthlyRevenueSummary.innerHTML = months.map((v,i)=>`
      <div class="col-6 col-md-3 col-lg-2">
        <div class="border rounded-4 p-2 bg-white shadow-sm">
          <div class="fw-semibold">${monthsTH[i]}</div>
          <div class="text-primary fw-bold">${baht(v)}</div>
        </div>
      </div>
    `).join('');

    if (!trendChart) {
      trendChart = new Chart(revenueTrendChartEl, {
        type: 'line',
        data: {
          labels: monthsTH,
          datasets: [{
            label: `รายได้ปี ${year}`,
            data: months,
            tension: .4,
            borderWidth: 3,
            pointRadius: 4,
            fill: true
          }]
        },
        options: baseLineOptions()
      });
    } else {
      trendChart.data.datasets[0].label = `รายได้ปี ${year}`;
      trendChart.data.datasets[0].data = months;
      trendChart.update();
    }

    const catRes = await fetch(`/api/owner/advertising-revenue/by-category?year=${year}`);
    const catData = await catRes.json();

    const labels = [];
    const values = [];

    if (catData.success) {
      catData.data.forEach(r => {
        labels.push(r.label);
        values.push(r.value);
      });
    }

    if (!typeChart) {
      typeChart = new Chart(revenueByTypeChartEl, {
        type: 'doughnut',
        data: { labels, datasets:[{ data: values, cutout: '65%' }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
    } else {
      typeChart.data.labels = labels;
      typeChart.data.datasets[0].data = values;
      typeChart.update();
    }

    revenueTypeDetail.innerHTML = labels.map((l, i) => `
      <div class="col-12 col-md-3 text-center">
        <div class="fw-semibold">${l}</div>
        <div class="text-primary fw-bold">${baht(values[i])}</div>
      </div>
    `).join('');
  }

  // ===============================
  // Compare Chart
  // ===============================
  async function renderCompare() {

    if (!compareMonthChartEl) return;

    const year = compareYearA?.value;

    const res = await fetch(`/api/owner/advertising-revenue/compare-by-type?year=${year}`);
    const json = await res.json();
    if (!json.success || !json.data) return;

    const labels = monthsTH;

    const datasets = Object.entries(json.data).map(([type, monthlyData]) => {
      const arr = new Array(12).fill(0);
      Object.entries(monthlyData).forEach(([m, v]) => {
        arr[parseInt(m) - 1] = v;
      });

      return {
        label: type,
        data: arr,
        tension: 0.4,
        borderWidth: 3,
        fill: false
      };
    });

    if (!compareChart) {
      compareChart = new Chart(compareMonthChartEl, {
        type: 'line',
        data: { labels, datasets },
        options: baseLineOptions()
      });
    } else {
      compareChart.data.datasets = datasets;
      compareChart.update();
    }
  }

  // ===============================
  // Initial Load
  // ===============================
  (async () => {
    const latestYear = await loadYearsFromDB();
    if (latestYear) {
      await renderYear(latestYear);
      await renderCompare();
    }
  })();

  // ===============================
  // Events
  // ===============================
  if (selectYear) {
    selectYear.addEventListener('change', e => renderYear(e.target.value));
  }

  [compareYearA, compareMonthA, compareYearB, compareMonthB].forEach(el => {
    if (el) el.addEventListener('change', renderCompare);
  });

});
