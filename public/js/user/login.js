document.querySelector('form').addEventListener('submit', function (e) {
    const email = document.querySelector('input[name="email"]');
    const password = document.querySelector('input[name="password"]');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    
    email.classList.remove('is-invalid');
    password.classList.remove('is-invalid');

    let valid = true;

    
    if (!emailPattern.test(email.value.trim())) {
      email.classList.add('is-invalid');
      valid = false;
    }

    
    if (password.value.trim().length < 6) {
      password.classList.add('is-invalid');
      valid = false;
    }

    if (!valid) {
      e.preventDefault();
    }
  });

  // Toggle password visibility
document.getElementById("togglePassword").addEventListener("click", function () {
  const passwordInput = document.getElementById("password");
  const isVisible = passwordInput.type === "text";
  passwordInput.type = isVisible ? "password" : "text";
  this.classList.toggle("fa-eye");
  this.classList.toggle("fa-eye-slash");
});