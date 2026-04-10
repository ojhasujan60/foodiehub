import { getToken, formatCurrency, isAdmin, showNotification } from '../customer/global.js';

if (!isAdmin()) {
  alert('Access denied. Admin only.');
  window.location.href = '../customer/login.html';
}

const periodSelect = document.getElementById('period-select');
const customDateRange = document.getElementById('custom-date-range');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const applyDateBtn = document.getElementById('apply-date');

let salesChart = null;
let topItemsChart = null;
let orderTypesChart = null;
let currentPeriod = 'week';

// Set default dates
const today = new Date().toISOString().split('T')[0];
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

if (startDateInput) startDateInput.value = lastWeek;
if (endDateInput) endDateInput.value = today;

// Get date range based on period
function getDateRange(period) {
  const now = new Date();
  let start, end;
  
  switch(period) {
    case 'today':
      start = new Date(now.setHours(0,0,0,0));
      end = new Date(now.setHours(23,59,59,999));
      break;
    case 'yesterday':
      start = new Date(now.setDate(now.getDate() - 1));
      start.setHours(0,0,0,0);
      end = new Date(start);
      end.setHours(23,59,59,999);
      break;
    case 'week':
      start = new Date(now.setDate(now.getDate() - 7));
      end = new Date();
      break;
    case 'month':
      start = new Date(now.setDate(now.getDate() - 30));
      end = new Date();
      break;
    case 'quarter':
      start = new Date(now.setMonth(now.getMonth() - 3));
      end = new Date();
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date();
      break;
    default:
      start = new Date(now.setDate(now.getDate() - 7));
      end = new Date();
  }
  
  return { start, end };
}

// Filter orders by date range
function filterOrdersByDate(orders, startDate, endDate) {
  return orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    return orderDate >= startDate && orderDate <= endDate;
  });
}

// Load report
async function loadReport(period, customStart = null, customEnd = null) {
  try {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    const menu = JSON.parse(localStorage.getItem('menu') || '[]');
    
    let startDate, endDate;
    
    if (period === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const range = getDateRange(period);
      startDate = range.start;
      endDate = range.end;
    }
    
    const filteredOrders = filterOrdersByDate(orders, startDate, endDate);
    const filteredReservations = filterOrdersByDate(reservations, startDate, endDate);
    
    // Update stats
    updateStats(filteredOrders, filteredReservations);
    
    // Render charts
    renderSalesChart(filteredOrders);
    renderTopItemsChart(filteredOrders, menu);
    renderOrderTypesChart(filteredOrders);
    renderOrdersTable(filteredOrders);
    
  } catch (error) {
    console.error('Error loading report:', error);
    showNotification('Failed to load report', 'error');
  }
}

function updateStats(orders, reservations) {
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = orders.length;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalItems = orders.reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0), 0);
  const cancelledOrders = orders.filter(o => o.status === 'Cancelled').length;
  const completionRate = totalOrders > 0 ? ((orders.filter(o => o.status === 'Delivered').length / totalOrders) * 100).toFixed(1) : 0;
  
  document.getElementById('report-revenue').textContent = formatCurrency(totalRevenue);
  document.getElementById('report-orders').textContent = totalOrders;
  document.getElementById('report-average').textContent = formatCurrency(avgOrder);
  document.getElementById('total-items-sold').textContent = totalItems;
  document.getElementById('total-reservations').textContent = reservations.length;
  document.getElementById('cancelled-orders').textContent = cancelledOrders;
  document.getElementById('completion-rate').textContent = completionRate + '%';
}

function renderSalesChart(orders) {
  const ctx = document.getElementById('sales-chart')?.getContext('2d');
  if (!ctx) return;
  
  // Group by date
  const dailyData = {};
  orders.forEach(order => {
    const date = order.createdAt?.split('T')[0];
    if (date) {
      if (!dailyData[date]) dailyData[date] = { revenue: 0, orders: 0 };
      dailyData[date].revenue += order.total || 0;
      dailyData[date].orders += 1;
    }
  });
  
  const sortedDates = Object.keys(dailyData).sort();
  const labels = sortedDates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const revenues = sortedDates.map(d => dailyData[d].revenue);
  
  if (salesChart) salesChart.destroy();
  
  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        label: 'Revenue (रु)',
        data: revenues.length > 0 ? revenues : [0],
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => formatCurrency(ctx.raw)
          }
        }
      }
    }
  });
}

function renderTopItemsChart(orders, menu) {
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
      labels: sorted.length > 0 ? sorted.map(s => s[0]) : ['No Data'],
      datasets: [{
        label: 'Units Sold',
        data: sorted.length > 0 ? sorted.map(s => s[1]) : [0],
        backgroundColor: '#ff6b6b'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderOrderTypesChart(orders) {
  const ctx = document.getElementById('order-types-chart')?.getContext('2d');
  if (!ctx) return;
  
  const delivery = orders.filter(o => o.orderType === 'Delivery').length;
  const takeaway = orders.filter(o => o.orderType === 'Takeaway').length;
  const dinein = orders.filter(o => o.orderType === 'Dine-in').length;
  
  if (orderTypesChart) orderTypesChart.destroy();
  
  orderTypesChart = new Chart(ctx, {
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
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function renderOrdersTable(orders) {
  const container = document.getElementById('report-orders-list');
  if (!container) return;
  
  if (orders.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-simple"></i><p>No orders in selected period</p></div>';
    return;
  }
  
  const recentOrders = [...orders].reverse().slice(0, 20);
  
  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Order #</th>
          <th>Customer</th>
          <th>Items</th>
          <th>Total</th>
          <th>Type</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${recentOrders.map(order => `
          <tr>
            <td>#${order.orderNumber || order._id?.slice(-6) || 'N/A'}</td>
            <td>${escapeHtml(order.user?.name || 'Guest')}</td>
            <td>${order.items?.length || 0}</td>
            <td>${formatCurrency(order.total || 0)}</td>
            <td>${order.orderType || 'Dine-in'}</td>
            <td><span class="badge badge-${order.status?.toLowerCase() || 'pending'}">${order.status || 'Pending'}</span></td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}

// Export functions
function exportCSV() {
  const orders = JSON.parse(localStorage.getItem('orders') || '[]');
  const period = periodSelect?.value || 'week';
  let startDate, endDate;
  
  if (period === 'custom') {
    startDate = new Date(startDateInput?.value || lastWeek);
    endDate = new Date(endDateInput?.value || today);
  } else {
    const range = getDateRange(period);
    startDate = range.start;
    endDate = range.end;
  }
  
  const filteredOrders = filterOrdersByDate(orders, startDate, endDate);
  
  const csv = ['Order #,Customer,Items,Total,Type,Status,Date'];
  filteredOrders.forEach(o => {
    csv.push(`${o.orderNumber || o._id?.slice(-6)},${o.user?.name || 'Guest'},${o.items?.length || 0},${o.total},${o.orderType},${o.status},${new Date(o.createdAt).toLocaleString()}`);
  });
  
  // Add summary
  const totalRevenue = filteredOrders.reduce((s, o) => s + (o.total || 0), 0);
  csv.push(`\nSummary,,,${formatCurrency(totalRevenue)},${filteredOrders.length} orders,,`);
  
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('Report exported successfully!', 'success');
}

function exportPDF() {
  showNotification('PDF export coming soon!', 'info');
}

// Event listeners
if (periodSelect) {
  periodSelect.addEventListener('change', (e) => {
    currentPeriod = e.target.value;
    if (currentPeriod === 'custom') {
      customDateRange.style.display = 'flex';
    } else {
      customDateRange.style.display = 'none';
      loadReport(currentPeriod);
    }
  });
}

if (applyDateBtn) {
  applyDateBtn.addEventListener('click', () => {
    loadReport('custom', startDateInput.value, endDateInput.value);
  });
}

document.getElementById('export-report-csv')?.addEventListener('click', exportCSV);
document.getElementById('export-report-pdf')?.addEventListener('click', exportPDF);

// Logout
document.getElementById('logout-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../customer/login.html';
});

// Initialize
loadReport('week');