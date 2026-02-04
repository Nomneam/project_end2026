document.addEventListener("DOMContentLoaded", function () {
  const editBtns = document.querySelectorAll(".profile-action");
  const avatarEditBtn = document.querySelector(".profile-edit-btn");

  function hasSwal() {
    return typeof window.Swal !== "undefined";
  }

  function showError(msg) {
    if (hasSwal()) {
      Swal.fire("ข้อมูลไม่ถูกต้อง", msg, "warning");
    } else {
      alert(msg);
    }
  }

  function isValidPhone(phone) {
    return /^\d{10}$/.test(phone); // ตัวเลข 10 หลัก
    // ถ้าต้องการบังคับขึ้นต้นด้วย 0 ใช้:
    // return /^0\d{9}$/.test(phone);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function confirmPassword() {
    if (!hasSwal()) {
      return prompt("กรอกรหัสผ่านเพื่อยืนยันการแก้ไข:");
    }

    const { value: password } = await Swal.fire({
      title: "ยืนยันตัวตน",
      input: "password",
      inputLabel: "กรอกรหัสผ่านเพื่อยืนยันการแก้ไขข้อมูล",
      inputPlaceholder: "รหัสผ่าน",
      inputAttributes: {
        autocapitalize: "off",
        autocorrect: "off",
      },
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#0d6efd",
      cancelButtonColor: "#6c757d",
      inputValidator: (value) => {
        if (!value) return "กรุณากรอกรหัสผ่าน";
      },
    });

    return password;
  }

  async function submitUpdate(formData) {
    const password = await confirmPassword();
    if (!password) return;

    formData.append("confirm_password", password);

    try {
      const res = await fetch("/admin-profile/update", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Update failed");

      if (hasSwal()) {
        Swal.fire({
          icon: "success",
          title: "อัปเดตสำเร็จ",
          text: "บันทึกข้อมูลเรียบร้อยแล้ว",
          timer: 1200,
          showConfirmButton: false,
        }).then(() => location.reload());
      } else {
        alert("อัปเดตสำเร็จ");
        location.reload();
      }
    } catch (err) {
      console.error(err);
      if (hasSwal()) {
        Swal.fire("ผิดพลาด", "ไม่สามารถอัปเดตข้อมูลได้", "error");
      } else {
        alert("อัปเดตไม่สำเร็จ");
      }
    }
  }

  editBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();

      const row = btn.closest(".profile-row");
      const keyEl = row.querySelector(".profile-key");
      const valEl = row.querySelector(".profile-val");

      const label = keyEl.textContent.trim();
      const oldValue = valEl.textContent.trim();

      let fieldName = "";
      let inputType = "text";
      let placeholder = "";

      if (label.includes("ชื่อ-นามสกุล")) {
        fieldName = "emp_fname";
        placeholder = "ชื่อ-นามสกุล";
      }
      if (label.includes("อีเมล")) {
        fieldName = "emp_email";
        inputType = "email";
        placeholder = "example@email.com";
      }
      if (label.includes("เบอร์โทร")) {
        fieldName = "emp_phone";
        inputType = "tel";
        placeholder = "0XXXXXXXXX";
      }

      if (!fieldName) return;

      valEl.innerHTML = `
        <input type="${inputType}" 
               class="form-control form-control-sm mb-1" 
               placeholder="${placeholder}"
               value="${oldValue}">
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-success">บันทึก</button>
          <button class="btn btn-sm btn-secondary">ยกเลิก</button>
        </div>
      `;

      const input = valEl.querySelector("input");
      const saveBtn = valEl.querySelector(".btn-success");
      const cancelBtn = valEl.querySelector(".btn-secondary");

      // จำกัดให้พิมพ์ได้เฉพาะตัวเลข + 10 หลัก สำหรับเบอร์โทร
      if (fieldName === "emp_phone") {
        input.addEventListener("input", () => {
          input.value = input.value.replace(/\D/g, "").slice(0, 10);
        });
      }

      cancelBtn.onclick = () => (valEl.textContent = oldValue);

      saveBtn.onclick = async () => {
        const newValue = input.value.trim();
        if (!newValue) {
          showError("กรุณากรอกข้อมูล");
          return;
        }

        // 🔎 Validation
        if (fieldName === "emp_phone" && !isValidPhone(newValue)) {
          showError("กรุณากรอกเบอร์โทรเป็นตัวเลข 10 หลัก");
          return;
        }

        if (fieldName === "emp_email" && !isValidEmail(newValue)) {
          showError("รูปแบบอีเมลไม่ถูกต้อง");
          return;
        }

        const formData = new FormData();
        formData.append(fieldName, newValue);

        await submitUpdate(formData);
      };
    });
  });

  // แก้ไขรูปโปรไฟล์
  if (avatarEditBtn) {
    avatarEditBtn.addEventListener("click", function (e) {
      e.preventDefault();

      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("emp_profile", file);

        await submitUpdate(formData);
      };

      input.click();
    });
  }
});
