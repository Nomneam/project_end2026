$(function () {
  const $form = $("#writeNewsForm");
  if ($form.length === 0) return;

  const MAX_SUB_IMAGES = 5;

  // ===============================
  // SweetAlert helpers
  // ===============================
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

  // ===============================
  // Elements
  // ===============================
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

  // ===============================
  // Action (draft / publish)
  // ===============================
  let lastAction = "publish";

  function setAction(action) {
    lastAction = action === "draft" ? "draft" : "publish";
    $submitAction.val(lastAction);
  }
  setAction("publish");

  // ===============================
  // Utils
  // ===============================
  function updateTitleCount() {
    $titleCount.text(($title.val() || "").length);
  }

  function isValidImageFile(file) {
    if (!file) return false;
    return ["image/png", "image/jpeg", "image/webp"].includes(file.type);
  }

  // ===============================
  // Subcategory
  // ===============================
  function resetSubcat() {
    $subCategory
      .html(`<option value="" selected disabled>เลือกประเภทย่อย</option>`)
      .prop("disabled", true);
    $subcatHint.text("กรุณาเลือกประเภทข่าวหลักก่อน").show();
  }

  function fillSubcats(rows) {
    $subCategory.html(`<option value="" selected disabled>เลือกประเภทย่อย</option>`);
    rows.forEach((r) => {
      $subCategory.append(`<option value="${r.subcat_id}">${r.subcat_name}</option>`);
    });
    $subCategory.prop("disabled", false);
    $subcatHint.hide();
  }

  const cache = {};
  async function preloadAllSubcategories() {
    const catIds = $mainCategory.find("option").map(function () {
      const v = $(this).val();
      return v ? v : null;
    }).get().filter(Boolean);

    for (const catId of catIds) {
      try {
        const res = await fetch(`/api/admin/news/subcategories?cat_id=${catId}`);
        const json = await res.json();
        cache[catId] = json && json.ok ? json.data || [] : [];
      } catch (e) {
        cache[catId] = [];
      }
    }
  }

  resetSubcat();
  preloadAllSubcategories();

  $mainCategory.on("change", function () {
    const catId = $(this).val();
    if (!catId) return resetSubcat();

    const rows = cache[catId] || [];
    if (!rows.length) return resetSubcat();
    fillSubcats(rows);
  });

  // ===============================
  // Main image preview
  // ===============================
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
      swalFire({ icon: "warning", title: "ไฟล์รูปหลักไม่ถูกต้อง", text: "รองรับ PNG / JPG / WEBP เท่านั้น" });
      return;
    }

    const url = URL.createObjectURL(file);
    $mainImagePreview.attr("src", url);
    $mainImagePreviewWrap.show();
  });

  $btnRemoveMainImage.on("click", clearMainImage);

  // ===============================
  // Sub images (max 5)
  // ===============================
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
          <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2" data-idx="${idx}">
            <i class="bi bi-x"></i>
          </button>
        </div>
      `);
    });
  }

  $subImages.on("change", function () {
    const files = Array.from(this.files || []);
    for (const f of files) {
      if (!isValidImageFile(f)) continue;

      if (subFiles.length >= MAX_SUB_IMAGES) {
        swalFire({
          icon: "info",
          title: "เลือกรูปรองเกินจำนวน",
          text: `อัปโหลดได้สูงสุด ${MAX_SUB_IMAGES} รูป`,
        });
        break;
      }

      const dup = subFiles.some(x => x.name === f.name && x.size === f.size);
      if (!dup) subFiles.push(f);
    }

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

  // ===============================
  // Title counter
  // ===============================
  updateTitleCount();
  $title.on("input", updateTitleCount);

  // ===============================
  // Draft / Publish
  // ===============================
  $btnDraft.on("click", function () {
    setAction("draft");
    $form.trigger("submit");
  });

  $btnPublish.on("click", function () {
    setAction("publish");
  });

  // ===============================
  // Submit
  // ===============================
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

    const formData = new FormData(this);

    swalLoading("กำลังบันทึก...");

    $.ajax({
      url: $form.attr("action"),
      method: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success(json) {
        if (!json || !json.ok) {
          swalFire({ icon: "error", title: "ไม่สำเร็จ", text: json?.message || "เกิดข้อผิดพลาด" });
          return;
        }

        swalFire({
          icon: "success",
          title: "สำเร็จ",
          text: json.message || "บันทึกข่าวเรียบร้อย",
        }).then(() => {
          window.location.href = "/admin-write-new";
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
