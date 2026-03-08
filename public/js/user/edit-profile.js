document.getElementById("editProfileForm").addEventListener("submit", async (e) => {
    e.preventDefault(); 

    const formData = {
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      password: document.getElementById("password").value
    };

    try {
      const response = await fetch("/edit-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.result) {
        Swal.fire({
         icon: "success",
         title: "OTP Sent!",
         text: "OTP has been sent to your email.",
         confirmButtonColor: "#3085d6"
      }).then(()=>window.location.href = "/otp-verification")
      } else {
        Swal.fire({
       icon: "error",
       title: "Oops!",
       text: "Failed to send verifiacation mail",
       confirmButtonColor: "#d33"
     });
      }
    } catch (err) {
      console.error("Error:", err);
      Swal.fire({
       icon: "error",
       title: "Oops!",
       text: "Something went wrong. Please try again later.",
       confirmButtonColor: "#d33"
     });
    }
  });