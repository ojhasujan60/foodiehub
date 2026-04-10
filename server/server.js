require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);

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

// Use routes
app.use('/api/users', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Database connection
const MONGO_URI = 'mongodb+srv://foodiehub_admin:tKn99M8XcTxHrNME@cluster0.6joq5w6.mongodb.net/foodiehub?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Import cron jobs
const cron = require('node-cron');
const { archivePastReservations } = require('./controllers/reservationController');
const { archiveOldOrders } = require('./controllers/orderController');

// Run reservation archiving daily at midnight
cron.schedule('0 0 * * *', () => {
  console.log('🕛 Running reservation archiving job...');
  archivePastReservations();
});

// Run order archiving daily at 1 AM
cron.schedule('0 1 * * *', () => {
  console.log('🕐 Running order archiving job...');
  archiveOldOrders();
});

// Also run on server start to catch any past items
console.log('📦 Running initial archiving...');
setTimeout(() => {
  archivePastReservations();
  archiveOldOrders();
}, 3000);

// Serve frontend HTML pages
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

// Catch-all for SPA-style routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/customer/index.html'));
});
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Customer portal: http://localhost:${PORT}/customer/`);
  console.log(`👔 Staff portal: http://localhost:${PORT}/staff/`);
  console.log(`👑 Admin portal: http://localhost:${PORT}/admin/`);
});
