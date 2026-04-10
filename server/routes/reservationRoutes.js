const express = require('express');
const router = express.Router();
const { 
  getAvailableSlots,
  createReservation,
  getUserReservations,
  getUserReservationHistory,
  cancelReservation,
  getAllReservations,
  updateReservationStatus,
  updateReservation,
  deleteReservation,
  getReservationStats
} = require('../controllers/reservationController');
const auth = require('../middleware/auth');
const staff = require('../middleware/staff');
const admin = require('../middleware/admin');

// Customer routes
router.get('/available-slots', getAvailableSlots);
router.post('/', auth, createReservation);
router.get('/my', auth, getUserReservations);
router.get('/my/history', auth, getUserReservationHistory);
router.put('/:id/cancel', auth, cancelReservation);

// Staff routes
router.get('/all', auth, staff, getAllReservations);
router.put('/:id/status', auth, staff, updateReservationStatus);

// Admin routes
router.put('/:id', auth, admin, updateReservation);
router.delete('/:id', auth, admin, deleteReservation);
router.get('/stats', auth, admin, getReservationStats);

module.exports = router;