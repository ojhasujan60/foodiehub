require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../client')));

// Import routes
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const tableRoutes = require('./routes/tableRoutes');
const adminRoutes = require('./routes/adminRoutes');

// API routes
app.use('/api/users', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/admin', adminRoutes);

// Database connection - Hardcoded for Railway
const MONGO_URI = 'mongodb+srv://foodiehub_admin:tKn99M8XcTxHrNME@cluster0.6joq5w6.mongodb.net/foodiehub?retryWrites=true&w=majority&appName=Cluster0';

console.log('📦 Connecting to MongoDB...');

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000
})
.then(() => {
  console.log('✅ MongoDB connected successfully!');
  
  // Frontend routes
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/customer/index.html'));
  });

  app.get('/customer/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client', req.path));
  });

  app.get('/staff/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client', req.path));
  });

  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client', req.path));
  });

  // Start server
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Customer: http://localhost:${PORT}/`);
    console.log(`👔 Staff: http://localhost:${PORT}/staff/dashboard.html`);
    console.log(`👑 Admin: http://localhost:${PORT}/admin/dashboard.html`);
  });
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  console.error('Full error:', err);
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});
