const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middleware/auth');

// Routes
router.get('/', auth(), cartController.getCart);
router.put('/add', auth(), cartController.addToCart);
router.put('/remove', auth(), cartController.removeFromCart);

module.exports = router;