$(function () {
  // -------- SweetAlert helpers --------
  function hasSwal() {
    return typeof window.Swal !== "undefined" && typeof window.Swal.fire === "function";
  }

  function swalFire(opts) {
    if (hasSwal()) return Swal.fire(opts);
    // fallback
    const ok = confirm((opts.title ? opts.title + "\n" : "") + (opts.text || ""));
    return Promise.resolve({ isConfirmed: ok });
  }

  function swalToast(icon, title) {
    if (!hasSwal()) return alert(title || "");
    return Swal.fire({ icon: icon || "info", title: title || "", timer: 1500, showConfirmButton: false });
  }

  // -------- Soft delete handler --------
  $(document).on("click", ".btn-soft-delete", async function () {
    const newsId = $(this).data("id");
    const title = $(this).data("title") || "";

    const rs = await swalFire({
      icon: "warning",
      title: "ยืนยันการลบข่าว?",
      text: title ? `ต้องการลบข่าว: "${title}" ใช่หรือไม่` : "ต้องการลบข่าวนี้ใช่หรือไม่",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });

    if (!rs.isConfirmed) return;

    try {
      const r = await fetch(`/reporter/news/delete/${newsId}`, {
        method: "POST",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok || !data.ok) {
        await swalFire({
          icon: "error",
          title: "ลบไม่สำเร็จ",
          text: data.message || "เกิดข้อผิดพลาด",
        });
        return;
      }

      swalToast("success", data.message || "ลบแล้ว");
      // ✅ รีเฟรชหน้าเพื่อให้ข้อมูลหายจากตาราง (เพราะ del_flg=1 แล้ว)
      setTimeout(() => location.reload(), 600);

    } catch (e) {
      await swalFire({
        icon: "error",
        title: "ลบไม่สำเร็จ",
        text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้",
      });
    }
  });
});
