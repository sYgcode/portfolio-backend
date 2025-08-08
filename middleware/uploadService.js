// services/uploadService.js
const cloudinary = require('cloudinary').v2;

class UploadService {
    constructor() {
        this.provider = process.env.UPLOAD_PROVIDER || 'cloudinary'; // 'cloudinary' or 'spaces'
    }

    async uploadPhoto(file, options = {}) {
        const { title, addWatermark = false } = options;

        if (this.provider === 'cloudinary') {
            return await this.uploadToCloudinary(file, options);
        } else if (this.provider === 'spaces') {
            return await this.uploadToSpaces(file, options);
        }

        throw new Error(`Unsupported upload provider: ${this.provider}`);
    }

    async uploadToCloudinary(file, options) {
        try {
            // Current Cloudinary upload logic (unchanged)
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'auto',
                        folder: 'photography',
                        transformation: options.addWatermark ? [
                            { overlay: 'watermark_logo', gravity: 'south_east', opacity: 30 }
                        ] : undefined
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                ).end(file.buffer);
            });

            return {
                imageUrl: result.secure_url,
                thumbnailUrl: result.secure_url, // Cloudinary can generate on-the-fly
                publicId: result.public_id,
                provider: 'cloudinary',
                metadata: {
                    width: result.width,
                    height: result.height,
                    format: result.format,
                    sizeKB: result.bytes / 1024
                }
            };
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            throw new Error('Failed to upload to Cloudinary');
        }
    }

    async uploadToSpaces(file, options) {
        // Future Spaces implementation would go here
        // For now, fallback to Cloudinary
        console.warn('Spaces upload not implemented yet, falling back to Cloudinary');
        return await this.uploadToCloudinary(file, options);
        
        /* Future implementation:
        const AWS = require('aws-sdk');
        const sharp = require('sharp');
        
        // Process image with watermark if requested
        let processedBuffer = file.buffer;
        if (options.addWatermark) {
            processedBuffer = await this.addWatermark(file.buffer);
        }
        
        // Upload to Spaces
        const s3 = new AWS.S3({...});
        const result = await s3.upload({
            Bucket: process.env.SPACES_BUCKET,
            Key: `photos/${Date.now()}-${options.title}.jpg`,
            Body: processedBuffer,
            ACL: 'public-read'
        }).promise();
        
        return {
            imageUrl: result.Location,
            thumbnailUrl: result.Location, // Would need separate thumbnail upload
            publicId: result.Key,
            provider: 'spaces',
            metadata: {...}
        };
        */
    }

    async deletePhoto(publicId, provider) {
        if (provider === 'cloudinary' || !provider) {
            return await this.deleteFromCloudinary(publicId);
        } else if (provider === 'spaces') {
            return await this.deleteFromSpaces(publicId);
        }
    }

    async deleteFromCloudinary(publicId) {
        try {
            await cloudinary.uploader.destroy(publicId);
            console.log(`Deleted ${publicId} from Cloudinary`);
        } catch (error) {
            console.error('Failed to delete from Cloudinary:', error);
        }
    }

    async deleteFromSpaces(key) {
        // Future Spaces delete implementation
        console.warn('Spaces delete not implemented yet');
    }

    // Future watermark method
    async addWatermark(imageBuffer) {
        // This would use Sharp to add watermark
        // For now, return original buffer
        return imageBuffer;
    }
}

// Singleton instance
const uploadService = new UploadService();
module.exports = uploadService;