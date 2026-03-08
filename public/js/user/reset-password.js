document.getElementById("resetForm").addEventListener("submit", function (e) {
      e.preventDefault();
      const password = document.getElementById("password").value.trim();
      const confirmPassword = document.getElementById("confirmPassword").value.trim();
      const errorDiv = document.getElementById("error");

      if (password.length < 6) {
        errorDiv.style.display = "block";
        errorDiv.textContent = "Password must be at least 6 characters long.";
        return;
      }

      if (password !== confirmPassword) {
        errorDiv.style.display = "block";
        errorDiv.textContent = "Passwords do not match.";
        return;
      }

      
      errorDiv.style.display = "none";
      $.ajax({
        method:"PATCH",
        url:"/reset-password",
        data:{
            password1:password,
            password2:confirmPassword
        },
        success:(response)=>{
            if(response.success){
                Swal.fire({
                icon:"success",
                text:"Password updated successfully",
                showConfirmButton:true
               }).then(()=>{
                window.location.href=response.redirectUrl;
               })
               
            }else{
                Swal.fire({
             icon: 'error',          
             title: 'Oops...',        
             text: 'Please try again',
             showConfirmButton: true  
             });
            }
        },
        error:()=>{

            Swal.fire({
             icon: 'error',          
             title: 'Oops...',        
             text: 'Something went wrong!',
             showConfirmButton: true  
             });


        }
      })
    });