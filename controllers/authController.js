// controllers/authController.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Product from "../models/Product.js";
import RefreshToken from "../models/RefreshToken.js";
import dotenv from "dotenv";
import crypto from "crypto";
import nodemailer from 'nodemailer';
//import mongoose from "mongoose";

dotenv.config();

/* configure these environment variables in production */
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/odoocarddb"
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES_IN || "10m";
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
const PRODUCT_COLLECTION_NAME = 'products';

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error("FATAL: JWT_SECRET or JWT_REFRESH_SECRET not set in .env");
  process.exit(1);
}

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, username: user.username },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
  console.log('accessToken is',accessToken);
  const refreshToken = jwt.sign(
    { id: user._id },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
  console.log('refreshToken is',refreshToken);
  return { accessToken, refreshToken };
};

const rotateRefreshToken = async (userId, oldToken, newToken) => {
  if (oldToken) {
    await RefreshToken.findOneAndUpdate({ token: oldToken }, { revoked: true }).catch(() => {});
  }

  const decoded = jwt.decode(newToken);
  const expiresAt = new Date(decoded.exp * 1000);

  const doc = new RefreshToken({
    token: newToken,
    userId,
    expiresAt,
    revoked: false,
  });
  await doc.save();
};

/* ----------------- Register ----------------- */
//app.post("/api/auth/register", async (req, res) => {
export const register = async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Missing" });
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Email already registered" });

    user = new User({ email, username });
    await user.setPassword(password);
    await user.save();
    
    return res.status(201).json({ message: "User registered" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

/*export const register = async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password) return res.status(400).json({ message: "username and password required" });

    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: "Username already taken" });

    const user = new User({ username, password, email });
    await user.save();

    res.status(201).json({ message: "User registered" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};*/

/* ----------------- Login ----------------- */
export const login = async (req, res) => {
  try {
    //const { username, password } = req.body;
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email and password required" });

    //const user = await User.findOne({ username });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await user.validatePassword(password);

    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    //const { accessToken, refreshToken } = generateTokens(user);
    //await rotateRefreshToken(user._id, null, refreshToken);
//console.log("Login Authorization header:", req.headers.authorization);
    // set cookie - secure:true for production (HTTPS). Use secure: false for local HTTP testing.
    /*res.cookie("refreshToken", refreshToken, {
      path: "/", // ⬅️ ensures cookie sent for all routes
      httpOnly: true,
      secure: false, //process.env.NODE_ENV === "production",
      //sameSite: "strict",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    //res.json({ token: accessToken, username: user.username });

    // return both tokens in JSON
    /*res.json({
      token: accessToken,
      refreshToken,
      username: user.username,
      message: "Login successful",
    });*/

    res.status(200).json({
      username: user.username,
      message: "Login successful",
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------- Searched Products ----------------- */
export const products = async (req, res) => {
  try {

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const minQty = Number(req.query.minQty ?? 0);
    const maxQty = Number(req.query.maxQty ?? 999999);
    const minLength = 3;

    if (search.trim().length < minLength) {
      return res.json([]);
    }

    const normalize = (str) =>
      (str || "").toLowerCase().trim();

    const words = normalize(search).split(/\s+/).filter(Boolean);

    if (!words.length) {
      return res.json([]);
    }

    // MAIN Compass-style AND logic
    const regexQuery = {
      $and: [
        ...words.map((w) => ({
          name: { $regex: w, $options: "i" }
        })),
        // ADD quantity filter here
        {
         qty_available: { $gte: minQty, $lte: maxQty }
        }
        //{ qty_available: { $gte: minQty } },
        //{ qty_available: { $lte: maxQty } }
      ]
    };

    //const products = await Product.find(regexQuery).limit(200);

    const products = await Product
      .find(regexQuery)
      .skip(skip)
      .limit(limit);

    res.json(products);

  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/*export const products = async (req, res) => {
  try {
    const search = req.query.search || "";
    const minQty = Number(req.query.minQty ?? 0);
    const maxQty = Number(req.query.maxQty ?? 999999);
    const minLength = 3;

    if (search.trim().length < minLength) {
      return res.json([]);
    }

    const normalize = (str) =>
      (str || "").toLowerCase().trim();

    const words = normalize(search).split(/\s+/).filter(Boolean);

    if (!words.length) {
      return res.json([]);
    }

    // MAIN Compass-style AND logic
    const regexQuery = {
      $and: [
        ...words.map((w) => ({
          name: { $regex: w, $options: "i" }
        })),
        // ADD quantity filter here
        { qty_available: { $gte: minQty } },
        { qty_available: { $lte: maxQty } }
      ]
    };

    const products = await Product.find(regexQuery).limit(200);
    res.json(products);

  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const products = async (req, res) => {
  try {
    const search = req.query.search || "";
    const minQty = Number(req.query.minQty ?? 0);
    const maxQty = Number(req.query.maxQty ?? 999999);
    const minLength = 3;

    if (!search || search.trim().length < minLength) {
      return res.json([]);
    }

    // Normalize input ("hOOdiE- bLue" → "hoodie blue")
    const normalize = (str) =>
      (str || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const normalizedSearch = normalize(search);
    const words = normalizedSearch.split(/\s+/).filter(Boolean);

    if (words.length === 0) return res.json([]);

    // Escape regex for MongoDB
    const escapeRegex = (s) =>
      s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Step 1 — BROAD MongoDB match (fast)
    const mongoQuery = {
      $or: words.map((w) => ({
        name: { $regex: escapeRegex(w), $options: "i" }
      }))
    };

    // Get broad candidates first
    const candidates = await Product.find(mongoQuery).limit(200);

    // Step 2 — DEEP fuzzy subsequence matching IN NODE
    const isSubsequence = (small, big) => {
      let i = 0, j = 0;
      while (i < small.length && j < big.length) {
        if (small[i] === big[j]) i++;
        j++;
      }
      return i === small.length;
    };

    const normalizeName = (str) =>
      (str || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, ""); // REMOVE all separators

    // filter by subsequence AND quantity range
    const results = candidates.filter((p) => {
      const qty = p.qty_available ?? 0;
      if (qty < minQty || qty > maxQty) return false;

      const norm = normalizeName(p.name);
      return words.every((w) => isSubsequence(w, norm));
    });

    return res.json(results.slice(0, 50));

  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};*/

        /*if (search) {
            const trimmedSearch = search.trim();

            // Check for exact barcode match first
            if (trimmedSearch.length === 13 || trimmedSearch.length === 12) {
                // Barcode search is typically exact
                query.barcode = trimmedSearch;
            } 

            // If not an exact barcode match, proceed with 3+ character logic
            if (trimmedSearch.length >= minLength) {

                // Use $or for multi-field search logic: SKU exact OR Name/Description fuzzy
                query['$or'] = [
                    // SKU (default_code) Exact or Prefix Match (using regex start anchor)
                    { default_code: { $regex: new RegExp('^' + trimmedSearch, 'i') } },

                    // Name Fuzzy Match (case-insensitive regular expression)
                    // MongoDB will scan the whole 'name' field, which is why we limit results.
                    { name: { $regex: trimmedSearch, $options: 'i' } }
                ];
            } else if (trimmedSearch.length > 0) {
                // If less than 3 characters and not an exact barcode match, return empty to respect the frontend rule
                return res.json([]);
            }
        }

        // --- Core Fix ---
        // Fetch products based on the constructed query (searches across all 2795 records)
        // and THEN limit the resulting subset for the client.
        const products = await Product.find(query).limit(50); 
        res.json(products);

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};*/


// ✅ Controller function
export const updateProdDetails = async (req, res) => {
  try {
    //const { list_price, qty_available, product_id } = req.query;
    const { list_price, qty_available, product_id } = req.body;
    //image_base64
    if (!product_id) {
      return res.status(400).json({ message: "Missing product_id parameter" });
    }

    // Convert query params to correct datatypes
    const parsedId = parseInt(product_id, 10);
    const parsedPrice = parseFloat(list_price);
    const parsedQty = parseFloat(qty_available);

    // Build update object dynamically
    const updateFields = {};
    if (!isNaN(parsedPrice)) updateFields.list_price = parsedPrice;
    if (!isNaN(parsedQty)) updateFields.qty_available = parsedQty;
    //if (image_base64) updateFields.image_base64 = image_base64;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    // Perform the update
    const result = await Product.updateOne({ id: parsedId }, { $set: updateFields });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: `No product found with id ${parsedId}` });
    }

    res.json({
      message: "Product updated successfully",
      updated_id: parsedId,
      updated_fields: updateFields,
      mongo_result: result
    });

  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/* ----------------- Refresh (rotation) ----------------- */
export const refresh = async (req, res) => {
  try {
    //const oldToken = req.cookies.refreshToken;
    const { refreshToken: oldToken } = req.body;
    //if (!oldToken) return res.status(401).json({ message: "No refresh token" });
    if (!oldToken) return res.status(401).json({ message: "Missing refresh token" });

    const stored = await RefreshToken.findOne({ token: oldToken });
    if (!stored || stored.revoked) {
      return res.status(403).json({ message: "Refresh token revoked or invalid" });
    }

    // verify signature & expiry
    let decoded;
    try {
      decoded = jwt.verify(oldToken, JWT_REFRESH_SECRET);
    } catch (err) {
      // mark token revoked for safety
      await RefreshToken.findOneAndUpdate({ token: oldToken }, { revoked: true }).catch(() => {});
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // issue new tokens and rotate
    /*const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    await rotateRefreshToken(user._id, oldToken, newRefreshToken);
    console.log('Refresh accessToken is',accessToken);*/

    // replace cookie
    /*res.cookie("refreshToken", newRefreshToken, {
      path: "/", // ⬅️ ensures cookie sent for all routes
      httpOnly: true,
      secure: false, //process.env.NODE_ENV === "production",
      //sameSite: "strict",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });*/

    // return new access + refresh tokens
    res.json({ token: accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------- Logout ----------------- */
export const logout = async (req, res) => {
  try {
    /*const token = req.cookies.refreshToken;
    if (token) {
      await RefreshToken.findOneAndUpdate({ token }, { revoked: true }).catch(() => {});
      res.clearCookie("refreshToken");
    }
    console.log('Logout accessToken is',token);*/
    res.json({ message: "Logged out" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------- Verify session ----------------- */
export const verifySession = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.json({ valid: false });

    const token = authHeader.split(" ")[1];
    console.log('Verify token is ',token);
    if (!token) return res.json({ valid: false });

    // verify access token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('Verify decoded token is ',decoded);
      console.log('Verify decoded username is ',decoded.username);
      // optionally: check something in DB if required
      return res.json({ valid: true, userId: decoded.id, username: decoded.username });
    } catch (err) {
      // invalid/expired token -> not valid
      return res.json({ valid: false });
    }
  } catch (err) {
    console.error("verifySession error:", err);
    // Always return JSON (don't throw) so client can handle gracefully
    return res.json({ valid: false });
  }
};

/**
 * Generates a cryptographically secure, 6-digit numeric string.
 * This is a reliable alternative to crypto.randomInt() for older Node.js versions.
 * * The range is 100000 to 999999 (inclusive).
 * @returns {string} The 6-digit code.
 */
function generateSecure6DigitCode() {
    // 1. Define the range: [100000, 999999]
    const min = 100000;
    const max = 999999;
    const range = max - min + 1; // 900000 possible values

    // 2. Calculate the number of bytes needed.
    // We need enough random bits to cover the range.
    // 2^n >= range -> n = ceil(log2(range))
    const byteLength = Math.ceil(Math.log2(range) / 8);

    // 3. Generate random bytes
    let randomBytes = crypto.randomBytes(byteLength);
    let randomNumber = 0;

    // 4. Convert bytes to a number and use the modulo operator
    // This technique safely converts the random bytes to a large integer
    for (let i = 0; i < byteLength; i++) {
        randomNumber = (randomNumber * 256) + randomBytes[i];
    }
    
    // 5. Map the large random number to the desired range [min, max]
    // The addition of 'min' shifts the result to the correct starting point.
    const code = (randomNumber % range) + min;

    // 6. Convert to string and ensure 6 digits (should always be 6, but good practice)
    return code.toString().padStart(6, '0');
}

// --- Mongoose Schema and Model ---
// Define the schema based on typical Odoo product fields saved by the Python script
/*const ProductSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId, // Or whatever unique ID Odoo uses, if not standard ObjectId
    name: { type: String, required: true },
    default_code: { type: String, index: true }, // SKU
    barcode: { type: String, index: true },
    list_price: Number,
    qty_available: Number, // Preferred stock field
    free_qty: Number, // Fallback stock field
    description_sale: String,
    image_url: String // Add other fields you need here, like image_url
}, { collection: PRODUCT_COLLECTION_NAME });*/

// --- MongoDB Connection ---
/*mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB successfully connected.'))
  .catch(err => console.error('MongoDB connection error:', err))*/

// Best practice: Add indexes to fields used in search queries for performance.
// Ensure these indexes are created in your MongoDB instance for maximum speed.
// Example: ProductSchema.index({ name: 'text', default_code: 1, barcode: 1 });
//const Product = mongoose.model('Product', ProductSchema);

// --- API Endpoint for Products ---
//app.get('/api/products', async (req, res) => {
/*export const products = async (req, res) => {

    try {
        const search = req.query.search;
        const query = {};
        const minLength = 3; // The minimum characters required for a fuzzy search

        if (search) {
            const trimmedSearch = search.trim();

            // Check for exact barcode match first
            if (trimmedSearch.length === 13 || trimmedSearch.length === 12) {
                // Barcode search is typically exact
                query.barcode = trimmedSearch;
            } 

            // If not an exact barcode match, proceed with 3+ character logic
            if (trimmedSearch.length >= minLength) {

                // Use $or for multi-field search logic: SKU exact OR Name/Description fuzzy
                query['$or'] = [
                    // SKU (default_code) Exact or Prefix Match (using regex start anchor)
                    { default_code: { $regex: new RegExp('^' + trimmedSearch, 'i') } },

                    // Name Fuzzy Match (case-insensitive regular expression)
                    // MongoDB will scan the whole 'name' field, which is why we limit results.
                    { name: { $regex: trimmedSearch, $options: 'i' } }
                ];
            } else if (trimmedSearch.length > 0) {
                // If less than 3 characters and not an exact barcode match, return empty to respect the frontend rule
                return res.json([]);
            }
        }

        // --- Core Fix ---
        // Fetch products based on the constructed query (searches across all 2795 records)
        // and THEN limit the resulting subset for the client.
        const products = await Product.find(query).limit(50); 
        res.json(products);

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};*/


/* ----------------- Request Reset ----------------- */
export const requestReset = async (req, res) => {

  try {

// configure these environment variables in production
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/odoocarddb"
const SMTP_HOST = process.env.SMTP_HOST || smtp.gmail.com
const SMTP_PORT = process.env.SMTP_PORT || 587
const SMTP_USER = process.env.SMTP_USER || "varun.puchnanda@gmail.com"
const SMTP_PASS = process.env.SMTP_PASS || qmkdriszpvpcvwhs

// nodemailer transporter
//secure: SMTP_PORT === 465,
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Missing email" });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email not found" });

    // generate numeric 6-digit code or alphanumeric
    const code = crypto.randomInt(100000, 999999).toString();
    //const code = generateSecure6DigitCode();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 20); // 20 minutes

    user.resetCode = { code, expiresAt };
    await user.save();

    // send mail
    const mailOptions = {
      //from: `"Your App" <${SMTP_USER}>`,
      from: `xyz@gmail.com`, // <${SMTP_USER}>`,
      to: user.email,
      subject: "Your password reset code",
      text: `Your activation code is: ${code} (valid for 20 minutes)`,
      html: `<p>Your activation code is: <strong>${code}</strong> (valid for 20 minutes)</p>`
    };

    await transporter.sendMail(mailOptions);

    return res.json({ message: "Activation code sent" });
  } catch (err) {
    console.error("request-reset error", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ----------------- Reset Password ----------------- */
//app.post("/api/auth/reset-password", async (req, res) => {
export const resetPassword = async (req, res) => {

  try {

    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user || !user.resetCode || !user.resetCode.code) {
      return res.status(400).json({ message: "Invalid code or email" });
    }

    if (user.resetCode.code !== code) {
      return res.status(400).json({ message: "Invalid activation code" });
    }

    if (user.resetCode.expiresAt < new Date()) {
      return res.status(400).json({ message: "Activation code expired" });
    }

    await user.setPassword(newPassword);
    user.resetCode = undefined;
    await user.save();

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("reset-password error", err);
    res.status(500).json({ message: "Server error" });
  }
};

