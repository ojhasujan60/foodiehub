const express = require('express');
const router = express.Router();
const { 
  getAllTables,
  getAvailableTables,
  createTable,
  updateTable,
  deleteTable
} = require('../controllers/tableController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Public routes
router.get('/', getAllTables);
router.get('/available', getAvailableTables);

// Admin only routes
router.post('/', auth, admin, createTable);
router.put('/:id', auth, admin, updateTable);
router.delete('/:id', auth, admin, deleteTable);

module.exports = router;