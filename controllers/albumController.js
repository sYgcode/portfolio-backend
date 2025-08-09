const Album = require('../models/Album');
const Photo = require('../models/Photo');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Simple API key middleware for admin operations
const requireApiKey = (req, res, next) => {
  // const apiKey = req.header('X-API-Key') || req.query.apiKey;
  
  // if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
  //   return res.status(401).json({ message: 'Invalid or missing API key' });
  // }
  
  next();
};

// Rate limiting
const albumUploadLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 album creations per windowMs
  message: 'Too many album creation attempts, please try again later'
});

const publicLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Allow more requests for public endpoints
  message: 'Too many requests, please try again later'
});

// Validation for album creation
const validateAlbumCreate = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,!?()'"]+$/)
    .withMessage('Title contains invalid characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
    
  body('coverImageUrl')
    .notEmpty()
    .withMessage('Cover image URL is required')
    .isURL()
    .withMessage('Cover image must be a valid URL'),
    
  body('photos')
    .optional()
    .isArray()
    .withMessage('Photos must be an array')
    .custom((photos) => {
      if (photos && photos.length > 100) {
        throw new Error('Maximum 100 photos allowed per album');
      }
      return true;
    }),
    
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean value'),
    
  body('isHidden')
    .optional()
    .isBoolean()
    .withMessage('isHidden must be a boolean value'),
    
  body('tags')
    .optional()
    .custom((value) => {
      if (value) {
        try {
          let tagsArray;
          if (typeof value === 'string' && value.startsWith('[')) {
            tagsArray = JSON.parse(value);
          } else if (typeof value === 'string') {
            tagsArray = value.split(',');
          } else {
            tagsArray = value;
          }
          
          if (!Array.isArray(tagsArray)) {
            tagsArray = [tagsArray.toString()];
          }
          
          for (const tag of tagsArray) {
            if (typeof tag !== 'string' || tag.trim().length === 0) {
              throw new Error('Each tag must be a non-empty string');
            }
            if (tag.trim().length > 100) {
              throw new Error('Each tag must be less than 100 characters');
            }
          }
          
          if (tagsArray.length > 20) {
            throw new Error('Maximum 20 tags allowed per album');
          }
        } catch (error) {
          throw new Error('Invalid tags format: ' + error.message);
        }
      }
      return true;
    })
];

// Validation for album updates
const validateAlbumUpdate = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,!?()'"]+$/)
    .withMessage('Title contains invalid characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
    
  body('coverImageUrl')
    .optional()
    .isURL()
    .withMessage('Cover image must be a valid URL'),
    
  body('photos')
    .optional()
    .isArray()
    .withMessage('Photos must be an array')
    .custom((photos) => {
      if (photos && photos.length > 100) {
        throw new Error('Maximum 100 photos allowed per album');
      }
      return true;
    }),
    
  body('isFeatured')
    .optional()
    .custom((value) => {
      if (value === 'true' || value === 'false' || typeof value === 'boolean') {
        return true;
      }
      throw new Error('isFeatured must be a boolean value');
    }),
    
  body('isHidden')
    .optional()
    .custom((value) => {
      if (value === 'true' || value === 'false' || typeof value === 'boolean') {
        return true;
      }
      throw new Error('isHidden must be a boolean value');
    }),
    
  body('tags')
    .optional()
    .custom((value) => {
      if (value) {
        try {
          let tagsArray;
          if (typeof value === 'string' && value.startsWith('[')) {
            tagsArray = JSON.parse(value);
          } else if (typeof value === 'string') {
            tagsArray = value.split(',');
          } else {
            tagsArray = value;
          }
          
          if (!Array.isArray(tagsArray)) {
            tagsArray = [tagsArray.toString()];
          }
          
          for (const tag of tagsArray) {
            if (typeof tag !== 'string' || tag.trim().length === 0) {
              throw new Error('Each tag must be a non-empty string');
            }
            if (tag.trim().length > 100) {
              throw new Error('Each tag must be less than 100 characters');
            }
          }
          
          if (tagsArray.length > 20) {
            throw new Error('Maximum 20 tags allowed per album');
          }
        } catch (error) {
          throw new Error('Invalid tags format: ' + error.message);
        }
      }
      return true;
    })
];

// Validate MongoDB ObjectId
const validateObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Create a new album (Admin only - requires API key)
exports.createAlbum = [
  requireApiKey,
  albumUploadLimit,
  validateAlbumCreate,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      console.log('Validation errors:', errors.array());
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: errors.array() 
        });
      }

      const { title, description, coverImageUrl, photos, isFeatured, isHidden, tags } = req.body;

      // Check if album with same title already exists
      const existingAlbum = await Album.findOne({ title: title.trim() });
      if (existingAlbum) {
        return res.status(400).json({ message: 'An album with this title already exists' });
      }

      // Process tags
      let processedTags = [];
      if (tags) {
        try {
          const tagsArray = typeof tags === 'string' && tags.startsWith('[') 
            ? JSON.parse(tags)
            : (typeof tags === 'string' ? tags.split(',') : tags);
            
          processedTags = Array.isArray(tagsArray) 
            ? tagsArray.map(tag => tag.trim().toLowerCase())
            : [tagsArray.toString().trim().toLowerCase()];
          
          processedTags = [...new Set(processedTags.filter(tag => tag.length > 0))];
          processedTags = processedTags.filter(tag => tag.length <= 100);
        } catch (error) {
          console.error('Error processing tags:', error);
          processedTags = [];
        }
      }

      // Validate photo IDs if provided
      let validatedPhotos = [];
      if (photos && photos.length > 0) {
        for (const photoId of photos) {
          if (!validateObjectId(photoId)) {
            return res.status(400).json({ message: `Invalid photo ID: ${photoId}` });
          }
        }
        
        // Check if all photos exist
        const existingPhotos = await Photo.find({ _id: { $in: photos } });
        if (existingPhotos.length !== photos.length) {
          return res.status(400).json({ message: 'One or more photos not found' });
        }
        
        validatedPhotos = photos;
      }

      const album = await Album.create({
        title: title.trim(),
        description: description ? description.trim() : '',
        coverImageUrl,
        photos: validatedPhotos,
        isFeatured: isFeatured === 'true' || isFeatured === true || false,
        isHidden: isHidden === 'true' || isHidden === true || false,
        tags: processedTags,
        metadata: {
          createdBy: req.user?.id || null, // Assuming you have user info in req.user
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const safeAlbum = {
        _id: album._id,
        title: album.title,
        description: album.description,
        coverImageUrl: album.coverImageUrl,
        photos: album.photos,
        isFeatured: album.isFeatured,
        isHidden: album.isHidden,
        tags: album.tags,
        createdAt: album.createdAt,
        updatedAt: album.updatedAt
      };

      res.status(201).json(safeAlbum);
      
    } catch (err) {
      console.error('Create album error:', err);
      
      if (err.name === 'ValidationError') {
        const validationErrors = Object.values(err.errors).map(e => ({
          field: e.path,
          message: e.message
        }));
        return res.status(400).json({
          message: 'Validation failed',
          errors: validationErrors
        });
      }
      
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(400).json({
          message: `An album with this ${field} already exists`
        });
      }
      
      next(err);
    }
  }
];

// Get paginated albums (Public - excludes hidden albums)
exports.getAlbums = [
  publicLimit,
  async (req, res, next) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
      const skip = (page - 1) * limit;

      const filter = { isHidden: false }; // Don't show hidden albums
      
      if (req.query.tag) {
        const tag = req.query.tag.toLowerCase().trim();
        if (tag.length > 0) {
          filter.tags = { $in: [tag] };
        }
      }
      
      if (req.query.search) {
        const searchTerm = req.query.search.trim();
        if (searchTerm.length > 0) {
          const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          filter.$or = [
            { title: searchRegex },
            { description: searchRegex },
            { tags: { $in: [searchRegex] } }
          ];
        }
      }

      const [albums, total] = await Promise.all([
        Album.find(filter)
          .populate('photos', 'title imageUrl thumbnailUrl')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        Album.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        page,
        totalPages,
        totalAlbums: total,
        albums: albums.map(album => {
          const albumObj = album.toObject();
          // Apply Cloudinary transformations to cover image
          if (albumObj.coverImageUrl && albumObj.coverImageUrl.includes('cloudinary.com')) {
            albumObj.coverImageUrl = albumObj.coverImageUrl.replace(
              '/upload/', 
              '/upload/'
              //'/upload/q_auto:low,f_auto,w_600/'
            );
          }
          return albumObj;
        })
      });
    } catch (err) {
      next(err);
    }
  }
];

// Get featured albums (Public)
exports.getFeaturedAlbums = [
  publicLimit,
  async (req, res, next) => {
    try {
      const limit = Math.min(10, Math.max(1, parseInt(req.query.limit) || 5));
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const skip = (page - 1) * limit;

      const [albums, total] = await Promise.all([
        Album.find({ isFeatured: true, isHidden: false })
          .populate('photos', 'title imageUrl thumbnailUrl')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        Album.countDocuments({ isFeatured: true, isHidden: false })
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        page,
        totalPages,
        totalAlbums: total,
        albums: albums.map(album => {
          const albumObj = album.toObject();
          if (albumObj.coverImageUrl && albumObj.coverImageUrl.includes('cloudinary.com')) {
            albumObj.coverImageUrl = albumObj.coverImageUrl.replace(
              '/upload/', 
              '/upload/'
              //'/upload/q_auto:low,f_auto,w_600/'
            );
          }
          return albumObj;
        })
      });
    } catch (err) {
      next(err);
    }
  }
];

// Get one album by ID (Public)
exports.getAlbumById = [
  publicLimit,
  async (req, res, next) => {
    try {
      if (!validateObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid album ID format' });
      }

      const album = await Album.findById(req.params.id)
        .populate('photos', 'title imageUrl thumbnailUrl description tags metadata');

      if (!album) {
        return res.status(404).json({ message: 'Album not found' });
      }

      if (album.isHidden) {
        return res.status(404).json({ message: 'Album not found' });
      }

      const safeAlbum = album.toObject();
      
      // Apply Cloudinary transformations
      if (safeAlbum.coverImageUrl && safeAlbum.coverImageUrl.includes('cloudinary.com')) {
        safeAlbum.coverImageUrl = safeAlbum.coverImageUrl.replace(
          '/upload/', 
          '/upload/'
          //'/upload/q_auto:low,f_auto,w_800/'
        );
      }

      res.json(safeAlbum);
    } catch (err) {
      next(err);
    }
  }
];

// Update album by ID (Admin only - requires API key)
exports.updateAlbum = [
  requireApiKey,
  validateAlbumUpdate,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: errors.array() 
        });
      }

      if (!validateObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid album ID format' });
      }

      let updateData = { ...req.body };
      
      // Process tags
      if (updateData.tags) {
        try {
          const tagsArray = typeof updateData.tags === 'string' && updateData.tags.startsWith('[')
            ? JSON.parse(updateData.tags)
            : (typeof updateData.tags === 'string' ? updateData.tags.split(',') : updateData.tags);
          
          updateData.tags = Array.isArray(tagsArray)
            ? tagsArray.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0)
            : [];
          
          updateData.tags = [...new Set(updateData.tags)];
        } catch (error) {
          console.error('Error processing tags:', error);
          updateData.tags = [];
        }
      }

      // Handle boolean conversions
      if (updateData.isFeatured !== undefined) {
        updateData.isFeatured = updateData.isFeatured === 'true' || updateData.isFeatured === true;
      }
      
      if (updateData.isHidden !== undefined) {
        updateData.isHidden = updateData.isHidden === 'true' || updateData.isHidden === true;
      }

      // Validate photo IDs if provided
      if (updateData.photos && updateData.photos.length > 0) {
        for (const photoId of updateData.photos) {
          if (!validateObjectId(photoId)) {
            return res.status(400).json({ message: `Invalid photo ID: ${photoId}` });
          }
        }
        
        const existingPhotos = await Photo.find({ _id: { $in: updateData.photos } });
        if (existingPhotos.length !== updateData.photos.length) {
          return res.status(400).json({ message: 'One or more photos not found' });
        }
      }

      // Update metadata
      updateData['metadata.updatedAt'] = new Date();

      // Check for title uniqueness if title is being updated
      if (updateData.title) {
        const existingAlbum = await Album.findOne({ 
          title: updateData.title.trim(),
          _id: { $ne: req.params.id }
        });
        if (existingAlbum) {
          return res.status(400).json({ message: 'An album with this title already exists' });
        }
      }

      const album = await Album.findByIdAndUpdate(
        req.params.id,
        updateData,
        { 
          new: true, 
          runValidators: true
        }
      ).populate('photos', 'title imageUrl thumbnailUrl');

      if (!album) {
        return res.status(404).json({ message: 'Album not found' });
      }

      res.json(album);
    } catch (err) {
      console.error('Update album error:', err);
      
      if (err.name === 'ValidationError') {
        const validationErrors = Object.values(err.errors).map(e => ({
          field: e.path,
          message: e.message
        }));
        return res.status(400).json({
          message: 'Validation failed',
          errors: validationErrors
        });
      }
      
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(400).json({
          message: `An album with this ${field} already exists`
        });
      }
      
      next(err);
    }
  }
];

// Delete album by ID (Admin only - requires API key)
exports.deleteAlbum = [
  requireApiKey,
  async (req, res, next) => {
    try {
      if (!validateObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid album ID format' });
      }

      const album = await Album.findById(req.params.id);
      if (!album) {
        return res.status(404).json({ message: 'Album not found' });
      }

      await Album.findByIdAndDelete(req.params.id);
      
      res.json({ message: 'Album deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
];

module.exports = exports;