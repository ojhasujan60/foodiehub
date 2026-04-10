const express = require('express');
const router = express.Router();
const { 
  getCart, 
  updateCart, 
  removeFromCart, 
  applyCoupon, 
  removeCoupon 
} = require('../controllers/cartController');
const auth = require('../middleware/auth');

router.get('/', auth, getCart);
router.post('/update', auth, updateCart);
router.post('/remove', auth, removeFromCart);
router.post('/apply-coupon', auth, applyCoupon);
router.delete('/coupon', auth, removeCoupon);

module.exports = router;