const Product = require('../models/Product');
const validator = require('validator');
const mongoose = require('mongoose');

// Helper to validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().populate('CompressedImages');
    res.json(products);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /products/:id
exports.getProductById = async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid product ID' });

  try {
    const product = await Product.findById(id).populate('CompressedImages');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /products
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      stock,
      thumbnailUrl,
      CompressedImages,
      tags,
      displayFlags,
      type,
      digitalDownload,
      printOptions,
    } = req.body;

    if (!name || !description || !price || !category || !thumbnailUrl || !type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['digital', 'print'].includes(type)) {
      return res.status(400).json({ message: 'Invalid product type' });
    }

    if (!validator.isURL(thumbnailUrl)) {
      return res.status(400).json({ message: 'Invalid thumbnail URL' });
    }

    if (type === 'digital' && (!digitalDownload || !validator.isURL(digitalDownload.fileUrl))) {
      return res.status(400).json({ message: 'Invalid or missing digital download URL' });
    }

    const newProduct = new Product({
      name,
      description,
      price,
      category,
      stock,
      thumbnailUrl,
      CompressedImages,
      tags,
      displayFlags,
      type,
      digitalDownload,
      printOptions,
    });

    await newProduct.save();
    res.status(201).json({ message: 'Product created', product: newProduct });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /products/:id
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid product ID' });

  try {
    const updates = req.body;

    if (updates.thumbnailUrl && !validator.isURL(updates.thumbnailUrl)) {
      return res.status(400).json({ message: 'Invalid thumbnail URL' });
    }

    if (updates.digitalDownload?.fileUrl && !validator.isURL(updates.digitalDownload.fileUrl)) {
      return res.status(400).json({ message: 'Invalid digital download URL' });
    }

    const product = await Product.findByIdAndUpdate(id, updates, { new: true }).populate('CompressedImages');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    res.json({ message: 'Product updated', product });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /products/:id
exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid product ID' });

  try {
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Product not found' });

    res.json({ message: 'Product deleted' });

  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /products/category/:category
exports.getProductsByCategory = async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.category });
    res.json(products);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /products/search?q=term
exports.searchProducts = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ message: 'Invalid search query' });

  try {
    const regex = new RegExp(q, 'i');
    const results = await Product.find({
      $or: [
        { name: regex },
        { description: regex },
        { tags: regex },
        { category: regex }
      ]
    });
    res.json(results);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /products/featured
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ 'displayFlags.isFeatured': true });
    res.json(products);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /products/latest
exports.getLatestProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).limit(10);
    res.json(products);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /products/tags/:tag
exports.getProductsByTag = async (req, res) => {
  try {
    const products = await Product.find({ tags: req.params.tag });
    res.json(products);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
