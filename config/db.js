import mongoose from "mongoose";

const connectdb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Database has been connected");
    } catch (error) {
        console.error("Error while connecting database", error);
    }
};

export default connectdb;