import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    productImage: {
        type: Array,
        required: true
    },
    offer: {
        type: Number,
        default: 0
    },
    productDiscount: {
        type: Number,
        default: 0
    },
    categoryDiscount: {
        type: Number,
        default: 0
    },
    ogSalesPrice: {
        type: Number,
        required: true
    },
    salesPrice: {
        type: Number,
        required: true
    },
    regularPrice: {
        type: Number,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Category"
    },
    quantity: {
        type: Number,
        default: 0
    },
    color: {
        type: String,
    },
    variants: [
        {
            size: {
                type: String,
                required: true,
                trim: true
            },
            stock: {
                type: Number,
                default: 0,
                min: 0
            }
        }
    ],
    productOffer: {
        type: Number,
        default: 0
    },
    reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review"
        }
    ],
    available: {
        type: Boolean,
        default: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    }
}, { timestamps: true }); // Added timestamps for better data tracking

const Product = mongoose.model("Product", productSchema);

export default Product;