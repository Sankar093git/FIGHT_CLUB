
import STATUS_CODES from "../../utils/statusCode.js";

export const pageNotFound = async (req, res) => {
    try {
        res.status(STATUS_CODES.NOT_FOUND).render("page-not-found");
    } catch (error) {
        console.error("Error rendering 404 page:", error);
        // Fallback in case the EJS template fails to load
        res.status(STATUS_CODES.NOT_FOUND).send("Page Not Found");
    }
};