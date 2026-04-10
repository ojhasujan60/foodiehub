const User = require('../models/User');
const Order = require('../models/Order');
const Food = require('../models/Food');
const Reservation = require('../models/Reservation');

// Dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [
      totalUsers,
      totalStaff,
      totalOrders,
      totalFoods,
      todayOrders,
      todayRevenue,
      pendingOrders,
      todayReservations
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'staff' }),
      Order.countDocuments(),
      Food.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: today, $lt: tomorrow }, status: 'Delivered' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.countDocuments({ status: 'Pending' }),
      Reservation.countDocuments({ 
        date: { $gte: today, $lt: tomorrow },
        status: { $in: ['Confirmed', 'Pending'] }
      })
    ]);
    
    // Recent orders
    const recentOrders = await Order.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Popular items
    const popularItems = await Order.aggregate([
      { $unwind: '$items' },
      { $group: {
          _id: '$items.foodId',
          totalSold: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);
    
    // Populate food details
    for (let item of popularItems) {
      const food = await Food.findById(item._id);
      if (food) item.food = food;
    }
    
    res.json({
      stats: {
        totalUsers,
        totalStaff,
        totalOrders,
        totalFoods,
        todayOrders,
        todayRevenue: todayRevenue[0]?.total || 0,
        pendingOrders,
        todayReservations
      },
      recentOrders,
      popularItems
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    let filter = {};
    
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating user role' });
  }
};

// Toggle user status
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error toggling user status' });
  }
};

// Get sales report
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, period } = req.query;
    let start, end;
    
    if (period === 'today') {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      start = new Date();
      start.setDate(start.getDate() - 7);
      end = new Date();
    } else if (period === 'month') {
      start = new Date();
      start.setMonth(start.getMonth() - 1);
      end = new Date();
    } else {
      start = new Date(startDate);
      end = new Date(endDate);
    }
    
    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      status: 'Delivered'
    });
    
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Daily breakdown
    const dailyBreakdown = {};
    orders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = { orders: 0, revenue: 0 };
      }
      dailyBreakdown[date].orders++;
      dailyBreakdown[date].revenue += order.total;
    });
    
    res.json({
      totalRevenue,
      totalOrders,
      averageOrderValue,
      dailyBreakdown: Object.entries(dailyBreakdown).map(([date, data]) => ({ date, ...data }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating report' });
  }
};
// Create a new user (admin only)
exports.createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create user with specified role
    const user = new User({
      name,
      email,
      phone,
      password,
      role: role || 'staff' // default to staff
    });
    
    await user.save();
    
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating user' });
  }
};