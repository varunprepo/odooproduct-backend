import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  username: { type: String },
  //username: { type: String, required: false, unique: true },
  email:    { type: String, required: true },
  //passwordHash: { type: String, required: true },
  passwordHash: { type: String },
  resetCode: {
    code: String,
    expiresAt: Date,
  },
}, { timestamps: true });

// helper to set password
userSchema.methods.setPassword = async function(password) {
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
};

export default mongoose.model("User", userSchema);
