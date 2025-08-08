const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');


// Routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', auth(['admin']),productController.createProduct);
router.put('/:id', auth(['admin']), productController.updateProduct);
router.delete('/:id', auth(['admin']), productController.deleteProduct);
router.get('/category/:category', productController.getProductsByCategory);
router.get('/search', productController.searchProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/latest', productController.getLatestProducts);
router.get('/tags/:tag', productController.getProductsByTag);

module.exports = router;