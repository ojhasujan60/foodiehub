// Global helper functions for customer
// Works with backend API at http://localhost:3001

// ============================================
// API CONFIGURATION
// ============================================
const API_BASE = 'http://localhost:3001';

// ============================================
// DEFAULT IMAGE CONFIGURATION
// ============================================
export const DEFAULT_FOOD_IMAGE = '/uploads/default.jpg';
export const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'300\' viewBox=\'0 0 400 300\'%3E%3Cdefs%3E%3ClinearGradient id=\'grad\' x1=\'0%25\' y1=\'0%25\' x2=\'100%25\' y2=\'100%25\'%3E%3Cstop offset=\'0%25\' style=\'stop-color:%23ff6b6b;stop-opacity:1\' /%3E%3Cstop offset=\'100%25\' style=\'stop-color:%23ff8e8e;stop-opacity:1\' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=\'400\' height=\'300\' fill=\'url(%23grad)\' rx=\'15\'/%3E%3Ccircle cx=\'200\' cy=\'120\' r=\'50\' fill=\'white\' opacity=\'0.2\'/%3E%3Ctext x=\'200\' y=\'170\' font-family=\'Arial, sans-serif\' font-size=\'60\' fill=\'white\' text-anchor=\'middle\' font-weight=\'bold\'%3E🍽️%3C/text%3E%3Ctext x=\'200\' y=\'220\' font-family=\'Arial, sans-serif\' font-size=\'20\' fill=\'white\' text-anchor=\'middle\' opacity=\'0.9\'%3EFoodieHub%3C/text%3E%3C/svg%3E';

export function getImageUrl(imagePath) {
  if (!imagePath || imagePath === '' || imagePath === 'undefined') {
    return DEFAULT_FOOD_IMAGE;
  }
  if (imagePath.startsWith('data:')) {
    return imagePath;
  }
  return imagePath;
}

// ============================================
// USER MANAGEMENT
// ============================================

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  localStorage.setItem('token', token);
}

export function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function isAuthenticated() {
  return !!getToken();
}

export function isAdmin() {
  const user = getUser();
  return user && user.role === 'admin';
}

export function isStaff() {
  const user = getUser();
  return user && (user.role === 'staff' || user.role === 'admin');
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/customer/login.html';
}

// ============================================
// CART MANAGEMENT (API Version)
// ============================================

export async function updateCartCount() {
  if (!isAuthenticated()) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/cart`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    
    if (!response.ok) return;
    
    const cart = await response.json();
    const count = cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    
    const cartCountSpan = document.getElementById('cart-count');
    if (cartCountSpan) {
      cartCountSpan.textContent = count;
      cartCountSpan.style.display = count > 0 ? 'inline-block' : 'none';
    }
  } catch (error) {
    console.error('Error fetching cart count:', error);
  }
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

export function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ============================================
// FORMATTING FUNCTIONS
// ============================================

export function formatCurrency(amount) {
  if (amount === undefined || amount === null) return 'रु 0';
  return `रु ${amount.toLocaleString('en-IN')}`;
}

export function formatDate(date) {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return 'Invalid Date';
  }
}

// ============================================
// NAVBAR UPDATE
// ============================================

export function updateNavbar() {
  const user = getUser();
  const userMenu = document.getElementById('user-menu');
  const loginLink = document.getElementById('login-link');
  const adminLink = document.getElementById('admin-link');
  const staffLink = document.getElementById('staff-link');
  
  if (user) {
    if (userMenu) {
      userMenu.style.display = 'flex';
      const userNameSpan = document.getElementById('user-name');
      if (userNameSpan) userNameSpan.textContent = user.name?.split(' ')[0] || 'User';
    }
    if (loginLink) loginLink.style.display = 'none';
    
    if (adminLink && user.role === 'admin') adminLink.style.display = 'block';
    if (staffLink && (user.role === 'staff' || user.role === 'admin')) staffLink.style.display = 'block';
  } else {
    if (userMenu) userMenu.style.display = 'none';
    if (loginLink) loginLink.style.display = 'block';
    if (adminLink) adminLink.style.display = 'none';
    if (staffLink) staffLink.style.display = 'none';
  }
  
  updateCartCount();
}

// ============================================
// GLOBAL IMAGE ERROR HANDLER
// ============================================

function setupImageErrorHandler() {
  document.addEventListener('error', function(e) {
    if (e.target.tagName === 'IMG') {
      if (!e.target.src.includes('data:image') && !e.target.src.includes('default.jpg')) {
        e.target.src = DEFAULT_FOOD_IMAGE;
      }
    }
  }, true);
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  setupImageErrorHandler();
  
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
});