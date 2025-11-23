// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import dotenv from "dotenv";
dotenv.config();

/* -----------------------------------------------------
   🔐  Helpers
----------------------------------------------------- */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "10m" } // short-lived access token
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" } // long-lived refresh token
  );

  return { accessToken, refreshToken };
};

const rotateRefreshToken = async (userId, oldToken, newToken) => {
  if (oldToken) {
    await RefreshToken.findOneAndUpdate(
      { token: oldToken },
      { revoked: true },
      { new: true }
    );
  }

  const decoded = jwt.decode(newToken);
  const expiresAt = new Date(decoded.exp * 1000);

  const newRefresh = new RefreshToken({
    token: newToken,
    userId,
    expiresAt,
    revoked: false,
  });

  await newRefresh.save();
};

/* -----------------------------------------------------
   🧾  REGISTER
----------------------------------------------------- */
export const register = async (req, res) => {
  try {
    const { username, password } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: "Username already taken" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/* -----------------------------------------------------
   🔑  LOGIN
----------------------------------------------------- */
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const { accessToken, refreshToken } = generateTokens(user);
    await rotateRefreshToken(user._id, null, refreshToken);

    // Set refresh token in secure HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true, // set to false for local testing if not using HTTPS
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      token: accessToken,
      username: user.username,
      message: "Login successful",
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/* -----------------------------------------------------
   🔄  REFRESH (with rotation)
----------------------------------------------------- */
export const refresh = async (req, res) => {
  const oldToken = req.cookies.refreshToken;
  if (!oldToken)
    return res.status(401).json({ message: "No refresh token provided" });

  try {
    const storedToken = await RefreshToken.findOne({ token: oldToken });
    if (!storedToken || storedToken.revoked)
      return res.status(403).json({ message: "Refresh token revoked or invalid" });

    const decoded = jwt.verify(oldToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    await rotateRefreshToken(user._id, oldToken, newRefreshToken);

    // Replace the cookie with the new refresh token
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token: accessToken });
  } catch (err) {
    console.error("Refresh Error:", err);
    await RefreshToken.findOneAndUpdate(
      { token: oldToken },
      { revoked: true }
    );
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

/* -----------------------------------------------------
   🚪  LOGOUT
----------------------------------------------------- */
export const logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      await RefreshToken.findOneAndUpdate({ token }, { revoked: true });
      res.clearCookie("refreshToken");
    }
    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
