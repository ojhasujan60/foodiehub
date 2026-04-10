// Take Order System - Staff Portal (Dine-in & Takeaway Only)
import { getToken, getUser, showNotification, formatCurrency } from '../customer/global.js';

let menuItems = [];
let currentCart = [];
let currentCategory = 'all';
let currentSearch = '';
let currentPage = 1;
let itemsPerPage = 12;
let currentOrderType = 'Dine-in'; // Default to Dine-in

// DOM Elements
const menuContainer = document.getElementById('menu-items');
const orderItemsContainer = document.getElementById('order-items');
const cartItemCount = document.getElementById('cart-item-count');
const subtotalSpan = document.getElementById('subtotal');
const taxSpan = document.getElementById('tax');
const totalSpan = document.getElementById('total');
const orderItemsCountSpan = document.getElementById('order-items-count');
const orderTotalDisplaySpan = document.getElementById('order-total-display');
const tableSelect = document.getElementById('table-select');
const pickupInfo = document.getElementById('pickup-info');
const tableSelection = document.getElementById('table-selection');
const pickupName = document.getElementById('pickup-name');
const pickupPhone = document.getElementById('pickup-phone');
const specialInstructions = document.getElementById('special-instructions');
const clearCartBtn = document.getElementById('clear-cart-btn');
const placeOrderBtn = document.getElementById('place-order-btn');
const searchInput = document.getElementById('search-menu');

// Update current time
function updateTime() {
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
}
setInterval(updateTime, 1000);
updateTime();

// ============================================
// LOAD MENU ITEMS
// ============================================

async function loadMenu() {
    if (!menuContainer) return;
    
    menuContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading menu...</p></div>';
    
    try {
        const menu = JSON.parse(localStorage.getItem('menu') || '[]');
        // Filter out unavailable and out of stock items
        menuItems = menu.filter(item => item.isAvailable !== false && !item.isOutOfStock);
        renderMenu();
    } catch (error) {
        console.error('Error loading menu:', error);
        menuContainer.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load menu</p></div>';
    }
}

// ============================================
// RENDER MENU
// ============================================

function renderMenu() {
    if (!menuContainer) return;
    
    let filtered = [...menuItems];
    
    if (currentCategory !== 'all') {
        filtered = filtered.filter(item => item.category === currentCategory);
    }
    
    if (currentSearch) {
        filtered = filtered.filter(item => 
            item.name.toLowerCase().includes(currentSearch.toLowerCase())
        );
    }
    
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);
    
    if (paginated.length === 0) {
        menuContainer.innerHTML = '<div class="empty-state"><i class="fas fa-utensils"></i><p>No items found</p></div>';
        renderPagination(0);
        return;
    }
    
    let html = '<div class="menu-items-grid">';
    for (const item of paginated) {
        const escapedName = item.name.replace(/'/g, "\\'");
        html += `
            <div class="menu-item-card">
                <div class="menu-item-info">
                    <h4 class="menu-item-name">${escapeHtml(item.name)}</h4>
                    <p class="menu-item-price">${formatCurrency(item.price)}</p>
                    ${item.description ? `<p class="menu-item-desc">${escapeHtml(item.description.substring(0, 40))}...</p>` : ''}
                    ${item.isVegetarian ? '<span class="badge badge-success" style="font-size: 0.6rem;"><i class="fas fa-leaf"></i> Veg</span>' : ''}
                    ${item.spicyLevel > 0 ? `<span class="badge" style="background: #fff3e0; color: #ff9800; font-size: 0.6rem;">🌶️ ${item.spicyLevel}/5</span>` : ''}
                </div>
                <button class="add-to-cart-btn" onclick="window.addToCart('${item._id}', '${escapedName}', ${item.price})">
                    <i class="fas fa-plus"></i> Add
                </button>
            </div>
        `;
    }
    html += '</div>';
    menuContainer.innerHTML = html;
    
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let paginationHtml = '<div class="pagination-controls">';
    for (let i = 1; i <= totalPages; i++) {
        paginationHtml += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="window.goToPage(${i})">${i}</button>`;
    }
    paginationHtml += '</div>';
    paginationDiv.innerHTML = paginationHtml;
}

// ============================================
// LOAD TABLES
// ============================================

async function loadTables() {
    if (!tableSelect) return;
    
    try {
        const tables = JSON.parse(localStorage.getItem('tables') || '[]');
        const availableTables = tables.filter(t => t.isAvailable !== false);
        const occupiedTables = tables.filter(t => t.isAvailable === false);
        
        let options = '';
        
        if (availableTables.length > 0) {
            options += '<optgroup label="🟢 Available Tables">';
            availableTables.sort((a, b) => a.tableNumber - b.tableNumber).forEach(table => {
                options += `<option value="${table._id}">Table ${table.tableNumber} - ${table.capacity} seats (${table.location})</option>`;
            });
            options += '</optgroup>';
        }
        
        if (occupiedTables.length > 0) {
            options += '<optgroup label="🔴 Occupied Tables">';
            occupiedTables.sort((a, b) => a.tableNumber - b.tableNumber).forEach(table => {
                options += `<option value="${table._id}" disabled>Table ${table.tableNumber} - Occupied</option>`;
            });
            options += '</optgroup>';
        }
        
        if (availableTables.length === 0) {
            options = '<option value="">No tables available - Walk-in only</option>';
        } else {
            options = '<option value="">Select a table</option>' + options;
        }
        
        tableSelect.innerHTML = options;
        
    } catch (error) {
        console.error('Error loading tables:', error);
        tableSelect.innerHTML = '<option value="">Error loading tables</option>';
    }
}

// ============================================
// ORDER TYPE SWITCHING
// ============================================

function initOrderTypeSwitcher() {
    const orderTypeBtns = document.querySelectorAll('.order-type-btn');
    
    orderTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            orderTypeBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'white';
                b.style.color = '#666';
            });
            btn.classList.add('active');
            btn.style.background = '#ff6b6b';
            btn.style.color = 'white';
            
            currentOrderType = btn.dataset.type;
            
            // Show/hide relevant sections
            if (currentOrderType === 'Dine-in') {
                tableSelection.style.display = 'block';
                pickupInfo.style.display = 'none';
            } else {
                tableSelection.style.display = 'none';
                pickupInfo.style.display = 'block';
            }
        });
    });
}

// ============================================
// CART FUNCTIONS
// ============================================

window.addToCart = function(id, name, price) {
    const existing = currentCart.find(item => item.id === id);
    if (existing) {
        existing.quantity++;
    } else {
        currentCart.push({ id, name, price, quantity: 1 });
    }
    updateCart();
    showNotification(`${name} added to order`, 'success');
};

window.updateQuantity = function(index, delta) {
    if (currentCart[index]) {
        const newQty = currentCart[index].quantity + delta;
        if (newQty <= 0) {
            currentCart.splice(index, 1);
        } else {
            currentCart[index].quantity = newQty;
        }
        updateCart();
    }
};

window.removeItem = function(index) {
    if (confirm('Remove this item from order?')) {
        currentCart.splice(index, 1);
        updateCart();
        showNotification('Item removed', 'success');
    }
};

window.goToPage = function(page) {
    currentPage = page;
    renderMenu();
};

function updateCart() {
    const totalItems = currentCart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax;
    
    if (cartItemCount) cartItemCount.textContent = `${totalItems} items`;
    if (orderItemsCountSpan) orderItemsCountSpan.textContent = totalItems;
    if (subtotalSpan) subtotalSpan.textContent = formatCurrency(subtotal);
    if (taxSpan) taxSpan.textContent = formatCurrency(tax);
    if (totalSpan) totalSpan.textContent = formatCurrency(total);
    if (orderTotalDisplaySpan) orderTotalDisplaySpan.textContent = formatCurrency(total);
    
    if (!orderItemsContainer) return;
    
    if (currentCart.length === 0) {
        orderItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>No items added yet</p>
                <small>Click on items to add to order</small>
            </div>
        `;
        return;
    }
    
    let cartHtml = '';
    for (let i = 0; i < currentCart.length; i++) {
        const item = currentCart[i];
        cartHtml += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${escapeHtml(item.name)}</div>
                    <div class="cart-item-price">${formatCurrency(item.price)} each</div>
                </div>
                <div class="cart-item-actions">
                    <button class="qty-btn" onclick="window.updateQuantity(${i}, -1)">-</button>
                    <span class="cart-qty">${item.quantity}</span>
                    <button class="qty-btn" onclick="window.updateQuantity(${i}, 1)">+</button>
                    <span class="item-total">${formatCurrency(item.price * item.quantity)}</span>
                    <button class="remove-btn" onclick="window.removeItem(${i})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }
    orderItemsContainer.innerHTML = cartHtml;
}

function clearCart() {
    if (currentCart.length > 0 && confirm('Clear all items from order?')) {
        currentCart = [];
        updateCart();
        showNotification('Order cleared', 'success');
    }
}

// ============================================
// PLACE ORDER
// ============================================

async function placeOrder() {
    if (currentCart.length === 0) {
        showNotification('No items in order', 'error');
        return;
    }
    
    // Validate based on order type
    if (currentOrderType === 'Dine-in') {
        const tableId = tableSelect?.value;
        if (!tableId) {
            showNotification('Please select a table for Dine-in order', 'error');
            return;
        }
    } else if (currentOrderType === 'Takeaway') {
        const name = pickupName?.value.trim();
        const phone = pickupPhone?.value.trim();
        if (!name || !phone) {
            showNotification('Please enter customer name and phone for Takeaway', 'error');
            return;
        }
    }
    
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax;
    
    // Get full menu for item details
    const menu = JSON.parse(localStorage.getItem('menu') || '[]');
    
    const orderData = {
        _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        orderNumber: 'ORD' + Date.now().toString().slice(-6),
        items: currentCart.map(item => {
            const food = menu.find(f => f._id === item.id);
            return {
                foodId: food || { name: item.name, price: item.price },
                quantity: item.quantity,
                price: item.price
            };
        }),
        subtotal: subtotal,
        tax: tax,
        total: total,
        orderType: currentOrderType,
        paymentMethod: 'Cash',
        specialInstructions: specialInstructions?.value || '',
        status: 'Confirmed', // Auto-confirm for staff orders
        createdAt: new Date().toISOString()
    };
    
    // Add order-type specific fields
    if (currentOrderType === 'Dine-in') {
        const tableId = tableSelect?.value;
        const tables = JSON.parse(localStorage.getItem('tables') || '[]');
        const table = tables.find(t => t._id === tableId);
        orderData.table = table || null;
        
        // Mark table as occupied
        if (table) {
            const tableIndex = tables.findIndex(t => t._id === tableId);
            tables[tableIndex].isAvailable = false;
            localStorage.setItem('tables', JSON.stringify(tables));
        }
    } else {
        orderData.pickupName = pickupName?.value || 'Guest';
        orderData.pickupPhone = pickupPhone?.value || '';
    }
    
    // Add staff info
    const user = getUser();
    if (user) {
        orderData.createdBy = {
            _id: user._id,
            name: user.name,
            role: user.role
        };
    }
    
    // Disable button during processing
    const placeBtn = document.getElementById('place-order-btn');
    const originalText = placeBtn?.innerHTML;
    if (placeBtn) {
        placeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing...';
        placeBtn.disabled = true;
    }
    
    try {
        // Save order to localStorage
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        orders.push(orderData);
        localStorage.setItem('orders', JSON.stringify(orders));
        
        showNotification(`Order #${orderData.orderNumber} placed successfully!`, 'success');
        
        // Clear cart and form
        currentCart = [];
        updateCart();
        if (specialInstructions) specialInstructions.value = '';
        if (pickupName) pickupName.value = '';
        if (pickupPhone) pickupPhone.value = '';
        
        // Reload tables
        await loadTables();
        
        // Refresh widgets
        loadKitchenAlerts();
        loadTableStatus();
        loadTodayStats();
        
    } catch (error) {
        console.error('Place order error:', error);
        showNotification('Failed to place order', 'error');
    } finally {
        if (placeBtn) {
            placeBtn.innerHTML = originalText || '<i class="fas fa-receipt"></i> Place Order';
            placeBtn.disabled = false;
        }
    }
}

// ============================================
// WIDGET FUNCTIONS
// ============================================

async function loadKitchenAlerts() {
    const container = document.getElementById('kitchen-alerts');
    if (!container) return;
    
    try {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Confirmed');
        
        if (pendingOrders.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>No pending alerts</p></div>';
            return;
        }
        
        let alertsHtml = '';
        for (let i = 0; i < Math.min(pendingOrders.length, 5); i++) {
            const order = pendingOrders[i];
            alertsHtml += `
                <div class="alert-item">
                    <span class="alert-type">${order.orderType === 'Dine-in' ? '🍽️' : '📦'}</span>
                    <span class="alert-detail">${order.orderType === 'Dine-in' ? `Table ${order.table?.tableNumber || 'N/A'}` : `Pickup: ${order.pickupName || 'Guest'}`}</span>
                    <span class="alert-status ${order.status.toLowerCase()}">${order.status}</span>
                </div>
            `;
        }
        container.innerHTML = alertsHtml;
        
    } catch (error) {
        container.innerHTML = '<div class="empty-state"><p>No alerts</p></div>';
    }
}

async function loadTableStatus() {
    const container = document.getElementById('table-status-grid');
    if (!container) return;
    
    try {
        const tables = JSON.parse(localStorage.getItem('tables') || '[]');
        
        let statusHtml = '';
        for (let i = 0; i < Math.min(tables.length, 6); i++) {
            const table = tables[i];
            statusHtml += `
                <div class="table-status ${table.isAvailable !== false ? 'available' : 'occupied'}">
                    <span class="table-num">Table ${table.tableNumber}</span>
                    <span class="table-status-text">${table.isAvailable !== false ? '🟢 Free' : '🔴 Occupied'}</span>
                </div>
            `;
        }
        container.innerHTML = statusHtml;
        
    } catch (error) {
        container.innerHTML = '<div class="empty-state">Loading tables...</div>';
    }
}

async function loadTodayStats() {
    const container = document.getElementById('today-stats');
    if (!container) return;
    
    try {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter(o => o.createdAt?.split('T')[0] === today);
        const totalRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
        
        container.innerHTML = `
            <div class="stat-item"><span>📋 Orders:</span><strong>${todayOrders.length}</strong></div>
            <div class="stat-item"><span>💰 Revenue:</span><strong>${formatCurrency(totalRevenue)}</strong></div>
            <div class="stat-item"><span>📊 Avg Order:</span><strong>${formatCurrency(todayOrders.length ? totalRevenue / todayOrders.length : 0)}</strong></div>
            <div class="stat-item"><span>🍽️ Dine-in:</span><strong>${todayOrders.filter(o => o.orderType === 'Dine-in').length}</strong></div>
            <div class="stat-item"><span>📦 Takeaway:</span><strong>${todayOrders.filter(o => o.orderType === 'Takeaway').length}</strong></div>
        `;
        
    } catch (error) {
        container.innerHTML = '<div class="empty-state">Loading stats...</div>';
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================
// EVENT LISTENERS
// ============================================

if (clearCartBtn) {
    clearCartBtn.addEventListener('click', clearCart);
}

if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', placeOrder);
}

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        currentPage = 1;
        renderMenu();
    });
}

// Category filters
const categoryFilters = document.querySelectorAll('.cat-filter');
categoryFilters.forEach(btn => {
    btn.addEventListener('click', () => {
        categoryFilters.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;
        currentPage = 1;
        renderMenu();
    });
});

// ============================================
// INITIALIZE
// ============================================

async function init() {
    const user = getUser();
    const userNameSpan = document.getElementById('user-name');
    if (userNameSpan && user) {
        userNameSpan.textContent = user.name?.split(' ')[0] || 'Staff';
    }
    
    const adminLink = document.getElementById('admin-link');
    if (adminLink && user?.role === 'admin') {
        adminLink.style.display = 'block';
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/customer/login.html';
        });
    }
    
    initOrderTypeSwitcher();
    await loadMenu();
    await loadTables();
    await loadKitchenAlerts();
    await loadTableStatus();
    await loadTodayStats();
    
    // Auto-refresh widgets every 30 seconds
    setInterval(() => {
        loadKitchenAlerts();
        loadTableStatus();
        loadTodayStats();
    }, 30000);
}

// Make functions global for HTML onclick
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
window.goToPage = goToPage;

// Start
init();