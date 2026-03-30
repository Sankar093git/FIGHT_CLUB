document.getElementById("addressForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const label = document.getElementById("label").value.trim();
  const street = document.getElementById("street").value.trim();
  const city = document.getElementById("city").value.trim();
  const state = document.getElementById("state").value.trim();
  const country = document.getElementById("country").value.trim();
  const postalCode = document.getElementById("postalCode").value.trim();
  const phone = document.getElementById("phone").value.trim();

  const obj = {
    label: label,
    street: street,
    city: city,
    state: state,
    country: country,
    postal: postalCode,
    phone: phone
  }

  let isValid = true;

  // Empty check
  for (let [key, value] of Object.entries(obj)) {
    if (!value) {
      let msg = document.getElementById(`add-${key}`);
      msg.innerText = "All fields are required";
      msg.classList.remove("d-none");
      isValid = false;
    }
  }

  if (!isValid) return;

  // City, State, Country — only alphabets and spaces
  if (!/^[a-zA-Z\s]+$/.test(city)) {
    let msg = document.getElementById("add-city");
    msg.innerText = "City must contain only letters.";
    msg.classList.remove("d-none");
    isValid = false;
  }

  if (!/^[a-zA-Z\s]+$/.test(state)) {
    let msg = document.getElementById("add-state");
    msg.innerText = "State must contain only letters.";
    msg.classList.remove("d-none");
    isValid = false;
  }

  if (!/^[a-zA-Z\s]+$/.test(country)) {
    let msg = document.getElementById("add-country");
    msg.innerText = "Country must contain only letters.";
    msg.classList.remove("d-none");
    isValid = false;
  }

  // Postal code — 5 or 6 digits, not all same digits
  if (!/^[0-9]{5,6}$/.test(postalCode)) {
    let msg = document.getElementById("add-postal");
    msg.innerText = "Postal code must be 5 or 6 digits.";
    msg.classList.remove("d-none");
    isValid = false;
  } else if (/^(\d)\1+$/.test(postalCode)) {
    let msg = document.getElementById("add-postal");
    msg.innerText = "Please enter a valid postal code.";
    msg.classList.remove("d-none");
    isValid = false;
  }

  // Phone — 10 digits, starts with 6-9, not all same digits
  if (!/^\d{10}$/.test(phone)) {
    let msg = document.getElementById("add-phone");
    msg.innerText = "Phone number must be exactly 10 digits.";
    msg.classList.remove("d-none");
    isValid = false;
  } else if (!/^[6-9]/.test(phone)) {
    let msg = document.getElementById("add-phone");
    msg.innerText = "Please enter a valid phone number.";
    msg.classList.remove("d-none");
    isValid = false;
  } else if (/^(\d)\1{9}$/.test(phone)) {
    let msg = document.getElementById("add-phone");
    msg.innerText = "Please enter a valid phone number.";
    msg.classList.remove("d-none");
    isValid = false;
  }

  if (!isValid) return;

  Swal.fire({
    icon: "success",
    title: "Success!",
    text: "Address saved successfully!",
    confirmButtonColor: "#3085d6"
  }).then(() => this.submit());
});

function changeProfilePic(userId) {
  const input = document.getElementById("profileImageInput");
  const file = input.files[0];
  console.log(file);

  if (!file) {
    console.warn("No file selected");
    return;
  }

  const formData = new FormData();
  formData.append("profileImageInput", file);

  fetch(`/change-profile-pic/${userId}`, {
    method: "PATCH",
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      console.log(data);
      if (data.success) {
        window.location.reload();
        // if (data.image) {
        //document.getElementById("profilePic").src = data.image + "?t=" + new Date().getTime();
        // }
      } else {
        Swal.fire({
          title: "Error",
          text: data.message,
          icon: "error"
        })
      }
    })
    .catch(err => console.error("Upload error:", err));
}


function populateAddressForm(id, label, street, city, state, country, postalCode, phone, isDefault) {

  document.getElementById("addressForm").action = "/edit-address/" + id;

  document.getElementById("label").value = label;
  document.getElementById("street").value = street;
  document.getElementById("city").value = city;
  document.getElementById("state").value = state;
  document.getElementById("country").value = country;
  document.getElementById("postalCode").value = postalCode;
  document.getElementById("phone").value = phone;
  document.getElementById("isDefault").checked = isDefault ? true : false;
}

function cancelOrder(orderId) {
  Swal.fire({
    title: 'Tell us why?',
    html: `<textarea id="swal-textarea" class="swal2-textarea" 
        style="width: 80%; max-width: 500px;" rows="5"></textarea>`,
    showCancelButton: true,
    confirmButtonText: 'Submit',
    preConfirm: () => {
      const val = document.getElementById('swal-textarea').value;
      if (!val.trim()) {
        Swal.showValidationMessage('Message cannot be empty!');
      }
      return val;
    }
  }).then((result) => {
    if (result.isConfirmed) {

      fetch(`/cancel-order/${orderId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: result.value })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            Swal.fire({
              title: "Cancelled!",
              text: "Your order has been successfully cancelled.",
              icon: "success",
              confirmButtonText: "OK",
            }).then(() => {
              window.location.reload();
            });
          } else {
            Swal.fire({
              title: "Cancellation Failed",
              text: "Something went wrong. Please try again later.",
              icon: "error",
              confirmButtonText: "OK",
            });
          }
        })
        .catch(() => {
          Swal.fire({
            title: "Cancellation Failed",
            text: "Network error. Please check your connection.",
            icon: "error",
            confirmButtonText: "OK",
          });
        });
    }
  });
}

function returnOrder(orderId) {
  Swal.fire({
    title: 'Tell us why?',
    html: `<textarea id="swal-textarea" class="swal2-textarea" 
        style="width: 80%; max-width: 500px;" rows="5"></textarea>`,
    showCancelButton: true,
    confirmButtonText: 'Submit',
    preConfirm: () => {
      const val = document.getElementById('swal-textarea').value;
      if (!val.trim()) {
        Swal.showValidationMessage('Message cannot be empty!');
      }
      return val;
    }
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(`/return-order/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: result.value })
      }).then(res => res.json())
        .then((data) => {
          if (data.success) {
            Swal.fire({
              title: "Returned!",
              text: "Your return request has been submitted.",
              icon: "success",
              confirmButtonText: "OK",
            }).then(() => {
              window.location.reload();
            });
          }
        })
    }
  });
}

function removeFromWishlist(productId) {
  Swal.fire({
    title: "Remove from Wishlist?",
    text: "This item will be removed from your wishlist.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, remove it",
    cancelButtonText: "Cancel",
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(`/remove-from-wishlist/${productId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {

            Swal.fire("Removed!", "Item removed from wishlist.", "success");

            // Remove card from DOM
            document.getElementById(`wishlist-${productId}`).remove();

            // Check if wishlist is now empty → show empty message
            if (document.querySelectorAll(".wishlist-item").length === 0) {
              document.getElementById("wishlist-container").innerHTML = `
                <div class="col-12 text-center py-4">
                  <i class="bi bi-heart" style="font-size: 48px; color: var(--text-muted);"></i>
                  <p class="text-muted mt-2">Your wishlist is empty.</p>
                  <a href="/shop" class="btn btn-primary mt-2">Browse Products</a>
                </div>`;
            }

          } else {
            Swal.fire("Error", data.message || "Failed to remove item.", "error");
          }
        })
        .catch((error) => Swal.fire("Error", `${error.message}`, "error"));
    }
  });
}


function applyReferalCode() {
  try {
    let code = document.getElementById("ref").value;
    fetch("/referal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: code })
    }).then((res) => res.json())
      .then((data) => {
        if (data.success) {
          Swal.fire({
            title: "Success",
            text: "On your first online payment reward will be credited to the referee!",
            icon: "success"
          }).then(() => {
            const modalElement = document.getElementById('referralModal');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);

            modalInstance.hide();
          })
        }
      })
  } catch (error) {
    console.error("Referal code : ", error);
    Swal.fire({
      title: "Error",
      text: "Something went wrong!",
      icon: "error"
    })
  }
}