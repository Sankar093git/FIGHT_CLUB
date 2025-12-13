const mongoose=require("mongoose");

const brandSchema= new mongoose.Schema({
    brandName:{
        type:String,
        required:true
    },
    logo:{
        type:String,
        required:true
    },
    isUnlisted:{
        type:Boolean,
        default:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    }

},{timestamps:true});

const Brand= mongoose.model("Brand",brandSchema);

module.exports=Brand;