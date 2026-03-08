function handleReturn(productId,size,action){
      try {
        let orderId=new URLSearchParams(window.location.search).get("orderId");
        console.log(orderId)
        if(action){
          Swal.fire({
          title:"Do you want to approve?",
          text:"Refund the user.",
          icon:"question",
          showCancelButton:true
        }).then((result)=>{
          if(result.isConfirmed){
            fetch(`/admin/handle-single-return/${productId}`,{
              method:"PATCH",
              headers:{
                "Content-Type":"application/json"
              },
              body:JSON.stringify({orderId,size,action})
            }).then((res)=>res.json())
            .then((data)=>{
              if(data.success){
                Swal.fire({
                  title:"Success",
                  text:data.message,
                  icon:"success"
                }).then(()=>window.location.reload());
              }else{
                Swal.fire({
                  title:"Failed",
                  text:data.message,
                  icon:"error"
                })
              }
            })
          }
        })
        }else{
          Swal.fire({
          title:"Do you want to reject?",
          text:"Reject the request.",
          icon:"question",
          showCancelButton:true
        }).then((result)=>{
          if(result.isConfirmed){
            fetch(`/admin/handle-single-return/${productId}`,{
              method:"PATCH",
              headers:{
                "Content-Type":"application/json"
              },
              body:JSON.stringify({orderId,size,action})
            }).then((res)=>res.json())
            .then((data)=>{
              if(data.success){
                Swal.fire({
                  title:"Success",
                  text:data.message,
                  icon:"success"
                }).then(()=>window.location.reload());
              }else{
                Swal.fire({
                  title:"Failed",
                  text:data.message,
                  icon:"error"
                })
              }
            })
          }
        })
        }
      } catch (error) {
        console.log("Error while handling return",error.message);
        Swal.fire({
          title:"Error",
          text:error.message,
          icon:"error"
        })
      }
    }

  document.querySelectorAll('.status-dropdown').forEach(select => {
  select.addEventListener('change', function() {
    const productId = this.dataset.productId;
    const size = this.dataset.size;
    const orderId = new URLSearchParams(window.location.search).get("orderId");
    const newStatus = this.value;
    
    fetch(`/admin/update-product-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, productId, size, status: newStatus })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        Swal.fire('Updated!', 'Status changed', 'success').then(() => location.reload());
      } else {
        Swal.fire('Error', data.message, 'error').then(()=>window.location.reload());
      }
    });
  });
});