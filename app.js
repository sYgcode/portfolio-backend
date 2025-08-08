const express = require('express');
const photoRoutes = require('./routes/photoRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const albumRoutes = require('./routes/albumRoutes');

const errorHandler = require('./middleware/errorHandler');
const cors = require('cors');
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5000', 'https://dancing-otter-56344f.netlify.app'];
const app = express();

// Middleware

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json()); // For parsing JSON bodies

// Routes
app.use('/api/photos', photoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/albums', albumRoutes); // Albums routes


// Error Handling Middleware (last)
app.use(errorHandler);

module.exports = app;
