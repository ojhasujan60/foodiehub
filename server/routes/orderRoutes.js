const express = require('express');
const router = express.Router();
const { 
  placeOrder, 
  getUserOrders, 
  getUserOrderHistory,
  getOrderById, 
  updateOrderStatus, 
  getAllOrders,
  getArchivedOrders,
  getKitchenOrders,
  cancelOrder,
  reorder,
  getOrderStats,
  editOrder,           // NEW
  returnOrderToKitchen, // NEW
  getReturnHistory      // NEW
} = require('../controllers/orderController');
const auth = require('../middleware/auth');
const staff = require('../middleware/staff');
const admin = require('../middleware/admin');

// Customer routes
router.post('/place', auth, placeOrder);
router.get('/my', auth, getUserOrders);
router.get('/my/history', auth, getUserOrderHistory);
router.put('/:id/cancel', auth, cancelOrder);
router.post('/:id/reorder', auth, reorder);

// Staff/Admin routes (must come before generic :id)
router.get('/all', auth, staff, getAllOrders);
router.get('/archived', auth, staff, getArchivedOrders);
router.get('/kitchen', auth, staff, getKitchenOrders);
router.get('/stats', auth, admin, getOrderStats);

// Edit and Return routes
router.put('/:id/edit', auth, staff, editOrder);                    // NEW
router.put('/:id/return', auth, staff, returnOrderToKitchen);       // NEW
router.get('/:id/return-history', auth, staff, getReturnHistory);   // NEW

// Generic routes (must come after specific ones)
router.get('/:id', auth, getOrderById);
router.put('/:id/status', auth, staff, updateOrderStatus);

module.exports = router;