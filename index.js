import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Config & Database

import connectDB from "./config/db.js";
import passport from "./config/passport.js";

// Routes
import userRouter from "./routers/user/userRoutes.js";
import adminRouter from "./routers/admin/adminRoutes.js";

// Middlewares & Services
import navbarContext from "./middlewares/navbarContext.js";
import errorHandler from "./middlewares/errorHandling.js";
import { initCleanupJob } from "./services/orderCleanup.js";

// Emulate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Database Connection
connectDB();

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View Engine Setup
app.set("view engine", "ejs");
app.set("views", [
    path.join(__dirname, "views/user"),
    path.join(__dirname, "views/admin")
]);

// Static Files
app.use(express.static(path.join(__dirname, "public")));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
    }),
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000 // 72 hours
    }
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Cache Control Middleware
app.use((req, res, next) => {
    res.set("cache-control", "no-store");
    next();
});

// Initialize Cron Jobs
initCleanupJob();

// Logging
const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'),
    { flags: 'a' }
);
app.use(morgan("dev"));
app.use(morgan('combined', { stream: accessLogStream }));

// Routes & Context
app.use("/", navbarContext);
app.use("/", userRouter);
app.use("/admin", adminRouter);

// Error Handling (Must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running at PORT: ${PORT}`);
});