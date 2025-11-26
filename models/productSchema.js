const mongoose=require("mongoose");

const productSchema= new mongoose.Schema({
    productName:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    productImage:{
        type:Array,
        required:true

    },
    salesPrice:{
        type:Number,
        required:true
    },
    regularPrice:{
        type:Number,
        required:true
    },
    brand:{
        type:String,
        required:true
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"Category"
    },
    quantity:{
        type:Number,
        default:0
    },
    productOffer:{
        type:Number,
        default:0
    },
    reviews: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Review"
  }
],
available:{
    type:Boolean,
    default:true
}


});

const Product= mongoose.model("Product",productSchema);

module.exports=Product;