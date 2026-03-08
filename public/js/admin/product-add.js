const croppers = {};
const selectedImages = [];

function validateForm() {
    clearErrorMessages();
    const name = document.getElementsByName('productName')[0].value;
    const description = document.getElementById('descriptionid').value;
    const brand = document.getElementsByName('brand')[0].value;
    const price = document.getElementsByName('regularPrice')[0].value;
    const saleprice = document.getElementsByName('salePrice')[0].value;
    const color = document.getElementsByName('color')[0].value;
    const category = document.getElementsByName('category')[0].value;
    const images = document.getElementById('input1');
    let isValid = true;

    if (name.trim() === "") {
        displayErrorMessage('productName-error', 'Please enter a product name.');
        isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
        displayErrorMessage('productName-error', 'Product name should contain only alphabetic characters.');
        isValid = false;
    }

    if (description.trim() === "") {
        displayErrorMessage('description-error', 'Please enter a product description.');
        isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(description.trim())) {
        displayErrorMessage('description-error', 'Product description should contain only alphabetic characters.');
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

    if (parseFloat(price) <= parseFloat(saleprice)) {
        displayErrorMessage('regularPrice-error', 'Regular price must be greater than sale price.');
        isValid = false;
    }

    if (color.trim() === "") {
        displayErrorMessage('color-error', 'Please enter a color.');
        isValid = false;
    }

    // Check if at least one image is uploaded
    let hasImage = false;
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById(`input${i}`);
        if (input.files && input.files.length > 0) {
            hasImage = true;
            break;
        }
    }
    if (!hasImage) {
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

function viewImage(event, index) {
    const input = event.target;
    if (!input.files || !input.files[0]) return;

    const previewImage = document.getElementById(`imgView${index}`);
    const cropperContainer = document.getElementById(`cropperContainer${index}`);
    const cropperImage = document.getElementById(`cropperImage${index}`);
    const saveButton = document.getElementById(`saveButton${index}`);
    const status = document.getElementById(`status${index}`);
    const previewSection = document.getElementById(`previewSection${index}`);
    const label = document.getElementById(`label${index}`);

    // Reset previous state
    if (croppers[index]) {
        croppers[index].destroy();
        delete croppers[index];
    }
    previewSection.classList.remove('visible');

    const reader = new FileReader();
    reader.onload = function() {
        const dataURL = reader.result;
        cropperImage.src = dataURL;
        cropperContainer.classList.add('active');
        label.style.display = 'none';
        status.textContent = 'Cropping...';
        status.classList.remove('ready');

        cropperImage.onload = function() {
            croppers[index] = new Cropper(cropperImage, {
                aspectRatio: 1,
                viewMode: 1,
                guides: true,
                background: false,
                autoCropArea: 1,
                zoomable: true
            });
        };

        saveButton.onclick = function() {
            const cropper = croppers[index];
            if (!cropper) return;

            const croppedCanvas = cropper.getCroppedCanvas({ 
                maxWidth: 1200, 
                maxHeight: 1200 
            });

            const croppedImg = document.getElementById(`croppedImg${index}`);
            croppedImg.src = croppedCanvas.toDataURL("image/jpeg", 1.0);

            const fileName = `cropped-img-${Date.now()}-${index}.jpg`;

            croppedCanvas.toBlob(blob => {
                const imgFile = new File([blob], fileName, { type: 'image/jpeg' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(imgFile);
                input.files = dataTransfer.files;

                // Update UI
                cropperContainer.classList.remove('active');
                previewSection.classList.add('visible');
                status.textContent = 'Ready';
                status.classList.add('ready');

                cropper.destroy();
                delete croppers[index];
            }, 'image/jpeg');
        };
    };
    reader.readAsDataURL(input.files[0]);
}

function cancelCrop(index) {
    const cropperContainer = document.getElementById(`cropperContainer${index}`);
    const input = document.getElementById(`input${index}`);
    const status = document.getElementById(`status${index}`);
    const label = document.getElementById(`label${index}`);

    if (croppers[index]) {
        croppers[index].destroy();
        delete croppers[index];
    }

    input.value = '';
    cropperContainer.classList.remove('active');
    label.style.display = 'flex';
    status.textContent = 'Empty';
    status.classList.remove('ready');
}

// Initialize event listeners
["input1", "input2", "input3", "input4"].forEach((id, index) => {
    document.getElementById(id).addEventListener("change", (e) => viewImage(e, index + 1));
});

// Thumbnail preview handler
function handleFileSelect(event) {
    const addedImagesContainer = document.getElementById("addedImagesContainer");
    addedImagesContainer.innerHTML = "";
    const files = event.target.files;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        selectedImages.push(file);
        const thumbnail = document.createElement("div");
        thumbnail.classList.add("thumbnail");

        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.alt = "thumbnail";

        const removeIcon = document.createElement("span");
        removeIcon.classList.add("remove-icon");
        removeIcon.innerHTML = "&times;";
        removeIcon.addEventListener("click", function() {
            const idx = selectedImages.indexOf(file);
            if (idx !== -1) {
                selectedImages.splice(idx, 1);
            }
            thumbnail.remove();
        });

        thumbnail.appendChild(img);
        thumbnail.appendChild(removeIcon);
        addedImagesContainer.appendChild(thumbnail);
    }
}
document.getElementById("input1").addEventListener("change", handleFileSelect);

let variants = [];

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
       variants = [];

    document.querySelectorAll('.variant-row').forEach(row => {
    const sizeInput = row.querySelector('.size-input');
    const quantityInput = row.querySelector('.quantity-input');

    // Safety check
    if (!sizeInput || !quantityInput) return;

    const size = sizeInput.value.trim();
    const stock = quantityInput.value.trim();

    if (size !== "" && stock !== "") {
      variants.push({
        size,
        stock: parseInt(stock, 10)
      });
    }
  });

  console.log(variants); // ✅ correct variable
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

function validateAndSubmit() {
    if (!validateForm()) return;

    const form = document.querySelector("form");
    const formData = new FormData(form);

    // Append variants array as JSON
    formData.append("variants", JSON.stringify(variants));

    fetch("/admin/add-products", {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            Swal.fire({
                title:"Success",
                text:data.message,
                icon:"success"
            }).then(()=>window.location.href = "/admin/products")
        } else {
            alert(data.message || "Something went wrong");
        }
    })
    .catch(err => {
        console.error(err);
        alert("Server error");
    });
}