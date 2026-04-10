const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
  getMenu, 
  getFoodById, 
  addFood, 
  updateFood, 
  deleteFood, 
  toggleAvailability 
} = require('../controllers/menuController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads directory:', uploadDir);
}

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
});

// Public routes
router.get('/', getMenu);
router.get('/:id', getFoodById);

// Admin only routes
router.post('/add', auth, admin, upload.single('image'), addFood);
router.put('/:id', auth, admin, upload.single('image'), updateFood);
router.delete('/:id', auth, admin, deleteFood);
router.patch('/:id/toggle', auth, admin, toggleAvailability);

module.exports = router;