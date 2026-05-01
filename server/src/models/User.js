const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name:              { type: String, required: true, trim: true },
    email:             { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:      { type: String },
    googleId:          { type: String, unique: true, sparse: true },
    preferredCurrency: { type: String, default: "INR", uppercase: true, minlength: 3, maxlength: 3 },
    avatarUrl:         { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
