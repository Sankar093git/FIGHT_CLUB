let couponCode="";
  document.getElementById('payBtn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const selected = document.querySelector('input[name="selectedAddress"]:checked');

  // 1. Validation
  if (!selected) {
    Swal.fire({
      icon: "warning",
      title: "No Address Selected",
      text: "Please select a delivery address!",
    });
    return;
  }

  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

  try {
    // Disable button to prevent double clicks
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';

    // --- CASE 1: CASH ON DELIVERY ---
    if (paymentMethod === "COD") {
      const response = await fetch('/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId: selected.value,
          paymentMethod: 'COD',
          couponCode:couponCode
        })
      });

      const data = await response.json();
      if (data.success) {
        window.location.href = `/order-success?orderId=${data.orderId}`;
      } else {
        Swal.fire({ icon: "error", title: "Error", text: data.message || "Failed to place order." });
      }

    // --- CASE 2: ONLINE PAYMENT ---
    } else if (paymentMethod === "ONLINE") {
       const response = await fetch('/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId: selected.value,
          paymentMethod: 'ONLINE',
          couponCode:couponCode
        })
      });

      const data=await response.json();
      if(data.success){
        let orderId=data.orderId;
         // A. Create Razorpay Order on Server
      const orderRes = await fetch(`/payment/create-order?orderId=${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const orderData = await orderRes.json();
      
      if (!orderData.success) {
        Swal.fire({ icon: "error", title: "Error", text: orderData.message });
        btn.disabled = false;
        btn.innerHTML = 'Place Order';
        return;
      }

      // B. Razorpay Modal Configuration
      const rzpOptions = {
        key: "<%= process.env.RAZORPAY_KEY_ID %>",
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "Your Shop Name",
        description: "Order Payment",
        order_id: orderData.order.id,
        handler: async function (response) {
          // THIS RUNS ONLY ON SUCCESSFUL PAYMENT
          const verifyRes = await fetch(`/update-order-payment-status/${orderId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              addressId: selected.value,
              paymentMethod: 'ONLINE'
            })
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            window.location.href = `/order-success?orderId=${verifyData.orderId}`;
          } else {
            // If verification fails on backend after payment
            window.location.href = `/payment-failed?orderId=${verifyData.order.id}`;
          }
        },
        prefill: {
          name: "<%= user.name %>",
          email: "<%= user.email %>",
          contact: "<%= user.phone %>"
        },
        theme: { color: "#528FF0" },
        modal: {
          ondismiss: function() {
            // Handle user closing the modal manually
            window.location.href = `/payment-failed?orderId=${orderId}`;
          }
        }
      };
      const rzp1 = new Razorpay(rzpOptions);
      // C. Handle Intentional/Bank Failures
      rzp1.on('payment.failed', function (response) {
        // Redirecting to failure page using orderData from the first fetch
        window.location.href = `/payment-failed?orderId=${orderId}`;
      });
      rzp1.open();
      }else{
        Swal.fire({ icon: "error", title: "Error", text: data.message || "Failed to place order." });
      }  
    }else if(paymentMethod==="WALLET"){
      const response = await fetch('/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId: selected.value,
          paymentMethod: 'WALLET',
          couponCode:couponCode
        })
      });

      const data = await response.json();
      if (data.success) {
        window.location.href = `/order-success?orderId=${data.orderId}`;
      } else {
        Swal.fire({ icon: "error", title: "Error", text: data.message || "Failed to place order." });
      }
    }
  } catch (err) {
    console.error("Checkout Error:", err);
    Swal.fire({ icon: "error", title: "Error", text: err });
  } finally {
    // Re-enable button if not redirected
    btn.disabled = false;
    btn.innerHTML = 'Place Order';
  }
});

function populateAddressForm(id,label, street, city, state, country, postalCode, phone, isDefault){
  
    document.getElementById("addressFormedit").action="/edit-current-address/"+id;

    document.getElementById("labeledit").value=label;
    document.getElementById("streetedit").value=street;
    document.getElementById("cityedit").value=city;
    document.getElementById("stateedit").value=state;
    document.getElementById("countryedit").value=country;
    document.getElementById("postalCodeedit").value=postalCode;
    document.getElementById("phoneedit").value=phone;
    document.getElementById("isDefaultedit").checked=isDefault?true:false;

    
}

function validateField(input, validator, message) {
    let errorSpan = input.nextElementSibling;

    if (!errorSpan || !errorSpan.classList.contains("error-text")) {
        errorSpan = document.createElement("div");
        errorSpan.classList.add("error-text");
        input.parentNode.appendChild(errorSpan);
    }

    if (!validator(input.value.trim())) {
        input.classList.add("input-error");
        errorSpan.textContent = message;
        return false;
    } else {
        input.classList.remove("input-error");
        errorSpan.textContent = "";
        return true;
    }
}

// Validation rules
const rules = {
    label: v => v.length >= 2,
    street: v => v.length >= 3,
    city: v => /^[A-Za-z ]{3,}$/.test(v),        
    state: v => /^[A-Za-z ]{3,}$/.test(v),       
    country: v => /^[A-Za-z ]{3,}$/.test(v),     
    postalCode: v => /^[0-9]{6}$/.test(v),
    phone: v => /^[6-9][0-9]{9}$/.test(v)
};
;

const messages = {
    label: "Label must be at least 2 characters.",
    street: "Street must be at least 3 characters and at least 3 characters.",
    city: "City can contain only letters and at least 3 characters.",
    state: "State can contain only letters and at least 3 characters.",
    country: "Country is required and at least 3 characters.",
    postalCode: "Postal Code must be a 6-digit number.",
    phone: "Phone must be a valid 10-digit number."
};

function attachValidation(formId) {
    const form = document.getElementById(formId);

    form.querySelectorAll("input").forEach(input => {
        const name = input.name;

        if (rules[name]) {
            input.addEventListener("input", () => {
                validateField(input, rules[name], messages[name]);
            });

            input.addEventListener("change", () => {
                validateField(input, rules[name], messages[name]);
            });
        }
    });

    form.addEventListener("submit", (e) => {
        let valid = true;

        form.querySelectorAll("input").forEach(input => {
            const name = input.name;

            if (rules[name]) {
                const isValid = validateField(input, rules[name], messages[name]);
                if (!isValid) valid = false;
            }
        });

        if (!valid) {
            e.preventDefault();
            Swal.fire({
                icon: "error",
                title: "Invalid Details",
                text: "Please fix the highlighted errors.",
            });
        }
    });
}

//Coupon logic

document.getElementById('applyCouponBtn').addEventListener('click', async function(e) {
  const select = document.getElementById('couponSelect');
  const code = select.value;
  const messageDiv = document.getElementById('couponMessage');
  
  if (!code) {
    messageDiv.innerHTML = '<span class="text-danger">Please select a coupon</span>';
    return;
  }
  
  try {
    const response = await fetch('/coupon', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: code })
    });
    const data = await response.json();
    
    if (data.success) {
      couponCode=code;
      messageDiv.innerHTML = '<span class="text-success">Coupon applied!</span>';
      document.getElementById('totalAmount').textContent = '₹' + data.newTotal;
      document.getElementById('discountValue').textContent='-₹' + data.discount;
      e.target.classList.add("d-none");
      document.getElementById("clearCouponBtn").classList.remove("d-none");
    } else {
      messageDiv.innerHTML = '<span class="text-danger">' + data.message + '</span>';
    }
  } catch (err) {
    messageDiv.innerHTML = '<span class="text-danger">Error applying coupon</span>';
  }
});

document.getElementById('clearCouponBtn').addEventListener("click", async function(e) {
  try {
    const select = document.getElementById('couponSelect');
    const code=select.value;
    select.value="";
    const messageDiv = document.getElementById('couponMessage');
    await fetch("/clear-coupon",{
      method:"PATCH",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        code:code,
        totalAmount:document.getElementById('totalAmount').textContent,
        discount:document.getElementById('discountValue').textContent
      })
    }).then((res)=>res.json())
    .then((data)=>{
      if(data.success){

         couponCode="";
         
         document.getElementById('couponSelect').selectedIndex = 0;
         messageDiv.innerHTML = '<span class="text-success"></span>';
         document.getElementById("applyCouponBtn").classList.remove("d-none");

         e.target.classList.add("d-none");

         document.getElementById('totalAmount').textContent= '₹' + data.newTotal
         document.getElementById('discountValue').textContent= '-₹' + data.discount;

         Swal.fire({
          title:"Removed",
          text:data.message,
          icon:"success"
         })

      }else{

        Swal.fire({
          title:"Oops",
          text:data.message,
          icon:"error"
        })

      }
    }) 
  } catch (error) {
    console.error("Coupon Clear : ",error);
    Swal.fire({
      title:"Error",
      text:"Something went wrong!",
      icon:"error"
    })
  }
})

function couponRefreshHandling(){
  let coupon=document.getElementById("couponSelect").value;
  let applybtn=document.getElementById("applyCouponBtn");
  let clearbtn=document.getElementById("clearCouponBtn");
  if(coupon){
    applybtn.classList.add("d-none");
    clearbtn.classList.remove("d-none")
  }else{
    clearbtn.classList.add("d-none");
    applybtn.classList.remove("d-none")
  }
}

couponRefreshHandling();
attachValidation("addressForm");
attachValidation("addressFormedit");