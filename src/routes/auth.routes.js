import express from "express";
import { registerAdmin, loginAdmin, getMe } from "../controllers/auth.controller.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/login", loginAdmin);
router.post("/register", registerAdmin);
router.get("/me", verifyToken, getMe);

export default router;
