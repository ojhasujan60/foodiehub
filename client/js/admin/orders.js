import { getToken, showNotification, formatCurrency, formatDate, isAdmin } from '../customer/global.js';

if (!isAdmin()) {
  alert('Access denied. Admin only.');
  window.location.href = '../customer/login.html';
}

const ordersList = document.getElementById('orders-list');
const statusFilter = document.getElementById('status-filter');
const typeFilter = document.getElementById('type-filter');
const dateFilter = document.getElementById('date-filter');
const searchFilter = document.getElementById('search-filter');
const selectAllCheckbox = document.getElementById('select-all-orders');
const bulkStatusSelect = document.getElementById('bulk-status');
const applyBulkBtn = document.getElementById('apply-bulk');
const orderModal = document.getElementById('order-details-modal');
const orderDetailsContent = document.getElementById('order-details-content');
const closeModal = document.querySelector('.modal-close');

let currentOrders = [];
let currentPage = 1;
const itemsPerPage = 10;
let selectedOrders = new Set();

// Initialize default orders if empty
function initializeDefaultOrders() {
  const existing = localStorage.getItem('orders');
  if (!existing || JSON.parse(existing).length === 0) {
    const defaultOrders = [
      {
        _id: '1',
        orderNumber: 'ORD001',
        user: { name: 'Sujan Shrestha', email: 'sujan@email.com', phone: '9800000001' },
        items: [
          { foodId: { name: 'Butter Chicken' }, quantity: 2, price: 350 },
          { foodId: { name: 'Naan' }, quantity: 3, price: 60 }
        ],
        subtotal: 880,
        tax: 44,
        total: 924,
        status: 'Delivered',
        orderType: 'Dine-in',
        table: { tableNumber: 5 },
        paymentMethod: 'Cash',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
      },
      {
        _id: '2',
        orderNumber: 'ORD002',
        user: { name: 'Priya Gurung', email: 'priya@email.com', phone: '9800000002' },
        items: [
          { foodId: { name: 'Chicken Momo' }, quantity: 2, price: 180 },
          { foodId: { name: 'Masala Chai' }, quantity: 2, price: 60 }
        ],
        subtotal: 480,
        tax: 24,
        total: 504,
        status: 'Preparing',
        orderType: 'Takeaway',
        paymentMethod: 'Cash',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        _id: '3',
        orderNumber: 'ORD003',
        user: { name: 'Ramesh Karki', email: 'ramesh@email.com', phone: '9800000003' },
        items: [
          { foodId: { name: 'Paneer Tikka' }, quantity: 1, price: 280 },
          { foodId: { name: 'Gulab Jamun' }, quantity: 2, price: 120 }
        ],
        subtotal: 520,
        tax: 26,
        total: 546,
        status: 'Pending',
        orderType: 'Delivery',
        deliveryAddress: { street: '123 Lakeside, Pokhara' },
        paymentMethod: 'Online',
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem('orders', JSON.stringify(defaultOrders));
  }
}

// Load orders
async function loadOrders() {
  if (!ordersList) return;
  
  ordersList.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading orders...</p></div>';
  
  try {
    initializeDefaultOrders();
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    currentOrders = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    updateStats(orders);
    renderOrders(orders);
  } catch (error) {
    console.error('Error loading orders:', error);
    ordersList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading orders</p></div>';
  }
}

function updateStats(orders) {
  document.getElementById('total-orders-stat').textContent = orders.length;
  document.getElementById('pending-orders-stat').textContent = orders.filter(o => o.status === 'Pending').length;
  document.getElementById('preparing-orders-stat').textContent = orders.filter(o => o.status === 'Preparing').length;
  document.getElementById('delivered-orders-stat').textContent = orders.filter(o => o.status === 'Delivered').length;
}

function getFilteredOrders() {
  let filtered = [...currentOrders];
  
  if (statusFilter?.value) {
    filtered = filtered.filter(o => o.status === statusFilter.value);
  }
  if (typeFilter?.value) {
    filtered = filtered.filter(o => o.orderType === typeFilter.value);
  }
  if (dateFilter?.value) {
    filtered = filtered.filter(o => o.createdAt?.split('T')[0] === dateFilter.value);
  }
  if (searchFilter?.value) {
    const search = searchFilter.value.toLowerCase();
    filtered = filtered.filter(o => 
      (o.orderNumber && o.orderNumber.toLowerCase().includes(search)) ||
      (o.user?.name && o.user.name.toLowerCase().includes(search)) ||
      (o.user?.email && o.user.email.toLowerCase().includes(search)) ||
      (o.user?.phone && o.user.phone.includes(search)) ||
      (o._id && o._id.slice(-6).includes(search))
    );
  }
  
  return filtered;
}

function renderOrders(orders) {
  if (!ordersList) return;
  
  const filtered = getFilteredOrders();
  
  if (filtered.length === 0) {
    ordersList.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><p>No orders found</p></div>';
    return;
  }
  
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(start, start + itemsPerPage);
  
  // Clear selected orders
  selectedOrders.clear();
  
  ordersList.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 40px;"><input type="checkbox" class="order-checkbox" id="select-all"></th>
          <th>Order #</th>
          <th>Customer</th>
          <th>Items</th>
          <th>Total</th>
          <th>Type</th>
          <th>Status</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${paginated.map(order => `
          <tr>
            <td><input type="checkbox" class="order-checkbox" data-id="${order._id}" ${selectedOrders.has(order._id) ? 'checked' : ''}></td>
            <td><strong>#${order.orderNumber || order._id?.slice(-6) || 'N/A'}</strong></td>
            <td>
              ${escapeHtml(order.user?.name || 'Guest')}<br>
              <small style="color: #666;">${order.user?.phone || 'N/A'}</small>
            </td>
            <td>${order.items?.length || 0} items</td>
            <td>${formatCurrency(order.total || 0)}</td>
            <td>
              <span class="badge ${order.orderType === 'Delivery' ? 'badge-info' : order.orderType === 'Takeaway' ? 'badge-warning' : 'badge-success'}">
                ${order.orderType || 'Dine-in'}
              </span>
            </td>
            <td>
              <select class="status-select" data-id="${order._id}" style="padding: 0.2rem; border-radius: 4px; border: 1px solid #ddd; font-size: 0.75rem;">
                <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="Preparing" ${order.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                <option value="Ready" ${order.status === 'Ready' ? 'selected' : ''}>Ready</option>
                <option value="Out for Delivery" ${order.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </td>
            <td>${formatDate(order.createdAt)}</td>
            <td>
              <button class="btn-view-order" data-id="${order._id}" style="background: #ff6b6b; color: white; border: none; padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.7rem;">
                <i class="fas fa-eye"></i> View
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  renderPagination(totalPages);
  
  // Event listeners
  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const orderId = select.dataset.id;
      const newStatus = select.value;
      await updateOrderStatus(orderId, newStatus);
    });
  });
  
  document.querySelectorAll('.btn-view-order').forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.dataset.id;
      showOrderDetails(orderId);
    });
  });
  
  document.querySelectorAll('.order-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const orderId = cb.dataset.id;
      if (orderId) {
        if (cb.checked) {
          selectedOrders.add(orderId);
        } else {
          selectedOrders.delete(orderId);
        }
      }
      updateSelectAllState();
    });
  });
  
  const selectAll = document.getElementById('select-all');
  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      const checked = e.target.checked;
      document.querySelectorAll('.order-checkbox[data-id]').forEach(cb => {
        cb.checked = checked;
        const orderId = cb.dataset.id;
        if (checked) {
          selectedOrders.add(orderId);
        } else {
          selectedOrders.delete(orderId);
        }
      });
    });
  }
}

function updateSelectAllState() {
  const allCheckboxes = document.querySelectorAll('.order-checkbox[data-id]');
  const selectAll = document.getElementById('select-all');
  if (selectAll && allCheckboxes.length > 0) {
    selectAll.checked = selectedOrders.size === allCheckboxes.length;
  }
}

function renderPagination(totalPages) {
  const container = document.getElementById('pagination-container');
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }
  
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  container.innerHTML = html;
  
  document.querySelectorAll('.pagination-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      loadOrders();
    });
  });
}

async function updateOrderStatus(orderId, newStatus) {
  const orders = JSON.parse(localStorage.getItem('orders') || '[]');
  const orderIndex = orders.findIndex(o => o._id === orderId);
  if (orderIndex !== -1) {
    orders[orderIndex].status = newStatus;
    if (newStatus === 'Delivered' || newStatus === 'Cancelled') {
      orders[orderIndex].completedAt = new Date().toISOString();
    }
    localStorage.setItem('orders', JSON.stringify(orders));
    showNotification(`Order status updated to ${newStatus}`, 'success');
    loadOrders();
  }
}

function showOrderDetails(orderId) {
  const orders = JSON.parse(localStorage.getItem('orders') || '[]');
  const order = orders.find(o => o._id === orderId);
  if (!order) return;
  
  orderDetailsContent.innerHTML = `
    <div style="padding: 1rem;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
        <div>
          <h3 style="margin: 0;">Order #${order.orderNumber || order._id?.slice(-6)}</h3>
          <p style="color: #666; margin: 0.25rem 0;">${formatDate(order.createdAt)}</p>
        </div>
        <span class="badge badge-${order.status?.toLowerCase()}">${order.status}</span>
      </div>
      
      <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <h4 style="margin-bottom: 0.5rem;">Customer Information</h4>
        <p><strong>Name:</strong> ${escapeHtml(order.user?.name || 'Guest')}</p>
        <p><strong>Email:</strong> ${order.user?.email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${order.user?.phone || 'N/A'}</p>
        ${order.orderType === 'Delivery' ? `<p><strong>Address:</strong> ${order.deliveryAddress?.street || 'N/A'}</p>` : ''}
        ${order.table ? `<p><strong>Table:</strong> Table ${order.table.tableNumber}</p>` : ''}
      </div>
      
      <h4 style="margin-bottom: 0.5rem;">Order Items</h4>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem;">
        <thead>
          <tr style="border-bottom: 2px solid #ff6b6b;">
            <th style="padding: 0.5rem; text-align: left;">Item</th>
            <th style="padding: 0.5rem; text-align: center;">Qty</th>
            <th style="padding: 0.5rem; text-align: right;">Price</th>
            <th style="padding: 0.5rem; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items?.map(item => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 0.5rem;">${escapeHtml(item.foodId?.name || 'Unknown')}</td>
              <td style="padding: 0.5rem; text-align: center;">${item.quantity}</td>
              <td style="padding: 0.5rem; text-align: right;">${formatCurrency(item.price)}</td>
              <td style="padding: 0.5rem; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="border-top: 2px solid #eee;">
            <td colspan="3" style="padding: 0.5rem; text-align: right;"><strong>Subtotal:</strong></td>
            <td style="padding: 0.5rem; text-align: right;">${formatCurrency(order.subtotal || 0)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 0.5rem; text-align: right;"><strong>Tax (5%):</strong></td>
            <td style="padding: 0.5rem; text-align: right;">${formatCurrency(order.tax || 0)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 0.5rem; text-align: right;"><strong>Total:</strong></td>
            <td style="padding: 0.5rem; text-align: right; font-weight: bold; color: #ff6b6b;">${formatCurrency(order.total || 0)}</td>
          </tr>
        </tfoot>
      </table>
      
      <p><strong>Payment Method:</strong> ${order.paymentMethod || 'Cash'}</p>
      <p><strong>Order Type:</strong> ${order.orderType || 'Dine-in'}</p>
      ${order.specialInstructions ? `<p><strong>Special Instructions:</strong> ${escapeHtml(order.specialInstructions)}</p>` : ''}
    </div>
  `;
  
  orderModal.classList.add('active');
}

async function applyBulkStatus() {
  const newStatus = bulkStatusSelect?.value;
  if (!newStatus || selectedOrders.size === 0) {
    showNotification('Please select orders and a status', 'error');
    return;
  }
  
  const orders = JSON.parse(localStorage.getItem('orders') || '[]');
  let updated = 0;
  
  selectedOrders.forEach(orderId => {
    const orderIndex = orders.findIndex(o => o._id === orderId);
    if (orderIndex !== -1) {
      orders[orderIndex].status = newStatus;
      updated++;
    }
  });
  
  localStorage.setItem('orders', JSON.stringify(orders));
  showNotification(`Updated ${updated} orders to ${newStatus}`, 'success');
  selectedOrders.clear();
  loadOrders();
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Export orders
function exportOrders() {
  const filtered = getFilteredOrders();
  const csv = ['Order #,Customer,Phone,Items,Total,Type,Status,Date'];
  filtered.forEach(o => {
    csv.push(`${o.orderNumber || o._id?.slice(-6)},${o.user?.name || 'Guest'},${o.user?.phone || ''},${o.items?.length || 0},${o.total},${o.orderType},${o.status},${new Date(o.createdAt).toLocaleString()}`);
  });
  
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('Orders exported successfully!', 'success');
}

// Event listeners
if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; loadOrders(); });
if (typeFilter) typeFilter.addEventListener('change', () => { currentPage = 1; loadOrders(); });
if (dateFilter) dateFilter.addEventListener('change', () => { currentPage = 1; loadOrders(); });
if (searchFilter) {
  let timeout;
  searchFilter.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => { currentPage = 1; loadOrders(); }, 500);
  });
}

document.getElementById('export-orders')?.addEventListener('click', exportOrders);
document.getElementById('refresh-orders')?.addEventListener('click', loadOrders);
if (applyBulkBtn) applyBulkBtn.addEventListener('click', applyBulkStatus);

if (closeModal) {
  closeModal.addEventListener('click', () => orderModal.classList.remove('active'));
}
window.addEventListener('click', (e) => {
  if (e.target === orderModal) orderModal.classList.remove('active');
});

// Logout
document.getElementById('logout-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../customer/login.html';
});

// Initialize
loadOrders();