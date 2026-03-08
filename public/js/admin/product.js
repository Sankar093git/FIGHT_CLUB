async function addOffer(productId) {
    const { value: amount } = await Swal.fire({
        title: 'Offer in percentage',
        input: "number",
        inputLabel: "percentage",
        inputPlaceholder: "%",
        confirmButtonColor: '#6366f1'
    });

    if (amount) {
        fetch("/admin/product-offer", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                percentage: amount,
                productId: productId
            })
        })
        .then((res) => res.json())
        .then((data) => {
            if (data.success) {
                Swal.fire({
                    title: "Success",
                    text: data.message,
                    icon: "success"
                }).then(() =>{
                    let tag=document.getElementById(`priceTag${productId}`)
                    let badge=document.getElementById(`offerBadge${productId}`);
                    let btn=document.getElementById(`offerBtn${productId}`);
                    badge.innerHTML=`${amount}<i class="fa fa-percent"></i>`;
                    badge.classList.remove("no-offer");
                    btn.innerHTML=`<i class="fa fa-times"></i> Remove`;
                    btn.onclick=()=>removeOffer(`${productId}`);
                    btn.classList.remove("btn-offer-add");
                    btn.classList.add("btn-offer-remove");
                    tag.innerText=`₹${data.price}`
                });
            } else {
                Swal.fire({
                    title: "Error",
                    text: data.message,
                    icon: "error"
                });
            }
        })
        .catch((error) => {
            Swal.fire({
                title: "Error",
                text: "Something went wrong!",
                icon: "error"
            });
        });
    }
}

    function removeOffer(productId) {
        try {
            Swal.fire({
                title: "Remove Offer",
                text: "Are you sure you want to remove the offer?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#6366f1",
                cancelButtonColor: "#ef4444",
                confirmButtonText: "Yes, remove",
                timer: 5000,
                timerProgressBar: true
            }).then(async (result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: "/admin/remove-product-offer",
                        method: "patch",
                        data: {
                            productId: productId
                        },
                        success: (response) => {
                            if (response.success === true) {
                                Swal.fire({
                                    title:'Success',
                                    text:response.message,
                                    icon:"success"
                                }).then(()=>{
                                    let tag=document.getElementById(`priceTag${productId}`);
                                    let badge=document.getElementById(`offerBadge${productId}`);
                                    let btn=document.getElementById(`offerBtn${productId}`);
                                    badge.innerHTML=`No offer`;
                                    badge.classList.add("no-offer");
                                    btn.innerHTML=`<i class="fa fa-plus"></i> Add Offer`;
                                    btn.onclick=()=>addOffer(`${productId}`);
                                    btn.classList.remove("btn-offer-remove");
                                    btn.classList.add("btn-offer-add");
                                    tag.innerText=`₹${response.price}`
                                })
                            } else if (response.status === false) {
                                Swal.fire({
                                    title:"Error",
                                    text:response.message,
                                    icon:"error"
                                })
                            }
                        }
                    })
                }
            })
        } catch (error) {
            console.log("Error while removing the offer", error);
            Swal.fire({
                        title:"Error",
                        text:"Something definitly went wrong",
                        icon:"error"
                    })
        }
    }

    function blockProducts(productId) {
        try {
            Swal.fire({
                title:"Are you sure",
                text:"Do you want to perform this action?",
                icon:"question"
            }).then((result)=>{
                if(result.isConfirmed){
                     $.ajax({
                method: "PATCH",
                url: `/admin/block-or-unblock-products/${productId}`,
                data: {},
                success: (response) => {
                    if (response.success === true) {
                        Swal.fire({
                        icon: "success",
                        title: "Success",
                        text: `${response.message}`,
                       }).then(()=>{
                        let btn=document.getElementById(`btn-action${productId}`);
                        if(!response.isBlocked){
                            btn.innerHTML=`<i class="fa fa-ban"></i> Block`
                            btn.classList.remove("btn-unblock");
                            btn.classList.add("btn-block");
                        }else{
                            btn.innerHTML=`<i class="fa fa-check"></i> Unblock`
                            btn.classList.remove("btn-block");
                            btn.classList.add("btn-unblock");
                        }
                        
                       })
                    } else if (response.status === false) {
                        Swal.fire("Failed", "Please try again", "error");
                    }
                }
            })
                }
            })
           
        } catch (error) {
            console.log("Error while blocking the product");
            Swal.fire("Failed", "Something went wrong", "error");
        }
    }

    function clearFilters(filter){
        try {
            let prod=document.getElementById("prod").value;
            let cate=document.getElementById("cate").value;
            let brand=document.getElementById("brand").value;
            //event.preventDefault();
            if(filter=="product"){
                window.location.href=`/admin/products?prod=&cate=${cate}&brand=${brand}`
            }else if(filter=="category"){
                window.location.href=`/admin/products?prod=${prod}&cate=&brand=${brand}`
            }else if(filter=="brand"){
                window.location.href=`/admin/products?prod=${prod}&cate=${cate}&brand=`
            }
        } catch (error) {
            console.error("error while clearing filter",error);
        }
    }