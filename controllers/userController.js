const User = require('../models/User');
const bcrypt = require('bcrypt');
const validator = require('validator');

// GET /me
exports.getCurrentUser = async (req, res) => {
  try {
    console.log('Fetching current user for ID:', req.user.id);
    const user = await User.findById(req.user.id).select('-password');
    console.log('Current user:', user); 
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /me/profilePicture
exports.updateProfilePicture = async (req, res) => {
  const { profilePicture } = req.body;
  if (!validator.isURL(profilePicture || ''))
    return res.status(400).json({ message: 'Invalid URL' });

  try {
    const user = await User.findByIdAndUpdate(req.user.id, { profilePicture }, { new: true });
    res.json({ message: 'Profile picture updated', profilePicture: user.profilePicture });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /me/firstname
exports.updateFirstName = async (req, res) => {
  const { firstName } = req.body;
  if (!firstName || firstName.length > 50)
    return res.status(400).json({ message: 'Invalid first name' });

  try {
    const user = await User.findByIdAndUpdate(req.user.id, { firstName }, { new: true });
    res.json({ message: 'First name updated', firstName: user.firstName });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /me/lastname
exports.updateLastName = async (req, res) => {
  const { lastName } = req.body;
  if (!lastName || lastName.length > 50)
    return res.status(400).json({ message: 'Invalid last name' });

  try {
    const user = await User.findByIdAndUpdate(req.user.id, { lastName }, { new: true });
    res.json({ message: 'Last name updated', lastName: user.lastName });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /me/username
exports.updateUsername = async (req, res) => {
  const { username } = req.body;
  if (!username || username.length > 50)
    return res.status(400).json({ message: 'Invalid username' });

  try {
    const existing = await User.findOne({ username });
    if (existing && existing._id.toString() !== req.user.id)
      return res.status(400).json({ message: 'Username already taken' });

    const user = await User.findByIdAndUpdate(req.user.id, { username }, { new: true });
    res.json({ message: 'Username updated', username: user.username });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /me/password
exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ message: 'New password must be at least 6 characters' });

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch)
      return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /me/favorites/:id?type=photo|product
exports.getFavorites = async (req, res) => {
  const { id } = req.params;
  const { type } = req.query;

  if (!['photo', 'product'].includes(type))
    return res.status(400).json({ message: 'Invalid type' });

  try {
    const user = await User.findById(req.user.id).populate(
      type === 'photo' ? 'favoritePhotos' : 'favoriteProducts'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (id) {
      const isFavorited = user[
        type === 'photo' ? 'favoritePhotos' : 'favoriteProducts'
      ].some((item) => item._id.toString() === id);
      return res.json({ isFavorited });
    }

    const favorites = type === 'photo' ? user.favoritePhotos : user.favoriteProducts;
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /me/favorites
exports.updateFavorites = async (req, res) => {
  const { id, type } = req.body;

  if (!id || !['photo', 'product'].includes(type))
    return res.status(400).json({ message: 'Invalid request body' });

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const listKey = type === 'photo' ? 'favoritePhotos' : 'favoriteProducts';

    const alreadyFavorited = user[listKey].includes(id);

    if (alreadyFavorited) {
      return res.status(400).json({ message: 'Already favorited' });
    }

    user[listKey].push(id);
    await user.save();

    res.json({ message: 'Added to favorites', id });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /me/favorites?type=photo|product&limit=10&page=1
exports.getFavorites = async (req, res) => {
  const { id } = req.params;
  const { type, limit = 10, page = 1 } = req.query;

  if (!['photo', 'product'].includes(type))
    return res.status(400).json({ message: 'Invalid type' });

  try {
    const user = await User.findById(req.user.id).populate(
      type === 'photo' ? 'favoritePhotos' : 'favoriteProducts'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    // If checking specific item (when ID is provided)
    if (id) {
      const isFavorited = user[
        type === 'photo' ? 'favoritePhotos' : 'favoriteProducts'
      ].some((item) => item._id.toString() === id);
      return res.json({ isFavorited });
    }

    // Get all favorites with pagination
    const favorites = type === 'photo' ? user.favoritePhotos : user.favoriteProducts;
    
    // Apply pagination
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skip = (pageNum - 1) * limitNum;
    
    const paginatedFavorites = favorites.slice(skip, skip + limitNum);
    const totalFavorites = favorites.length;
    const totalPages = Math.ceil(totalFavorites / limitNum);

    res.json({
      favorites: paginatedFavorites,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalFavorites,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (err) {
    console.error('Get favorites error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /me/favorites/:id?type=photo|product
exports.removeFavorite = async (req, res) => {
  const { id } = req.params;
  const { type } = req.query;

  if (!['photo', 'product'].includes(type))
    return res.status(400).json({ message: 'Invalid type' });

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const listKey = type === 'photo' ? 'favoritePhotos' : 'favoriteProducts';
    user[listKey] = user[listKey].filter((favId) => favId.toString() !== id);
    await user.save();

    res.json({ message: 'Removed from favorites', id });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
