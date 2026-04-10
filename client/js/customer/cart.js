import { getToken, showNotification, formatCurrency, updateCartCount, isAuthenticated, getUser } from './global.js';

// DOM Elements
const cartContent = document.getElementById('cart-content');
const instructionsModal = document.getElementById('instructions-modal');
const instructionsText = document.getElementById('instructions-text');
const saveInstructionsBtn = document.getElementById('save-instructions');
const closeModal = document.querySelector('.modal-close');
const guestModal = document.getElementById('guest-modal');
const closeGuestModal = document.querySelector('.modal-close-guest');
const guestForm = document.getElementById('guest-form');

let currentCart = null;
let currentEditingItem = null;
let currentStep = 'cart';
let guestInfo = null;

// ============================================
// PROGRESS STEP FUNCTIONS
// ============================================

function updateProgress(step) {
  currentStep = step;
  const steps = ['cart', 'details', 'payment', 'confirm'];
  const stepIndex = steps.indexOf(step);
  
  document.querySelectorAll('.progress-step').forEach((el, index) => {
    if (index < stepIndex) {
      el.classList.add('completed');
      el.classList.remove('active');
    } else if (index === stepIndex) {
      el.classList.add('active');
      el.classList.remove('completed');
    } else {
      el.classList.remove('active', 'completed');
    }
  });
}

// ============================================
// FETCH CART
// ============================================

async function fetchCart() {
  if (!cartContent) return;
  
  cartContent.innerHTML = `
    <div class="spinner-wrapper">
      <div class="spinner"></div>
      <p>Loading your cart...</p>
    </div>
  `;
  
  try {
    // Get cart from localStorage
    const cartData = localStorage.getItem('cart');
    currentCart = cartData ? JSON.parse(cartData) : { items: [], orderType: 'Dine-in' };
    
    // Ensure cart has items array
    if (!currentCart.items) currentCart.items = [];
    
    renderCart();
  } catch (error) {
    console.error('Error fetching cart:', error);
    if (cartContent) {
      cartContent.innerHTML = `
        <div class="empty-cart-container">
          <i class="fas fa-exclamation-circle"></i>
          <h3>Error loading cart</h3>
          <p>Please try again</p>
          <button onclick="location.reload()" class="btn-primary" style="margin-top: 1rem;">Retry</button>
        </div>
      `;
    }
  }
}

// ============================================
// RENDER CART
// ============================================

function renderCart() {
  if (!cartContent) return;
  
  if (!currentCart.items || currentCart.items.length === 0) {
    renderEmptyCart();
    return;
  }
  
  // Get full menu for item details
  const menu = JSON.parse(localStorage.getItem('menu') || '[]');
  
  let subtotal = 0;
  
  const itemsHtml = currentCart.items.map(item => {
    // Find food details from menu
    const food = menu.find(f => f._id === item.foodId || f._id === item.foodId?._id);
    const itemName = food?.name || item.name || 'Unknown Item';
    const itemPrice = food?.price || item.price || 0;
    const itemImage = food?.image || '/uploads/default-food.jpg';
    const itemTotal = itemPrice * item.quantity;
    subtotal += itemTotal;
    
    return `
      <div class="cart-item" data-item-id="${item.foodId}" data-food-id="${item.foodId}">
        <img src="${itemImage}" alt="${escapeHtml(itemName)}" class="cart-item-image" onerror="this.src='/uploads/default-food.jpg'">
        <div class="cart-item-details">
          <div class="cart-item-title">${escapeHtml(itemName)}</div>
          <div class="cart-item-price">${formatCurrency(itemPrice)} each</div>
          ${item.specialInstructions ? `<div class="special-note"><i class="fas fa-comment"></i> ${escapeHtml(item.specialInstructions)}</div>` : ''}
          <div class="cart-item-actions">
            <div class="quantity-control">
              <button class="decrement">-</button>
              <span class="quantity">${item.quantity}</span>
              <button class="increment">+</button>
            </div>
            <button class="special-instruction-btn" data-id="${item.foodId}" data-instructions="${escapeHtml(item.specialInstructions || '')}">
              <i class="fas fa-pen"></i> Note
            </button>
            <button class="remove-item" data-id="${item.foodId}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="cart-item-total">
          ${formatCurrency(itemTotal)}
        </div>
      </div>
    `;
  }).join('');
  
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  
  cartContent.innerHTML = `
    <div class="cart-layout">
      <div class="cart-items-container">
        <div class="cart-items-header">
          <h3>Your Items (${currentCart.items.length})</h3>
          <button id="clear-cart-btn" class="btn-text"><i class="fas fa-trash"></i> Clear Cart</button>
        </div>
        
        ${itemsHtml}
        
        <!-- Recommended Section -->
        <div class="recommended-section">
          <h3><i class="fas fa-star"></i> You Might Also Like</h3>
          <div id="recommended-items" class="recommended-grid">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
      
      <div class="order-summary-card">
        <div class="summary-title">Order Summary</div>
        
        <div class="summary-row">
          <span>Subtotal</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        <div class="summary-row">
          <span>Tax (5%)</span>
          <span>${formatCurrency(tax)}</span>
        </div>
        <div class="summary-row total">
          <span>Total</span>
          <span>${formatCurrency(total)}</span>
        </div>
        
        <!-- Order Type Selector - DINE-IN & TAKEAWAY ONLY -->
        <div class="order-type-selector">
          <label>Order Type</label>
          <div class="order-type-options">
            <div class="order-type-btn ${currentCart.orderType === 'Dine-in' ? 'active' : ''}" data-type="Dine-in">
              <i class="fas fa-utensils"></i> Dine-in
            </div>
            <div class="order-type-btn ${currentCart.orderType === 'Takeaway' ? 'active' : ''}" data-type="Takeaway">
              <i class="fas fa-box"></i> Takeaway
            </div>
          </div>
        </div>
        
        <!-- Table Selection for Dine-in -->
        <div id="table-selection" style="display: ${currentCart.orderType === 'Dine-in' ? 'block' : 'none'}; margin-top: 1rem;">
          <label>Select Table (Optional)</label>
          <select id="table-select" class="table-select">
            <option value="">No table preference</option>
          </select>
          <p class="hint-text" style="font-size: 0.7rem; color: #666; margin-top: 0.25rem;">
            <i class="fas fa-info-circle"></i> You can select a table now or we'll assign one when you arrive
          </p>
        </div>
        
        <!-- Pickup Information -->
        <div id="pickup-info" style="display: ${currentCart.orderType === 'Takeaway' ? 'block' : 'none'}; margin-top: 1rem;">
          <label>Pickup Information</label>
          <input type="text" id="pickup-name" placeholder="Name for pickup" value="${getUser()?.name || ''}" style="width: 100%; padding: 0.6rem; border: 1px solid #ddd; border-radius: 8px; margin-top: 0.3rem;">
          <input type="tel" id="pickup-phone" placeholder="Phone number" value="${getUser()?.phone || ''}" style="width: 100%; padding: 0.6rem; border: 1px solid #ddd; border-radius: 8px; margin-top: 0.5rem;">
        </div>
        
        <!-- Special Instructions for whole order -->
        <div style="margin-top: 1rem;">
          <label>Order Instructions (Optional)</label>
          <textarea id="order-instructions" rows="2" placeholder="Any special requests for the entire order?" style="width: 100%; padding: 0.6rem; border: 1px solid #ddd; border-radius: 8px; margin-top: 0.3rem; resize: vertical;"></textarea>
        </div>
        
        <!-- Payment Method -->
        <div style="margin-top: 1rem;">
          <label>Payment Method</label>
          <select id="payment-method" style="width: 100%; padding: 0.6rem; border: 1px solid #ddd; border-radius: 8px; margin-top: 0.3rem;">
            <option value="Cash">Cash on Pickup/Dine-in</option>
            <option value="Card">Credit/Debit Card</option>
            <option value="UPI">UPI / QR Code</option>
          </select>
        </div>
        
        <button id="place-order-btn" class="btn-order" style="margin-top: 1.5rem;">
          <i class="fas fa-check-circle"></i> Place Order
        </button>
        
        <a href="menu.html" style="display: block; text-align: center; margin-top: 1rem; color: #666; font-size: 0.85rem; text-decoration: none;">
          <i class="fas fa-arrow-left"></i> Continue Shopping
        </a>
      </div>
    </div>
  `;
  
  attachCartEventListeners();
  loadRecommendedItems();
  loadAvailableTables();
}

function renderEmptyCart() {
  cartContent.innerHTML = `
    <div class="empty-cart-container">
      <i class="fas fa-shopping-cart"></i>
      <h3>Your cart is empty</h3>
      <p>Looks like you haven't added any items yet</p>
      <a href="menu.html" class="btn-primary" style="display: inline-block; margin-top: 1rem;">
        <i class="fas fa-utensils"></i> Browse Menu
      </a>
    </div>
  `;
}

// ============================================
// LOAD AVAILABLE TABLES
// ============================================

async function loadAvailableTables() {
  const tableSelect = document.getElementById('table-select');
  if (!tableSelect) return;
  
  try {
    const tables = JSON.parse(localStorage.getItem('tables') || '[]');
    const availableTables = tables.filter(t => t.isAvailable !== false);
    
    if (availableTables.length === 0) {
      tableSelect.innerHTML = '<option value="">No tables available - Walk-in only</option>';
      return;
    }
    
    tableSelect.innerHTML = '<option value="">No table preference</option>' +
      availableTables.map(table => 
        `<option value="${table._id}">Table ${table.tableNumber} (${table.capacity} seats) - ${table.location}</option>`
      ).join('');
      
  } catch (error) {
    console.error('Error loading tables:', error);
  }
}

// ============================================
// RECOMMENDED ITEMS
// ============================================

async function loadRecommendedItems() {
  const container = document.getElementById('recommended-items');
  if (!container) return;
  
  try {
    const menu = JSON.parse(localStorage.getItem('menu') || '[]');
    
    const cartFoodIds = currentCart.items?.map(i => i.foodId) || [];
    const recommended = menu
      .filter(f => !cartFoodIds.includes(f._id) && f.isAvailable && !f.isOutOfStock)
      .slice(0, 4);
    
    if (recommended.length === 0) {
      container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No recommendations available</p>';
      return;
    }
    
    container.innerHTML = recommended.map(food => `
      <div class="recommended-item" data-id="${food._id}">
        <img src="${food.image || '/uploads/default-food.jpg'}" alt="${escapeHtml(food.name)}" onerror="this.src='/uploads/default-food.jpg'">
        <div class="recommended-item-info">
          <div class="recommended-item-name">${escapeHtml(food.name)}</div>
          <div class="recommended-item-price">${formatCurrency(food.price)}</div>
          <button class="add-recommended" data-id="${food._id}">
            <i class="fas fa-plus"></i> Add
          </button>
        </div>
      </div>
    `).join('');
    
    document.querySelectorAll('.add-recommended').forEach(btn => {
      btn.addEventListener('click', async () => {
        const foodId = btn.dataset.id;
        await addToCart(foodId);
      });
    });
  } catch (error) {
    console.error('Error loading recommendations:', error);
    container.innerHTML = '<p>Unable to load recommendations</p>';
  }
}

// ============================================
// CART ACTIONS
// ============================================

function attachCartEventListeners() {
  // Clear cart button
  document.getElementById('clear-cart-btn')?.addEventListener('click', () => {
    if (confirm('Clear all items from cart?')) {
      currentCart.items = [];
      localStorage.setItem('cart', JSON.stringify(currentCart));
      fetchCart();
      updateCartCount();
      showNotification('Cart cleared', 'success');
    }
  });
  
  // Quantity buttons
  document.querySelectorAll('.decrement').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const cartItem = btn.closest('.cart-item');
      const foodId = cartItem.dataset.foodId;
      const quantitySpan = cartItem.querySelector('.quantity');
      const currentQty = parseInt(quantitySpan.textContent);
      if (currentQty > 1) {
        await updateQuantity(foodId, currentQty - 1);
      } else {
        await removeItem(foodId);
      }
    });
  });
  
  document.querySelectorAll('.increment').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const cartItem = btn.closest('.cart-item');
      const foodId = cartItem.dataset.foodId;
      const quantitySpan = cartItem.querySelector('.quantity');
      const currentQty = parseInt(quantitySpan.textContent);
      await updateQuantity(foodId, currentQty + 1);
    });
  });
  
  // Remove item
  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      const foodId = btn.dataset.id;
      await removeItem(foodId);
    });
  });
  
  // Special instructions
  document.querySelectorAll('.special-instruction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentEditingItem = btn.dataset.id;
      instructionsText.value = btn.dataset.instructions || '';
      instructionsModal.classList.add('active');
    });
  });
  
  // Order type selector - ONLY DINE-IN AND TAKEAWAY
  document.querySelectorAll('.order-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const orderType = btn.dataset.type;
      currentCart.orderType = orderType;
      localStorage.setItem('cart', JSON.stringify(currentCart));
      
      // Show/hide relevant sections
      const tableSelection = document.getElementById('table-selection');
      const pickupInfo = document.getElementById('pickup-info');
      
      if (tableSelection) tableSelection.style.display = orderType === 'Dine-in' ? 'block' : 'none';
      if (pickupInfo) pickupInfo.style.display = orderType === 'Takeaway' ? 'block' : 'none';
    });
  });
  
  // Place order
  document.getElementById('place-order-btn')?.addEventListener('click', async () => {
    if (!isAuthenticated()) {
      guestModal.classList.add('active');
      return;
    }
    
    await placeOrder();
  });
}

async function updateQuantity(foodId, newQuantity) {
  const itemIndex = currentCart.items.findIndex(i => i.foodId === foodId);
  if (itemIndex === -1) return;
  
  currentCart.items[itemIndex].quantity = newQuantity;
  localStorage.setItem('cart', JSON.stringify(currentCart));
  fetchCart();
  updateCartCount();
}

async function removeItem(foodId) {
  currentCart.items = currentCart.items.filter(i => i.foodId !== foodId);
  localStorage.setItem('cart', JSON.stringify(currentCart));
  showNotification('Item removed', 'success');
  fetchCart();
  updateCartCount();
}

async function addToCart(foodId) {
  const menu = JSON.parse(localStorage.getItem('menu') || '[]');
  const food = menu.find(f => f._id === foodId);
  
  if (!food) {
    showNotification('Item not found', 'error');
    return;
  }
  
  const existingItem = currentCart.items.find(i => i.foodId === foodId);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    currentCart.items.push({
      foodId: foodId,
      name: food.name,
      price: food.price,
      quantity: 1
    });
  }
  
  localStorage.setItem('cart', JSON.stringify(currentCart));
  showNotification('Added to cart!', 'success');
  fetchCart();
  updateCartCount();
}

// ============================================
// SPECIAL INSTRUCTIONS MODAL
// ============================================

if (saveInstructionsBtn) {
  saveInstructionsBtn.addEventListener('click', async () => {
    const instructions = instructionsText.value;
    const itemIndex = currentCart.items.findIndex(i => i.foodId === currentEditingItem);
    
    if (itemIndex !== -1) {
      currentCart.items[itemIndex].specialInstructions = instructions;
      localStorage.setItem('cart', JSON.stringify(currentCart));
      instructionsModal.classList.remove('active');
      fetchCart();
      showNotification('Special instructions saved', 'success');
    }
  });
}

if (closeModal) {
  closeModal.addEventListener('click', () => {
    instructionsModal.classList.remove('active');
  });
}

// ============================================
// GUEST CHECKOUT MODAL
// ============================================

if (closeGuestModal) {
  closeGuestModal.addEventListener('click', () => {
    guestModal.classList.remove('active');
  });
}

if (guestForm) {
  guestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    guestInfo = {
      name: document.getElementById('guest-name').value,
      phone: document.getElementById('guest-phone').value,
      email: document.getElementById('guest-email').value
    };
    
    guestModal.classList.remove('active');
    await placeOrder();
  });
}

// ============================================
// PLACE ORDER
// ============================================

async function placeOrder() {
  if (!currentCart.items || currentCart.items.length === 0) {
    showNotification('Your cart is empty', 'error');
    return;
  }
  
  const orderType = currentCart.orderType || 'Dine-in';
  const paymentMethod = document.getElementById('payment-method')?.value || 'Cash';
  const orderInstructions = document.getElementById('order-instructions')?.value || '';
  
  // Calculate totals
  const subtotal = currentCart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  
  // Get menu for full item details
  const menu = JSON.parse(localStorage.getItem('menu') || '[]');
  
  const orderData = {
    _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    orderNumber: 'ORD' + Date.now().toString().slice(-6),
    items: currentCart.items.map(item => {
      const food = menu.find(f => f._id === item.foodId);
      return {
        foodId: food || { name: item.name, price: item.price },
        quantity: item.quantity,
        price: item.price,
        specialInstructions: item.specialInstructions || ''
      };
    }),
    subtotal: subtotal,
    tax: tax,
    total: total,
    orderType: orderType,
    paymentMethod: paymentMethod,
    specialInstructions: orderInstructions,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };
  
  // Add order-type specific fields
  if (orderType === 'Dine-in') {
    const tableId = document.getElementById('table-select')?.value;
    if (tableId) {
      const tables = JSON.parse(localStorage.getItem('tables') || '[]');
      const table = tables.find(t => t._id === tableId);
      orderData.table = table || null;
    }
  } else if (orderType === 'Takeaway') {
    orderData.pickupName = document.getElementById('pickup-name')?.value || guestInfo?.name || 'Guest';
    orderData.pickupPhone = document.getElementById('pickup-phone')?.value || guestInfo?.phone || '';
  }
  
  // Add user info
  const user = getUser();
  if (user) {
    orderData.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone
    };
  } else if (guestInfo) {
    orderData.user = {
      name: guestInfo.name,
      phone: guestInfo.phone,
      email: guestInfo.email
    };
  }
  
  try {
    // Save order to localStorage
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push(orderData);
    localStorage.setItem('orders', JSON.stringify(orders));
    
    // Clear cart
    currentCart.items = [];
    localStorage.setItem('cart', JSON.stringify(currentCart));
    
    showNotification(`Order #${orderData.orderNumber} placed successfully!`, 'success');
    updateCartCount();
    
    // Redirect to orders page
    setTimeout(() => {
      window.location.href = '/customer/orders.html';
    }, 1500);
    
  } catch (error) {
    console.error('Order error:', error);
    showNotification('Failed to place order', 'error');
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

// Close modals on outside click
window.addEventListener('click', (e) => {
  if (e.target === instructionsModal) instructionsModal.classList.remove('active');
  if (e.target === guestModal) guestModal.classList.remove('active');
});

// ============================================
// INITIALIZE
// ============================================

fetchCart();