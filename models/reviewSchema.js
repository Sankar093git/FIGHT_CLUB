const mongoose=require("mongoose");

const reviewSchema= mongoose.Schema({
    review:{
        type:String,
        required:true
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    ProductId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Product"
    }
},{timestamps:true});

const Review=mongoose.model("Review",reviewSchema);

module.exports=Review;