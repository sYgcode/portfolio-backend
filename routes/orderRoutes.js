const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

// Routes
router.get('/', auth(['admin']), orderController.getAllOrders);
router.get('/:id', auth(), orderController.getOrderById);
router.post('/', auth(), orderController.createOrder);
router.put('/:id', auth(['admin']), orderController.updateOrder);
router.delete('/:id', auth(['admin']), orderController.deleteOrder);
router.get('/user/:userId', auth(), orderController.getOrdersByUserId);
router.get('/status/:status', auth(['admin']), orderController.getOrdersByStatus);
router.put('/status/:id', auth(['admin']), orderController.updateOrderStatus);
router.get('/latest', auth(['admin']), orderController.getLatestOrders);
router.get('/search/:userId', auth(['admin']), orderController.searchOrders); // search by userId


module.exports = router;