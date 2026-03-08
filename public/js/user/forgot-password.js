document.getElementById('emailForm').addEventListener('submit', function(e) {
  e.preventDefault(); 
  
  const emailInput = document.getElementById('emailInput');
  emailInput.classList.remove('is-invalid'); 

  if (!emailInput.checkValidity()) {
    emailInput.classList.add('is-invalid');
  } else {
    const emailId = emailInput.value;

    $.ajax({
      method: "POST",
      url: "/forgotpassword",
      data: { email: emailId },
      success: (response) => {
        if (response.success) {
          Swal.fire({
            title: 'Success!',
            text: `${response.message}`,
            icon: 'success',
            confirmButtonText: 'OK'
          }).then((result) => {
            if(result.isConfirmed){
            window.location.href = "/verify-pass-otp";
            }
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `${response.message}`,
            confirmButtonText: 'OK'
          });
        }
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Something went wrong.',
          confirmButtonText: 'OK'
        });
      }
    });
  }
});