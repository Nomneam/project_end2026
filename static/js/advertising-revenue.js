document.addEventListener('DOMContentLoaded', function () {

  const monthsTH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

  const TYPE_COLORS = {
    banner: '#3b82f6',
    video:  '#ff6384',
    popup:  '#ffa34d'
  };

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

  // ===============================
  // ตั้งค่า default เป็นปี/เดือนปัจจุบัน
  // ===============================
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  if (selectYear) selectYear.value = currentYear;
  if (compareYearA) compareYearA.value = currentYear;
  if (compareYearB) compareYearB.value = currentYear;

  function makeGradient(ctx, area) {
    const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, 'rgba(59,130,246,.25)');
    g.addColorStop(1, 'rgba(59,130,246,0)');
    return g;
  }

  function fillMonthSelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = monthsTH.map((m, i) => `<option value="${i+1}">${m}</option>`).join('');
  }

  fillMonthSelect(compareMonthA);
  fillMonthSelect(compareMonthB);

  // 👉 ตั้งค่าเดือนปัจจุบัน
  if (compareMonthA) compareMonthA.value = currentMonth;
  if (compareMonthB) compareMonthB.value = currentMonth;

  function baseLineOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true } },
        tooltip: {
          backgroundColor: 'rgba(17,24,39,.9)',
          padding: 12,
          callbacks: { label: ctx => ` ${baht(ctx.parsed.y)}` }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(0,0,0,.05)' } },
        y: {
          grid: { color: 'rgba(0,0,0,.06)' },
          ticks: { callback: v => '฿' + v.toLocaleString() }
        }
      }
    };
  }

  // ===============================
  // โหลดข้อมูลปี
  // ===============================
  async function renderYear(year) {
    try {
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
              tension: .45,
              borderWidth: 3,
              pointRadius: 4,
              fill: true
            }]
          },
          options: baseLineOptions(),
          plugins: [{
            id: 'gradientFill',
            beforeDatasetsDraw(chart) {
              const { ctx, chartArea } = chart;
              if (!chartArea) return;
              chart.data.datasets[0].backgroundColor = makeGradient(ctx, chartArea);
            }
          }]
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
          data: {
            labels,
            datasets:[{
              data: values,
              hoverOffset: 12,
              cutout: '65%',
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { usePointStyle: true } },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
                    const value = ctx.parsed;
                    const percent = total ? ((value / total) * 100).toFixed(1) : 0;
                    return ` ${ctx.label}: ${baht(value)} (${percent}%)`;
                  }
                }
              }
            }
          }
        });
      } else {
        typeChart.data.labels = labels;
        typeChart.data.datasets[0].data = values;
        typeChart.update();
      }

      revenueTypeDetail.innerHTML = labels.map((l, i) => `
        <div class="col-12 col-md-3 d-flex justify-content-center">
          <div class="d-flex align-items-center gap-2">
            <span class="dot"></span>
            <div class="text-center">
              <div class="fw-semibold">${l}</div>
              <div class="text-primary fw-bold">${baht(values[i])}</div>
            </div>
          </div>
        </div>
      `).join('');

    } catch (err) {
      console.error("โหลดข้อมูล Advertising Revenue ล้มเหลว:", err);
    }
  }

  // ===============================
  // Compare Chart
  // ===============================
  async function renderCompare() {
    try {
      if (!compareMonthChartEl) return;

      const year = compareYearA?.value || currentYear;

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
          pointRadius: 4,
          pointHoverRadius: 6,
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
        compareChart.data.labels = labels;
        compareChart.data.datasets = datasets;
        compareChart.update();
      }

    } catch (err) {
      console.error("โหลด Compare Chart ล้มเหลว:", err);
    }
  }

  // ===== initial load =====
  renderYear(selectYear?.value || currentYear);
  renderCompare();

  // ===== events =====
  if (selectYear) {
    selectYear.addEventListener('change', e => renderYear(e.target.value));
  }

  [compareYearA, compareMonthA, compareYearB, compareMonthB].forEach(el => {
    if (el) el.addEventListener('change', renderCompare);
  });

});
