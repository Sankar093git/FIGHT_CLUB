const express = require("express");
const session = require("express-session");
const connectDB = require("./config/db");
const app = express();
const userRouter = require("./routers/user/userRoutes");
const adminRouter = require("./routers/admin/adminRoutes");
const fs = require("fs");
const path = require("path");
const passport = require("./config/passport");
const navbarContext = require("./middlewares/navbarContext");
const errorHandler = require("./middlewares/errorHandling");
const { initCleanupJob } = require("./services/orderCleanup");
const MongoStore = require("connect-mongo").default;
const morgan = require("morgan");

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, "views/user"), path.join(__dirname, "views/admin")])
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI, // Your Atlas URI from .env
        collectionName: 'sessions',
    }),
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000
    }

}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.set("cache-control", "no-store");
    next();
})

initCleanupJob();

const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'),
    { flags: 'a' }
);

app.use(morgan("dev"));
app.use(morgan('combined', { stream: accessLogStream }));

app.use("/", navbarContext);
app.use("/", userRouter);
app.use("/admin", adminRouter);

app.use(errorHandler);




app.listen(process.env.PORT, () => {
    console.log(`Server is running at PORT: ${process.env.PORT} `)
})