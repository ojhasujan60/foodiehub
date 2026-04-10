import { getToken, formatCurrency, formatDate, isStaff } from '../customer/global.js';

if (!isStaff()) {
  alert('Access denied. Staff only.');
  window.location.href = '/customer/login.html';
}

// DOM Elements
const pendingOrdersSpan = document.getElementById('pending-orders');
const preparingOrdersSpan = document.getElementById('preparing-orders');
const readyOrdersSpan = document.getElementById('ready-orders');
const todayReservationsSpan = document.getElementById('today-reservations');
const kitchenAlertsDiv = document.getElementById('kitchen-alerts');
const tableStatusDiv = document.getElementById('table-status-grid');
const todayStatsDiv = document.getElementById('today-stats');
const upcomingReservationsDiv = document.getElementById('upcoming-reservations');
const recentOrdersDiv = document.getElementById('recent-orders');

// Load all dashboard data
async function loadDashboard() {
  await loadQuickStats();
  await loadKitchenAlerts();
  await loadTableStatus();
  await loadTodayStats();
  await loadUpcomingReservations();
  await loadRecentOrders();
}

// Load quick stats
async function loadQuickStats() {
  const token = getToken();
  try {
    const response = await fetch('/api/orders/all', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const orders = await response.json();
    
    const pending = orders.filter(o => o.status === 'Pending').length;
    const preparing = orders.filter(o => o.status === 'Preparing').length;
    const ready = orders.filter(o => o.status === 'Ready').length;
    
    if (pendingOrdersSpan) pendingOrdersSpan.textContent = pending;
    if (preparingOrdersSpan) preparingOrdersSpan.textContent = preparing;
    if (readyOrdersSpan) readyOrdersSpan.textContent = ready;
    
    // Load today's reservations count
    const today = new Date().toISOString().split('T')[0];
    const resResponse = await fetch(`/api/reservations/all?date=${today}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const reservations = await resResponse.json();
    if (todayReservationsSpan) todayReservationsSpan.textContent = reservations.length;
    
  } catch (error) {
    console.error('Error loading quick stats:', error);
  }
}

// Load kitchen alerts (orders that need attention)
async function loadKitchenAlerts() {
  if (!kitchenAlertsDiv) return;
  
  const token = getToken();
  try {
    const response = await fetch('/api/orders/kitchen', {
      headers: { Authorization: `Bearer ${token}` }
    });
    let orders = await response.json();
    
    // Show orders that need attention (Confirmed, Preparing)
    const alerts = orders.filter(o => ['Confirmed', 'Preparing'].includes(o.status));
    
    if (alerts.length === 0) {
      kitchenAlertsDiv.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>All caught up! No pending kitchen alerts.</p></div>';
      return;
    }
    
    kitchenAlertsDiv.innerHTML = alerts.slice(0, 5).map(order => `
      <div class="alert-item" onclick="window.location.href='/staff/kitchen.html'">
        <div class="alert-icon ${order.status === 'Confirmed' ? 'pending' : 'preparing'}">
          <i class="fas ${order.status === 'Confirmed' ? 'fa-clock' : 'fa-cooking'}"></i>
        </div>
        <div class="alert-content">
          <div class="alert-title">Order #${order.orderNumber || order._id.slice(-6)}</div>
          <div class="alert-detail">${order.items.length} items • ${order.orderType}</div>
          <div class="alert-time">${formatDate(order.createdAt)}</div>
        </div>
        <div class="alert-status">${order.status}</div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading kitchen alerts:', error);
    kitchenAlertsDiv.innerHTML = '<div class="empty-state">Error loading alerts</div>';
  }
}

// Load table status
async function loadTableStatus() {
  if (!tableStatusDiv) return;
  
  const token = getToken();
  try {
    const response = await fetch('/api/tables', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const tables = await response.json();
    
    if (tables.length === 0) {
      tableStatusDiv.innerHTML = '<div class="empty-state">No tables configured</div>';
      return;
    }
    
    tableStatusDiv.innerHTML = tables.map(table => `
      <div class="table-status-item ${table.isAvailable ? 'available' : 'occupied'}" 
           onclick="window.location.href='/staff/tables.html'">
        <div class="table-number">Table ${table.tableNumber}</div>
        <div class="table-status">${table.isAvailable ? 'Available' : 'Occupied'}</div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading table status:', error);
    tableStatusDiv.innerHTML = '<div class="empty-state">Error loading tables</div>';
  }
}

// Load today's stats
async function loadTodayStats() {
  if (!todayStatsDiv) return;
  
  const token = getToken();
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const [ordersResponse, reservationsResponse] = await Promise.all([
      fetch('/api/orders/all', { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/reservations/all?date=${today}`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    
    const orders = await ordersResponse.json();
    const reservations = await reservationsResponse.json();
    
    const todayOrders = orders.filter(o => o.createdAt?.split('T')[0] === today);
    const completedOrders = todayOrders.filter(o => o.status === 'Completed');
    const totalRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    
    todayStatsDiv.innerHTML = `
      <div class="stat-row">
        <span class="stat-label">Today's Orders</span>
        <span class="stat-value">${todayOrders.length}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Completed Orders</span>
        <span class="stat-value">${completedOrders.length}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Today's Revenue</span>
        <span class="stat-value">${formatCurrency(totalRevenue)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Avg. Order Value</span>
        <span class="stat-value">${formatCurrency(todayOrders.length ? totalRevenue / todayOrders.length : 0)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Reservations Today</span>
        <span class="stat-value">${reservations.length}</span>
      </div>
    `;
    
  } catch (error) {
    console.error('Error loading today stats:', error);
    todayStatsDiv.innerHTML = '<div class="empty-state">Error loading stats</div>';
  }
}

// Load upcoming reservations
async function loadUpcomingReservations() {
  if (!upcomingReservationsDiv) return;
  
  const token = getToken();
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const response = await fetch('/api/reservations/all', {
      headers: { Authorization: `Bearer ${token}` }
    });
    let reservations = await response.json();
    
    // Filter upcoming (today and future, not cancelled)
    const upcoming = reservations.filter(r => 
      new Date(r.date) >= new Date(today) && 
      r.status !== 'Cancelled' && 
      r.status !== 'Completed'
    ).slice(0, 5);
    
    if (upcoming.length === 0) {
      upcomingReservationsDiv.innerHTML = '<div class="empty-state">No upcoming reservations</div>';
      return;
    }
    
    upcomingReservationsDiv.innerHTML = upcoming.map(res => `
      <div class="reminder-item" onclick="window.location.href='/staff/reservations.html'">
        <div class="reminder-time">${res.time}</div>
        <div class="reminder-info">
          <div class="reminder-name">${res.user?.name || 'Guest'}</div>
          <div class="reminder-detail">${res.numberOfGuests} guests • Table ${res.table?.tableNumber || 'N/A'}</div>
        </div>
        <div class="reminder-status status-${res.status.toLowerCase()}">${res.status}</div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading upcoming reservations:', error);
    upcomingReservationsDiv.innerHTML('<div class="empty-state">Error loading reservations</div>');
  }
}

// Load recent orders
async function loadRecentOrders() {
  if (!recentOrdersDiv) return;
  
  const token = getToken();
  try {
    const response = await fetch('/api/orders/all', {
      headers: { Authorization: `Bearer ${token}` }
    });
    let orders = await response.json();
    
    const recentOrders = orders.slice(0, 5);
    
    if (recentOrders.length === 0) {
      recentOrdersDiv.innerHTML = '<div class="empty-state">No recent orders</div>';
      return;
    }
    
    recentOrdersDiv.innerHTML = recentOrders.map(order => `
      <div class="alert-item" onclick="window.location.href='/staff/orders.html'">
        <div class="alert-icon ${order.status === 'Pending' ? 'pending' : order.status === 'Preparing' ? 'preparing' : order.status === 'Ready' ? 'ready' : 'completed'}">
          <i class="fas ${order.status === 'Pending' ? 'fa-clock' : order.status === 'Preparing' ? 'fa-cooking' : order.status === 'Ready' ? 'fa-check' : 'fa-receipt'}"></i>
        </div>
        <div class="alert-content">
          <div class="alert-title">Order #${order.orderNumber || order._id.slice(-6)}</div>
          <div class="alert-detail">${order.items.length} items • ${formatCurrency(order.total)}</div>
          <div class="alert-time">${formatDate(order.createdAt)}</div>
        </div>
        <div class="order-status status-${order.status.toLowerCase()}">${order.status}</div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading recent orders:', error);
    recentOrdersDiv.innerHTML = '<div class="empty-state">Error loading orders</div>';
  }
}

// Update user name
const user = JSON.parse(localStorage.getItem('user') || '{}');
const userNameSpan = document.getElementById('user-name');
if (userNameSpan && user.name) {
  userNameSpan.textContent = user.name.split(' ')[0];
}

// Logout
document.getElementById('logout-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/customer/login.html';
});

// Initialize dashboard
loadDashboard();

// Auto-refresh every 30 seconds
setInterval(loadDashboard, 30000);