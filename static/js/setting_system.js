document.addEventListener("DOMContentLoaded", function () {

    /* =========================
       FUNCTION: format เบอร์ 081-234-5678
    ========================== */
    function formatPhone(value) {
        let digits = value.replace(/\D/g, "");

        // จำกัดสูงสุด 10 หลัก
        if (digits.length > 10) {
            digits = digits.substring(0, 10);
        }

        // ====== ถ้าครบ 10 หลัก → มือถือ ======
        if (digits.length === 10) {
            return digits.slice(0, 3) + "-" +
                digits.slice(3, 6) + "-" +
                digits.slice(6);
        }

        // ====== ถ้าครบ 9 หลัก → สำนักงาน ======
        if (digits.length === 9) {
            return digits.slice(0, 2) + "-" +
                digits.slice(2, 5) + "-" +
                digits.slice(5);
        }

        // ====== ตอนกำลังพิมพ์ (ยังไม่ครบ) ======
        if (digits.length <= 2) {
            return digits;
        }
        else if (digits.length <= 5) {
            return digits.slice(0, 2) + "-" + digits.slice(2);
        }
        else if (digits.length <= 8) {
            return digits.slice(0, 2) + "-" +
                digits.slice(2, 5) + "-" +
                digits.slice(5);
        }
        else {
            return digits.slice(0, 3) + "-" +
                digits.slice(3, 6) + "-" +
                digits.slice(6);
        }
    }

    function getDigits(value) {
        return value.replace(/\D/g, "");
    }


    /* =========================
       Auto Format ตอนพิมพ์
    ========================== */
    document.querySelectorAll("input[name^='phone_']").forEach(input => {

        input.addEventListener("input", function () {

            const cursorPos = this.selectionStart;
            const beforeLength = this.value.length;

            this.value = formatPhone(this.value);

            const afterLength = this.value.length;

            // ปรับตำแหน่ง cursor ไม่ให้กระโดด
            this.setSelectionRange(
                cursorPos + (afterLength - beforeLength),
                cursorPos + (afterLength - beforeLength)
            );
        });

        // format ตอนโหลดหน้า (กรณี DB ไม่มีขีด)
        if (input.value) {
            const digits = getDigits(input.value);
            input.value = formatPhone(digits);
            input.dataset.original = digits;
        }

    });


    /* =========================
       ปลดล็อคราคา
    ========================== */
    document.querySelectorAll(".unlock-price").forEach(btn => {

        btn.addEventListener("click", function () {

            const currentCard = this.closest(".pricing-card");
            const currentInput = currentCard.querySelector(".price-input-field");
            const currentBtn = this;
            const isLocked = currentInput.hasAttribute("readonly");

            Swal.fire({
                title: isLocked ? "ปลดล็อคการแก้ไขราคา?" : "ล็อคราคาอีกครั้ง?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: isLocked ? "ปลดล็อค" : "ล็อค",
                cancelButtonText: "ยกเลิก"
            }).then(result => {

                if (!result.isConfirmed) return;

                document.querySelectorAll(".pricing-card").forEach(card => {
                    const input = card.querySelector(".price-input-field");
                    const btn = card.querySelector(".unlock-price");
                    const icon = btn.querySelector("i");

                    input.setAttribute("readonly", true);

                    if (icon) {
                        icon.classList.remove("bi-unlock-fill");
                        icon.classList.add("bi-lock-fill");
                    }

                    btn.classList.remove("btn-outline-success");
                    btn.classList.add("btn-outline-danger");
                });

                if (isLocked) {
                    const icon = currentBtn.querySelector("i");

                    currentInput.removeAttribute("readonly");
                    currentInput.focus();

                    if (icon) {
                        icon.classList.remove("bi-lock-fill");
                        icon.classList.add("bi-unlock-fill");
                    }

                    currentBtn.classList.remove("btn-outline-danger");
                    currentBtn.classList.add("btn-outline-success");
                }

            });

        });

    });


    /* =========================
       บันทึกราคาโฆษณา
    ========================== */
    document.getElementById("saveAdsBtn")?.addEventListener("click", function () {

        let valid = true;
        let changed = false;

        document.querySelectorAll("input[name^='price_']").forEach(input => {

            const value = input.value.trim();
            const original = input.dataset.original;

            if (value === "" || isNaN(value) || parseFloat(value) < 0) {
                valid = false;
            }

            if (value !== original) {
                changed = true;
            }
        });

        if (!valid) {
            Swal.fire("ข้อมูลไม่ถูกต้อง", "ราคาต้องเป็นตัวเลข และห้ามติดลบ", "error");
            return;
        }

        if (!changed) {
            Swal.fire("ไม่มีการเปลี่ยนแปลง", "คุณยังไม่ได้แก้ไขราคา", "warning");
            return;
        }

        Swal.fire({
            title: "ยืนยันการบันทึกราคา?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "บันทึก",
            cancelButtonText: "ยกเลิก"
        }).then(result => {

            if (!result.isConfirmed) return;

            const formData = new FormData();

            document.querySelectorAll("input[name^='price_']").forEach(input => {
                formData.append(input.name, parseFloat(input.value).toFixed(2));
            });

            fetch("/setting_system/update_ads", {
                method: "POST",
                body: formData
            })
            .then(res => res.json())
            .then(data => {

                if (data.success) {
                    Swal.fire({
                        icon: "success",
                        title: "สำเร็จ",
                        timer: 1200,
                        showConfirmButton: false
                    }).then(() => location.reload());
                } else {
                    Swal.fire("ผิดพลาด", data.message || "ไม่สามารถบันทึกได้", "error");
                }

            })
            .catch(() => {
                Swal.fire("Server Error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
            });

        });

    });


    /* =========================
       บันทึกข้อมูลเว็บไซต์
    ========================== */
    document.getElementById("saveContactBtn")?.addEventListener("click", function () {

        const emailInput = document.querySelector("input[name='email']");
        const addressInput = document.querySelector("textarea[name='address']");
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        let changed = false;

        if (!emailPattern.test(emailInput.value.trim())) {
            Swal.fire("อีเมลไม่ถูกต้อง", "กรุณากรอกอีเมลให้ถูกต้อง", "error");
            return;
        }

        if (emailInput.value.trim() !== emailInput.dataset.original) {
            changed = true;
        }

        let phoneValid = true;

        document.querySelectorAll("input[name^='phone_']").forEach(input => {

            const digitsOnly = getDigits(input.value);

            // 
            if (!/^0\d{8,9}$/.test(digitsOnly)) {
                phoneValid = false;
            }

            if (digitsOnly !== input.dataset.original) {
                changed = true;
            }
        });

        if (!phoneValid) {
            Swal.fire("เบอร์ไม่ถูกต้อง", "กรุณากรอกเบอร์มือถือ 10 หลัก (ขึ้นต้นด้วย 0)", "error");
            return;
        }

        if (addressInput.value.trim() !== addressInput.dataset.original) {
            changed = true;
        }

        if (!changed) {
            Swal.fire("ไม่มีการเปลี่ยนแปลง", "คุณยังไม่ได้แก้ไขข้อมูล", "warning");
            return;
        }

        Swal.fire({
            title: "ยืนยันการบันทึก?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "บันทึก",
            cancelButtonText: "ยกเลิก"
        }).then(result => {

            if (!result.isConfirmed) return;

            const formData = new FormData();
            formData.append("contact_id", document.querySelector("input[name='contact_id']")?.value || "");
            formData.append("email", emailInput.value.trim());
            formData.append("address", addressInput.value.trim());

            document.querySelectorAll("input[name^='phone_']").forEach(input => {
                formData.append(input.name, getDigits(input.value));
            });

            fetch("/setting_system/update_contact", {
                method: "POST",
                body: formData
            })
            .then(res => res.json())
            .then(data => {

                if (data.success) {
                    Swal.fire({
                        icon: "success",
                        title: "สำเร็จ",
                        timer: 1200,
                        showConfirmButton: false
                    }).then(() => location.reload());
                } else {
                    Swal.fire("ผิดพลาด", data.message || "ไม่สามารถบันทึกได้", "error");
                }

            })
            .catch(() => {
                Swal.fire("Server Error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
            });

        });

    });


    /* =========================
       แสดง .00 ตอนโหลดหน้า
    ========================== */
    document.querySelectorAll("input[name^='price_']").forEach(input => {

        let value = input.value.trim();

        if (value !== "" && !isNaN(value)) {
            input.value = parseFloat(value).toFixed(2);
            input.dataset.original = input.value;
        }

    });

});