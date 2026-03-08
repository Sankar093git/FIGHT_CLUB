//incrementing the quantity number

document.querySelectorAll(".btn-sm").forEach((btn)=>{
  btn.addEventListener("click",()=>{
    let id=btn.getAttribute("item");
    let itemQuant=document.getElementById(`itemQuant${id}`);
    let action=btn.getAttribute("value");
    let price=document.getElementById(`priceof${id}`);
    let totalPrice=document.getElementById(`totalPrice${id}`)
    let decrement=document.getElementById(`decrement${id}`);
    let increment=document.getElementById(`increment${id}`);
    fetch("/cart/quantity",{
       method:"PATCH",
       headers:{
        "Content-Type":"application/json"
       },
       body:JSON.stringify({id,action})
    }).then((res)=>res.json())
      .then((data)=>{
        if(data.success){
        if(action=="increment"){
          itemQuant.innerText=parseInt(itemQuant.innerText)+1;
          totalPrice.innerText=`₹${parseInt(itemQuant.innerText.replace("₹",""))*parseInt(price.innerText.replace("₹",""))}`;
          let cText = document.querySelector(".cartCount").innerText; 
          let match = cText.match(/\d+/); 
          let count = match ? parseInt(match[0]) : 0; 
          count++;
          document.querySelector(".cartCount").innerText = `CART(${count})`;
          if(parseInt(itemQuant.innerText)==5){
            increment.disabled=true;
          }else{
            increment.disabled=false;
            decrement.disabled=false;
          }
          findGrandTotal()
        }else if(action=="decrement"){
          itemQuant.innerText=parseInt(itemQuant.innerText)-1;
          totalPrice.innerText=`₹${parseInt(itemQuant.innerText.replace("₹",""))*parseInt(price.innerText.replace("₹",""))}`;
          let cText = document.querySelector(".cartCount").innerText; 
          let match = cText.match(/\d+/); 
          let count = match ? parseInt(match[0]) : 0; 
          count--;
          document.querySelector(".cartCount").innerText = `CART(${count})`;
          if(parseInt(itemQuant.innerText)==1){
            decrement.disabled=true;
          }else{
            increment.disabled=false;
            decrement.disabled=false;
          }
          findGrandTotal()
        }
      }else{
        Swal.fire({
          title:"Oops!",
          text:data.message,
          icon:"warning"
        })
      }       
      })
  })
}) 

//hiding the increment na ddecrement button based on the cart quantity

function hideButton(){
 let quant=document.querySelectorAll(".quant");
 let dec=document.querySelectorAll(".dec");
 let inc=document.querySelectorAll(".inc");
 for(let i=0;i<quant.length;i++){
  if(parseInt(quant[i].innerText.replace("₹",""))==1){
    dec[i].disabled=true;
  }else if(parseInt(quant[i].innerText.replace("₹",""))>=5){
    inc[i].disabled=true;
  }else{
    dec[i].disabled=false;
    inc[i].disabled=false;
  }
 }
}

//finding the total amount

function findGrandTotal(){
  let priceArr=[]
  document.querySelectorAll(".totalPrice").forEach((price)=>{
       priceArr.push(parseInt(price.innerText.replace("₹","")));
  });
  document.getElementById("grandTotal").innerText=`₹${priceArr.reduce((acc,num)=> acc+num,0)}`
}

//removing the items from cart

document.querySelectorAll(".trash-btn").forEach((btn)=>{
  btn.addEventListener("click",()=>{
    let product=btn.getAttribute("product");
    let row=document.getElementById(`row${product}`);
     fetch("/cart/remove",{
      method:"PATCH",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({product})
     }).then((res)=>res.json())
       .then((data)=>{
        if(data.success){
          let itemQuant=document.getElementById(`itemQuant${product}`);
          let cText = document.querySelector(".cartCount").innerText; 
          let match = cText.match(/\d+/); 
          let count = match ? parseInt(match[0]) : 0; 
          count=count-parseInt(itemQuant.innerText);
          document.querySelector(".cartCount").innerText = `CART(${count})`;
          row.remove();
          findGrandTotal();
        }
       })
  })
})

function proccedToCheckout(){
  fetch("/validate-cart",{
    method:"GET"
  }).then((res)=>res.json())
  .then((data)=>{
    if(data.success){
      window.location.href="/checkout"
    }else{
      Swal.fire({
        title:"Error",
        text:data.message,
        icon:"error"
      })
    }
  })
}
findGrandTotal();
hideButton();