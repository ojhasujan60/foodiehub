const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Table = require('../models/Table');

// Generate unique order number
async function generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const count = await Order.countDocuments();
    return `ORD-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
}

// Place new order
exports.placeOrder = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id }).populate('items.foodId');
        
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        const subtotal = cart.items.reduce((sum, item) => {
            return sum + (item.foodId.price * item.quantity);
        }, 0);

        const tax = subtotal * 0.05;
        const deliveryFee = req.body.orderType === 'Delivery' ? 40 : 0;
        const total = subtotal + tax + deliveryFee;

        const order = new Order({
            orderNumber: await generateOrderNumber(),
            user: req.user.id,
            items: cart.items.map(item => ({
                foodId: item.foodId._id,
                quantity: item.quantity,
                price: item.foodId.price,
                specialInstructions: item.specialInstructions || ''
            })),
            subtotal,
            tax,
            deliveryFee,
            total,
            paymentMethod: req.body.paymentMethod || 'COD',
            orderType: req.body.orderType || 'Delivery',
            table: req.body.tableId || null,
            deliveryAddress: req.body.deliveryAddress || {},
            specialInstructions: req.body.specialInstructions || ''
        });

        await order.save();
        
        // Clear the cart
        cart.items = [];
        await cart.save();

        res.status(201).json(order);
    } catch (error) {
        console.error('Place order error:', error);
        res.status(500).json({ message: 'Error placing order', error: error.message });
    }
};

// Get user's active orders
exports.getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({ 
            user: req.user.id,
            isArchived: false 
        })
        .populate('items.foodId')
        .sort({ createdAt: -1 });
        
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
};

// Get user's order history (archived)
exports.getUserOrderHistory = async (req, res) => {
    try {
        const orders = await Order.find({ 
            user: req.user.id,
            isArchived: true 
        })
        .populate('items.foodId')
        .sort({ createdAt: -1 });
        
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching order history', error: error.message });
    }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.foodId')
            .populate('user', 'name email phone');
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Check authorization
        if (order.user._id.toString() !== req.user.id && req.user.role !== 'staff' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching order', error: error.message });
    }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Update timestamps based on status
        const updateData = { status };
        switch(status) {
            case 'Confirmed':
                updateData.confirmedAt = new Date();
                break;
            case 'Preparing':
                updateData.preparingAt = new Date();
                break;
            case 'Ready':
                updateData.readyAt = new Date();
                break;
            case 'Out for Delivery':
                updateData.outForDeliveryAt = new Date();
                break;
            case 'Delivered':
                updateData.deliveredAt = new Date();
                break;
            case 'Cancelled':
                updateData.cancelledAt = new Date();
                break;
        }
        
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        
        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: 'Error updating order status', error: error.message });
    }
};

// Get all orders (staff/admin)
exports.getAllOrders = async (req, res) => {
    try {
        const { limit, status, date } = req.query;
        let query = { isArchived: false };
        
        if (status) query.status = status;
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            query.createdAt = { $gte: startDate, $lt: endDate };
        }
        
        let ordersQuery = Order.find(query)
            .populate('items.foodId')
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        
        if (limit) ordersQuery = ordersQuery.limit(parseInt(limit));
        
        const orders = await ordersQuery;
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
};

// Get archived orders
exports.getArchivedOrders = async (req, res) => {
    try {
        const orders = await Order.find({ isArchived: true })
            .populate('items.foodId')
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching archived orders', error: error.message });
    }
};

// Get kitchen orders (active orders)
exports.getKitchenOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            status: { $in: ['Pending', 'Confirmed', 'Preparing', 'Ready'] },
            isArchived: false
        })
        .populate('items.foodId')
        .sort({ createdAt: 1 });
        
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching kitchen orders', error: error.message });
    }
};

// Get order statistics
exports.getOrderStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const stats = await Order.aggregate([
            {
                $facet: {
                    totalRevenue: [
                        { $match: { status: 'Delivered' } },
                        { $group: { _id: null, total: { $sum: "$total" } } }
                    ],
                    todayRevenue: [
                        { $match: { createdAt: { $gte: today }, status: 'Delivered' } },
                        { $group: { _id: null, total: { $sum: "$total" } } }
                    ],
                    averageOrderValue: [
                        { $match: { status: 'Delivered' } },
                        { $group: { _id: null, avg: { $avg: "$total" } } }
                    ],
                    totalOrders: [
                        { $count: "count" }
                    ],
                    pendingOrders: [
                        { $match: { status: 'Pending' } },
                        { $count: "count" }
                    ]
                }
            }
        ]);
        
        res.json({
            totalRevenue: stats[0].totalRevenue[0]?.total || 0,
            todayRevenue: stats[0].todayRevenue[0]?.total || 0,
            averageOrderValue: stats[0].averageOrderValue[0]?.avg || 0,
            totalOrders: stats[0].totalOrders[0]?.count || 0,
            pendingOrders: stats[0].pendingOrders[0]?.count || 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        if (order.status !== 'Pending' && order.status !== 'Confirmed') {
            return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
        }
        
        order.status = 'Cancelled';
        order.cancelledAt = new Date();
        await order.save();
        
        res.json({ message: 'Order cancelled successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling order', error: error.message });
    }
};

// Reorder previous order
exports.reorder = async (req, res) => {
    try {
        const previousOrder = await Order.findById(req.params.id);
        
        if (!previousOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            cart = new Cart({ user: req.user.id, items: [] });
        }
        
        // Add items from previous order to cart
        for (const item of previousOrder.items) {
            const existingItem = cart.items.find(i => i.foodId.toString() === item.foodId.toString());
            if (existingItem) {
                existingItem.quantity += item.quantity;
            } else {
                cart.items.push({
                    foodId: item.foodId,
                    quantity: item.quantity,
                    specialInstructions: item.specialInstructions
                });
            }
        }
        
        await cart.save();
        res.json({ message: 'Items added to cart', cart });
    } catch (error) {
        res.status(500).json({ message: 'Error reordering', error: error.message });
    }
};

// Edit order (staff/admin)
exports.editOrder = async (req, res) => {
    try {
        const { items, specialInstructions, tableId } = req.body;
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        if (order.status !== 'Pending' && order.status !== 'Confirmed') {
            return res.status(400).json({ message: 'Order cannot be edited at this stage' });
        }
        
        if (items) {
            order.items = items;
            // Recalculate totals
            order.subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            order.total = order.subtotal + order.tax + order.deliveryFee - order.discount;
        }
        
        if (specialInstructions) order.specialInstructions = specialInstructions;
        if (tableId) order.table = tableId;
        
        await order.save();
        res.json({ message: 'Order updated successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Error editing order', error: error.message });
    }
};

// Return order to kitchen (with reason)
exports.returnOrderToKitchen = async (req, res) => {
    try {
        const { returnReason } = req.body;
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Store return history
        const returnHistory = order.returnHistory || [];
        returnHistory.push({
            returnedAt: new Date(),
            reason: returnReason,
            previousStatus: order.status,
            returnedBy: req.user.id
        });
        
        order.status = 'Preparing';
        order.returnHistory = returnHistory;
        order.returnCount = (order.returnCount || 0) + 1;
        order.returnReason = returnReason;
        order.returnedAt = new Date();
        
        await order.save();
        
        res.json({ 
            message: 'Order returned to kitchen', 
            order,
            returnCount: order.returnCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Error returning order to kitchen', error: error.message });
    }
};

// Get return history for an order
exports.getReturnHistory = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        res.json({
            returnCount: order.returnCount || 0,
            returnHistory: order.returnHistory || [],
            lastReturnReason: order.returnReason,
            lastReturnedAt: order.returnedAt
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching return history', error: error.message });
    }
};

// Archive old orders (cron job)
exports.archiveOldOrders = async () => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const result = await Order.updateMany(
            {
                createdAt: { $lt: thirtyDaysAgo },
                status: { $in: ['Delivered', 'Cancelled'] },
                isArchived: false
            },
            { isArchived: true }
        );
        
        console.log(`📦 Archived ${result.modifiedCount} old orders`);
        return result;
    } catch (error) {
        console.error('Error archiving orders:', error);
    }
};