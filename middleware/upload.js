const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'testing', // optional: folder in your Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
  },
});

const parser = multer({ storage: storage });

module.exports = parser;
