let timerDuration = 60; 
    let currentTime = timerDuration;
    let timerElement = document.getElementById("timer");
    let resendBtn = document.getElementById("resendBtn");
    let confirmBtn = document.getElementById("confirmBtn");
    let timerInterval;

    function startTimer() {
      currentTime = timerDuration;
      updateTimerDisplay();
      resendBtn.disabled = true;
      confirmBtn.disabled =false;

      timerInterval = setInterval(() => {
        currentTime--;
        updateTimerDisplay();

        if (currentTime <= 0) {
          clearInterval(timerInterval);
          timerElement.textContent = "00:00";
          resendBtn.disabled = false;
          confirmBtn.disabled =true;
        }
      }, 1000);
    }

    function updateTimerDisplay() {
      let minutes = String(Math.floor(currentTime / 60)).padStart(2, '0');
      let seconds = String(currentTime % 60).padStart(2, '0');
      timerElement.textContent = `${minutes}:${seconds}`;
    }

    function resendOTP() {
  startTimer();

  $.ajax({
    method: "GET",
    url: "/resend-otp",
    success: (response) => {
      if (response.success) {
        Swal.fire({
          title: 'OTP Resent!',
          text: 'Please check your email.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      } else {
        Swal.fire("Error!", response.message || "Failed to resend OTP", "error");
      }
    },
    error: () => {
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  });
}

    function confirmOTP() {
  let OTP = document.getElementById("otpInput").value;
  if (OTP === "") {
    Swal.fire({
      icon: 'warning',
      title: 'Missing OTP',
      text: 'Please enter the OTP.',
      confirmButtonColor: '#3085d6'
    });
    return;
  }

  $.ajax({
    method: "POST",
    url: "/verify-otp",
    data: { otp: OTP },
    success: (response) => {
      if (response.success) {
        Swal.fire({
          title: 'OTP Verified!',
          text: response.message,
          icon: 'success',
          confirmButtonText: 'OK'
        }).then(() => {
          window.location.href = "/login"; 
        });
      } else {
        Swal.fire("Invalid OTP", response.message || "Verification failed", "error");
      }
    },
    error: (err) => {
      Swal.fire("Error", "Server error or invalid request", "error");
      console.error("AJAX Error:", err);
    }
  });
}


    window.onload = startTimer;