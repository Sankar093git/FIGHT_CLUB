document.addEventListener("DOMContentLoaded",returnStatHandling());
  function returnStatHandling() {
  document.querySelectorAll("tr").forEach(row => {
    const requestStatus = row.querySelector(".returnRequestStat")?.innerText.trim();
    const buttons = row.querySelectorAll(".returHandleButton");

    if (requestStatus !== "Requested") {
      buttons.forEach(btn => btn.classList.add("hideReturnHandlers"));
    } else {
      buttons.forEach(btn => btn.classList.remove("hideReturnHandlers"));
    }
  });
}




function handleOrderStatus(status,orderId,email){
    let cancelMessage="";
         if(status=="Cancelled"){
          Swal.fire({
           title: "Warning!",
           text: "Are you sure you want to cancel?",
           icon: "warning",
           showCancelButton: true,
           confirmButtonText: "Yes",
           cancelButtonText: "No"
         }).then((result)=>{
          if(result.isConfirmed){
            Swal.fire({
             title: "Reason for cancellation",
             input: "textarea",
             inputPlaceholder: "Type your reason here...",
             inputAttributes: {
              rows: 5
             },
            showCancelButton: true,
            confirmButtonText: "Submit"
           }).then((result) => {
          if (result.isConfirmed) {
            cancelMessage= result.value;
          }
         }).then(()=>{
          fetch(`/admin/change-order-status/${orderId}`,{
      method:"PATCH",
     headers:{
      "content-type":"application/json"
     },
      body:JSON.stringify({status,email,cancelMessage}),
     }).then((res)=>res.json())
     .then((data)=>{
      if(data.success){
        Swal.fire({
          title:"Success",
          text:"Status updated successfully",
          icon:"success"
        }).then(()=>window.location.reload())
      }else{
        Swal.fire({
          title:"Something went wrong",
          text:`${data.message}`,
          icon:"error"
        })
      }
     })
     .catch((err)=>{
      console.log(err);
      Swal.fire({
          title:"Forbidden",
          text:`${err}`,
          icon:"error"
        })
     })
         });
          }
         })
         }else{
     fetch(`/admin/change-order-status/${orderId}`,{
      method:"PATCH",
     headers:{
      "content-type":"application/json"
     },
      body:JSON.stringify({status,email,cancelMessage}),
     }).then((res)=>res.json())
     .then((data)=>{
      if(data.success){
       Swal.fire({
          title:"Success",
          text:"Status updated successfully",
          icon:"success"
        }).then(()=>window.location.reload())
      }else{
       Swal.fire({
          title:"Forbidden",
          text:`${data.message}`,
          icon:"error"
        }).then(()=>{window.location.reload()})
      }
     })
     .catch((err)=>{
      console.log(err);
      Swal.fire({
          title:"Forbidden",
          text:`${err}`,
          icon:"error"
        })
     })
    }
}


    let currentReturnOrder = null;
    let currentReturnApproval = false;

    function handleReturnVerification(orderId,email,approve) {
      currentReturnOrder = orderId;
      currentReturnApproval = approve;  
      if (currentReturnApproval) {
        fetch(`/admin/handle-refund/${orderId}`,{
          method:"PATCH",
          headers:{
            "content-type":"application/json"
          },
          body:JSON.stringify({email,currentReturnApproval})
        }).then((res)=>res.json())
          .then((data)=>{
            if(data.success==true){
              Swal.fire({
                title:"Success",
                text:`${data.message}`,
                icon:"success"
              }).then(()=>{
                document.getElementById(`status${orderId}`).value = "Returned"
                document.getElementById(`returnRequestStat${orderId}`).innerHTML="Approved";
                document.getElementById(`approve${orderId}`).style.display="none";
                document.getElementById(`reject${orderId}`).style.display="none";
              })
            }
          })
      } else {
        fetch(`/admin/handle-refund/${orderId}`,{
          method:"PATCH",
          headers:{
            "content-type":"application/json"
          },
          body:JSON.stringify({email,currentReturnApproval})
        }).then((res)=>res.json())
        .then((data)=>{
          if(data.success==true){
             Swal.fire({
                title:"Success",
                text:`${data.message}`,
                icon:"success"
              }).then(()=>{
                document.getElementById(`status${orderId}`).value = "Return rejected"
                document.getElementById(`returnRequestStat${orderId}`).innerHTML="Rejected";
                document.getElementById(`approve${orderId}`).style.display="none";
                document.getElementById(`reject${orderId}`).style.display="none";
              })
          }
        })
      }
    }
    function viewOrderDetails(orderId,email) {
      window.location.href = `/admin/orderDetails?orderId=${orderId}&email=${email}`;
    }

    document.getElementById('applyFilters').addEventListener('click',(e)=>{
      let searchInput=document.getElementById("searchInput").value;
      let statusFilter=document.getElementById("statusFilter").value;
      let sortByDate=document.getElementById("sortBy").value;
      let dateFilter=document.getElementById("dateFilter").value;
      console.log(searchInput," ",statusFilter," ",sortByDate," ",dateFilter);
      window.location.href=`/admin/orderList?search=${searchInput}&status=${statusFilter}&sort=${sortByDate}&date=${dateFilter}`

    });

    document.getElementById('clearFilters').addEventListener('click', ()=> {
      
      window.location.href="/admin/orderList"

    });

    document.getElementById('searchInput').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        document.getElementById('applyFilters').click();
      }
    });