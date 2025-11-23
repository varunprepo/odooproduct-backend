import mongoose from "mongoose";
//import bcrypt from "bcryptjs";

/*const userSchema = new mongoose.Schema({
  username: { type: String },
  //username: { type: String, required: false, unique: true },
  email:    { type: String, required: true },
  //passwordHash: { type: String, required: true },
  passwordHash: { type: String },
  resetCode: {
    code: String,
    expiresAt: Date,
  },
}, { timestamps: true });*/

const PRODUCT_COLLECTION_NAME = 'products';

// Define schema and model (you can move this to models/Product.js)
const productSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId, // Or whatever unique ID Odoo uses, if not standard ObjectId
    name: { type: String, required: true },
    default_code: { type: String, index: true }, // SKU
    barcode: { type: String, index: true },
    list_price: Number,
    qty_available: Number, // Preferred stock field
    id: Number,
    free_qty: Number, // Fallback stock field
    description_sale: String,
    image_url: String // Add other fields you need here, like image_url
}, { collection: PRODUCT_COLLECTION_NAME });

// Best practice: Add indexes to fields used in search queries for performance.
// Ensure these indexes are created in your MongoDB instance for maximum speed.
// Example: ProductSchema.index({ name: 'text', default_code: 1, barcode: 1 });
//const Product = mongoose.model('Product', productSchema);

/*const productSchema = new mongoose.Schema({
  id: Number, // odoo_product_id
  list_price: Number,
  qty_available: Number,
  //image_base64: String
}, { collection: "products" });

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);*/

// helper to set password
/*userSchema.methods.setPassword = async function(password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

// helper to set password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.validatePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};*/

export default mongoose.model("Product", productSchema);
