document.addEventListener("DOMContentLoaded", () => {
  initProfilePage();
});

/* =========================
   Init
========================= */
function initProfilePage() {
  bindEditProfile();
  bindAvatarUpload();
  bindChangePassword();
}

/* =========================
   Helpers
========================= */
function hasSwal() {
  return typeof window.Swal !== "undefined";
}

function showError(msg) {
  if (hasSwal()) Swal.fire("ข้อมูลไม่ถูกต้อง", msg, "warning");
  else alert(msg);
}

function showSuccess(msg) {
  if (hasSwal()) {
    return Swal.fire({
      icon: "success",
      title: "สำเร็จ",
      text: msg,
      timer: 1200,
      showConfirmButton: false,
    });
  } else {
    alert(msg);
    return Promise.resolve();
  }
}

function isValidPhone(phone) {
  return /^\d{10}$/.test(phone);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* =========================
   Auth confirm
========================= */
async function confirmPassword() {
  if (!hasSwal()) return prompt("กรอกรหัสผ่านเพื่อยืนยันการแก้ไข:");

  const { value: password, isConfirmed } = await Swal.fire({
    title: "ยืนยันตัวตน",
    input: "password",
    inputLabel: "กรอกรหัสผ่านเพื่อยืนยันการแก้ไขข้อมูล",
    inputPlaceholder: "รหัสผ่าน",
    showCancelButton: true,
    confirmButtonText: "ยืนยัน",
    cancelButtonText: "ยกเลิก",
    inputValidator: (value) => (!value ? "กรุณากรอกรหัสผ่าน" : undefined),
  });

  if (!isConfirmed) return null;
  return password;
}

/* =========================
   API
========================= */
async function submitProfileUpdate(formData, triggerBtn) {
  const password = await confirmPassword();
  if (!password) return;

  formData.append("auth_password", password);

  try {
    if (triggerBtn) triggerBtn.disabled = true;

    const res = await fetch("/reporter-profile/update", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Update failed");
    }

    await showSuccess("บันทึกข้อมูลเรียบร้อยแล้ว");
    location.reload();
  } catch (err) {
    console.error(err);
    if (hasSwal()) {
      Swal.fire("ผิดพลาด", err.message || "ไม่สามารถอัปเดตข้อมูลได้", "error");
    } else {
      alert(err.message || "อัปเดตไม่สำเร็จ");
    }
  } finally {
    if (triggerBtn) triggerBtn.disabled = false;
  }
}

async function submitChangePassword(form) {
  const formData = new FormData(form);

  try {
    const res = await fetch("/reporter-profile/change-password", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Change password failed");
    }

    await showSuccess("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
    location.reload();
  } catch (err) {
    console.error(err);
    if (hasSwal()) {
      Swal.fire("ผิดพลาด", err.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ", "error");
    } else {
      alert(err.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    }
  }
}

/* =========================
   Bindings
========================= */
function bindEditProfile() {
  const editBtns = document.querySelectorAll(".profile-action");
  if (!editBtns.length) return;

  editBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const row = btn.closest(".profile-row");
      const keyEl = row.querySelector(".profile-key");
      const valEl = row.querySelector(".profile-val");

      const label = keyEl.textContent.trim();
      const oldValue = valEl.textContent.trim();

      let fieldName = "";
      let inputType = "text";

      if (label.includes("ชื่อ") && !label.includes("นามสกุล")) {
        fieldName = "emp_fname";
      }

      if (label.includes("นามสกุล")) {
        fieldName = "emp_lname";
      }

      if (label.includes("อีเมล")) {
        fieldName = "emp_email";
        inputType = "email";
      }

      if (label.includes("เบอร์โทร")) {
        fieldName = "emp_phone";
        inputType = "tel";
      }

      if (!fieldName) return;

      valEl.innerHTML = `
        <input type="${inputType}" 
               class="form-control form-control-sm mb-1" 
               value="${oldValue}">
        <div class="d-flex gap-1">
          <button type="button" class="btn btn-sm btn-success">บันทึก</button>
          <button type="button" class="btn btn-sm btn-secondary">ยกเลิก</button>
        </div>
      `;

      const input = valEl.querySelector("input");
      const saveBtn = valEl.querySelector(".btn-success");
      const cancelBtn = valEl.querySelector(".btn-secondary");

      if (fieldName === "emp_phone") {
        input.addEventListener("input", () => {
          input.value = input.value.replace(/\D/g, "").slice(0, 10);
        });
      }

      cancelBtn.onclick = () => {
        valEl.textContent = oldValue;
      };

      saveBtn.onclick = async () => {
        const newValue = input.value.trim();

        if (!newValue) {
          return showError("กรุณากรอกข้อมูล");
        }

        if (fieldName === "emp_phone" && !isValidPhone(newValue)) {
          return showError("กรุณากรอกเบอร์โทร 10 หลัก");
        }

        if (fieldName === "emp_email" && !isValidEmail(newValue)) {
          return showError("รูปแบบอีเมลไม่ถูกต้อง");
        }

        const formData = new FormData();
        formData.append(fieldName, newValue);

        await submitProfileUpdate(formData, saveBtn);
      };
    });
  });
}

function bindAvatarUpload() {
  const avatarEditBtn = document.querySelector(".profile-edit-btn");
  if (!avatarEditBtn) return;

  avatarEditBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("emp_profile", file);

      await submitProfileUpdate(formData, avatarEditBtn);
    };

    input.click();
  });
}

function bindChangePassword() {
  const form = document.getElementById("changePasswordForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitChangePassword(form);
  });
}