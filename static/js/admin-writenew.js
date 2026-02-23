$(function () {
  const $form = $("#writeNewsForm");
  if ($form.length === 0) return;

  const MAX_SUB_IMAGES = 5;

  // ======================================================
  // SweetAlert Premium Setup
  // ======================================================
  function hasSwal() {
    return typeof window.Swal !== "undefined";
  }

  const Toast = hasSwal()
    ? Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
      })
    : null;

  const ModalSwal = hasSwal()
    ? Swal.mixin({
        customClass: {
          popup: "rounded-4 shadow-lg",
          confirmButton: "btn btn-primary px-4",
          cancelButton: "btn btn-secondary px-4",
        },
        buttonsStyling: false,
      })
    : null;

  function swalLoading(title) {
    if (!hasSwal()) return;
    Swal.fire({
      title: title || "กำลังบันทึกข่าว...",
      html: "กรุณารอสักครู่",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
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
  // Draft / Publish
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
  function updateTitleCount() {
    $titleCount.text(($title.val() || "").length);
  }

  function isValidImageFile(file) {
    return ["image/png", "image/jpeg", "image/webp"].includes(file.type);
  }

  // ======================================================
  // Subcategory
  // ======================================================
  function resetSubcat() {
    $subCategory
      .html(`<option value="" selected disabled>เลือกประเภทย่อย</option>`)
      .prop("disabled", true);
    $subcatHint.text("กรุณาเลือกประเภทข่าวหลักก่อน").show();
  }

  function fillSubcats(rows) {
    $subCategory.html(`<option value="" selected disabled>เลือกประเภทย่อย</option>`);
    rows.forEach((r) => {
      $subCategory.append(
        `<option value="${r.subcat_id}">${r.subcat_name}</option>`
      );
    });
    $subCategory.prop("disabled", false);
    $subcatHint.hide();
  }

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
        const res = await fetch(
          `/api/admin/news/subcategories?cat_id=${catId}`
        );
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

  // ======================================================
  // Main Image Preview
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
      Toast?.fire({
        icon: "warning",
        title: "รองรับเฉพาะ PNG / JPG / WEBP",
      });
      return;
    }

    const url = URL.createObjectURL(file);
    $mainImagePreview.attr("src", url);
    $mainImagePreviewWrap.show();
  });

  $btnRemoveMainImage.on("click", clearMainImage);

  // ======================================================
  // Sub Images (max 5)
  // ======================================================
  let subFiles = [];

  function rebuildSubInput() {
    const dt = new DataTransfer();
    subFiles.forEach((f) => dt.items.add(f));
    $subImages[0].files = dt.files;
  }

  function renderSubPreview() {
    $subImagesPreview.empty();

    subFiles.forEach((file, idx) => {
      const url = URL.createObjectURL(file);
      $subImagesPreview.append(`
        <div class="position-relative preview-540x360">
          <img src="${url}" class="rounded-3 shadow-sm">
          <button type="button"
            class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2"
            data-idx="${idx}">
            <i class="bi bi-x"></i>
          </button>
        </div>
      `);
    });

    rebuildSubInput();
  }

  $subImages.on("change", function () {
    const files = Array.from(this.files || []);

    for (const f of files) {
      if (!isValidImageFile(f)) {
        Toast?.fire({
          icon: "warning",
          title: "รองรับเฉพาะ PNG / JPG / WEBP",
        });
        continue;
      }

      if (subFiles.length >= MAX_SUB_IMAGES) {
        Toast?.fire({
          icon: "info",
          title: `อัปโหลดได้สูงสุด ${MAX_SUB_IMAGES} รูป`,
        });
        break;
      }

      const dup = subFiles.some(
        (x) => x.name === f.name && x.size === f.size
      );
      if (!dup) subFiles.push(f);
    }

    renderSubPreview();
  });

  $subImagesPreview.on("click", "button[data-idx]", function () {
    const idx = Number($(this).data("idx"));
    subFiles.splice(idx, 1);
    renderSubPreview();
  });

  // ======================================================
  // Title Counter
  // ======================================================
  updateTitleCount();
  $title.on("input", updateTitleCount);

  // ======================================================
  // Draft / Publish Buttons
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

    const mainFile = $mainImage[0].files[0];
    if (!mainFile) {
      Toast?.fire({
        icon: "warning",
        title: "กรุณาเลือกรูปหลัก",
      });
      return;
    }

    const formData = new FormData(this);

    swalLoading("กำลังบันทึกข่าว...");

    $.ajax({
      url: $form.attr("action"),
      method: "POST",
      data: formData,
      processData: false,
      contentType: false,

      success(json) {
        if (!json || !json.ok) {
          ModalSwal.fire({
            icon: "error",
            title: "บันทึกไม่สำเร็จ",
            text: json?.message || "เกิดข้อผิดพลาด",
          });
          return;
        }

        ModalSwal.fire({
          icon: "success",
          title: "บันทึกสำเร็จ ",
          text: json.message || "ข่าวถูกบันทึกเรียบร้อยแล้ว",
          confirmButtonText: "ไปหน้าจัดการข่าว",
        }).then(() => {
          window.location.href = "/admin-write-new";
        });
      },

      error(xhr) {
        ModalSwal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: xhr?.responseJSON?.message || "ไม่สามารถบันทึกข้อมูลได้",
        });
      },
    });
  });
});