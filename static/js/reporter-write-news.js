$(function () {
  const $form = $("#writeNewsForm");
  if ($form.length === 0) return;

  function hasSwal() {
    return typeof window.Swal !== "undefined" && typeof window.Swal.fire === "function";
  }

  function swalFire(opts) {
    if (hasSwal()) return window.Swal.fire(opts);
    if (opts && (opts.text || opts.title)) alert((opts.title ? opts.title + "\n" : "") + (opts.text || ""));
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

  let lastAction = "publish";

  function setAction(action) {
    lastAction = action === "draft" ? "draft" : "publish";
    $submitAction.val(lastAction);
  }
  setAction("publish");

  function resetSubcat() {
    $subCategory.html(`<option value="" selected disabled>เลือกประเภทย่อย</option>`);
    $subCategory.prop("disabled", true);
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

  function updateTitleCount() {
    $titleCount.text(($title.val() || "").length);
  }

  function isValidImageFile(file) {
    if (!file) return false;
    const ok = ["image/png", "image/jpeg", "image/webp"];
    return ok.includes(file.type);
  }

  // preload all subcategories
  const cache = {};
  async function preloadAllSubcategories() {
    const catIds = $mainCategory
      .find("option")
      .map(function () {
        const v = $(this).val();
        return v ? v : null;
      })
      .get()
      .filter(Boolean);

    for (const catId of catIds) {
      try {
        const res = await fetch(`/api/news/subcategories?cat_id=${catId}`);
        const json = await res.json();
        cache[catId] = json && json.ok ? json.data || [] : [];
      } catch (e) {
        cache[catId] = [];
      }
    }
  }

  // main image preview
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

  // sub images preview
  let subFiles = [];

  function rebuildSubInputFromSubFiles() {
    const dt = new DataTransfer();
    subFiles.forEach((f) => dt.items.add(f));
    $subImages[0].files = dt.files;
  }

  function renderSubPreview() {
    $subImagesPreview.empty();
    if (subFiles.length === 0) return;

    $subImagesPreview.addClass("sub-preview-row");

    subFiles.forEach((file, idx) => {
      const url = URL.createObjectURL(file);

      const $item = $(`
        <div class="position-relative preview-540x360">
          <img src="${url}" alt="sub">
          <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2" data-idx="${idx}">
            <i class="bi bi-x"></i>
          </button>
        </div>
      `);

      $subImagesPreview.append($item);
    });
  }

  $subImages.on("change", function () {
  const files = Array.from(this.files || []);
  if (files.length === 0) return;

  // ✅ สะสมไฟล์ ไม่ล้างของเดิม
  for (const f of files) {
    if (!isValidImageFile(f)) continue;

    // กันซ้ำ (ชื่อ+ขนาด)
    const dup = subFiles.some(x => x.name === f.name && x.size === f.size);
    if (!dup) subFiles.push(f);
  }

  rebuildSubInputFromSubFiles(); // ✅ สำคัญ: เขียนกลับเข้า input.files
  renderSubPreview();

  // ❌ ห้ามทำแบบนี้หลัง rebuild เพราะมันจะล้าง input.files
  // $(this).val("");
});



  $subImagesPreview.on("click", "button[data-idx]", function () {
    const idx = Number($(this).data("idx"));
    if (Number.isNaN(idx)) return;

    subFiles.splice(idx, 1);
    rebuildSubInputFromSubFiles();
    renderSubPreview();
  });

  // title counter
  updateTitleCount();
  $title.on("input", updateTitleCount);

  // subcategory behavior
  resetSubcat();
  preloadAllSubcategories();

  $mainCategory.on("change", function () {
    const catId = $(this).val();
    if (!catId) return resetSubcat();

    const rows = cache[catId] || [];
    if (!rows.length) return resetSubcat();

    fillSubcats(rows);
  });

  // draft / publish
  $btnDraft.on("click", function () {
    setAction("draft");
    $form.trigger("submit");
  });

  $btnPublish.on("click", function () {
    setAction("publish");
  });

  // submit via ajax
  $form.on("submit", function (e) {
    e.preventDefault();

    if (!$submitAction.val()) $submitAction.val(lastAction || "publish");

    if (!this.checkValidity()) {
      e.stopPropagation();
      $form.addClass("was-validated");
      return;
    }
    $form.addClass("was-validated");

    // รูปหลักต้องมี
    const mainFile = $mainImage[0].files && $mainImage[0].files[0];
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
      success: function (json) {
        if (!json || !json.ok) {
          swalFire({
            icon: "error",
            title: "ไม่สำเร็จ",
            text: (json && json.message) ? json.message : "เกิดข้อผิดพลาด",
          });
          return;
        }

        swalFire({
          icon: "success",
          title: "สำเร็จ",
          text: json.message || "บันทึกสำเร็จ",
          confirmButtonText: "ตกลง",
        }).then(() => {
          // ✅ จะให้ไปหน้าไหนหลังบันทึก เปลี่ยนตรงนี้ได้
          // ตัวอย่าง: กลับไปหน้าเขียนข่าวใหม่
          window.location.href = "/reporter/write_news";
        });
      },
      error: function (xhr) {
        let msg = "เกิดข้อผิดพลาด";
        try {
          const r = xhr.responseJSON;
          if (r && r.message) msg = r.message;
        } catch (_) {}
        swalFire({ icon: "error", title: "ไม่สำเร็จ", text: msg });
      },
    });
  });
});
