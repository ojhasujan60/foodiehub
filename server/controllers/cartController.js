const Cart = require('../models/Cart');
const Food = require('../models/Food');
const Coupon = require('../models/Coupon');

// Get cart
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.foodId')
      .populate('coupon');
    
    if (!cart) {
      cart = { items: [], subtotal: 0, discount: 0, total: 0 };
    } else {
      const subtotal = cart.items.reduce((sum, item) => sum + (item.foodId.price * item.quantity), 0);
      cart.subtotal = subtotal;
      cart.total = subtotal - (cart.discount || 0);
    }
    
    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching cart' });
  }
};

// Update cart (add/update item)
exports.updateCart = async (req, res) => {
  try {
    const { foodId, quantity, specialInstructions } = req.body;
    
    const food = await Food.findById(foodId);
    if (!food || !food.isAvailable) {
      return res.status(404).json({ message: 'Food not available' });
    }
    
    let cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }
    
    const itemIndex = cart.items.findIndex(
      item => item.foodId.toString() === foodId
    );
    
    if (itemIndex > -1) {
      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
        if (specialInstructions) cart.items[itemIndex].specialInstructions = specialInstructions;
      }
    } else {
      if (quantity > 0) {
        cart.items.push({ foodId, quantity, specialInstructions });
      }
    }
    
    await cart.save();
    
    cart = await Cart.findById(cart._id).populate('items.foodId').populate('coupon');
    const subtotal = cart.items.reduce((sum, item) => sum + (item.foodId.price * item.quantity), 0);
    cart.subtotal = subtotal;
    cart.total = subtotal - (cart.discount || 0);
    
    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating cart' });
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { foodId } = req.body;
    
    let cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.json({ items: [] });
    }
    
    cart.items = cart.items.filter(
      item => item.foodId.toString() !== foodId
    );
    
    await cart.save();
    
    cart = await Cart.findById(cart._id).populate('items.foodId').populate('coupon');
    const subtotal = cart.items.reduce((sum, item) => sum + (item.foodId.price * item.quantity), 0);
    cart.subtotal = subtotal;
    cart.total = subtotal - (cart.discount || 0);
    
    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error removing from cart' });
  }
};

// Apply coupon
exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.foodId');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }
    
    const coupon = await Coupon.findOne({ 
      code: couponCode.toUpperCase(),
      isActive: true,
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() }
    });
    
    if (!coupon) {
      return res.status(400).json({ message: 'Invalid or expired coupon' });
    }
    
    const subtotal = cart.items.reduce((sum, item) => sum + (item.foodId.price * item.quantity), 0);
    
    if (subtotal < coupon.minOrderAmount) {
      return res.status(400).json({ message: `Minimum order amount of ₹${coupon.minOrderAmount} required` });
    }
    
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.discountValue;
    }
    
    cart.coupon = coupon._id;
    cart.discount = discount;
    await cart.save();
    
    res.json({ discount, message: 'Coupon applied successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error applying coupon' });
  }
};

// Remove coupon
exports.removeCoupon = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    
    if (cart) {
      cart.coupon = null;
      cart.discount = 0;
      await cart.save();
    }
    
    res.json({ message: 'Coupon removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error removing coupon' });
  }
};