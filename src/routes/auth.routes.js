import express from "express";
import { registerAdmin, loginAdmin, getMe, updatePreferences, changePassword, updateProfile } from "../controllers/auth.controller.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/login", loginAdmin);
router.post("/register", registerAdmin);
router.get("/me", verifyToken, getMe);
router.put("/preferences", verifyToken, updatePreferences);
router.put("/profile", verifyToken, updateProfile);
router.put("/change-password", verifyToken, changePassword);

export default router;


//test