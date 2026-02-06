const mongoose=require("mongoose");

const constantSchema= new mongoose.Schema({
    shipping:{
        type:Number,
        default:0
    },
    taxes:{
        type:Number,
        default:0
    }
},{timestamps:true})

const Constants= mongoose.model("Constants",constantSchema);

module.exports=Constants