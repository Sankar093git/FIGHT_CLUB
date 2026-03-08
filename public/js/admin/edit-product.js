const croppers = {};
    const croppedBlobs = {};
    const croppedFiles = {};

    function handleImageSelect(index) {
        const input = document.getElementById(`input${index}`);
        const cropperContainer = document.getElementById(`cropperContainer${index}`);
        const cropperImage = document.getElementById(`cropperImage${index}`);
        const previewSection = document.getElementById(`previewSection${index}`);
        const uploadCard = document.getElementById(`uploadCard${index}`);
        const uploadStatus = document.getElementById(`uploadStatus${index}`);

        // Destroy existing cropper if any
        if (croppers[index]) {
            croppers[index].destroy();
            delete croppers[index];
        }
        
        // Reset UI state
        previewSection.classList.remove('visible');
        uploadCard.classList.remove('has-image');
        uploadStatus.classList.remove('visible');
        delete croppedBlobs[index];
        delete croppedFiles[index];

        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();

            reader.onload = function(e) {
                cropperImage.src = e.target.result;
                cropperContainer.classList.add('active');

                // Initialize cropper after image loads
                cropperImage.onload = function() {
                    if (croppers[index]) {
                        croppers[index].destroy();
                    }
                    croppers[index] = new Cropper(cropperImage, {
                        aspectRatio: 1,
                        viewMode: 1,
                        guides: true,
                        background: false,
                        autoCropArea: 0.8,
                        zoomable: true,
                        scalable: true,
                        responsive: true
                    });
                };
            };
            reader.readAsDataURL(file);
        }
    }

    function saveCrop(index) {
        const cropper = croppers[index];
        if (!cropper) {
            Swal.fire('Error', 'No image to crop', 'error');
            return;
        }

        const canvas = cropper.getCroppedCanvas({
            width: 1200,
            height: 1200,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });

        const croppedPreview = document.getElementById(`croppedPreview${index}`);
        const previewSection = document.getElementById(`previewSection${index}`);
        const uploadCard = document.getElementById(`uploadCard${index}`);
        const uploadStatus = document.getElementById(`uploadStatus${index}`);
        const cropperContainer = document.getElementById(`cropperContainer${index}`);

        // Show preview
        croppedPreview.src = canvas.toDataURL('image/jpeg', 0.9);
        previewSection.classList.add('visible');
        uploadCard.classList.add('has-image');
        uploadStatus.classList.add('visible');

        // Convert to blob and update file input
        canvas.toBlob(function(blob) {
            croppedBlobs[index] = blob;
            
            const input = document.getElementById(`input${index}`);
            const fileName = `cropped-image-${Date.now()}-${index}.jpg`;
            const croppedFile = new File([blob], fileName, { type: 'image/jpeg' });
            
            // Store the cropped file
            croppedFiles[index] = croppedFile;
            
            // Update the file input with the cropped file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(croppedFile);
            input.files = dataTransfer.files;

            // Hide cropper
            cropperContainer.classList.remove('active');
            
            // Destroy cropper instance
            if (croppers[index]) {
                croppers[index].destroy();
                delete croppers[index];
            }
        }, 'image/jpeg', 0.9);
    }

    function cancelCrop(index) {
        const cropperContainer = document.getElementById(`cropperContainer${index}`);
        const input = document.getElementById(`input${index}`);
        const previewSection = document.getElementById(`previewSection${index}`);
        const uploadCard = document.getElementById(`uploadCard${index}`);
        const uploadStatus = document.getElementById(`uploadStatus${index}`);

        // Destroy cropper
        if (croppers[index]) {
            croppers[index].destroy();
            delete croppers[index];
        }

        // Clear input and reset UI
        input.value = '';
        cropperContainer.classList.remove('active');
        previewSection.classList.remove('visible');
        uploadCard.classList.remove('has-image');
        uploadStatus.classList.remove('visible');
        delete croppedBlobs[index];
        delete croppedFiles[index];
    }

    function validateAndSubmitForm() {
        if (validateForm()) {
            // Check if any croppers are still active (user hasn't saved crop)
            let hasActiveCropper = false;
            for (let i = 1; i <= 4; i++) {
                if (croppers[i]) {
                    hasActiveCropper = true;
                    Swal.fire({
                        title: 'Unsaved Crop',
                        text: `Please save or cancel the crop for Image ${i} before submitting.`,
                        icon: 'warning',
                        confirmButtonColor: '#6366f1'
                    });
                    return;
                }
            }
            
            return true
        }
    }

    function validateForm() {
        let imageDatas = false;
        clearErrorMessages();
        
        const name = document.getElementsByName('productName')[0].value;
        const description = document.getElementsByName('descriptionData')[0].value;
        const price = document.getElementsByName('regularPrice')[0].value;
        const saleprice = document.getElementsByName('salePrice')[0].value;
        const color = document.getElementsByName('color')[0].value;
        
        // Check for existing images
        for (let i = 0; i < 10; i++) {
            const el = document.getElementById(`imageDatas${i}`);
            if (el && el.value) {
                imageDatas = true;
                break;
            }
        }
        
        // Check for new uploaded/cropped images
        let hasNewImages = false;
        for (let i = 1; i <= 4; i++) {
            const input = document.getElementById(`input${i}`);
            if (input && input.files && input.files.length > 0) {
                hasNewImages = true;
                break;
            }
        }

        let isValid = true;

        if (name.trim() === "") {
            displayErrorMessage('productName-error', 'Please enter a product name.');
            isValid = false;
        }

        if (description.trim() === '') {
            displayErrorMessage('description-error', 'Please enter a product description.');
            isValid = false;
        }

        if (!/^\d+(\.\d{1,2})?$/.test(price) || parseFloat(price) < 0) {
            displayErrorMessage('regularPrice-error', 'Please enter a valid non-negative price.');
            isValid = false;
        }

        if (!/^\d+(\.\d{1,2})?$/.test(saleprice) || parseFloat(saleprice) < 0) {
            displayErrorMessage('salePrice-error', 'Please enter a valid non-negative price.');
            isValid = false;
        }

        if (color.trim() === "") {
            displayErrorMessage('color-error', 'Please enter a color.');
            isValid = false;
        }

        if (!imageDatas && !hasNewImages) {
            displayErrorMessage("images-error", 'Please select at least one image.');
            isValid = false;
        }

        return isValid;
    }

    function displayErrorMessage(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.innerText = message;
            errorElement.style.display = "block";
        }
    }

    function clearErrorMessages() {
        const errorElements = document.getElementsByClassName('error-message');
        Array.from(errorElements).forEach(element => {
            element.innerText = '';
            element.style.display = 'none';
        });
    }

    function deleteSingleImage(image, productId) {
        Swal.fire({
            title: "Delete Image?",
            text: "This action cannot be undone.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            confirmButtonText: "Yes, delete",
            cancelButtonText: "Cancel"
        }).then((result) => {
            if (result.isConfirmed) {
                fetch(`/admin/delete-image/${image}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ productId })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire("Deleted!", "Image removed successfully.", "success").then(() => {
                            location.reload();
                        });
                    } else {
                        Swal.fire("Error", "Failed to delete image.", "error");
                    }
                })
                .catch(err => {
                    console.error('Delete error:', err);
                    Swal.fire("Error", "Failed to delete image.", "error");
                });
            }
        });
    }

let variants = <%- JSON.stringify(variants) %>;
let x = new Set(variants.map(v => JSON.stringify(v)));

function addVariantRow() {
    const row = document.createElement('div');
    row.className = 'variant-row d-flex gap-2 mb-2';
    row.innerHTML = `
        <div>
                        <input type="text" class="form-control variantSize size-input" placeholder="Size (e.g., S, M, 42, 10ml)">
                        <span class="error size"  style="display: none;"></span>
                        </div>
                        <div>
                        <input type="text" class="form-control variantQuantity quantity-input" placeholder="Quantity" min="0">
                        <span class="error quantity"  style="display: none;"></span>
                        </div>
                        <button type="button" class="btn btn-danger btn-sm remove-variant">&times;</button>
    `;
    document.getElementById('variantRows').appendChild(row);
}

    document.getElementById('variantRows').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-variant')) {
        const rows = document.querySelectorAll('.variant-row');
        if (rows.length > 1) e.target.parentElement.remove();
    }
});

function saveVariants() {
    x.clear(); 
    
    document.querySelectorAll('.variant-row').forEach(row => {
        const sizeInput = row.querySelector('.size-input');
        const quantityInput = row.querySelector('.quantity-input');
        
        if (!sizeInput || !quantityInput) return;
        
        const size = sizeInput.value.trim();
        const stock = quantityInput.value.trim();
        
        if (size !== "" && stock !== "") {
            x.add(JSON.stringify({ size, stock: parseInt(stock, 10) }));
        }
    });
    
    variants = [...x].map(v => JSON.parse(v));
    console.log(variants);
    const modalElement = document.getElementById("variantsModal");
    const modalInstance = bootstrap.Modal.getInstance(modalElement);

    modalInstance.hide();
}

document.querySelectorAll(".variantSize").forEach((variant)=>{
    variant.addEventListener("input",validateModal)
})

document.querySelectorAll(".variantQuantity").forEach((variant)=>{
    variant.addEventListener("input",validateModal)
})

function validateModal(){
    let sizeError=document.querySelectorAll(".size");
    let quantityError=document.querySelectorAll(".quantity");
    let size=document.querySelectorAll(".size-input");
    let quantity=document.querySelectorAll(".quantity-input");
    let sizeRegex=/^[a-zA-Z0-9]+$/;
    let quantityRegex=/^[0-9]+$/;
    let length=size.length;

    for(let i=0;i<length;i++){
        if(size[i].value.trim()==""){
           sizeError[i].style.display="block";
           sizeError[i].innerText="Size is required"
        }else if(!sizeRegex.test(size[i].value.trim())){
            sizeError[i].style.display="block";
            sizeError[i].innerText="This feild only accepts letters and numbers"
        }else{
            sizeError[i].style.display="none";
            sizeError[i].innerText=""
        }

        if(quantity[i].value.trim()==""){
            quantityError[i].style.display="block";
            quantityError[i].innerText="Quantity is required"
        }else if(!quantityRegex.test(quantity[i].value.trim())){
            quantityError[i].style.display="block";
            quantityError[i].innerText="This field only accepts numbers"
        }else{
            quantityError[i].style.display="none";
            quantityError[i].innerText=""
        }
    }
}

function validateAndSubmit(id) {
    if (!validateForm()) return;
    if(!validateAndSubmitForm()) return

    console.log("Reaching");

    const form = document.querySelector("form");
    const formData = new FormData(form);

    // Append variants array as JSON
    formData.append("variants", JSON.stringify(variants));

    fetch(`/admin/edit-product/${id}`, {
        method: "PATCH",
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            Swal.fire({
            title:"Success!",
            text:data.message,
            icon:"success",
            showCOnfirmButton:true
        }).then(()=>window.location.href = "/admin/products")
        } else {
            Swal.fire({
            title:"Error",
            text:data.message,
            icon:"error",
            showCOnfirmButton:true
        });
        }
    })
    .catch(err => {
        console.error(err);
        Swal.fire({
            title:"Error",
            text:"Something went wrong",
            icon:"error",
            showCOnfirmButton:true
        });
    });
}
saveVariants();