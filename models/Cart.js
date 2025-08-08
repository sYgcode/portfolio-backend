const mongoose = require('mongoose');

/* we'll have a cart model that references products. 
it will be retrievable only by the user who it is connected to. 
it will not be deletable, but it will be updatable. 

*/

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, // Ensure one cart per user
    products: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true },
            type: {
                type: String,
                enum: ['digital', 'print', 'mixed'], // optional if supporting both
                default: 'mixed',
                required: true
            },
            selectedOptions: {
                size: String,
                paperType: String,
                frameOption: String,
            }
        }]
    }, { timestamps: true });
module.exports = mongoose.model('Cart', cartSchema);