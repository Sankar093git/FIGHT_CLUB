const mongoose=require("mongoose");

const variantSchema= new mongoose.Schema({
    size:{
        type:String,
        required:true
    },
    color:{
        type:String,
        required:true
    },
    stock:{
        type:Number,
        default:0
    },
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    }

});

const Variant=mongoose.model("Variant",variantSchema);

module.exposrts=Variant;