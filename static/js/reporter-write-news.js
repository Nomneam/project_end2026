document.addEventListener("DOMContentLoaded", () => {
  const mainCategory = document.getElementById("mainCategory");
  const subCategory = document.getElementById("subCategory");

  // cache: { catId: [{subcat_id, subcat_name}, ...] }
  const cache = {};

  function resetSubcat() {
    subCategory.innerHTML = `<option value="" selected disabled>เลือกประเภทย่อย</option>`;
    subCategory.disabled = true;
  }

  function fillSubcats(rows) {
    subCategory.innerHTML = `<option value="" selected disabled>เลือกประเภทย่อย</option>`;
    for (const r of rows) {
      const opt = document.createElement("option");
      opt.value = r.subcat_id;
      opt.textContent = r.subcat_name;
      subCategory.appendChild(opt);
    }
    subCategory.disabled = false;
  }

  // preload ประเภทย่อยของทุกหมวดแบบเงียบ ๆ
  async function preloadAllSubcategories() {
    const options = [...mainCategory.options].filter(o => o.value);
    for (const opt of options) {
      const catId = opt.value;
      try {
        const res = await fetch(`/api/news/subcategories?cat_id=${catId}`);
        const json = await res.json();
        if (json.ok) {
          cache[catId] = json.data || [];
        }
      } catch (_) {
        cache[catId] = [];
      }
    }
  }

  // init
  resetSubcat();
  preloadAllSubcategories(); // 🔥 โหลดล่วงหน้า

  mainCategory.addEventListener("change", (e) => {
    const catId = e.target.value;
    if (!catId) {
      resetSubcat();
      return;
    }

    const rows = cache[catId] || [];
    if (!rows.length) {
      resetSubcat();
      return;
    }

    fillSubcats(rows); // ⚡ ขึ้นทันที ไม่มีโหลด
  });
});
