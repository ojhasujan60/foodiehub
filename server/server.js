require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Database connection
const MONGO_URI = 'mongodb+srv://foodiehub_admin:tKn99M8XcTxHrNME@cluster0.6joq5w6.mongodb.net/foodiehub?retryWrites=true&w=majority&appName=Cluster0';

console.log('📦 Attempting to connect to MongoDB...');

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected successfully!');
  
  // Start server ONLY after MongoDB connects
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  process.exit(1);
});

// Static files
app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/customer/index.html'));
});
