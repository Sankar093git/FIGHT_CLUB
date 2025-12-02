const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Decide folder dynamically
    let uploadPath = path.join(__dirname, "../public/uploads/others");

    // You can decide based on route
    if (req.originalUrl.includes("product")) {
      uploadPath = path.join(__dirname, "../public/uploads/re-image");
    } else if (req.originalUrl.includes("profile")) {
      uploadPath = path.join(__dirname, "../public/uploads/profiles");
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

module.exports = upload;
