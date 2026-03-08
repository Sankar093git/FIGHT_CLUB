function cancelProduct(productId,size,quantity){
      const id = new URLSearchParams(window.location.search).get("id");
      console.log(id);
     Swal.fire({
      title:"Are you sure?",
      text:"Cancel this product.",
      icon:"warning",
      showConfirmButton:true,
      showCancelButton:true
     }).then((result)=>{
         if(result.isConfirmed){
          Swal.fire({
            title:"Sure",
            text:"Do you want to cancel all units?",
            showCancelButton:true,
            showConfirmButton:true,
            confirmButtonText: "Yes",
            cancelButtonText: "No",
          }).then((result)=>{
            if(result.isConfirmed){
              fetch(`/cancel/${productId}`,{
                method:"PATCH",
                headers:{
                  "Content-Type":"application/json"
                },
                body:JSON.stringify({id,size,quantity})
              }).then((res)=>res.json())
                .then((data)=>{
                  if(data.success){
                    Swal.fire({
                      title:"Success!",
                      text:data.message,
                      icon:"success"
                    }).then(()=>window.location.reload());
                  }else{
                    Swal.fire({
                      title:"Error!",
                      text:data.message,
                      icon:"error"
                    })
                  }
                });
            }else{
              Swal.fire({
                title: "Adjust quantity",
                input: "number",
                inputLabel: "No of units to be returned",
                inputAttributes: {
                       min: 0,
                       step: 1
                   },
                showCancelButton: true,
                preConfirm: (value) => {
                    if (!Number.isInteger(+value)) {
                        Swal.showValidationMessage("Only whole numbers allowed");
                        return false;
                     }else if(quantity<=value||value<0){
                        Swal.showValidationMessage("Invalid entries");
                        return false;
                     }
                     return +value;
                  }
              }).then(({ isConfirmed, value }) => {
                        if (isConfirmed) {
                           fetch(`/cancel/${productId}`,{
                            method:"PATCH",
                            headers:{
                              "Content-Type":"application/json"
                            },
                            body:JSON.stringify({id,size,value})
                           }).then((res)=>res.json())
                           .then((data)=>{
                            if(data.success){
                              Swal.fire({
                                title:"Success",
                                text:data.message,
                                icon:"success"
                              }).then(()=>window.location.reload())
                            }else{
                              Swal.fire({
                                title:"Error",
                                text:data.message,
                                icon:"error"
                              })
                            }
                           })
                         }
                 });
            }
          })
         }
     })
    }
function returnProduct(productId,size,quantity){
  const id = new URLSearchParams(window.location.search).get("id");
      console.log(id);
     Swal.fire({
      title:"Are you sure?",
      text:"Return this product.",
      icon:"warning",
      showConfirmButton:true,
      showCancelButton:true
     }).then((result)=>{
         if(result.isConfirmed){
          Swal.fire({
            title:"Sure",
            text:"Do you want to return all units?",
            icon:"question",
            showCancelButton:true,
            confirmButtonText: "Yes",
            cancelButtonText: "No",
          }).then((result)=>{
            if(result.isConfirmed){
              fetch(`/return/${productId}`,{
                method:"PATCH",
                headers:{
                  "Content-Type":"application/json"
                },
                body:JSON.stringify({id,size,value:quantity})
              }).then((res)=>res.json())
                .then((data)=>{
                  if(data.success){
                    Swal.fire({
                      title:"Success!",
                      text:data.message,
                      icon:"success"
                    }).then(()=>window.location.reload())
                  }else{
                    Swal.fire({
                      title:"Error!",
                      text:data.message,
                      icon:"error"
                    })
                  }
                });
            }else{
              Swal.fire({
                title: "Adjust quantity",
                input: "number",
                inputLabel: "No of units to be returned",
                inputAttributes: {
                       min: 0,
                       step: 1
                   },
                showCancelButton: true,
                preConfirm: (value) => {
                    if (!Number.isInteger(+value)) {
                        Swal.showValidationMessage("Only whole numbers allowed");
                        return false;
                     }else if(quantity<=value||value<0){
                        Swal.showValidationMessage("Invalid entries");
                        return false;
                     }
                     return +value;
                  }
              }).then(({ isConfirmed, value }) => {
                        if (isConfirmed) {
                           fetch(`/return/${productId}`,{
                            method:"PATCH",
                            headers:{
                              "Content-Type":"application/json"
                            },
                            body:JSON.stringify({id,size,value})
                           }).then((res)=>res.json())
                           .then((data)=>{
                            if(data.success){
                              Swal.fire({
                                title:"Success",
                                text:data.message,
                                icon:"success"
                              }).then(()=>window.location.reload())
                            }else{
                              Swal.fire({
                                title:"Error",
                                text:data.message,
                                icon:"error"
                              })
                            }
                           })
                         }
                 });
            }
          })
         }
     })
}