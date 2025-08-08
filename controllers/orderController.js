const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// GET /orders (admin-only)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('user products.product');
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /orders/:id (user or admin)
exports.getOrderById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid order ID' });

  try {
    const order = await Order.findById(id).populate('user products.product');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // If not admin, ensure user owns the order
    if (req.user.role !== 'admin' && order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /orders
exports.createOrder = async (req, res) => {
  const { shippingAddress } = req.body;
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('products.product');
    if (!cart || cart.products.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    let totalPrice = 0;
    const items = [];

    for (const item of cart.products) {
      const prod = item.product;
      if (!prod) continue;
      totalPrice += prod.price * item.quantity;
      items.push({
        product: prod._id,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions,
        downloadLink: prod.type === 'digital' ? prod.digitalDownload?.fileUrl : undefined
      });
    }

    const order = new Order({
      user: req.user.id,
      products: items,
      type: cart.products.every(i => i.product.type === 'digital') ? 'digital'
             : cart.products.every(i => i.product.type === 'print') ? 'print'
             : 'mixed',
      totalPrice,
      shippingAddress: shippingAddress || {},
      status: 'pending'
    });

    await order.save();

    // Optionally clear cart
    cart.products = [];
    await cart.save();

    res.status(201).json({ message: 'Order created', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /orders/:id (admin-only)
exports.updateOrder = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid order ID' });

  try {
    const order = await Order.findByIdAndUpdate(id, updates, { new: true }).populate('user products.product');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order updated', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /orders/:id (admin-only)
exports.deleteOrder = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid order ID' });

  try {
    const deleted = await Order.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /orders/user/:userId (user or admin)
exports.getOrdersByUserId = async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid user ID' });

  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const orders = await Order.find({ user: userId }).populate('products.product');
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /orders/status/:status (admin-only)
exports.getOrdersByStatus = async (req, res) => {
  const { status } = req.params;
  if (!['pending','paid','shipped','completed','cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  try {
    const orders = await Order.find({ status }).populate('user products.product');
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /orders/status/:id (admin-only)
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id) || !['pending','paid','shipped','completed','cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid data' });
  }
  try {
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true }).populate('user products.product');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order status updated', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /orders/latest (admin-only)
exports.getLatestOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(10).populate('user products.product');
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /orders/search/:userId (admin-only)
exports.searchOrders = async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid user ID' });

  try {
    const orders = await Order.find({ user: userId }).populate('user products.product');
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
