const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true, maxlength: 1000 },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 },
  thumbnailUrl: { type: String, required: true },
  CompressedImages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],
  tags: [{ type: String, maxlength: 100 }],
  displayFlags: {
    isFeatured: { type: Boolean, default: false },
    isLatest: { type: Boolean, default: false },
    isOnSale: { type: Boolean, default: false }
  },

  // 👇 New fields
  type: {
    type: String,
    enum: ['digital', 'print'],
    required: true
  },

  digitalDownload: {
    fileUrl: { type: String },           // e.g., S3 or Cloudinary link
    fileSize: { type: Number },          // optional, in bytes
    format: { type: String },            // e.g., 'jpg', 'pdf', 'zip'
  },

  printOptions: {
    sizes: [{ type: String }],           // e.g., ['8x10', '12x18']
    paperTypes: [{ type: String }],      // e.g., ['Matte', 'Glossy']
    frameOptions: [{ type: String }],    // e.g., ['None', 'Black Frame']
    shippingDetails: { type: String },   // Optional text
  },

}, { timestamps: true });
