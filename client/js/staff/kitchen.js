// Kitchen Display System - Dine-in & Takeaway Only
let currentOrders = [];
let currentFilter = 'all';

function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `kitchen-notification ${type}`;
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const minutes = Math.floor((new Date() - date) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
}

// ============================================
// UPDATE ORDER STATUS
// ============================================

window.updateOrderStatus = async function(orderId, status) {
    try {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        const orderIndex = orders.findIndex(o => o._id === orderId);
        
        if (orderIndex !== -1) {
            orders[orderIndex].status = status;
            
            if (status === 'Served' || status === 'Completed') {
                orders[orderIndex].completedAt = new Date().toISOString();
                
                // Free up table if Dine-in
                if (orders[orderIndex].orderType === 'Dine-in' && orders[orderIndex].table) {
                    const tables = JSON.parse(localStorage.getItem('tables') || '[]');
                    const tableIndex = tables.findIndex(t => t._id === orders[orderIndex].table._id);
                    if (tableIndex !== -1) {
                        tables[tableIndex].isAvailable = true;
                        localStorage.setItem('tables', JSON.stringify(tables));
                    }
                }
            }
            
            if (status === 'Cancelled') {
                orders[orderIndex].cancelledAt = new Date().toISOString();
                
                // Free up table if Dine-in
                if (orders[orderIndex].orderType === 'Dine-in' && orders[orderIndex].table) {
                    const tables = JSON.parse(localStorage.getItem('tables') || '[]');
                    const tableIndex = tables.findIndex(t => t._id === orders[orderIndex].table._id);
                    if (tableIndex !== -1) {
                        tables[tableIndex].isAvailable = true;
                        localStorage.setItem('tables', JSON.stringify(tables));
                    }
                }
            }
            
            localStorage.setItem('orders', JSON.stringify(orders));
            showNotification(`Order status updated to ${status}`, 'success');
            loadKitchenOrders();
        }
    } catch (error) {
        showNotification('Failed to update status', 'error');
    }
};

// ============================================
// RENDER ORDERS
// ============================================

function renderOrders(orders) {
    const container = document.getElementById('kitchen-orders-container');
    if (!container) return;
    currentOrders = orders;
    
    // Filter out delivered/completed/cancelled orders for active view
    const activeOrders = orders.filter(o => 
        !['Delivered', 'Completed', 'Cancelled', 'Served'].includes(o.status)
    );
    
    let filteredOrders = activeOrders;
    
    if (currentFilter === 'dinein') {
        filteredOrders = activeOrders.filter(o => o.orderType === 'Dine-in');
    } else if (currentFilter === 'takeaway') {
        filteredOrders = activeOrders.filter(o => o.orderType === 'Takeaway');
    } else if (currentFilter === 'pending') {
        filteredOrders = activeOrders.filter(o => o.status === 'Pending' || o.status === 'Confirmed');
    } else if (currentFilter === 'preparing') {
        filteredOrders = activeOrders.filter(o => o.status === 'Preparing');
    } else if (currentFilter === 'ready') {
        filteredOrders = activeOrders.filter(o => o.status === 'Ready');
    }
    
    // Sort by urgency (older first) and status priority
    filteredOrders.sort((a, b) => {
        const statusPriority = { 'Pending': 1, 'Confirmed': 2, 'Preparing': 3, 'Ready': 4 };
        const aPriority = statusPriority[a.status] || 5;
        const bPriority = statusPriority[b.status] || 5;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(a.createdAt) - new Date(b.createdAt);
    });
    
    // Update stats
    document.getElementById('pending-count').textContent = activeOrders.filter(o => o.status === 'Pending' || o.status === 'Confirmed').length;
    document.getElementById('preparing-count').textContent = activeOrders.filter(o => o.status === 'Preparing').length;
    document.getElementById('ready-count').textContent = activeOrders.filter(o => o.status === 'Ready').length;
    document.getElementById('total-count').textContent = activeOrders.length;
    
    if (filteredOrders.length === 0) {
        container.innerHTML = `<div class="kitchen-empty-state"><i class="fas fa-check-circle"></i><h3>No active orders</h3><p>All caught up! Great work!</p></div>`;
        return;
    }
    
    let html = '<div class="kitchen-orders-grid">';
    
    for (const order of filteredOrders) {
        const isUrgent = (new Date() - new Date(order.createdAt)) > 1800000; // 30 minutes
        const isDineIn = order.orderType === 'Dine-in';
        
        html += `
            <div class="kitchen-order-card ${isUrgent ? 'urgent' : ''}">
                <div class="kitchen-order-header">
                    <div class="kitchen-order-type">
                        <span class="kitchen-badge-${isDineIn ? 'dinein' : 'pickup'}">
                            <i class="fas ${isDineIn ? 'fa-utensils' : 'fa-box'}"></i> ${isDineIn ? 'DINE IN' : 'TAKEAWAY'}
                        </span>
                        <span class="kitchen-order-location">
                            ${isDineIn ? `Table ${order.table?.tableNumber || 'N/A'}` : `Pickup: ${order.pickupName || 'Guest'}`}
                        </span>
                    </div>
                    <div class="kitchen-order-timer ${isUrgent ? 'warning' : ''}">
                        <i class="fas fa-clock"></i> ${formatTimeAgo(order.createdAt)}
                    </div>
                    <span class="kitchen-status-badge kitchen-status-${order.status?.toLowerCase() || 'pending'}">
                        ${order.status || 'Pending'}
                    </span>
                </div>
                
                <div class="kitchen-order-body">
                    ${!isDineIn && order.pickupPhone ? 
                        `<div class="kitchen-customer-name"><i class="fas fa-phone"></i> ${order.pickupPhone}</div>` : ''}
                    
                    <ul class="kitchen-items-list">
                        ${order.items.map(item => `
                            <li>
                                <span class="kitchen-item-name">${item.quantity}x ${item.foodId?.name || 'Item'}</span>
                                ${item.specialInstructions ? 
                                    `<span class="kitchen-item-note" style="font-size: 0.65rem; color: #ff9800; display: block;">
                                        <i class="fas fa-comment"></i> ${item.specialInstructions}
                                    </span>` : ''}
                            </li>
                        `).join('')}
                    </ul>
                    
                    ${order.specialInstructions ? 
                        `<div class="kitchen-special-notes"><i class="fas fa-comment-dots"></i> ${order.specialInstructions}</div>` : ''}
                </div>
                
                <div class="kitchen-order-actions">
                    ${order.status === 'Pending' || order.status === 'Confirmed' ? 
                        `<button class="kitchen-btn-sm btn btn-primary" onclick="window.updateOrderStatus('${order._id}', 'Preparing')">
                            <i class="fas fa-fire"></i> Start Preparing
                        </button>` : ''}
                    
                    ${order.status === 'Preparing' ? 
                        `<button class="kitchen-btn-sm btn btn-success" onclick="window.updateOrderStatus('${order._id}', 'Ready')">
                            <i class="fas fa-check-double"></i> Mark Ready
                        </button>` : ''}
                    
                    ${order.status === 'Ready' ? 
                        `<button class="kitchen-btn-sm btn btn-warning" onclick="window.updateOrderStatus('${order._id}', 'Served')">
                            <i class="fas fa-hands-clapping"></i> Serve
                        </button>` : ''}
                    
                    <button class="kitchen-btn-sm btn btn-danger" onclick="if(confirm('Cancel this order?')) window.updateOrderStatus('${order._id}', 'Cancelled')">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// LOAD KITCHEN ORDERS
// ============================================

async function loadKitchenOrders() {
    const container = document.getElementById('kitchen-orders-container');
    if (container) {
        container.innerHTML = '<div class="kitchen-loading-state"><div class="kitchen-spinner"></div><p>Loading orders...</p></div>';
    }
    
    try {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        renderOrders(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
        if (container) {
            container.innerHTML = `<div class="kitchen-empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error loading orders</h3><button onclick="location.reload()" class="btn btn-primary">Refresh</button></div>`;
        }
    }
}

// ============================================
// INITIALIZE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    
    if (document.getElementById('user-name') && user) {
        document.getElementById('user-name').textContent = user.name?.split(' ')[0] || 'Staff';
    }
    
    if (document.getElementById('admin-link') && user?.role === 'admin') {
        document.getElementById('admin-link').style.display = 'block';
    }
    
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '/customer/login.html';
    });
    
    // Filter buttons
    document.querySelectorAll('.kitchen-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.kitchen-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            loadKitchenOrders();
        });
    });
    
    loadKitchenOrders();
    
    // Auto-refresh every 15 seconds
    setInterval(loadKitchenOrders, 15000);
});