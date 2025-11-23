import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import jwt from "jsonwebtoken";
import { register, login, refresh, logout } from "../controllers/authController.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// 🔐 Verify current token validity
router.get("/verify-session", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ valid: false, reason: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // You can add logic here to check a blacklist or revoked list if you store one
    res.json({ valid: true, userId: decoded.id });
    //res.json({ valid: true, exp: decoded.exp });
  } catch (err) {
    res.status(401).json({ valid: false, reason: "Token invalid or expired" });
  }
});

// Helper to create tokens
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
}

// 🔐 Login endpoint
router.post("/login", async (req, res) => {
  // ... validate credentials etc.
  const user = { _id: "123", username: req.body.username }; // example
  const { accessToken, refreshToken } = generateTokens(user);

  // send refresh token as secure, HTTP-only cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ token: accessToken, username: user.username });
});

// 🔄 Refresh access token
router.post("/refresh", (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid refresh token" });

    const newAccessToken = jwt.sign(
      { id: decoded.id },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );
    res.json({ token: newAccessToken });
  });
});

router.post("/register", register);
//router.post("/login", loginUser);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
//router.get("/odoo-product-card-generator", requireAuth, (req, res) => {
router.get("/", requireAuth, (req, res) => {
  res.json({ message: `Hello User ID: ${req.user.id}` });
});

export default router;
