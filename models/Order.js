const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      selectedOptions: {
        size: String,
        paperType: String,
        frameOption: String,
      },
      downloadLink: String, // if digital
    }
  ],

  type: {
    type: String,
    enum: ['digital', 'print', 'mixed'], // optional if supporting both
    default: 'mixed'
  },
  flags: {
    isFreeShipping: { type: Boolean, default: false }, // e.g., for orders over a certain amount
  },

  totalPrice: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'paid', 'shipped', 'completed', 'cancelled'],
    default: 'pending'
  },

  paymentInfo: {
    paymentId: String,
    method: String, // e.g., stripe, paypal
    paidAt: Date,
  },

  shippingAddress: {
    fullName: String,
    street: String,
    city: String,
    zip: String,
    country: String,
  },

}, { timestamps: true });
