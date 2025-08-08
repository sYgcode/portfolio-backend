const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const photoController = require('../controllers/photoController');
const auth = require('../middleware/auth');

// Routes
// Public routes (no API key needed)
router.get('/', photoController.getPhotos);
router.get('/featured', photoController.getFeaturedPhotos); // Get featured photos
router.get('/:id', photoController.getPhotoById);

// Admin routes (API key required)
router.post('/', auth(['admin']), upload.single('image'), photoController.createPhoto);
router.put('/:id',auth(['admin']), upload.none(), photoController.updatePhoto);
router.delete('/:id',auth(['admin']), photoController.deletePhoto);
router.get('/:id/full',auth(['admin']), photoController.getFullResImage); // Full res access
module.exports = router;
