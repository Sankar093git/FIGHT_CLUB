let isEditMode = false;
    let editingId = null;

    function openAddModal() {
      isEditMode = false;
      editingId = null;
      document.getElementById('couponModalLabel').innerHTML = '<i class="bi bi-plus-circle me-2 text-primary"></i>Add New Coupon';
      document.getElementById('couponForm').reset();
      document.getElementById('couponCode').removeAttribute('readonly');
    }

    function openEditModal(code, value, type, minPurchase, maxDiscount ,limit, startDate, endDate, id) {
      isEditMode = true;
      editingId = id;
      document.getElementById('couponModalLabel').innerHTML = '<i class="bi bi-pencil me-2 text-primary"></i>Edit Coupon';
      
      document.getElementById('couponCode').value = code;
      document.getElementById('couponCode').setAttribute('readonly', true);
      document.getElementById('discountType').value = type;
      document.getElementById('discountValue').value = value;
      document.getElementById('minPurchase').value = minPurchase;
      document.getElementById('maxDiscount').value= parseInt(maxDiscount)
      document.getElementById('usageLimit').value = limit;
      document.getElementById('startDate').value = formatForDateInput(startDate);;
      document.getElementById('endDate').value = formatForDateInput(endDate);

      const modal = new bootstrap.Modal(document.getElementById('couponModal'));
      modal.show();
    }

   function deleteCoupon(code, id) {
  Swal.fire({
    title: 'Delete Coupon?',
    text: `Are you sure you want to delete "${code}"?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'Yes, delete it'
  }).then((result) => {
    if (!result.isConfirmed) return;

    fetch(`/admin/coupon/${id}`, { method: "DELETE" })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          return Swal.fire('Error', data.message || 'Delete failed', 'error');
        }

        Swal.fire('Deleted!', 'Coupon has been deleted.', 'success');

        const row = document.getElementById(`couponRow${id}`);
        if (row) row.remove();
      })
      .catch(() => {
        Swal.fire('Error', 'Network error. Try again.', 'error');
      });
  });
}


    document.getElementById('couponForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = {
        code: document.getElementById('couponCode').value.toUpperCase(),
        discountType: document.getElementById('discountType').value,
        discountValue: document.getElementById('discountValue').value,
        minPurchase: document.getElementById('minPurchase').value,
        usageLimit: document.getElementById('usageLimit').value,
        maxDiscount: document.getElementById('maxDiscount').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        description: document.getElementById('description').value
      };

      // Validation
      if (formData.discountType === 'percentage' && formData.discountValue > 100) {
        Swal.fire('Error', 'Percentage discount cannot exceed 100%', 'error');
        return;
      }

      if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
        Swal.fire('Error', 'End date must be after start date', 'error');
        return;
      }
      if(isEditMode==false){
        fetch("/admin/coupon",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify(formData)
      }).then((res)=>res.json())
      .then((data)=>{
        if(data.success){
          Swal.fire({
            title:"Success",
            text:data.message,
            icon:"success"
          }).then((result)=>{
            if(result.isConfirmed){
             const modalEl = document.getElementById('couponModal');
             const modalInstance = bootstrap.Modal.getInstance(modalEl);
              if (modalInstance) {
                modalInstance.hide();
              }
             document.body.classList.remove('modal-open');
             document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
             addNewRow(formData.code, formData.discountValue, formData.discountType, formData.minPurchase, formData.usageLimit, formData.endDate);
            }
          })
        }else{
          Swal.fire({
            title:"Error",
            text:data.message,
            icon:"error"
          })
        }
      })
      }else{
        fetch(`/admin/coupon/${editingId}`,{
          method:"PATCH",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify(formData)
        }).then((res)=>res.json())
        .then((data)=>{
          if(data.success){
            Swal.fire({
              title:"Success",
              message:data.message,
              icon:"success"
            }).then(()=>{
             updateCouponRow(editingId,formData);
             const modalEl = document.getElementById('couponModal');
             const modalInstance = bootstrap.Modal.getInstance(modalEl);
              if (modalInstance) {
                modalInstance.hide();
              }
            })
          }else{
            Swal.fire({
              title:"Error",
              text:"Something went wrong!",
              icon:"error"
            })
          }
        })
      }
      
    });

    function addNewRow(code, value, type, minPurchase,limit,expiryDate){
      try {
        const status="active";
        const redemptions=0;
        const row=document.createElement("tr");
        const body=document.getElementById("body");
        row.innerHTML=`<td><span class="coupon-code">${code}</span></td>
              <td><span class="discount-value">${value}</span></td>
              <td>${type}</td>
              <td>${minPurchase}</td>
              <td>
                <span>${redemptions} / ${limit}</span>
                <div class="usage-bar"><div class="usage-bar-fill" style="width: 45%;"></div></div>
              </td>
              <td>
                <small class="text-muted">${expiryDate}</small>
              </td>
              <td><span class="badge-status badge-active">${status}</span></td>
              <td>
                <div class="d-flex gap-2">
                  <button class="btn btn-action btn-edit" onclick="openEditModal('${code}', ${value}, '${type}', ${minPurchase},${limit},'${startDate}','${expiryDate}')">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-action btn-delete" onclick="deleteCoupon('${code}')">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>`
      if (body.children.length >= 5) {
         body.lastElementChild.remove();
        }
        body.prepend(row);
      } catch (error) {
        console.error("Coupon row creation:",error);
        Swal.fire({
          title:"Error",
          text:"Something went wrong!",
          icon:"error"
        })
      }
    }

  function updateCouponRow(couponId, data) {
  const row = document.getElementById(`couponRow${couponId}`);
  if (!row) return;

  // Update coupon code
  row.querySelector(".coupon-code").textContent = data.code;

  // Update discount value
  row.querySelector(".discount-value").textContent = data.discountValue;

  // Update discount type (3rd column)
  row.children[2].textContent = data.discountType;

  // Update minimum purchase
  row.children[3].textContent = `₹${data.minPurchase}`;

  // Update usage limit (keep redemptions same)
  const usageSpan = row.children[4].querySelector("span");
  const redemptions = usageSpan.textContent.split("/")[0].trim();
  usageSpan.textContent = `${redemptions} / ${data.usageLimit}`;

  
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  row.children[5].querySelector("small").textContent =
    `${formatDate(start)} - ${formatDate(end)}`;

  
  const statusBadge = row.querySelector(".badge-status");
  const now = new Date();

  let status = "scheduled";
  if (start <= now && end >= now) status = "active";
  else if (end < now) status = "expired";

  statusBadge.textContent = status;
  statusBadge.className = `badge-status badge-${status}`;
}

function formatDate(date) {
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatForDateInput(dateValue) {
  const date = new Date(dateValue);
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

    function applyFilters() {
    const search = document.getElementById("search").value.trim();
    const status = document.getElementById("status").value;

    const params = new URLSearchParams();

    if (search) params.set("search", search);
    if (status) params.set("status", status);
    params.set("page", 1);

    window.location.href = `?${params.toString()}`;
  }

  function clearFilters() {
  window.location.href = "/admin/coupon";
}