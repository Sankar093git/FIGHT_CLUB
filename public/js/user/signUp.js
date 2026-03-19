document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const Name = document.getElementById("name");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");
  const password = document.getElementById("password");
  const cpassword = document.getElementById("cpassword");
  const referalCode = document.getElementById("referalCode");
  const error1 = document.getElementById("error1");
  const error2 = document.getElementById("error2");
  const error3 = document.getElementById("error3");
  const error4 = document.getElementById("error4");
  const error5 = document.getElementById("error5");
  const error6 = document.getElementById("error6");
  const error7 = document.getElementById("error7");
  const signform = document.getElementById("signform");
  const profileImage = document.getElementById("profileImage");
  const previewImg = document.getElementById("previewImg");
 
  // ─── Profile Image Preview ───────────────────────────────────────────────────
  profileImage.addEventListener("change", () => {
    const file = profileImage.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        error6.style.display = "block";
        error6.innerHTML = "Please select a valid image file.";
        profileImage.value = "";
        previewImg.src = "https://via.placeholder.com/100";
        return;
      }
      error6.style.display = "none";
      error6.innerHTML = "";
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
 
  // ─── Validation Functions ─────────────────────────────────────────────────────
  function nameValidation() {
    const nameVal = Name.value;
    const namePattern = /^[A-Za-z]+(?:\s[A-Za-z]+)+$/;
    if (nameVal.trim() === "") {
      error1.style.display = "block";
      error1.innerHTML = "Please enter a valid name";
      return false;
    } else if (!namePattern.test(nameVal)) {
      error1.style.display = "block";
      error1.innerHTML = "Please enter a valid name";
      return false;
    } else {
      error1.style.display = "none";
      error1.innerHTML = "";
      return true;
    }
  }
 
  function emailValidation() {
    const emailVal = email.value;
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (emailVal.trim() === "") {
      error2.style.display = "block";
      error2.innerHTML = "This field cannot be empty";
      return false;
    } else if (!emailPattern.test(emailVal)) {
      error2.style.display = "block";
      error2.innerHTML = "Please enter a valid email";
      return false;
    } else {
      error2.style.display = "none";
      error2.innerHTML = "";
      return true;
    }
  }
 
  function phoneValidation() {
    const phoneVal = phone.value;
    const phonePattern = /^[6-9]\d{9}$/;
    if (phoneVal.trim() === "") {
      error3.style.display = "block";
      error3.innerHTML = "This field cannot be empty";
      return false;
    } else if (!phonePattern.test(phoneVal)) {
      error3.style.display = "block";
      error3.innerHTML = "Please enter a valid phone number";
      return false;
    } else {
      error3.style.display = "none";
      error3.innerHTML = "";
      return true;
    }
  }
 
  function passValidation() {
    const passVal = password.value;
    const cpassVal = cpassword.value;
    const passPattern =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    let isValid = true;
 
    if (passVal.trim() === "") {
      error4.style.display = "block";
      error4.innerHTML = "This field cannot be empty";
      isValid = false;
    } else if (!passPattern.test(passVal)) {
      error4.style.display = "block";
      error4.innerHTML =
        "Password must be at least 8 characters long and include one uppercase, one lowercase, one number, and one special character.";
      isValid = false;
    } else {
      error4.style.display = "none";
      error4.innerHTML = "";
    }
 
    if (cpassVal.trim() === "") {
      error5.style.display = "block";
      error5.innerHTML = "This field cannot be empty";
      isValid = false;
    } else if (cpassVal !== passVal) {
      error5.style.display = "block";
      error5.innerHTML = "Passwords do not match";
      isValid = false;
    } else {
      error5.style.display = "none";
      error5.innerHTML = "";
    }
 
    return isValid;
  }
 
  function referalCodeValidation() {
    // FIX: renamed local variable from referalCode to referalVal
    const referalVal = referalCode.value;
    const referalPattern = /^REF-[0-9a-f]{8}$/;
 
    // Referral is optional — skip validation if empty
    if (referalVal.trim() === "") {
      error7.style.display = "none";
      error7.innerHTML = "";
      return true;
    } else if (!referalPattern.test(referalVal)) {
      error7.style.display = "block";
      error7.innerHTML = "Please enter a valid referral code";
      return false;
    } else {
      error7.style.display = "none";
      error7.innerHTML = "";
      return true;
    }
  }
 
  // ─── Clear Error on Focus ─────────────────────────────────────────────────────
  function clearErrorOnFocus(input, error) {
    input.addEventListener("focus", () => {
      error.style.display = "none";
      error.innerHTML = "";
    });
  }
 
  clearErrorOnFocus(Name, error1);
  clearErrorOnFocus(email, error2);
  clearErrorOnFocus(phone, error3);
  clearErrorOnFocus(password, error4);
  clearErrorOnFocus(cpassword, error5);
  if (referalCode) clearErrorOnFocus(referalCode, error7);
 
  // ─── Re-validate Confirm Password When Password Changes ───────────────────────
  password.addEventListener("blur", passValidation);
  cpassword.addEventListener("blur", passValidation);
 
  // ─── Password Toggle ──────────────────────────────────────────────────────────
  document.getElementById("togglePassword").addEventListener("click", function () {
    const input = document.getElementById("password");
    const isVisible = input.type === "text";
    input.type = isVisible ? "password" : "text";
    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
  });
 
  document.getElementById("toggleCPassword").addEventListener("click", function () {
    const input = document.getElementById("cpassword");
    const isVisible = input.type === "text";
    input.type = isVisible ? "password" : "text";
    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
  });
 
  // ─── Form Submit ──────────────────────────────────────────────────────────────
  signform.addEventListener("submit", (e) => {
    // FIX: using boolean flags from each validation function instead of innerHTML check
    const isNameValid = nameValidation();
    const isEmailValid = emailValidation();
    const isPhoneValid = phoneValidation();
    const isPassValid = passValidation();
    const isReferalValid = referalCode ? referalCodeValidation() : true;
 
    if (!isNameValid || !isEmailValid || !isPhoneValid || !isPassValid || !isReferalValid) {
      e.preventDefault();
    }
  });
});