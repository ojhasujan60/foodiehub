import { getToken, formatCurrency, isAdmin, showNotification } from '../customer/global.js';

// Check admin access
if (!isAdmin()) {
  alert('Access denied. Admin only.');
  window.location.href = '../customer/login.html';
}

// Chart instances
let salesChart = null;
let orderDistributionChart = null;
let topItemsChart = null;
let reservationChart = null;

// Load dashboard data
async function loadDashboard() {
  const token = getToken();
  
  try {
    // For demo, use localStorage data
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    const tables = JSON.parse(localStorage.getItem('tables') || '[]');
    const menu = JSON.parse(localStorage.getItem('menu') || '[]');
    
    // Update stats
    updateStats(orders, users, reservations, tables);
    
    // Load charts
    loadSalesChart(orders);
    loadOrderDistribution(orders);
    loadTopItems(orders, menu);
    loadReservationTrends(reservations);
    loadRecentActivity(orders, reservations);
    loadRecentOrders(orders);
    loadTodayReservations(reservations, tables);
    
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

function updateStats(orders, users, reservations, tables) {
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const thisMonthOrders = orders.filter(o => {
    const d = new Date(o.createdAt);
    return d.getMonth() === new Date().getMonth();
  });
  const lastMonthOrders = orders.filter(o => {
    const d = new Date(o.createdAt);
    return d.getMonth() === new Date().getMonth() - 1;
  });
  
  const revenueTrend = lastMonthOrders.length > 0 
    ? ((thisMonthOrders.reduce((s,o) => s + o.total, 0) - lastMonthOrders.reduce((s,o) => s + o.total, 0)) / lastMonthOrders.reduce((s,o) => s + o.total, 0) * 100).toFixed(1)
    : 0;
  
  document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue);
  document.getElementById('total-orders').textContent = orders.length;
  document.getElementById('total-users').textContent = users.filter(u => u.role === 'customer').length;
  
  const availableTables = tables.filter(t => t.isAvailable !== false).length;
  document.getElementById('active-tables').textContent = `${availableTables}/${tables.length}`;
  
  document.getElementById('revenue-trend').textContent = `${revenueTrend > 0 ? '+' : ''}${revenueTrend}% from last month`;
  document.getElementById('orders-trend').textContent = `+${thisMonthOrders.length} this month`;
  document.getElementById('users-trend').textContent = `+${users.filter(u => {
    const d = new Date(u.createdAt);
    return d > new Date(Date.now() - 7 * 86400000);
  }).length} this week`;
  document.getElementById('tables-trend').textContent = `${availableTables} available now`;
}

function loadSalesChart(orders) {
  const ctx = document.getElementById('sales-chart')?.getContext('2d');
  if (!ctx) return;
  
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOrders = orders.filter(o => o.createdAt?.split('T')[0] === dateStr);
    const revenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    last7Days.push({
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      revenue
    });
  }
  
  if (salesChart) salesChart.destroy();
  
  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: last7Days.map(d => d.date),
      datasets: [{
        label: 'Revenue (रु)',
        data: last7Days.map(d => d.revenue),
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function loadOrderDistribution(orders) {
  const ctx = document.getElementById('order-distribution-chart')?.getContext('2d');
  if (!ctx) return;
  
  const delivery = orders.filter(o => o.orderType === 'Delivery').length;
  const takeaway = orders.filter(o => o.orderType === 'Takeaway').length;
  const dinein = orders.filter(o => o.orderType === 'Dine-in').length;
  
  if (orderDistributionChart) orderDistributionChart.destroy();
  
  orderDistributionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Delivery', 'Takeaway', 'Dine-in'],
      datasets: [{
        data: [delivery, takeaway, dinein],
        backgroundColor: ['#ff6b6b', '#ffa502', '#4caf50']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function loadTopItems(orders, menu) {
  const ctx = document.getElementById('top-items-chart')?.getContext('2d');
  if (!ctx) return;
  
  const itemSales = {};
  orders.forEach(order => {
    order.items?.forEach(item => {
      const name = item.foodId?.name || item.name || 'Unknown';
      itemSales[name] = (itemSales[name] || 0) + (item.quantity || 1);
    });
  });
  
  const sorted = Object.entries(itemSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  if (topItemsChart) topItemsChart.destroy();
  
  topItemsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{
        label: 'Units Sold',
        data: sorted.map(s => s[1]),
        backgroundColor: '#ff6b6b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

function loadReservationTrends(reservations) {
  const ctx = document.getElementById('reservation-chart')?.getContext('2d');
  if (!ctx) return;
  
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const count = reservations.filter(r => r.date?.split('T')[0] === dateStr).length;
    last7Days.push({
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      count
    });
  }
  
  if (reservationChart) reservationChart.destroy();
  
  reservationChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: last7Days.map(d => d.date),
      datasets: [{
        label: 'Reservations',
        data: last7Days.map(d => d.count),
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function loadRecentActivity(orders, reservations) {
  const container = document.getElementById('recent-activity');
  if (!container) return;
  
  const activities = [];
  
  orders.slice(-5).reverse().forEach(order => {
    activities.push({
      type: 'order',
      title: `New order #${order.orderNumber || order._id?.slice(-6) || 'N/A'}`,
      detail: `${order.items?.length || 0} items • ${formatCurrency(order.total || 0)}`,
      time: new Date(order.createdAt),
      icon: '<i class="fas fa-shopping-cart"></i>'
    });
  });
  
  reservations.slice(-3).reverse().forEach(res => {
    activities.push({
      type: 'reservation',
      title: `Reservation for ${res.user?.name || 'Guest'}`,
      detail: `${res.numberOfGuests} guests at ${res.time}`,
      time: new Date(res.createdAt),
      icon: '<i class="fas fa-calendar-alt"></i>'
    });
  });
  
  activities.sort((a, b) => b.time - a.time);
  
  if (activities.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-clock"></i><p>No recent activity</p></div>';
    return;
  }
  
  container.innerHTML = activities.slice(0, 8).map(a => `
    <div class="activity-item">
      <div class="activity-icon">${a.icon}</div>
      <div class="activity-content">
        <div class="activity-title">${a.title}</div>
        <div class="activity-detail">${a.detail}</div>
        <div class="activity-time">${formatRelativeTime(a.time)}</div>
      </div>
    </div>
  `).join('');
}

function loadRecentOrders(orders) {
  const container = document.getElementById('recent-orders-list');
  if (!container) return;
  
  const recent = orders.slice(-5).reverse();
  
  if (recent.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-box"></i><p>No orders yet</p></div>';
    return;
  }
  
  container.innerHTML = recent.map(order => `
    <div class="activity-item">
      <div class="activity-icon"><i class="fas fa-receipt"></i></div>
      <div class="activity-content">
        <div class="activity-title">#${order.orderNumber || order._id?.slice(-6) || 'N/A'}</div>
        <div class="activity-detail">${order.user?.name || 'Guest'} • ${formatCurrency(order.total || 0)}</div>
        <div class="activity-time">
          <span class="badge badge-${(order.status || 'pending').toLowerCase()}">${order.status || 'Pending'}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function loadTodayReservations(reservations, tables) {
  const container = document.getElementById('today-reservations-widget');
  if (!container) return;
  
  const today = new Date().toISOString().split('T')[0];
  const todayRes = reservations.filter(r => r.date?.split('T')[0] === today);
  
  if (todayRes.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No reservations today</p></div>';
    return;
  }
  
  container.innerHTML = todayRes.map(res => `
    <div class="activity-item">
      <div class="activity-icon"><i class="fas fa-clock"></i></div>
      <div class="activity-content">
        <div class="activity-title">${res.time} • Table ${res.table?.tableNumber || 'N/A'}</div>
        <div class="activity-detail">${res.user?.name || 'Guest'} • ${res.numberOfGuests} guests</div>
        <div class="activity-time">
          <span class="badge badge-${(res.status || 'pending').toLowerCase()}">${res.status || 'Pending'}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function formatRelativeTime(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../customer/login.html';
  });
  
  loadDashboard();
});

// Auto-refresh every 60 seconds
setInterval(loadDashboard, 60000);