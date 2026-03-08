// Product carousel functionality
        function scrollProducts(direction, sectionId) {
            const section = document.getElementById(sectionId);
            const scrollAmount = 300;
            
            if (direction === 'left') {
                section.scrollLeft -= scrollAmount;
            } else {
                section.scrollLeft += scrollAmount;
            }
        }

        // Add to cart functionality
        document.addEventListener('DOMContentLoaded', function() {
            const addToCartButtons = document.querySelectorAll('.btn-primary');
            
            addToCartButtons.forEach(button => {
                if (button.textContent.includes('Add to Cart')) {
                    const id=button.getAttribute("data-id");
                    button.addEventListener('click', function() {
                        try {
                           fetch(`/add-to-cart/${id}`,{
                            method:"POST",
                            headers:{
                                "Content-type":"application/json"
                            }
                        }).then((res)=>res.json())
                        .then((data)=>{
                            if(data.success){
                                Swal.fire({
                                    title:"Success",
                                    text:data.message,
                                    icon:"success"
                                }).then(()=>{
                                    let cText = document.querySelector(".cartCount").innerText; 
                                    let match = cText.match(/\d+/); 
                                    let count = match ? parseInt(match[0]) : 0; 
                                    count++;
                                    document.querySelector(".cartCount").innerText = `CART(${count})`;
                                })
                            }else{
                                Swal.fire({
                                    title:"Error",
                                    text:data.message,
                                    icon:"error"
                                })
                            }
                        }) 
                        } catch (error) {
                            Swal.fire({
                                title:"Error",
                                text:"Please check if you have logged in or not!",
                                icon:"error"
                            })
                        }
                    });
                }
            });
        });

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Category hover effects
        document.querySelectorAll('.category-icon').forEach(icon => {
            icon.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#dc3545';
            });
            
            icon.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '#000';
            });
        });