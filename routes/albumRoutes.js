const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');

// Routes
// Public routes
router.get('/', albumController.getAlbums);
router.get('/featured', albumController.getFeaturedAlbums); // Get featured albums
router.get('/:id', albumController.getAlbumById);

// Admin routes (API key required)
router.post('/', albumController.createAlbum);
router.put('/:id', albumController.updateAlbum);
router.delete('/:id', albumController.deleteAlbum);

// Export the router
module.exports = router;
