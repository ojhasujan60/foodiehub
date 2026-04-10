import { getToken, showNotification, formatCurrency, isStaff } from '../customer/global.js';

if (!isStaff()) {
  alert('Access denied. Staff only.');
  window.location.href = '/customer/login.html';
}

// DOM Elements - FIXED IDs
const foodGrid = document.getElementById('food-grid');
const categoryFilter = document.getElementById('category-filter');
const searchInput = document.getElementById('search-input');
const orderItemsList = document.getElementById('order-items-list');
const orderTotalSpan = document.getElementById('order-total');
const tableSelect = document.getElementById('table-select');
const placeOrderBtn = document.getElementById('place-dinein-order');  // FIXED: matches HTML button ID

// State
let currentOrder = [];

// Load available tables
async function loadTables() {
  const token = getToken();
  try {
    const response = await fetch('/api/tables', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const tables = await response.json();
    
    const availableTables = tables.filter(t => t.isAvailable);
    if (availableTables.length === 0) {
      tableSelect.innerHTML = '<option value="">No tables available</option>';
    } else {
      tableSelect.innerHTML = '<option value="">Select Table</option>' +
        availableTables.map(table => 
          `<option value="${table._id}">Table ${table.tableNumber} (${table.capacity} seats) - ${table.location}</option>`
        ).join('');
    }
  } catch (error) {
    console.error('Error loading tables:', error);
    tableSelect.innerHTML = '<option value="">Error loading tables</option>';
  }
}

// Load menu items
async function loadMenu() {
  if (!foodGrid) return;
  
  foodGrid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading menu...</p></div>';
  
  try {
    const response = await fetch('/api/menu');
    const foods = await response.json();
    renderMenu(foods);
  } catch (error) {
    console.error('Error loading menu:', error);
    foodGrid.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading menu</p></div>';
  }
}

// Render menu items with filters
function renderMenu(foods) {
  let filteredFoods = [...foods];
  
  const category = categoryFilter?.value;
  const search = searchInput?.value.toLowerCase();
  
  if (category) {
    filteredFoods = filteredFoods.filter(f => f.category === category);
  }
  if (search) {
    filteredFoods = filteredFoods.filter(f => 
      f.name.toLowerCase().includes(search) || 
      (f.description && f.description.toLowerCase().includes(search))
    );
  }
  
  if (filteredFoods.length === 0) {
    foodGrid.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No items found</p></div>';
    return;
  }
  
  foodGrid.innerHTML = filteredFoods.map(food => `
    <div class="food-card" data-id="${food._id}">
      <img src="${food.image || '/uploads/default-food.jpg'}" alt="${food.name}" onerror="this.src='/uploads/default-food.jpg'">
      <div class="food-info">
        <h3>${escapeHtml(food.name)}</h3>
        <p class="description">${escapeHtml(food.description || '')}</p>
        <p class="price">${formatCurrency(food.price)}</p>
        <button class="btn-add-to-order" data-id="${food._id}" data-name="${food.name}" data-price="${food.price}">
          <i class="fas fa-plus"></i> Add to Order
        </button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners
  document.querySelectorAll('.btn-add-to-order').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      addToOrder(id, name, price);
    });
  });
}

// Add item to current order
function addToOrder(id, name, price) {
  const existingItem = currentOrder.find(item => item.id === id);
  
  if (existingItem) {
    existingItem.quantity++;
  } else {
    currentOrder.push({ id, name, price, quantity: 1 });
  }
  
  renderOrderList();
}

// Render order list in sidebar
function renderOrderList() {
  if (!orderItemsList) return;
  
  if (currentOrder.length === 0) {
    orderItemsList.innerHTML = '<p class="empty-cart">No items added</p>';
    if (orderTotalSpan) orderTotalSpan.textContent = '0';
    return;
  }
  
  let total = 0;
  orderItemsList.innerHTML = currentOrder.map((item, index) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    return `
      <div class="cart-item-order" data-index="${index}">
        <div class="item-name">
          ${escapeHtml(item.name)}
        </div>
        <div class="item-quantity">
          <button class="qty-down" data-index="${index}">-</button>
          <span>${item.quantity}</span>
          <button class="qty-up" data-index="${index}">+</button>
        </div>
        <div class="item-price">
          ${formatCurrency(itemTotal)}
        </div>
        <button class="remove-item" data-index="${index}"><i class="fas fa-trash"></i></button>
      </div>
    `;
  }).join('');
  
  if (orderTotalSpan) orderTotalSpan.textContent = total;
  
  // Quantity buttons
  document.querySelectorAll('.qty-down').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      if (currentOrder[index].quantity > 1) {
        currentOrder[index].quantity--;
      } else {
        currentOrder.splice(index, 1);
      }
      renderOrderList();
    });
  });
  
  document.querySelectorAll('.qty-up').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      currentOrder[index].quantity++;
      renderOrderList();
    });
  });
  
  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      currentOrder.splice(index, 1);
      renderOrderList();
    });
  });
}

// Place dine-in order
if (placeOrderBtn) {
  placeOrderBtn.addEventListener('click', async () => {
    const tableId = tableSelect.value;
    
    if (!tableId) {
      showNotification('Please select a table', 'error');
      return;
    }
    
    if (currentOrder.length === 0) {
      showNotification('No items in order', 'error');
      return;
    }
    
    const token = getToken();
    
    try {
      // Clear existing cart
      const cartResponse = await fetch('/api/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const cart = await cartResponse.json();
      
      if (cart.items && cart.items.length > 0) {
        for (const item of cart.items) {
          await fetch('/api/cart/remove', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ foodId: item.foodId._id })
          });
        }
      }
      
      // Add items to cart
      for (const item of currentOrder) {
        await fetch('/api/cart/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ foodId: item.id, quantity: item.quantity })
        });
      }
      
      // Place order with status "Confirmed" for kitchen
      const response = await fetch('/api/orders/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentMethod: 'COD',
          orderType: 'Dine-in',
          tableId: tableId,
          status: 'Confirmed'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Order placement failed');
      }
      
      showNotification('Order placed successfully! Kitchen notified.', 'success');
      
      // Reset order
      currentOrder = [];
      renderOrderList();
      loadTables();
      
    } catch (error) {
      console.error('Error placing order:', error);
      showNotification(error.message || 'Failed to place order', 'error');
    }
  });
}

// Helper function
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Filter event listeners
if (categoryFilter) {
  categoryFilter.addEventListener('change', () => loadMenu());
}
if (searchInput) {
  let timeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => loadMenu(), 500);
  });
}

// Initialize
loadTables();
loadMenu();