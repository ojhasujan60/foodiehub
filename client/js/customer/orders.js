import { getToken, showNotification, formatCurrency, formatDate, isAuthenticated, getUser } from './global.js';

const ordersList = document.getElementById('orders-list');
const periodFilter = document.getElementById('period-filter');
const invoiceModal = document.getElementById('invoice-modal');
const invoiceContent = document.getElementById('invoice-content');
const closeInvoiceBtn = document.querySelector('.modal-close-invoice');
const printInvoiceBtn = document.getElementById('print-invoice');

let currentPeriod = 'this_month';
let currentInvoiceOrder = null;

// Check authentication
if (!isAuthenticated()) {
  window.location.href = '/customer/login.html';
}

// ============================================
// FETCH ORDERS
// ============================================

async function fetchOrders() {
  if (!ordersList) return;
  
  ordersList.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading your orders...</p></div>';
  
  try {
    const user = getUser();
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    
    // Filter orders for current user
    let userOrders = orders.filter(order => {
      if (order.user?._id) {
        return order.user._id === user?._id;
      }
      if (order.user?.email) {
        return order.user.email === user?.email;
      }
      if (order.user?.phone) {
        return order.user.phone === user?.phone;
      }
      return false;
    });
    
    // Apply period filter
    userOrders = filterByPeriod(userOrders, currentPeriod);
    
    // Sort by date (newest first)
    userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    renderOrders(userOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    ordersList.innerHTML = '<div class="empty-state-modern"><i class="fas fa-exclamation-circle"></i><p>Error loading orders. Please try again.</p></div>';
  }
}

function filterByPeriod(orders, period) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  switch(period) {
    case 'this_month':
      return orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      });
    case 'last_month':
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === lastMonth && orderDate.getFullYear() === lastMonthYear;
      });
    case 'last_3_months':
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return orders.filter(order => new Date(order.createdAt) >= threeMonthsAgo);
    case 'this_year':
      return orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getFullYear() === currentYear;
      });
    case 'all':
    default:
      return orders;
  }
}

// ============================================
// RENDER ORDERS
// ============================================

function renderOrders(orders) {
  if (!ordersList) return;
  
  const periodNames = {
    'this_month': 'this month',
    'last_month': 'last month',
    'last_3_months': 'the last 3 months',
    'this_year': 'this year',
    'all': ''
  };
  
  if (orders.length === 0) {
    let emptyMessage = `No orders found`;
    if (periodNames[currentPeriod]) {
      emptyMessage += ` for ${periodNames[currentPeriod]}`;
    }
    
    ordersList.innerHTML = `
      <div class="empty-state-modern">
        <i class="fas fa-box-open"></i>
        <h3>${emptyMessage}</h3>
        <p>Looks like you haven't placed any orders${periodNames[currentPeriod] ? ` ${periodNames[currentPeriod]}` : ''}</p>
        <a href="menu.html" class="btn-primary">Start Shopping</a>
      </div>
    `;
    return;
  }
  
  ordersList.innerHTML = orders.map(order => `
    <div class="order-card-modern" data-order-id="${order._id}">
      <!-- Header -->
      <div class="order-header-modern">
        <div class="order-info">
          <h3><i class="fas fa-receipt"></i> Order #${order.orderNumber || order._id.slice(-6)}</h3>
          <div class="order-date"><i class="far fa-calendar-alt"></i> ${formatDate(order.createdAt)}</div>
          <div class="order-type-badge">
            <i class="fas ${order.orderType === 'Dine-in' ? 'fa-utensils' : 'fa-box'}"></i> ${order.orderType}
            ${order.table ? `<span class="order-table"><i class="fas fa-chair"></i> Table ${order.table.tableNumber}</span>` : ''}
          </div>
        </div>
        <div class="order-badge badge-${order.status?.toLowerCase().replace(/ /g, '-') || 'pending'}">
          ${getStatusIcon(order.status)} ${order.status || 'Pending'}
        </div>
      </div>
      
      <!-- Body -->
      <div class="order-body">
        <div class="order-items-section">
          <h4><i class="fas fa-utensils"></i> Items Ordered</h4>
          <ul class="order-items-list">
            ${order.items.map(item => `
              <li>
                <div class="item-name">
                  <span class="quantity">${item.quantity}x</span> ${escapeHtml(item.foodId?.name || 'Unknown Item')}
                </div>
                <div class="item-price">${formatCurrency(item.price * item.quantity)}</div>
                ${item.specialInstructions ? `<div class="special-note-item"><i class="fas fa-comment"></i> ${escapeHtml(item.specialInstructions)}</div>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
        
        <!-- Summary -->
        <div class="order-summary-section">
          <div class="summary-detail">
            <span>Subtotal</span>
            <span>${formatCurrency(order.subtotal || 0)}</span>
          </div>
          <div class="summary-detail">
            <span>Tax (5%)</span>
            <span>${formatCurrency(order.tax || 0)}</span>
          </div>
          ${order.discount > 0 ? `
            <div class="summary-detail">
              <span>Discount</span>
              <span>-${formatCurrency(order.discount)}</span>
            </div>
          ` : ''}
          <div class="summary-detail total">
            <span>Total Paid</span>
            <span>${formatCurrency(order.total || 0)}</span>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="order-footer-modern">
        <div class="order-meta">
          <span><i class="fas fa-credit-card"></i> ${order.paymentMethod || 'Cash'}</span>
          <span><i class="fas fa-utensils"></i> ${order.orderType || 'Dine-in'}</span>
          ${order.table ? `<span><i class="fas fa-chair"></i> Table ${order.table.tableNumber}</span>` : ''}
          ${order.pickupName ? `<span><i class="fas fa-user"></i> Pickup: ${escapeHtml(order.pickupName)}</span>` : ''}
        </div>
        <div class="order-buttons">
          ${order.status === 'Completed' || order.status === 'Delivered' ? `
            <button class="btn-invoice-modern" data-id="${order._id}"><i class="fas fa-file-invoice"></i> Invoice</button>
          ` : ''}
          ${order.status === 'Completed' || order.status === 'Delivered' ? `
            <button class="btn-reorder-modern" data-id="${order._id}"><i class="fas fa-redo"></i> Order Again</button>
          ` : ''}
          ${(order.status === 'Pending' || order.status === 'Confirmed') ? `
            <button class="btn-cancel-modern" data-id="${order._id}"><i class="fas fa-times"></i> Cancel Order</button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
  
  // Add event listeners
  document.querySelectorAll('.btn-reorder-modern').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.id;
      await reorder(orderId);
    });
  });
  
  document.querySelectorAll('.btn-cancel-modern').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.id;
      if (confirm('Are you sure you want to cancel this order?')) {
        await cancelOrder(orderId);
      }
    });
  });
  
  document.querySelectorAll('.btn-invoice-modern').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.id;
      await showInvoice(orderId);
    });
  });
}

function getStatusIcon(status) {
  const icons = {
    'Pending': '<i class="fas fa-clock"></i>',
    'Confirmed': '<i class="fas fa-check-circle"></i>',
    'Preparing': '<i class="fas fa-fire"></i>',
    'Ready': '<i class="fas fa-box-open"></i>',
    'Served': '<i class="fas fa-utensils"></i>',
    'Completed': '<i class="fas fa-check-double"></i>',
    'Delivered': '<i class="fas fa-check-double"></i>',
    'Cancelled': '<i class="fas fa-times-circle"></i>'
  };
  return icons[status] || '<i class="fas fa-info-circle"></i>';
}

// ============================================
// REORDER FUNCTION
// ============================================

async function reorder(orderId) {
  try {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const order = orders.find(o => o._id === orderId);
    
    if (!order) {
      showNotification('Order not found', 'error');
      return;
    }
    
    // Create cart from order items
    const cart = {
      items: order.items.map(item => ({
        foodId: item.foodId?._id || item.foodId,
        name: item.foodId?.name || 'Item',
        price: item.price,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions || ''
      })),
      orderType: order.orderType || 'Dine-in'
    };
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    showNotification('Items added to cart!', 'success');
    setTimeout(() => {
      window.location.href = '/customer/cart.html';
    }, 1500);
  } catch (error) {
    console.error('Error reordering:', error);
    showNotification('Failed to reorder', 'error');
  }
}

// ============================================
// CANCEL ORDER
// ============================================

async function cancelOrder(orderId) {
  try {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const orderIndex = orders.findIndex(o => o._id === orderId);
    
    if (orderIndex !== -1) {
      orders[orderIndex].status = 'Cancelled';
      orders[orderIndex].cancelledAt = new Date().toISOString();
      localStorage.setItem('orders', JSON.stringify(orders));
      
      // If it was a Dine-in order, free up the table
      if (orders[orderIndex].table) {
        const tables = JSON.parse(localStorage.getItem('tables') || '[]');
        const tableIndex = tables.findIndex(t => t._id === orders[orderIndex].table._id);
        if (tableIndex !== -1) {
          tables[tableIndex].isAvailable = true;
          localStorage.setItem('tables', JSON.stringify(tables));
        }
      }
      
      showNotification('Order cancelled successfully', 'success');
      fetchOrders();
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
    showNotification('Failed to cancel order', 'error');
  }
}

// ============================================
// SHOW INVOICE
// ============================================

async function showInvoice(orderId) {
  try {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const order = orders.find(o => o._id === orderId);
    
    if (!order) {
      showNotification('Order not found', 'error');
      return;
    }
    
    currentInvoiceOrder = order;
    
    const user = getUser();
    const invoiceHtml = `
      <div style="font-family: 'Poppins', sans-serif;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <h2 style="color: #ff6b6b; margin-bottom: 0.2rem;">FoodieHub</h2>
          <p style="color: #666; font-size: 0.8rem;">123 Food Street, Kathmandu, Nepal</p>
          <p style="color: #666; font-size: 0.8rem;">Tel: +977 980-0000000 | Email: info@foodiehub.com</p>
        </div>
        
        <div style="border-top: 2px solid #ff6b6b; margin: 1rem 0;"></div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap;">
          <div>
            <p><strong>Invoice #:</strong> ${order.orderNumber || order._id.slice(-6)}</p>
            <p><strong>Date:</strong> ${formatDate(order.createdAt)}</p>
            <p><strong>Order Type:</strong> ${order.orderType}</p>
          </div>
          <div>
            <p><strong>Customer:</strong> ${user?.name || order.user?.name || 'Guest'}</p>
            <p><strong>Phone:</strong> ${user?.phone || order.user?.phone || 'N/A'}</p>
            ${order.table ? `<p><strong>Table:</strong> Table ${order.table.tableNumber}</p>` : ''}
          </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem;">
          <thead>
            <tr style="background: #f8f9fa; border-bottom: 2px solid #ff6b6b;">
              <th style="padding: 0.8rem; text-align: left;">Item</th>
              <th style="padding: 0.8rem; text-align: center;">Qty</th>
              <th style="padding: 0.8rem; text-align: right;">Price</th>
              <th style="padding: 0.8rem; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 0.8rem; text-align: left;">${escapeHtml(item.foodId?.name || 'Item')}</td>
                <td style="padding: 0.8rem; text-align: center;">${item.quantity}</td>
                <td style="padding: 0.8rem; text-align: right;">${formatCurrency(item.price)}</td>
                <td style="padding: 0.8rem; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #eee;">
              <td colspan="3" style="padding: 0.8rem; text-align: right;"><strong>Subtotal:</strong></td>
              <td style="padding: 0.8rem; text-align: right;">${formatCurrency(order.subtotal || 0)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 0.8rem; text-align: right;"><strong>Tax (5%):</strong></td>
              <td style="padding: 0.8rem; text-align: right;">${formatCurrency(order.tax || 0)}</td>
            </tr>
            ${order.discount > 0 ? `
              <tr>
                <td colspan="3" style="padding: 0.8rem; text-align: right;"><strong>Discount:</strong></td>
                <td style="padding: 0.8rem; text-align: right;">-${formatCurrency(order.discount)}</td>
              </tr>
            ` : ''}
            <tr style="background: #f8f9fa;">
              <td colspan="3" style="padding: 0.8rem; text-align: right;"><strong>Total:</strong></td>
              <td style="padding: 0.8rem; text-align: right; font-weight: bold; color: #ff6b6b;">${formatCurrency(order.total || 0)}</td>
            </tr>
          </tfoot>
        </table>
        
        ${order.specialInstructions ? `
          <div style="margin-top: 1rem; padding: 0.5rem; background: #f8f9fa; border-radius: 8px;">
            <p><strong>Special Instructions:</strong> ${escapeHtml(order.specialInstructions)}</p>
          </div>
        ` : ''}
        
        <div style="border-top: 1px solid #eee; margin-top: 1rem; padding-top: 1rem; text-align: center;">
          <p style="font-size: 0.7rem; color: #999;">Thank you for dining with us!</p>
          <p style="font-size: 0.7rem; color: #999;">This is a computer generated invoice.</p>
        </div>
      </div>
    `;
    
    invoiceContent.innerHTML = invoiceHtml;
    invoiceModal.classList.add('active');
  } catch (error) {
    console.error('Error generating invoice:', error);
    showNotification('Failed to generate invoice', 'error');
  }
}

// ============================================
// PRINT INVOICE
// ============================================

if (printInvoiceBtn) {
  printInvoiceBtn.addEventListener('click', () => {
    const printContent = invoiceContent.innerHTML;
    const originalTitle = document.title;
    document.title = `Invoice_${currentInvoiceOrder?.orderNumber || 'order'}`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>FoodieHub Invoice</title>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Poppins', sans-serif; padding: 2rem; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    document.title = originalTitle;
  });
}

// ============================================
// MODAL CLOSE
// ============================================

if (closeInvoiceBtn) {
  closeInvoiceBtn.addEventListener('click', () => {
    invoiceModal.classList.remove('active');
  });
}

window.addEventListener('click', (e) => {
  if (e.target === invoiceModal) {
    invoiceModal.classList.remove('active');
  }
});

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

if (periodFilter) {
  periodFilter.addEventListener('change', (e) => {
    currentPeriod = e.target.value;
    fetchOrders();
  });
}

// ============================================
// INITIALIZE
// ============================================

fetchOrders();
setInterval(fetchOrders, 30000);