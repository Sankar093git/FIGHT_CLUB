const mongoose=require("mongoose");

const categorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    isListed:{
        type:Boolean,
        default:true
    },
    isDeleted:{
        type:Boolean,
        default:0
    },
    categoryOffer:{
        type:Number,
        default:0
    }
},{timestamps:true})

const Category= mongoose.model("Category",categorySchema);

module.exports=Category;