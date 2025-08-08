const Photo = require('../models/Photo');
const { body, validationResult } = require('express-validator');
const uploadService = require('../middleware/uploadService');
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
const photoUploadLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 uploads per windowMs
  message: 'Too many upload attempts, please try again later'
});

const publicLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Allow more requests for public endpoints
  message: 'Too many requests, please try again later'
});

// Flexible validation that works for both create and update
const validatePhotoCreate = [
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
    
  body('photographer')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Photographer name must be less than 100 characters'),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean value'),
    
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
          
          if (tagsArray.length > 50) {
            throw new Error('Maximum 50 tags allowed');
          }
        } catch (error) {
          throw new Error('Invalid tags format: ' + error.message);
        }
      }
      return true;
    }),
    
  body('metadata')
    .optional()
    .custom((value) => {
      if (value) {
        try {
          const metadata = typeof value === 'string' ? JSON.parse(value) : value;
          
          const numericFields = ['width', 'height', 'originalWidth', 'originalHeight', 'originalSizeKB', 'sizeKB'];
          for (const field of numericFields) {
            if (metadata[field] !== undefined && metadata[field] !== null) {
              const num = parseFloat(metadata[field]);
              if (isNaN(num) || num < 0) {
                throw new Error(`${field} must be a positive number`);
              }
              if (field.includes('Width') || field.includes('Height')) {
                if (num > 50000) {
                  throw new Error(`${field} must be less than 50,000 pixels`);
                }
              }
            }
          }
          
          if (metadata.location && metadata.location.length > 200) {
            throw new Error('Location must be less than 200 characters');
          }
          
          if (metadata.photographer && metadata.photographer.length > 100) {
            throw new Error('Photographer name must be less than 100 characters');
          }
          
          if (metadata.format && !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(metadata.format)) {
            throw new Error('Invalid image format');
          }
          
          if (metadata.dateTaken) {
            const date = new Date(metadata.dateTaken);
            if (isNaN(date.getTime())) {
              throw new Error('Invalid date format for dateTaken');
            }
            if (date > new Date()) {
              throw new Error('Date taken cannot be in the future');
            }
            if (date < new Date('1826-01-01')) {
              throw new Error('Date taken is too old');
            }
          }
          
        } catch (error) {
          throw new Error('Invalid metadata: ' + error.message);
        }
      }
      return true;
    })
];

// Validation for updates - title is optional
const validatePhotoUpdate = [
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
    
  body('photographer')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Photographer name must be less than 100 characters'),

  body('isFeatured')
    .optional()
    .custom((value) => {
      // Handle string boolean conversion
      if (value === 'true' || value === 'false' || typeof value === 'boolean') {
        return true;
      }
      throw new Error('isFeatured must be a boolean value');
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
          
          if (tagsArray.length > 50) {
            throw new Error('Maximum 50 tags allowed');
          }
        } catch (error) {
          throw new Error('Invalid tags format: ' + error.message);
        }
      }
      return true;
    }),
    
  body('metadata')
    .optional()
    .custom((value) => {
      if (value) {
        try {
          const metadata = typeof value === 'string' ? JSON.parse(value) : value;
          
          const numericFields = ['width', 'height', 'originalWidth', 'originalHeight', 'originalSizeKB', 'sizeKB'];
          for (const field of numericFields) {
            if (metadata[field] !== undefined && metadata[field] !== null) {
              const num = parseFloat(metadata[field]);
              if (isNaN(num) || num < 0) {
                throw new Error(`${field} must be a positive number`);
              }
              if (field.includes('Width') || field.includes('Height')) {
                if (num > 50000) {
                  throw new Error(`${field} must be less than 50,000 pixels`);
                }
              }
            }
          }
          
          if (metadata.location && metadata.location.length > 200) {
            throw new Error('Location must be less than 200 characters');
          }
          
          if (metadata.photographer && metadata.photographer.length > 100) {
            throw new Error('Photographer name must be less than 100 characters');
          }
          
          if (metadata.format && !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(metadata.format)) {
            throw new Error('Invalid image format');
          }
          
          if (metadata.dateTaken) {
            const date = new Date(metadata.dateTaken);
            if (isNaN(date.getTime())) {
              throw new Error('Invalid date format for dateTaken');
            }
            if (date > new Date()) {
              throw new Error('Date taken cannot be in the future');
            }
            if (date < new Date('1826-01-01')) {
              throw new Error('Date taken is too old');
            }
          }
          
        } catch (error) {
          throw new Error('Invalid metadata: ' + error.message);
        }
      }
      return true;
    })
];

// Validate MongoDB ObjectId
const validateObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Only change the createPhoto function:
exports.createPhoto = [
  requireApiKey,
  photoUploadLimit,
  validatePhotoCreate,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: errors.array() 
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP allowed.' });
      }

      const maxSize = 50 * 1024 * 1024; // 50MB
      if (req.file.size > maxSize) {
        return res.status(400).json({ message: 'File too large. Maximum size is 50MB.' });
      }

      const { title, description, photographer, tags, metadata, isFeatured } = req.body;

      const existingPhoto = await Photo.findOne({ title: title.trim() });
      if (existingPhoto) {
        return res.status(400).json({ message: 'A photo with this title already exists' });
      }

      // Process tags (keep your existing logic)
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

      // Process metadata (keep your existing logic)
      let parsedMetadata = {};
      if (metadata) {
        try {
          parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
        } catch (error) {
          console.error('Error parsing metadata:', error);
        }
      }

      // THIS IS THE MAIN CHANGE - Use upload service instead of direct Cloudinary
      const uploadResult = await uploadService.uploadPhoto(req.file, {
        title: title.trim(),
        addWatermark: false // Set to true when you want watermarks
      });

      // Merge upload metadata with parsed metadata
      const photoMetadata = {
        width: uploadResult.metadata.width || parsedMetadata.width ? parseInt(parsedMetadata.width) : null,
        height: uploadResult.metadata.height || parsedMetadata.height ? parseInt(parsedMetadata.height) : null,
        originalWidth: parsedMetadata.originalWidth ? parseInt(parsedMetadata.originalWidth) : uploadResult.metadata.width,
        originalHeight: parsedMetadata.originalHeight ? parseInt(parsedMetadata.originalHeight) : uploadResult.metadata.height,
        originalSizeKB: parsedMetadata.originalSizeKB ? parseFloat(parsedMetadata.originalSizeKB) : null,
        sizeKB: uploadResult.metadata.sizeKB || req.file.size / 1024,
        format: uploadResult.metadata.format || parsedMetadata.format || req.file.mimetype,
        location: parsedMetadata.location || null,
        photographer: parsedMetadata.photographer || photographer || null,
        dateTaken: parsedMetadata.dateTaken ? new Date(parsedMetadata.dateTaken) : null
      };

      // Create photo record - UPDATED to use upload service results
      const photo = await Photo.create({
        title: title.trim(),
        imageUrl: uploadResult.imageUrl,
        thumbnailUrl: uploadResult.thumbnailUrl, // New field for thumbnails
        publicId: uploadResult.publicId,
        provider: uploadResult.provider, // Track which service was used
        description: description ? description.trim() : null,
        tags: processedTags,
        metadata: photoMetadata,
        isFeatured: isFeatured === 'true' || isFeatured === true || false
      });

      const safePhoto = {
        _id: photo._id,
        title: photo.title,
        imageUrl: photo.imageUrl,
        thumbnailUrl: photo.thumbnailUrl, // Include in response
        description: photo.description,
        tags: photo.tags,
        isFeatured: photo.isFeatured,
        createdAt: photo.createdAt,
        updatedAt: photo.updatedAt,
        metadata: photo.metadata
      };

      res.status(201).json(safePhoto);
      
    } catch (err) {
      console.error('Create photo error:', err);
      
      // Error cleanup still works because uploadService handles the provider logic
      if (req.file && req.file.public_id) {
        await uploadService.deletePhoto(req.file.public_id, 'cloudinary');
      }
      
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
          message: `A photo with this ${field} already exists`
        });
      }
      
      next(err);
    }
  }
];

// Get paginated photos (Public - with compressed images)
exports.getPhotos = [
  publicLimit,
  async (req, res, next) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
      const skip = (page - 1) * limit;

      const filter = {};
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

      const [photos, total] = await Promise.all([
        Photo.find(filter)
          .select('-publicId')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        Photo.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        page,
        totalPages,
        totalPhotos: total,
        photos: photos.map(photo => {
          const photoObj = photo.toObject();
          if (photoObj.imageUrl && photoObj.imageUrl.includes('cloudinary.com')) {
            photoObj.imageUrl = photoObj.imageUrl.replace(
              '/upload/', 
              '/upload/q_auto:low,f_auto,w_800/'
            );
          }
          return photoObj;
        })
      });
    } catch (err) {
      next(err);
    }
  }
];

// Get featured photos (Public - with compressed images)
exports.getFeaturedPhotos = [
  publicLimit,
  async (req, res, next) => {
    try {
      const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10)); // Max 20 featured photos
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const skip = (page - 1) * limit;

      const [photos, total] = await Promise.all([
        Photo.find({ isFeatured: true })
          .select('-publicId')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        Photo.countDocuments({ isFeatured: true })
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        page,
        totalPages,
        totalPhotos: total,
        photos: photos.map(photo => {
          const photoObj = photo.toObject();
          if (photoObj.imageUrl && photoObj.imageUrl.includes('cloudinary.com')) {
            photoObj.imageUrl = photoObj.imageUrl.replace(
              '/upload/', 
              '/upload/q_auto:low,f_auto,w_800/'
            );
          }
          return photoObj;
        })
      });
    } catch (err) {
      next(err);
    }
  }
];

// Get one photo by ID (Public - compressed version)
exports.getPhotoById = [
  publicLimit,
  async (req, res, next) => {
    try {
      if (!validateObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid photo ID format' });
      }

      const photo = await Photo.findById(req.params.id)
        .select('-publicId');

      if (!photo) {
        return res.status(404).json({ message: 'Photo not found' });
      }

      const safePhoto = photo.toObject();
      if (safePhoto.imageUrl && safePhoto.imageUrl.includes('cloudinary.com')) {
        safePhoto.imageUrl = safePhoto.imageUrl.replace(
          '/upload/', 
          '/upload/q_auto:low,f_auto,w_1200/'
        );
      }

      res.json(safePhoto);
    } catch (err) {
      next(err);
    }
  }
];

// Get full resolution image (Admin only - requires API key)
exports.getFullResImage = [
  requireApiKey,
  async (req, res, next) => {
    try {
      if (!validateObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid photo ID format' });
      }

      const photo = await Photo.findById(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: 'Photo not found' });
      }

      res.json({ 
        url: photo.imageUrl,
        title: photo.title,
        metadata: photo.metadata
      });
    } catch (err) {
      next(err);
    }
  }
];

// Update photo by ID (Admin only - requires API key)
exports.updatePhoto = [
  requireApiKey,
  validatePhotoUpdate,
  async (req, res, next) => {
    try {
      console.log('Updating photo with ID:', req.body);
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: errors.array() 
        });
      }

      if (!validateObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid photo ID format' });
      }

      let updateData = { ...req.body };
      
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

      if (updateData.isFeatured !== undefined) {
        updateData.isFeatured = updateData.isFeatured === 'true' || updateData.isFeatured === true;
      }

      delete updateData.publicId;
      delete updateData.imageUrl;
      delete updateData.createdAt;

      if (updateData.title) {
        const existingPhoto = await Photo.findOne({ 
          title: updateData.title.trim(),
          _id: { $ne: req.params.id }
        });
        if (existingPhoto) {
          return res.status(400).json({ message: 'A photo with this title already exists' });
        }
      }

      const photo = await Photo.findByIdAndUpdate(
        req.params.id,
        updateData,
        { 
          new: true, 
          runValidators: true,
          select: '-publicId'
        }
      );

      if (!photo) {
        return res.status(404).json({ message: 'Photo not found' });
      }

      res.json(photo);
    } catch (err) {
      console.error('Update photo error:', err);
      
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
          message: `A photo with this ${field} already exists`
        });
      }
      
      next(err);
    }
  }
];

// Delete photo by ID (Admin only - requires API key)
// Update deletePhoto to use the service:
exports.deletePhoto = [
  requireApiKey,
  async (req, res, next) => {
    try {
      if (!validateObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid photo ID format' });
      }

      const photo = await Photo.findById(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: 'Photo not found' });
      }

      // Use upload service for deletion - handles both Cloudinary and Spaces
      if (photo.publicId) {
        await uploadService.deletePhoto(photo.publicId, photo.provider);
      }

      await Photo.findByIdAndDelete(req.params.id);
      
      res.json({ message: 'Photo deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
];

module.exports = exports;