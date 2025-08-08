const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// GET /cart
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('products.product');
    if (!cart) return res.status(404).json({ message: 'Cart not found' });
    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /cart/add
exports.addToCart = async (req, res) => {
  const { productId, quantity = 1, type, selectedOptions } = req.body;
  if (!mongoose.Types.ObjectId.isValid(productId) || quantity < 1) {
    return res.status(400).json({ message: 'Invalid product ID or quantity' });
  }
  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const cart = await Cart.findOne({ user: req.user.id }) || await Cart.create({ user: req.user.id, products: [] });

    // Check if already in cart
    const entryIndex = cart.products.findIndex(item => item.product.equals(productId));
    if (entryIndex > -1) {
      cart.products[entryIndex].quantity += quantity;
      if (type) cart.products[entryIndex].type = type;
      if (selectedOptions) cart.products[entryIndex].selectedOptions = selectedOptions;
    } else {
      cart.products.push({
        product: productId,
        quantity,
        type: type || product.type,
        selectedOptions: selectedOptions || {}
      });
    }
    await cart.save();
    res.json({ message: 'Cart updated', cart });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /cart/remove
exports.removeFromCart = async (req, res) => {
  const { productId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: 'Invalid product ID' });
  }
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.products = cart.products.filter(item => !item.product.equals(productId));
    await cart.save();
    res.json({ message: 'Removed from cart', cart });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
