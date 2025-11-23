// routes/authRoutes.js
import express from "express";
//import { register, login, refresh, logout, verifySession, requestReset, products } from "../controllers/authController.js";
import { register, login, logout, requestReset, resetPassword, updateProdDetails, products } from "../controllers/authController.js";
const router = express.Router();

router.post("/register", register);
router.get("/products", products);
//router.post("/refresh", refresh);
router.post("/login", login);
router.post("/logout", logout);
//router.get("/verify-session", verifySession);
router.post("/request-reset", requestReset);
router.post("/reset-password", resetPassword);
// Existing routes (e.g., login, reset password)
router.get("/updateProdDetails", updateProdDetails); // ✅ Added route
router.post("/updateProdDetails", updateProdDetails); // ✅ Added route

export default router;
