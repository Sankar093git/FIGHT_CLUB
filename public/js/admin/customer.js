function blockOrUnblockUser(userId, userName) {
    try {
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to perform this action for ${userName}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Yes',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    method: "PATCH",
                    url: `/admin/block-or-unblock-user?id=${userId}`,
                    data: {},
                    success: (response) => {
                        if (response.success) {
                            if (response.status === "unblocked") {
                                Swal.fire({
                                    title: "Unblocked!",
                                    text: response.message,
                                    icon: "success",
                                    timer: 1500,
                                    showConfirmButton: false
                                }).then(() => {
                                      let btn=document.getElementById(`actnBtn${userId}`);
                                      let blockedUsers=document.getElementById("blockedUsers");
                                      let activeUsers=document.getElementById("activeUsers");
                                      blockedUsers.innerText=response.blockedUsers;
                                      activeUsers.innerText=response.activeUsers;
                                      btn.innerHTML=`<i class="fa fa-ban"></i> Block`
                                      btn.classList.remove("btn-unblock");
                                      btn.classList.add("btn-block"); 
                                    });
                            } else if (response.status === "blocked") {
                                Swal.fire({
                                    title: "Blocked!",
                                    text: response.message,
                                    icon: "success",
                                    timer: 1500,
                                    showConfirmButton: false
                                }).then(() => {
                                      let btn=document.getElementById(`actnBtn${userId}`);
                                      let blockedUsers=document.getElementById("blockedUsers");
                                      let activeUsers=document.getElementById("activeUsers");
                                      blockedUsers.innerText=response.blockedUsers;
                                      activeUsers.innerText=response.activeUsers;
                                      btn.innerHTML=`<i class="fa fa-check-circle"></i> Unblock`
                                      btn.classList.remove("btn-block");
                                      btn.classList.add("btn-unblock");
                                    });
                            }
                        }
                    },
                    error: () => {
                        Swal.fire({
                            icon: "error",
                            title: "Error!",
                            text: "Something went wrong, please try again.",
                            confirmButtonText: 'OK'
                        })
                    }
                })
            }
        });
    } catch (error) {
        Swal.fire({
            icon: "error",
            title: "Error!",
            text: `${error.message}`,
            confirmButtonText: 'OK'
        })
    }
}

function clearFilter(){
    try {
        event.preventDefault();
        window.location.href="/admin/users"
    } catch (error) {
        console.error("Something went wrong while clearing filter!",error);
    }
}