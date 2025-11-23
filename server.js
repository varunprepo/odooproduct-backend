import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import templateRoutes from "./routes/templateRoutes.js";
import http from 'http'; // http is needed to create the server object explicitly
import nodemailer from 'nodemailer';
import User from "./models/User.js";
import crypto from "crypto";

dotenv.config();

/* configure these environment variables in production
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/odoocarddb"
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER || "xyz@gmail.com";
const SMTP_PASS = process.env.SMTP_PASS || "123321";*/

const PRODUCT_COLLECTION_NAME = 'products'; 

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
// Enable CORS for the React frontend running on a different port/host
app.use(cors({
    origin: "http://localhost:5173", // React dev server origin
    credentials: true,               // Allow cookies or headers
  }));

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI).then(() => console.log('MongoDB successfully connected.'))
  .catch(err => console.error('MongoDB connection error:', err))

// nodemailer transporter
//secure: SMTP_PORT === 465,
/*const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});*/


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
}, { collection: PRODUCT_COLLECTION_NAME });

// Best practice: Add indexes to fields used in search queries for performance.
// Ensure these indexes are created in your MongoDB instance for maximum speed.
// Example: ProductSchema.index({ name: 'text', default_code: 1, barcode: 1 });
const Product = mongoose.model('Product', ProductSchema);*/

app.use("/api/auth", authRoutes);
app.use("/api/template", templateRoutes);

// --- API Endpoint for Products ---
/*app.get('/api/products', async (req, res) => {
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
});*/

// register
/*app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Missing" });
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Email already registered" });

    user = new User({ email, username });
    await user.setPassword(password);
    await user.save();

    return res.json({ message: "Registered" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});*/

// login (simple example, return JWT in production)
/*app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await user.validatePassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    // For demo, return basic tokens (in prod use real JWTs)
    res.json({ token: "FAKE-TOKEN", refreshToken: "FAKE-REFRESH", username: user.name || user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});*/


/* request reset: generate activation code, store in user.resetCode, email it 
app.post("/api/auth/request-reset", async (req, res) => {
  try {
// configure these environment variables in production
const MONGODB_URI = process.env.MONGODB_URI || mongodb://localhost:27017/odoocarddb
const SMTP_HOST = process.env.SMTP_HOST || smtp.gmail.com
const SMTP_PORT = process.env.SMTP_PORT || 587
const SMTP_USER = process.env.SMTP_USER || varun.puchnanda@gmail.com
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
    const expiresAt = new Date(Date.now() + 1000 * 60 * 20); // 20 minutes

    user.resetCode = { code, expiresAt };
    await user.save();

    // send mail
    const mailOptions = {
      //from: `"Your App" <${SMTP_USER}>`,
      from: `"varun.puchnanda@gmail.com" <${SMTP_USER}>`,
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
});*/

// reset-password: check code and expiry, set new password, clear code
/*app.post("/api/auth/reset-password", async (req, res) => {
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
});*/

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// ✅ Place 404 fallback LAST
app.use((req, res) => {
  console.log("404 Not Found:", req.originalUrl);
  res.status(404).json({ message: "Not found" });
});

app.listen(PORT, ()=> console.log(`Server started on ${PORT}`));
