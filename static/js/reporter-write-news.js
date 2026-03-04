$(function () {
  const $form = $("#writeNewsForm");
  if ($form.length === 0) return;

  const MAX_SUB_IMAGES = 5;
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
  const $videoInput = $('input[name="video_file"]');

  // ======================================================
  // SweetAlert helpers
  // ======================================================
  function hasSwal() {
    return typeof window.Swal !== "undefined" && typeof window.Swal.fire === "function";
  }

  function swalFire(opts) {
    if (hasSwal()) return window.Swal.fire(opts);
    if (opts && (opts.text || opts.title)) {
      alert((opts.title ? opts.title + "\n" : "") + (opts.text || ""));
    }
    return Promise.resolve();
  }

  function swalLoading(title) {
    if (!hasSwal()) return;
    window.Swal.fire({
      title: title || "กำลังบันทึก...",
      allowOutsideClick: false,
      didOpen: () => window.Swal.showLoading(),
    });
  }

  // ======================================================
  // Elements
  // ======================================================
  const $mainCategory = $("#mainCategory");
  const $subCategory = $("#subCategory");
  const $subcatHint = $("#subcatHint");

  const $title = $("#newsTitle");
  const $titleCount = $("#titleCount");

  const $mainImage = $("#mainImage");
  const $mainImagePreviewWrap = $("#mainImagePreviewWrap");
  const $mainImagePreview = $("#mainImagePreview");
  const $btnRemoveMainImage = $("#btnRemoveMainImage");

  const $subImages = $("#subImages");
  const $subImagesPreview = $("#subImagesPreview");

  const $submitAction = $("#submitAction");
  const $btnDraft = $("#btnSaveDraft");
  const $btnPublish = $("#btnPublish");

  // ======================================================
  // Action (draft / publish)
  // ======================================================
  let lastAction = "publish";

  function setAction(action) {
    lastAction = action === "draft" ? "draft" : "publish";
    $submitAction.val(lastAction);
  }
  setAction("publish");

  // ======================================================
  // Utils
  // ======================================================
  function isValidImageFile(file) {
    if (!file) return false;
    return ["image/png", "image/jpeg", "image/webp"].includes(file.type);
  }

  function updateTitleCount() {
    const len = ($title.val() || "").length;
    $titleCount.text(len);
  }

  // ======================================================
  // Subcategory helpers
  // ======================================================
  function setSubcatNoNeed() {
    $subCategory
      .prop("disabled", true)
      .html(`<option value="">— ไม่มีประเภทย่อย —</option>`);

    $subcatHint
      .text("หมวดนี้ไม่มีประเภทย่อย สามารถลงข่าวได้เลย")
      .show();
  }

  function fillSubcats(rows) {
    $subCategory.prop("disabled", false);
    $subCategory.html(`<option value="">เลือกประเภทย่อย (ถ้ามี)</option>`);

    rows.forEach((r) => {
      $subCategory.append(
        `<option value="${r.subcat_id}">${r.subcat_name}</option>`
      );
    });

    $subcatHint
      .text("กรุณาเลือกประเภทย่อย")
      .show();
  }

  // ======================================================
  // 🔥 FIX หลัก: โหลด subcategory ตอนเลือก main category
  // ======================================================
  const subcatCache = {};

  setSubcatNoNeed();

  $mainCategory.on("change", async function () {
    const catId = $(this).val();

    if (!catId) {
      setSubcatNoNeed();
      return;
    }

    // ถ้าเคยโหลดแล้ว ใช้ cache
    if (subcatCache[catId]) {
      if (subcatCache[catId].length === 0) return setSubcatNoNeed();
      return fillSubcats(subcatCache[catId]);
    }

    // ยังไม่เคยโหลด → call API
    try {
      $subCategory.prop("disabled", true).html(`<option>กำลังโหลด...</option>`);

      const res = await fetch(`/api/news/subcategories?cat_id=${catId}`);
      const json = await res.json();

      const rows = json && json.ok ? json.data || [] : [];
      subcatCache[catId] = rows;

      if (!rows.length) {
        setSubcatNoNeed();
      } else {
        fillSubcats(rows);
      }
    } catch (err) {
      subcatCache[catId] = [];
      setSubcatNoNeed();
    }
  });

  // ======================================================
  // Main image preview
  // ======================================================
  function clearMainImage() {
    $mainImage.val("");
    $mainImagePreview.attr("src", "");
    $mainImagePreviewWrap.hide();
  }

  $mainImage.on("change", function () {
    const file = this.files && this.files[0];
    if (!file) return clearMainImage();

    if (!isValidImageFile(file)) {
      clearMainImage();
      swalFire({
        icon: "warning",
        title: "ไฟล์รูปหลักไม่ถูกต้อง",
        text: "รองรับ PNG / JPG / WEBP เท่านั้น",
      });
      return;
    }

    const url = URL.createObjectURL(file);
    $mainImagePreview.attr("src", url);
    $mainImagePreviewWrap.show();
  });

  $btnRemoveMainImage.on("click", clearMainImage);

  // ======================================================
  // Sub images (max 5)
  // ======================================================
  let subFiles = [];

  function rebuildSubInput() {
    const dt = new DataTransfer();
    subFiles.forEach((f) => dt.items.add(f));
    $subImages[0].files = dt.files;
  }

  function renderSubPreview() {
    $subImagesPreview.empty();
    if (!subFiles.length) return;

    subFiles.forEach((file, idx) => {
      const url = URL.createObjectURL(file);
      $subImagesPreview.append(`
        <div class="position-relative preview-540x360">
          <img src="${url}">
          <button type="button"
                  class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2"
                  data-idx="${idx}">
            <i class="bi bi-x"></i>
          </button>
        </div>
      `);
    });
  }

  function enforceLimit() {
    if (subFiles.length <= MAX_SUB_IMAGES) return;
    subFiles = subFiles.slice(0, MAX_SUB_IMAGES);
    rebuildSubInput();
    renderSubPreview();
    swalFire({
      icon: "info",
      title: "เลือกรูปรองเกินจำนวน",
      text: `เลือกได้สูงสุด ${MAX_SUB_IMAGES} รูป`,
    });
  }

  $subImages.on("change", function () {
    const files = Array.from(this.files || []);
    files.forEach((f) => {
      if (!isValidImageFile(f)) return;
      if (!subFiles.some((x) => x.name === f.name && x.size === f.size)) {
        subFiles.push(f);
      }
    });

    enforceLimit();
    rebuildSubInput();
    renderSubPreview();
  });

  $subImagesPreview.on("click", "button[data-idx]", function () {
    const idx = Number($(this).data("idx"));
    if (Number.isNaN(idx)) return;
    subFiles.splice(idx, 1);
    rebuildSubInput();
    renderSubPreview();
  });

  // ======================================================
  // Title counter
  // ======================================================
  updateTitleCount();
  $title.on("input", updateTitleCount);

  // ======================================================
  // Draft / Publish
  // ======================================================
  $btnDraft.on("click", function () {
    setAction("draft");
    $form.trigger("submit");
  });

  $btnPublish.on("click", function () {
    setAction("publish");
  });

  // ======================================================
  // Submit
  // ======================================================
  $form.on("submit", function (e) {
    e.preventDefault();

    if (!this.checkValidity()) {
      $form.addClass("was-validated");
      return;
    }
    $form.addClass("was-validated");

    const mainFile = $mainImage[0].files[0];
    if (!mainFile) {
      swalFire({ icon: "warning", title: "กรุณาเลือกรูปหลัก" });
      return;
    }

    const videoFile = $videoInput[0].files[0];

if (videoFile) {
  if (videoFile.type !== "video/mp4") {
    swalFire({
      icon: "warning",
      title: "ไฟล์วิดีโอไม่ถูกต้อง",
      text: "รองรับเฉพาะไฟล์ .mp4 เท่านั้น",
    });
    return;
  }

  if (videoFile.size > MAX_VIDEO_SIZE) {
    swalFire({
      icon: "warning",
      title: "ไฟล์ใหญ่เกินกำหนด",
      text: "วิดีโอต้องไม่เกิน 100MB",
    });
    return;
  }
}

    const formData = new FormData(this);

    formData.delete("sub_images");
    subFiles.slice(0, MAX_SUB_IMAGES).forEach((f) => {
      formData.append("sub_images", f);
    });

    swalLoading("กำลังบันทึก...");

    $.ajax({
      url: $form.attr("action"),
      method: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success(json) {
        if (!json || !json.ok) {
          swalFire({
            icon: "error",
            title: "ไม่สำเร็จ",
            text: json?.message || "เกิดข้อผิดพลาด",
          });
          return;
        }

        swalFire({
          icon: "success",
          title: "สำเร็จ",
          text: json.message || "บันทึกข่าวเรียบร้อย",
        }).then(() => {
          window.location.href = "/reporter/write_news";
        });
      },
      error(xhr) {
        swalFire({
          icon: "error",
          title: "ไม่สำเร็จ",
          text: xhr?.responseJSON?.message || "เกิดข้อผิดพลาด",
        });
      },
    });
  });
});
