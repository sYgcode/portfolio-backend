const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
    title: { type: String, required: true, maxlength: 200, unique: true },
    description: { type: String, maxlength: 1000 },
    coverImageUrl: { type: String, required: true },
    photos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],
    isFeatured: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
    tags: [{ type: String, maxlength: 100 }],
    metadata: {
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }
}, { timestamps: true });
module.exports = mongoose.model('Album', albumSchema);
