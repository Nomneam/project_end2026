/* static/js/news_detail.js */
$(function () {
  // ======================================================
  // Header date (เหมือน index)
  // ======================================================
  const now = new Date();
  setHeaderDate(now);

  // ======================================================
  // Font size switcher
  // ======================================================
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

  // ======================================================
  // Top search (Enter -> ไปหน้า index พร้อม q)
  // ======================================================
  $("#topSearch").on("keypress", function (e) {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const q = ($(this).val() || "").trim();
    if (!q) return;

    const indexUrl = $("body").data("index-url") || "/index";
    const target = indexUrl + (indexUrl.includes("?") ? "&" : "?") + "q=" + encodeURIComponent(q);
    window.location.href = target;
  });

  // ======================================================
  // Share (copy link)
  // ======================================================
  $("#btnShare").on("click", async function () {
    const url = window.location.href;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        toast("คัดลอกลิงก์แล้ว");
      } else {
        legacyCopy(url);
      }
    } catch (_) {
      legacyCopy(url);
    }
  });

  function legacyCopy(text) {
    try {
      window.prompt("คัดลอกลิงก์นี้:", text);
      toast("คัดลอกลิงก์แล้ว");
    } catch (_) {
      alert("คัดลอกไม่สำเร็จ");
    }
  }

  // ======================================================
  // Save (mock): localStorage
  // ======================================================
  const SAVE_KEY = "bkk_saved_news_v1";
  const news = getCurrentNewsMeta();

  syncSaveButton();

  $("#btnSave").on("click", function () {
    const list = readSaved();
    const idx = list.findIndex((x) => String(x.id) === String(news.id));

    if (idx >= 0) {
      list.splice(idx, 1);
      writeSaved(list);
      syncSaveButton();
      toast("ลบจากรายการบันทึกแล้ว");
      return;
    }

    list.unshift({
      id: String(news.id),
      title: String(news.title || "ข่าว"),
      url: String(window.location.href),
      saved_at: new Date().toISOString(),
    });

    writeSaved(list);
    syncSaveButton();
    toast("บันทึกข่าวแล้ว");
  });

  function readSaved() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function writeSaved(arr) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(arr || []));
    } catch (_) {}
  }

  function isSaved() {
    const list = readSaved();
    return list.some((x) => String(x.id) === String(news.id));
  }

  function syncSaveButton() {
    const saved = isSaved();
    const $btn = $("#btnSave");
    if (!$btn.length) return;

    if (saved) {
      $btn.addClass("active").text("บันทึกแล้ว");
    } else {
      $btn.removeClass("active").text("บันทึก");
    }
  }

  function getCurrentNewsMeta() {
    const metaId = $('meta[name="news-id"]').attr("content");
    const metaTitle = $('meta[name="news-title"]').attr("content");

    let id = metaId;
    if (!id) {
      const m = window.location.pathname.match(/\/news\/(\d+)/);
      id = m ? m[1] : window.location.pathname;
    }

    const title = metaTitle || document.title || "ข่าว";
    return { id, title };
  }

//   // ============================================
// // Load Sidebar Ads
// // ============================================
async function loadSidebarAds() {
  const container = document.getElementById("sidebarAds");
  if (!container) return;

  try {
    const res = await fetch("/api/ads/sidebar");
    const data = await res.json();

    if (!data.ok || !data.items || data.items.length === 0) {
      container.style.display = "none";
      return;
    }

    container.innerHTML = data.items.map(ad => `
      <a href="${ad.target_url}" target="_blank" class="sidebar-ad">
        <img src="${ad.adv_image_url}" alt="${ad.adv_name}">
      </a>
    `).join("");

    // ✅ รอให้รูปโหลดก่อนคำนวณ
    const images = container.querySelectorAll("img");
    let loaded = 0;

    images.forEach(img => {
      if (img.complete) {
        loaded++;
      } else {
        img.onload = img.onerror = () => {
          loaded++;
          if (loaded === images.length) adjustSidebarAds();
        };
      }
    });

    if (loaded === images.length) {
      adjustSidebarAds();
    }

  } catch (err) {
    console.error("Sidebar ads error:", err);
    container.style.display = "none";
  }
}


loadSidebarAds();



  function toast(msg) {
    // ถ้ามี Swal ก็เปลี่ยนเป็น Swal.fire ได้
    try {
      if (window.Swal && typeof window.Swal.fire === "function") {
        return window.Swal.fire({ icon: "success", title: msg, timer: 1400, showConfirmButton: false });
      }
    } catch (_) {}
    alert("✅ " + msg);
  }


function adjustSidebarAds() {
  const $article = $(".article-card");
  const $ads = $(".sidebar-ad");

  if (!$article.length || !$ads.length) return;

  const articleHeight = $article.outerHeight(true);
  let usedHeight = 0;

  $ads.each(function () {
    const adHeight = $(this).outerHeight(true);
    usedHeight += adHeight;

    if (usedHeight > articleHeight - 150) {
      $(this).hide();
    }
  });
}
});
