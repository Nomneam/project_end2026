document.addEventListener('DOMContentLoaded', function () {

  /* =========================
     CENTER TEXT PLUGIN
  ========================= */
  const centerTextPlugin = {
    id: 'centerText',
    beforeDraw(chart) {
      const { width, height, ctx } = chart;
      const total = chart.config.data.datasets[0].data
        .reduce((a, b) => a + b, 0);

      ctx.save();
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#212529';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(total, width / 2, height / 2);
      ctx.restore();
    }
  };

  Chart.register(centerTextPlugin);

  /* =========================
     USER ACTIVITY (DONUT)
  ========================= */
  const userCanvas = document.getElementById('userActivityChart');

  if (userCanvas) {
    fetch('/admin/user-activity/today')
      .then(res => res.json())
      .then(res => {

        if (!res.success) return;

        new Chart(userCanvas, {
          type: 'doughnut',
          data: {
            labels: ['ออนไลน์ (วันนี้)', 'ออฟไลน์ (วันนี้)'],
            datasets: [{
              data: [res.online || 0, res.offline || 0],
              backgroundColor: ['#20c997', '#adb5bd'],
              borderWidth: 3,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: { position: 'bottom' }
            }
          }
        });

      })
      .catch(err => console.error('User activity error:', err));
  }

  /* =========================
     ADS STATUS (DONUT + MONTH)
  ========================= */
  const adsCanvas = document.getElementById('adsStatusChart');
  const monthSelect = document.getElementById('adsMonthSelect');

  let adsChart = null;

  function loadAdsChart(month) {

    fetch(`/admin/ads-status-by-month?month=${month}`)
      .then(res => res.json())
      .then(res => {

        if (!res.success) return;

        const data = [
          Number(res.approved) || 0,
          Number(res.pending)  || 0,
          Number(res.expired)  || 0
        ];

        if (adsChart) {
          adsChart.data.datasets[0].data = data;
          adsChart.update();
          return;
        }

        adsChart = new Chart(adsCanvas, {
          type: 'doughnut',
          data: {
            labels: ['อนุมัติแล้ว', 'รออนุมัติ', 'หมดอายุ'],
            datasets: [{
              data: data,
              backgroundColor: ['#22c55e', '#facc15', '#ef4444'],
              borderWidth: 3,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  usePointStyle: true,
                  pointStyle: 'circle',
                  padding: 16,
                  font: { size: 13, weight: '600' }
                }
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    const total = context.dataset.data
                      .reduce((a, b) => a + b, 0);
                    const value = context.raw || 0;
                    const percent = total
                      ? ((value / total) * 100).toFixed(1)
                      : 0;
                    return `${context.label}: ${value} รายการ (${percent}%)`;
                  }
                }
              }
            }
          }
        });

      })
      .catch(err => console.error('Ads chart error:', err));
  }

  if (adsCanvas && monthSelect) {

    // ตั้งค่าเดือนปัจจุบัน
    const currentMonth = new Date().getMonth() + 1;
    monthSelect.value = currentMonth;

    loadAdsChart(currentMonth);

    monthSelect.addEventListener('change', function () {
      loadAdsChart(this.value);
    });
  }

});