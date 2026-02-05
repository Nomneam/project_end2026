$(function () {
  // ===========================
  // Mock data
  // ===========================
  const article = {
    id: 101,
    cat: "ต่างประเทศ",
    title:
      'ฮิวแมนไรท์วอทช์ เตือนสหรัฐฯ กำลังกลายเป็น "รัฐอำนาจนิยม" ภายใต้การนำของทรัมป์',
    coverUrl:
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1400&q=80",
    dateText: "4 ก.พ. 2569",
    timeAgo: "10 นาทีที่แล้ว",
    author: "กองบรรณาธิการ",

    // รูปรอง: ใส่ได้สูงสุด 2 รูป (ว่างได้)
    secondaryImages: [
      "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1400&q=80",
      // ถ้าจะทดสอบไม่มีรูป ให้เป็น "" หรือ null
    ],

    paragraphs: [
      "ฮิวแมนไรท์วอทช์ (Human Rights Watch) ออกรายงานเตือนสถานการณ์สิทธิมนุษยชน โดยชี้ว่าแนวโน้มทางการเมืองและนโยบายกำลังส่งผลต่อเสรีภาพในหลายด้าน",
      "รายงานกล่าวถึงประเด็นการตรวจสอบถ่วงดุล รวมถึงความกังวลเกี่ยวกับการใช้กลไกรัฐที่อาจกระทบต่อสิทธิขั้นพื้นฐาน",
      "องค์กรได้ยกตัวอย่างเหตุการณ์หลายกรณีที่สะท้อนถึงทิศทางนโยบาย และเรียกร้องให้มีความโปร่งใสมากขึ้น",
      "อย่างไรก็ตาม อีกฝ่ายหนึ่งมองว่า นโยบายบางอย่างเป็นไปเพื่อความมั่นคงและการบริหารจัดการภายในประเทศ",
      "ท้ายที่สุด ประเด็นดังกล่าวยังคงเป็นที่ถกเถียง และต้องติดตามผลกระทบต่อสังคมในระยะยาว",
    ],
    tags: ["ต่างประเทศ", "การเมืองโลก", "สิทธิมนุษยชน"],
  };

  const hot = Array.from({ length: 6 }).map((_, i) => ({
    cat: ["การเมือง", "เศรษฐกิจ", "สังคม", "เทคโนโลยี"][i % 4],
    timeAgo: ["25 นาทีที่แล้ว", "1 ชม. ที่แล้ว", "2 ชม. ที่แล้ว"][i % 3],
    title: `ข่าวเด่นตัวอย่าง #${i + 1} โทนเดียวกับหน้า index`,
    imgId: 120 + i,
  }));

  const related = Array.from({ length: 4 }).map((_, i) => ({
    cat: ["ต่างประเทศ", "สังคม", "เศรษฐกิจ"][i % 3],
    timeAgo: ["1 ชม. ที่แล้ว", "2 ชม. ที่แล้ว", "เมื่อวานนี้"][i % 3],
    title: `ข่าวที่เกี่ยวข้อง #${i + 1} คลิกไปหน้าอ่านข่าวได้`,
    imgId: 140 + i,
  }));

  // ===========================
  // Render header date
  // ===========================
  $("#todayText").text(formatToday());

  // ===========================
  // Render main article
  // ===========================
  $("#coverImg").attr("src", article.coverUrl);
  $("#catName").text(article.cat);
  $("#timeAgo").text(article.timeAgo);
  $("#title").text(article.title);
  $("#dateText").text(article.dateText);
  $("#author").text(article.author);

  // Render paragraphs
  const $content = $("#content").empty();
  article.paragraphs.forEach((p) => $content.append(`<p>${escapeHtml(p)}</p>`));

  // ===========================
  // Insert secondary images (max 2)
  // - รูป1 หลังย่อหน้า 2
  // - รูป2 หลังย่อหน้า 5
  // ถ้าไม่มีรูป -> ไม่แสดง
  // ===========================
  const plan = [
    {
      url: article.secondaryImages?.[0],
      afterParagraph: 2,
      caption: "ภาพประกอบ (1)",
    },
    {
      url: article.secondaryImages?.[1],
      afterParagraph: 5,
      caption: "ภาพประกอบ (2)",
    },
  ].filter((x) => (x.url || "").toString().trim());

  const $paras = $content.find("p");
  plan.forEach((item) => {
    const $figure = $(`
      <figure class="figure-inline">
        <div class="imgbox">
          <img src="${escapeAttr(item.url)}" alt="ภาพประกอบ">
        </div>
        <figcaption class="caption">${escapeHtml(item.caption)}</figcaption>
      </figure>
    `);

    const idx = item.afterParagraph - 1;
    if ($paras.length && idx >= 0 && idx < $paras.length) $figure.insertAfter($paras.eq(idx));
    else $content.append($figure);
  });

  // Tags
  const $tags = $("#tags").empty();
  article.tags.forEach((t) => {
    $tags.append(
      `<span class="ad-badge" style="background: rgba(206,17,38,.92)">#${escapeHtml(
        t
      )}</span>`
    );
  });

  // ===========================
  // Sidebar hot list
  // ===========================
  const $hot = $("#hotList").empty();
  hot.forEach((n, idx) => {
    $hot.append(`
      <div class="d-flex align-items-start gap-3 p-3 rounded-4 border bg-white">
        <div class="fw-bold text-white d-flex align-items-center justify-content-center"
             style="width: 32px; height: 32px; border-radius: 10px; background: var(--bkk-red)">
          ${idx + 1}
        </div>
        <div style="min-width:0" class="flex-grow-1">
          <div class="small text-muted mb-1">${escapeHtml(n.cat)} • ${escapeHtml(n.timeAgo)}</div>
          <div class="fw-bold small line-clamp-2">${escapeHtml(n.title)}</div>
        </div>
      </div>
    `);
  });

  // ===========================
  // Related grid
  // ===========================
  const $rel = $("#relatedGrid").empty();
  related.forEach((n) => {
    $rel.append(`
      <div class="col-md-6">
        <div class="bg-white rounded-4 overflow-hidden shadow-sm border h-100">
          <div class="position-relative">
            <img src="https://picsum.photos/id/${n.imgId}/900/520" class="w-100" style="height:160px;object-fit:cover" alt="">
            <div class="position-absolute top-0 start-0 p-3">
              <span class="ad-badge" style="background: rgba(0,45,98,.75)">news</span>
            </div>
          </div>
          <div class="p-3" style="border-top: 4px solid var(--bkk-navy)">
            <div class="d-flex align-items-center justify-content-between gap-2">
              <span class="text-red-bkk fw-bold text-uppercase" style="font-size: 12px">${escapeHtml(n.cat)}</span>
              <span class="small text-muted">${escapeHtml(n.timeAgo)}</span>
            </div>
            <div class="fw-bold mt-1 line-clamp-2">${escapeHtml(n.title)}</div>
            <div class="small text-muted mt-3">คลิกเพื่ออ่านต่อ (mock)</div>
          </div>
        </div>
      </div>
    `);
  });

  // ===========================
  // Font size switcher
  // ===========================
  $("html").removeClass("font-sm font-md font-lg").addClass("font-md");

  $(".js-font").on("click", function () {
    const size = $(this).data("font"); // sm|md|lg
    $(".js-font").removeClass("active");
    $(this).addClass("active");

    $("html").removeClass("font-sm font-md font-lg");
    if (size === "sm") $("html").addClass("font-sm");
    else if (size === "lg") $("html").addClass("font-lg");
    else $("html").addClass("font-md");
  });

  // ===========================
  // Top search (mock)
  // ===========================
  $("#topSearch").on("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      alert("ตอนนี้เป็น mock UI: ค้นหา '" + ($(this).val() || "") + "'");
    }
  });

  // ===========================
  // Share / Save (mock)
  // ===========================
  $("#btnShare").on("click", function () {
    alert("Mock: แชร์ข่าว (ยังไม่ต่อระบบจริง)");
  });
  $("#btnSave").on("click", function () {
    alert("Mock: บันทึกข่าว (ยังไม่ต่อระบบจริง)");
  });

  // ===========================
  // Helpers
  // ===========================
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(s) {
    return String(s).replaceAll('"', "%22").replaceAll("'", "%27");
  }

  function formatToday() {
    // โชว์แบบง่ายๆ (English) เพราะยังไม่ใช้ lib
    // ถ้าจะให้ไทยเต็ม เดี๋ยวผมปรับเป็น format ไทยให้ได้
    const d = new Date();
    return d.toDateString();
  }
});
