const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200, unique: true },
  imageUrl: { type: String, required: true },
  publicId: { type: String }, // Add this for Cloudinary tracking
  description: { type: String, maxlength: 1000 },
  tags: [{ type: String, maxlength: 100 }],
  isFeatured: { type: Boolean, default: false },
  isHidden: { type: Boolean, default: false },
  metadata: {
    width: Number,
    height: Number,
    originalWidth: Number,
    originalHeight: Number,
    originalSizeKB: Number,
    format: String,
    location: String,
    photographer: String,
    sizeKB: Number,
    dateTaken: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Photo', photoSchema);
