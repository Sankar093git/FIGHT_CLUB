/* ---------------------------------------------------------
     1. Inject backend data safely into JS
  --------------------------------------------------------- */
  const products = <%- JSON.stringify(product || []) %>;
  const productList = document.getElementById("product-list");

  /* ---------------------------------------------------------
     2. Generic URL helper (avoids repeating logic)
  --------------------------------------------------------- */
  function updateURLParams(updates = {}) {
    const url = new URL(window.location.href);

    Object.keys(updates).forEach(key => {
      const value = updates[key];
      if (value === "" || value === null || value === undefined) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });

    // always reset pagination when filters change
    url.searchParams.delete("page");

    window.location.href = url.pathname + "?" + url.searchParams.toString();
  }

  /* ---------------------------------------------------------
     3. Handlers for Filters
  --------------------------------------------------------- */
  function updateQueryParam(key, value) {
    updateURLParams({ [key]: value });
  }

  function applyPriceFilter() {
    const min = document.getElementById("minRange").value;
    const max = document.getElementById("maxRange").value;
    updateURLParams({ minPrice: min, maxPrice: max });
  }

  /* ---------------------------------------------------------
     4. Render Product Cards
  --------------------------------------------------------- */
  function renderProducts(container, data) {
    container.innerHTML = "";

    data.forEach(p => {
      const discount =
        p.regularPrice > p.salesPrice? Math.round(((p.regularPrice - p.salesPrice) / p.regularPrice) * 100): 0;

      const mainImage =
        p.productImage && p.productImage[0]? `/uploads/re-image/${p.productImage[0]}`: "/uploads/re-image/placeholder.jpg";

      const card = document.createElement("div");
      card.className = "col-md-4 mb-4";

      card.innerHTML = `
        <div class="card product-card h-100">
          
          <a href="/product-details?id=${p._id}">
            <img src="${mainImage}" class="card-img-top" alt="${p.productName}">
          </a>

          <div class="card-body d-flex flex-column align-items-center">
            <h6 class="card-title text-center mb-2">${p.productName}</h6>
            <span class="original-price me-2">
                Size:${p.variants[0].size}
              </span>

            <div class="price-section mb-3">
              <span class="original-price text-muted text-decoration-line-through me-2">
                ₹${p.regularPrice}
              </span>
              <span class="sale-price fw-bold text-danger">₹${p.salesPrice}</span>
            </div>

            <button onclick="handleAddToCart('${p._id}','${p.variants[0].size}',)" class="btn btn-add-cart">
              <i class="bi bi-cart-plus me-1"></i> Add to Cart
            </button>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  /* ---------------------------------------------------------
     5. Execute Render
  --------------------------------------------------------- */
  renderProducts(productList, products);

function handleAddToCart(productId,size){
  fetch(`/add-to-cart/${productId}`,{
    method:"POST",
    headers:{
      "content-type":"application/json"
    },
    body:JSON.stringify({size})
  }).then(res => {
        if (res.status === 403) {
          Swal.fire({
          icon: "error",
          title: "Oops!",
          text: "This product is blocked or unavailable at the moment.",
          confirmButtonColor: "#d33",
        }).then(()=>{
          window.location.href = "/shop";
        })
        } else {
          Swal.fire({
            title: 'Success!',
            text: 'Item added to cart',
            icon: 'success',
            confirmButtonText: 'OK'
          }).then(()=>{
            let cText = document.querySelector(".cartCount").innerText; 
            let match = cText.match(/\d+/); 
            let count = match ? parseInt(match[0]) : 0; 
            count++;
            document.querySelector(".cartCount").innerText = `CART(${count})`;
          })
        }
      })
      .catch(() => Swal.fire({
                     icon: 'error',
                     title: 'Add to Cart Failed',
                     text: 'Something went wrong. Please try again.',
                     confirmButtonColor: '#d33'
                    }));
  }

  function clearFilters(){
    window.location.href="/shop"
  }