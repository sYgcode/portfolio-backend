// services/uploadService.js
const cloudinary = require('cloudinary').v2;

class UploadService {
    constructor() {
        this.provider = process.env.UPLOAD_PROVIDER || 'cloudinary';
    }

    async uploadPhoto(file, options = {}) {
        const { title, addWatermark = false } = options;

        // Validate file before upload
        if (!file) {
            throw new Error('No file provided');
        }

        // Check for buffer (handle different multer configurations)
        const buffer = file.buffer || file.data;
        if (!buffer || buffer.length === 0) {
            console.error('File buffer is empty or missing:', {
                hasBuffer: !!file.buffer,
                hasData: !!file.data,
                bufferLength: buffer?.length,
                fileSize: file.size,
                originalName: file.originalname
            });
            throw new Error('File buffer is empty or corrupted');
        }

        console.log('Upload service - File info:', {
            size: file.size,
            bufferLength: buffer.length,
            mimetype: file.mimetype,
            originalname: file.originalname
        });

        if (this.provider === 'cloudinary') {
            return await this.uploadToCloudinary(file, options);
        } else if (this.provider === 'spaces') {
            return await this.uploadToSpaces(file, options);
        }

        throw new Error(`Unsupported upload provider: ${this.provider}`);
    }

    async uploadToCloudinary(file, options) {
        try {
            const buffer = file.buffer || file.data;
            
            if (!buffer || buffer.length === 0) {
                throw new Error('Invalid file buffer for Cloudinary upload');
            }

            console.log('Uploading to Cloudinary:', {
                bufferLength: buffer.length,
                mimetype: file.mimetype,
                provider: this.provider
            });

            const result = await new Promise((resolve, reject) => {
                const uploadOptions = {
                    resource_type: 'auto',
                    folder: 'photography',
                    // Add quality optimization
                    quality: 'auto:good',
                    fetch_format: 'auto'
                };

                if (options.addWatermark) {
                    uploadOptions.transformation = [
                        { overlay: 'watermark_logo', gravity: 'south_east', opacity: 30 }
                    ];
                }

                const uploadStream = cloudinary.uploader.upload_stream(
                    uploadOptions,
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            console.log('Cloudinary upload success:', {
                                public_id: result.public_id,
                                width: result.width,
                                height: result.height,
                                bytes: result.bytes
                            });
                            resolve(result);
                        }
                    }
                );

                // Write buffer to stream
                uploadStream.end(buffer);
            });

            return {
                imageUrl: result.secure_url,
                thumbnailUrl: result.secure_url.replace('/upload/', '/upload/c_thumb,w_400,h_300/'),
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
            console.error('Cloudinary upload error details:', {
                message: error.message,
                stack: error.stack,
                fileSize: file.size,
                mimetype: file.mimetype
            });
            throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
        }
    }

    // ... rest of your methods stay the same
}

const uploadService = new UploadService();
module.exports = uploadService;