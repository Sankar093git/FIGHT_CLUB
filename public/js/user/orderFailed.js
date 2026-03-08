document.querySelector('.retryPay').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; 
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';
      
  try {
   let orderId=document.getElementById("orderId").innerText.trim();
   console.log(orderId);
         // A. Create Razorpay Order on Server
   const orderRes = await fetch(`/payment/create-order?orderId=${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:JSON.stringify({isRetry:true})
      });
      
      const orderData = await orderRes.json();
      
      if (!orderData.success) {
        Swal.fire({ icon: "error", title: "Error", text: orderData.message });
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i> Retry Payment';
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
              razorpay_signature: response.razorpay_signature
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
  } catch (err) {
    console.error(err);
    Swal.fire({
       icon: "error",  title: "Error",  text: "Something went wrong", });
    ;
  } finally{
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i> Retry Payment';
  }
});