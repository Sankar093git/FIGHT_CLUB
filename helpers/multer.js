import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Using process.cwd() to ensure we reference the root directory
    let uploadPath = path.join(process.cwd(), "public/uploads/others");

    // Dynamic folder selection based on the route
    if (req.originalUrl.includes("product")) {
      uploadPath = path.join(process.cwd(), "public/uploads/re-image");
    } else if (req.originalUrl.includes("profile")) {
      uploadPath = path.join(process.cwd(), "public/uploads/profiles");
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Sanitizing the original name to avoid potential path issues
    const uniqueSuffix = Date.now() + "-" + file.originalname.replace(/\s+/g, '-');
    cb(null, uniqueSuffix);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Optional: 5MB limit
});

export default upload;