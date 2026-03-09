import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    isListed: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false // Updated from 0 to false for type consistency
    },
    categoryOffer: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Category = mongoose.model("Category", categorySchema);

export default Category;