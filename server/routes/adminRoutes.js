const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const adminController = require('../controllers/adminController');

// Dashboard stats
router.get('/dashboard', auth, admin, adminController.getDashboardStats);

// User management
router.get('/users', auth, admin, adminController.getAllUsers);
router.put('/users/:id/role', auth, admin, adminController.updateUserRole);
router.patch('/users/:id/toggle', auth, admin, adminController.toggleUserStatus);
router.post('/users', auth, admin, adminController.createUser);   // ✅ Add this line

// Sales report
router.get('/sales-report', auth, admin, adminController.getSalesReport);

module.exports = router;