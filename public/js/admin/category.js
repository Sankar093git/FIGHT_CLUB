function clearSearchBar(){
    document.getElementById("search-bar").value="";
    document.getElementById("search-button").click();
  }

  function handleFormSubmit(event){
    event.preventDefault(); 

    if(!validateForm()){
      return;
    }

    const name = document.getElementsByName("name")[0].value.trim();
    const description = document.getElementById("descriptionId").value.trim();

    fetch("/admin/add-category", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, description })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          throw new Error(err.error);
        });
      }
      return response.json();
    })
    .then(data => {
      Swal.fire({
        icon: "success",
        title: "Category added!",
        text: data.message
      }).then(() => {
        const c = data.category;
    const offerHTML = c.categoryOffer
        ? `<span id="offerBadge${c._id}" class="offer-badge has-offer"><i class="fa fa-tag"></i> ${c.categoryOffer}%</span>`
        : `<span id="offerBadge${c._id}" class="offer-badge no-offer"><i class="fa fa-tag"></i> 0%</span>`;

    const statusHTML = c.isListed
        ? `<span id="listStatus${c._id}" class="status-badge listed"><span class="status-dot"></span> Listed</span>`
        : `<span id="listStatus${c._id}" class="status-badge unlisted"><span class="status-dot"></span> Unlisted</span>`;

    const newRow = `
    <tr id="row${c._id}">
        <td><span class="category-name">${c.name}</span></td>
        <td><span class="category-desc" title="${c.description}">${c.description}</span></td>
        <td>${offerHTML}</td>
        <td>${statusHTML}</td>
        <td>
            <div class="action-buttons">
                <a href="#" id="offerBtn${c._id}" class="action-btn action-btn-offer" onclick="addOffer('${c._id}')">
                    <i class="fa fa-percent"></i> Add Offer
                </a>
                <button id="changeStatus${c._id}" class="action-btn action-btn-unlist" onclick="unlistlistCategory('${c._id}')">
                    <i class="fa fa-eye"></i> Unlist
                </button>
                <a href="/admin/edit-category?id=${c._id}" class="action-btn action-btn-edit">
                    <i class="fa fa-pen"></i> Edit
                </a>
                <a href="#" onclick="deleteCategory('${c._id}')" class="action-btn action-btn-delete">
                    <i class="fa fa-trash"></i> Delete
                </a>
            </div>
        </td>
    </tr>`;

    document.getElementById("tBody").insertAdjacentHTML("afterbegin", newRow);

    document.getElementById("product_name").value="";
    document.getElementById("descriptionId").value="";
      });
    })
    .catch(error => {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: error.message || "An error occurred while adding the category"
      });
    });
  }

  function validateForm(){
    clearErrorMessages();
    const name = document.getElementsByName("name")[0].value.trim();
    const description = document.getElementById("descriptionId").value.trim();

    let isValid = true;

    if(name === ""){
      displayErrorMessage("name-error", "Please enter a name");
      isValid = false;
    } else if (!/^[A-Za-z\s]+$/.test(name)) {
      displayErrorMessage("name-error", "Category name should only contain alphabets");
      isValid = false;
    }

    if(description === ""){
      displayErrorMessage("description-error", "Please enter a description");
      isValid = false;
    }

    return isValid;
  }

  function displayErrorMessage(elementId, message){
    var errorElement = document.getElementById(elementId);
    errorElement.innerText = message;
    errorElement.style.display = "block";
  }

  function clearErrorMessages(){
    const errorElements = document.getElementsByClassName("error-message");
    Array.from(errorElements).forEach((element) => {
      element.innerText = "";
      element.style.display = "none";
    });
  }

  async function addOffer(categoryId) {
    const { value: amount } = await Swal.fire({
      title: "Offer in percentage",
      input: "text",
      inputLabel: "Percentage", 
      inputPlaceholder: "%",
      showCancelButton: true
    });

    if (amount) {
      try {
        const response = await fetch("/admin/add-categoryOffer", {
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            percentage: amount,
            categoryId: categoryId
          }),
        });

        const data = await response.json();
        console.log("Response data:", data); 

        if (response.ok && data.status === true) {
          Swal.fire(
            "Offer Added",
            "Offer has been added",
            "success" 
          ).then(() => {
            let badge=document.getElementById(`offerBadge${categoryId}`);
            let btn=document.getElementById(`offerBtn${categoryId}`);
            btn.onclick = () => removeOffer(categoryId);
            btn.innerHTML=`<i class="fa fa-times"></i> Remove`;
            badge.innerHTML=`<i class="fa fa-tag"></i> ${amount}%`
            badge.classList.remove("no-offer");
            badge.classList.add("has-offer");
          });
        } else {
          Swal.fire("Failed", data.message || "Adding offer failed", "error");
        }

      } catch (error) {
        console.error("Error while adding offer", error); 
        Swal.fire("Error", "An error occurred", "error");
      }
    }
  }

  async function removeOffer(categoryId) {
    try {
      const response = await fetch("/admin/remove-categoryOffer", {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ categoryId: categoryId })
      });

      const data = await response.json();

      if (data.success === true) {
        Swal.fire({
          title:"Success",
          text:data.message,
          icon:"success"
        }
        ).then(() => {
          let badge=document.getElementById(`offerBadge${categoryId}`);
            let btn=document.getElementById(`offerBtn${categoryId}`);
            btn.onclick = () => addOffer(categoryId);
            btn.innerHTML=`<i class="fa fa-percent"></i> Add Offer`;
            badge.innerHTML=`<i class="fa fa-tag"></i> 0%`
            badge.classList.remove("has-offer");
            badge.classList.add("no-offer");
        });
      } else {
        Swal.fire("Failed", data.message || "Removing offer failed", "error");
      }
    } catch (error) {
      console.error("Error removing offer:", error);
      Swal.fire(
        "Error",
        "An error occurred while removing the offer",
        "error"
      );
    }
  }

  async function deleteCategory(catId){
    try {
      Swal.fire({
        icon: "question",
        title: "Are you sure?",
        text: "Do you want to delete this category?",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        confirmButtonText: "Yes, delete it"
      }).then((result) => {
        if (result.isConfirmed) {
          $.ajax({
            method: "PATCH",
            url: `/admin/delete-category/${catId}`,
            data: {},
            success: (response) => {
              if(response.success){
                Swal.fire({
                  icon: "success",
                  title: "Done!",
                  text: "Category deleted successfully!",
                  showConfirmButton: true
                }).then(() => {
                  let row= document.getElementById(`row${catId}`);
                  row.remove();
                });
              }
            },
            error: () => {
              Swal.fire({
                icon: "error",
                title: "Oops!",
                text: "Something went wrong",
                showConfirmButton: true
              });
            }
          });
        }
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Oops!",
        text: "Something went wrong",
        showConfirmButton: true
      });
    }
  }

  function unlistlistCategory(catId){
    try {
      Swal.fire({
      title:"Are you sure?",
      text:"Unlist this category",
      icon:"question",
      showCancelButton:true,
      showConfirmButton:true
    }).then((result)=>{
      if(result.isConfirmed){
        fetch(`/admin/listorunlist-category/${catId}`,{
          method:"PATCH",
        }).then((res)=>res.json())
        .then((data)=>{
          if(data.success){
            Swal.fire({
              title:"Success",
              text:data.message,
              icon:"success"
            }).then(()=>{
              let badge=document.getElementById(`listStatus${catId}`);
              let btn=document.getElementById(`changeStatus${catId}`);
              if(data.unlisted){
                badge.innerHTML=`<span class="status-dot"></span> Unlisted`;
                badge.classList.remove("listed");
                badge.classList.add("unlisted");
                btn.innerHTML=`<i class="fa fa-eye"></i>List`
                btn.classList.remove("action-btn-unlist");
                btn.classList.add("action-btn-list");
              }else{
                badge.innerHTML=`<span class="status-dot"></span> Listed`;
                badge.classList.remove("unlisted");
                badge.classList.add("listed");
                btn.innerHTML=`<i class="fa fa-eye"></i>Unlist`
                btn.classList.remove("action-btn-list");
                btn.classList.add("action-btn-unlist");
              }

            });
          }else{
            Swal.fire({
              title:"Error",
              text:data.message,
              icon:"error"
            })
          }
        })
      }
    })
    } catch (error) {
      console.error(error.message);
    }
  }