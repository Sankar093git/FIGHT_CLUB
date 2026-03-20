function showError(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.style.display = 'block';
}

function clearError(id) {
  const el = document.getElementById(id);
  el.textContent = '';
  el.style.display = 'none';
}

document
  .getElementById('username')
  .addEventListener('focus', () => clearError('error1'));
document
  .getElementById('email')
  .addEventListener('focus', () => clearError('error2'));
document
  .getElementById('phone')
  .addEventListener('focus', () => clearError('error3'));
document
  .getElementById('password')
  .addEventListener('focus', () => clearError('error4'));

document
  .getElementById('editProfileForm')
  .addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;

    let isValid = true;

    // Username validation
    if (!/^[a-zA-Z\s]{3,}$/.test(username)) {
      showError(
        'error1',
        'Name must be at least 3 characters and contain only letters.'
      );
      isValid = false;
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('error2', 'Please enter a valid email address.');
      isValid = false;
    }

    
    // Phone validation
    if (!/^\d{10}$/.test(phone)) {
      showError('error3', 'Phone number must be exactly 10 digits.');
      isValid = false;
    } else if (!/^[6-9]/.test(phone)) {
      showError('error3', 'Please enter a valid phone number.');
      isValid = false;
    } else if (/^(\d)\1{9}$/.test(phone)) {
      showError('error3', 'Please enter a valid phone number.');
      isValid = false;
    }

    // Password validation (only if filled in)
    if (
      password &&
      !/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(
        password
      )
    ) {
      showError(
        'error4',
        'Password must be at least 8 characters, include one uppercase letter and one special character.'
      );
      isValid = false;
    }

    if (!isValid) return;

    const formData = { username, email, phone, password };

    try {
      const response = await fetch('/edit-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.result) {
        Swal.fire({
          icon: 'success',
          title: 'OTP Sent!',
          text: 'OTP has been sent to your email.',
          confirmButtonColor: '#3085d6',
        }).then(() => (window.location.href = '/otp-verification'));
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Oops!',
          text: 'Failed to send verification mail',
          confirmButtonColor: '#d33',
        });
      }
    } catch (err) {
      console.error('Error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Oops!',
        text: 'Something went wrong. Please try again later.',
        confirmButtonColor: '#d33',
      });
    }
  });
