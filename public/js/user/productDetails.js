let size=document.querySelector(".size-btn").innerText;
  function handleAddToCart(productId) {
    console.log(size);
    fetch(`/add-to-cart/${productId}`, { 
      method: "POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({size})
    })
      .then(res => {
        if (res.status === 403) {
          alert("This product is blocked/unavailable.");
          window.location.href = "/shop";
        } else {
          Swal.fire({
            title: 'Success!',
            text: 'Item added to cart',
            icon: 'success',
            confirmButtonText: 'OK'
          }).then(() => {
            let cText = document.querySelector(".cartCount").innerText; 
          let match = cText.match(/\d+/); 
          let count = match ? parseInt(match[0]) : 0; 
          count++;
          document.querySelector(".cartCount").innerText = `CART(${count})`;
          });
        }
      })
      .catch(() => alert("Error adding to cart."));
  }

  function handleAddToWishlist(productId){
    try {
      fetch(`/add-to-wishlist/${productId}`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
      }).then((res)=>res.json())
      .then((data)=>{
        if(data.success){
          Swal.fire({
            title:"Success",
            text:`${data.message}`,
            icon:"success",
            confirmButtonText: 'OK'
          })
        }
      })
      
    } catch (error) {
      console.error(error);
      Swal.fire({
        title:"Error!",
        text:"Something went wrong!",
        icon:"error",
        confirmButtonTex: "OK"
      })
    }
  }

  // Image switching function
  function changeImage(imageSrc, thumbnail) {
    // Update main image
    document.getElementById('mainImage').src = imageSrc;
    
    // Update active thumbnail
    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    thumbnail.classList.add('active');
  }

  // Enhanced zoom with mouse tracking
  const zoomContainer = document.getElementById('zoomContainer');
  const mainImage = document.getElementById('mainImage');

  zoomContainer.addEventListener('mousemove', (e) => {
    const rect = zoomContainer.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    mainImage.style.transformOrigin = `${x}% ${y}%`;
  });

  zoomContainer.addEventListener('mouseleave', () => {
    mainImage.style.transformOrigin = 'center center';
  });

  function selectSize(btn) {
  if (btn.classList.contains('out-of-stock')) return;
  
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('selectedSize').value = btn.dataset.size;
}

function handleStockPerSize(){
  try {
    let stock=document.getElementById("stock");
    let btn=document.querySelectorAll(".size-btn").forEach((btn)=>{
          btn.addEventListener("click",()=>{
                stock.innerText=`✅ In Stock: ${btn.getAttribute("data-stock")} items`;
                size=btn.innerText;
          });
    })
  } catch (error) {
    console.error("Error while switching variants");
  }
}
handleStockPerSize()