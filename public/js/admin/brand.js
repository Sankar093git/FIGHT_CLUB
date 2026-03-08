function addBrandRow(brand){
     try {
        let name=document.getElementById("brandName");
        let image=document.getElementById("imageInput");
        let prev=document.getElementById("imagePreview");
        let table=document.getElementById("tableBody");

        let tr=document.createElement("tr");

        tr.setAttribute("data-brand-id",brand._id);

        tr.innerHTML = `
        <td>
            <div class="brand-info">
                <div class="brand-logo">
                    <img src="/uploads/others/${brand.logo}" alt="${brand.brandName}">
                </div>
                <span class="brand-name">${brand.brandName}</span>
            </div>
        </td>

        <td>
            <span class="status-badge active" id="badge${brand._id}">
                <i class="fa fa-circle"></i> Active
            </span>
        </td>

        <td>
            <div class="action-buttons">
                <button class="btn-action block-btn btn-block">
                    <a href="/admin/blockBrand/id=${brand._id}">
                        <i class="fa fa-ban"></i> Block
                    </a>
                </button>

                <button class="btn-action btn-delete"
                    onclick="confirmDelete('${brand._id}')">
                    <i class="fa fa-trash"></i> Delete
                </button>

                <button class="btn-action btn-edit"
                    data-brand-id="${brand._id}"
                    data-brand-name="${brand.brandName}"
                    data-brand-image="${brand.logo}">
                    <i class="fa fa-pencil"></i> Edit
                </button>
            </div>
        </td>
    `;

    table.appendChild(tr);
    name.value="";
    image.value="";
    prev.src="";

     } catch (error) {
        console.error(error);
     } 

    }

    async function addBrand(event) {
      event.preventDefault(); 

    const name = document.getElementById("brandName").value.trim();
    const fileInput = document.getElementById("imageInput");
    const file = fileInput.files[0];

    if (!name) {
        Swal.fire("Error", "Brand name is required", "error");
        return;
    }

    if (!file) {
        Swal.fire("Error", "Brand image is required", "error");
        return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("image", file); 

    try {
        const res = await fetch("/admin/add-brand", {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        if (data.success) {
            Swal.fire("Success", data.message, "success").then(() => {
                addBrandRow(data.brand);
            });
        } else {
            Swal.fire("Error", data.message, "error");
        }
    } catch (error) {
        console.error(error);
        Swal.fire("Error", "Something went wrong!", "error");
    }
}

  const imageInput = document.getElementById('imageInput');
  const imagePreview = document.getElementById('imagePreview');
  const uploadIcon = document.getElementById('uploadIcon');
  const uploadText = document.getElementById('uploadText');

  imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        imagePreview.src = e.target.result;
        imagePreview.style.display = 'block';
        uploadIcon.style.display = 'none';
        uploadText.textContent = 'Click to change image';
      };
      reader.readAsDataURL(file);
    }
  });
  
  document.querySelectorAll(".btn-edit").forEach(btn => {
    btn.addEventListener("click", function () {
        const bId = this.getAttribute("data-brand-id");
        const bName = this.getAttribute("data-brand-name");
        const logo=this.getAttribute("data-brand-image")

        document.getElementById("brandName").value = bName;
        document.getElementById("imagePreview").style.display="block";
        document.getElementById("imagePreview").src=`/uploads/others/${logo}`
    });
});

function confirmDelete(id){
    Swal.fire({
        title:"Are you sure?",
        text:"Delete this brand.",
        icon:"warning",
        showCancelButton:true,
        confirmButtonText:"Okay"
    }).then((result)=>{
        if(result.isConfirmed){
            fetch(`/admin/delete-brand/${id}`,{
                method:"DELETE"      
            }).then((res)=>res.json())
            .then((data)=>{
                if(data.success){
                    Swal.fire({
                        title:"Deleted",
                        text:data.message,
                        icon:"success",
                        showConfirmButton:true
                    }).then(()=>{
                        const row = document.querySelector(`tr[data-brand-id="${id}"]`);
                        if (row) row.remove();
                        let bCount=document.getElementById("brandCount");
                        let current=parseInt(bCount.textContent);
                        bCount.textContent=`${current-1} brands`
                })
                }else{
                    Swal.fire({
                        title:"Error",
                        text:data.message,
                        icon:"error",
                        showConfirmButton:true
                    })
                }
            })
        }
    })

}

document.querySelectorAll(".block-btn").forEach((btn)=>{
    btn.addEventListener("click",()=>{
        let id= btn.getAttribute("data-brand-id");
        let badge=document.getElementById(`badge${id}`);
        fetch(`/admin/block-or-unblock-brand/${id}`,{
            method:"PATCH",
        }).then((res)=>res.json())
        .then((data)=>{
            if(data.success){
            if(btn.classList.contains("btn-block")){
                Swal.fire({
                    title:"Done",
                    text:data.message,
                    icon:"success",
                    showConfirmButton:true
                }).then(()=>{
                    badge.classList.remove("active");
                    badge.classList.add("blocked");
                    badge.innerHTML=`<i class="fa fa-circle"></i> Blocked`;
                    btn.classList.remove("btn-block");
                    btn.classList.add("btn-unblock");
                    btn.innerHTML=`<i class="fa fa-check-circle"></i> Unblock`
                })
        }else{
            Swal.fire({
                    title:"Done",
                    text:data.message,
                    icon:"success",
                    showConfirmButton:true
                }).then(()=>{
                    badge.classList.remove("blocked");
                    badge.classList.add("active");
                    badge.innerHTML=`<i class="fa fa-circle"></i> Active`
                    btn.classList.remove("btn-unblock");
                    btn.classList.add("btn-block");
                    btn.innerHTML=`<i class="fa fa-ban"></i> Block`
                })
        }
            }else{
                Swal.fire({
                    title:"Error",
                    text:"Something went wrong!",
                    icon:"error",
                    showConfirmButton:true
                })
            }
        })
    })
})