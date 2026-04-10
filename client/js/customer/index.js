import { getToken, showNotification, formatCurrency, updateCartCount, isAuthenticated, DEFAULT_FOOD_IMAGE, getImageUrl } from './global.js';

import { API_BASE } from '../config.js';

// DOM Elements
const specialsGrid = document.getElementById('specials-grid');
const chefSpecialsGrid = document.getElementById('chef-specials-grid');
const heroSearchInput = document.getElementById('hero-search');
const heroSearchBtn = document.getElementById('hero-search-btn');

// ============================================
// LOAD HOMEPAGE CONFIGURATION
// ============================================

function loadHomepageConfig() {
  const saved = localStorage.getItem('homepageConfig');
  const defaultConfig = {
    visibility: {
      showChefSpecial: true,
      showTodaySpecial: true,
      showOffers: true,
      showTestimonials: true
    },
    chefSpecialCount: 4,
    todaySpecialCount: 4,
    offers: []
  };
  
  return saved ? JSON.parse(saved) : defaultConfig;
}

// ============================================
// APPLY VISIBILITY SETTINGS
// ============================================

function applyVisibilitySettings() {
  const config = loadHomepageConfig();
  const visibility = config.visibility || {};
  
  // Chef's Special Section
  const chefSection = document.querySelector('.chef-special-section');
  if (chefSection) {
    chefSection.style.display = visibility.showChefSpecial ? 'block' : 'none';
  }
  
  // Today's Special Section (specials-section)
  const todaySection = document.querySelector('.specials-section');
  if (todaySection) {
    todaySection.style.display = visibility.showTodaySpecial ? 'block' : 'none';
  }
  
  // Special Offers Section
  const offersSection = document.querySelector('.offers-section');
  if (offersSection) {
    offersSection.style.display = visibility.showOffers ? 'block' : 'none';
  }
  
  // Testimonials Section
  const testimonialsSection = document.querySelector('.testimonials-section');
  if (testimonialsSection) {
    testimonialsSection.style.display = visibility.showTestimonials ? 'block' : 'none';
  }
}

// ============================================
// LOAD TODAY'S SPECIAL (specials-section)
// ============================================

async function loadTodaySpecials() {
  const config = loadHomepageConfig();
  
  // Check if section should be visible - if not, don't load
  if (!config.visibility?.showTodaySpecial) {
    return;
  }
  
  if (!specialsGrid) return;
  
  specialsGrid.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading specials...</p></div>';
  
  try {
    const response = await fetch(`${API_BASE}/api/menu`);
    if (!response.ok) throw new Error('Failed to fetch menu');
    const foods = await response.json();
    
    // Filter available items
    const availableFoods = foods.filter(food => food.isAvailable !== false);
    
    // Get today's special items (isTodaySpecial flag)
    let todaySpecials = availableFoods.filter(food => food.isTodaySpecial === true);
    
    // Fallback to popular items
    if (todaySpecials.length === 0) {
      todaySpecials = availableFoods.filter(food => food.isPopular === true);
    }
    
    // Limit by config count
    const count = config.todaySpecialCount || 4;
    
    // Final fallback
    if (todaySpecials.length === 0) {
      todaySpecials = availableFoods.slice(0, count);
    }
    
    renderTodaySpecials(todaySpecials.slice(0, count));
  } catch (error) {
    console.error('Error loading today specials:', error);
    specialsGrid.innerHTML = '<div class="empty-state-modern"><i class="fas fa-exclamation-circle"></i><p>Failed to load specials.</p></div>';
  }
}

function renderTodaySpecials(items) {
  if (!specialsGrid) return;
  
  if (items.length === 0) {
    specialsGrid.innerHTML = '<div class="empty-state-modern"><i class="fas fa-utensils"></i><p>No specials available.</p></div>';
    return;
  }
  
  specialsGrid.innerHTML = items.map(food => `
    <div class="special-card" data-food-id="${food._id}">
      ${food.isTodaySpecial ? '<div class="popular-badge"><i class="fas fa-fire"></i> Today\'s Special</div>' : 
        (food.isPopular ? '<div class="popular-badge"><i class="fas fa-star"></i> Popular</div>' : '')}
      <img src="${getImageUrl(food.image)}" alt="${escapeHtml(food.name)}" onerror="this.src='${DEFAULT_FOOD_IMAGE}'">
      <div class="special-info">
        <h3>${escapeHtml(food.name)}</h3>
        <p class="special-desc">${escapeHtml(food.description?.substring(0, 60) || 'Delicious dish')}${food.description?.length > 60 ? '...' : ''}</p>
        <div class="special-price">${formatCurrency(food.price)}</div>
        <button class="btn-add-special" data-id="${food._id}">Add to Cart</button>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.btn-add-special').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const foodId = btn.dataset.id;
      await addToCart(foodId, btn);
    });
  });
}

// ============================================
// LOAD CHEF'S SPECIAL
// ============================================

async function loadChefSpecials() {
  const config = loadHomepageConfig();
  
  // Check if section should be visible
  if (!config.visibility?.showChefSpecial) {
    return;
  }
  
  if (!chefSpecialsGrid) return;
  
  chefSpecialsGrid.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading chef\'s specials...</p></div>';
  
  try {
    const response = await fetch(`${API_BASE}/api/menu`);
    if (!response.ok) throw new Error('Failed to fetch menu');
    const foods = await response.json();
    
    const availableFoods = foods.filter(food => food.isAvailable !== false);
    let chefSpecials = availableFoods.filter(food => food.isPopular === true);
    
    const count = config.chefSpecialCount || 4;
    
    if (chefSpecials.length === 0) {
      chefSpecials = availableFoods.slice(0, count);
    }
    
    renderChefSpecials(chefSpecials.slice(0, count));
  } catch (error) {
    console.error('Error loading chef specials:', error);
    chefSpecialsGrid.innerHTML = '<div class="empty-state-modern"><i class="fas fa-exclamation-circle"></i><p>Failed to load chef\'s specials.</p></div>';
  }
}

function renderChefSpecials(items) {
  if (!chefSpecialsGrid) return;
  
  if (items.length === 0) {
    chefSpecialsGrid.innerHTML = '<div class="empty-state-modern"><i class="fas fa-utensils"></i><p>Chef\'s specials coming soon!</p></div>';
    return;
  }
  
  chefSpecialsGrid.innerHTML = items.map(food => `
    <div class="chef-special-card" data-food-id="${food._id}">
      <div class="chef-badge"><i class="fas fa-crown"></i> Chef's Special</div>
      <img src="${getImageUrl(food.image)}" alt="${escapeHtml(food.name)}" onerror="this.src='${DEFAULT_FOOD_IMAGE}'">
      <div class="chef-special-info">
        <h3>${escapeHtml(food.name)}</h3>
        <p class="chef-special-desc">${escapeHtml(food.description?.substring(0, 50) || 'Signature dish')}</p>
        <div class="chef-special-footer">
          <span class="chef-special-price">${formatCurrency(food.price)}</span>
          <button class="btn-add-chef-special" data-id="${food._id}">Add to Cart</button>
        </div>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.btn-add-chef-special').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const foodId = btn.dataset.id;
      await addToCart(foodId, btn);
    });
  });
}

// ============================================
// LOAD OFFERS SECTION
// ============================================

function loadOffers() {
  const config = loadHomepageConfig();
  
  // Check if section should be visible
  if (!config.visibility?.showOffers) {
    return;
  }
  
  const offersGrid = document.querySelector('.offers-grid');
  if (!offersGrid) return;
  
  const offers = config.offers || [];
  const activeOffers = offers.filter(o => o.active);
  
  if (activeOffers.length === 0) {
    // Show default offers
    offersGrid.innerHTML = `
      <div class="offer-card happy-hour">
        <i class="fas fa-clock"></i>
        <div>
          <h3>Happy Hours</h3>
          <p>Monday - Friday | 5:00 PM - 7:00 PM</p>
          <span class="offer-tag">20% OFF on selected items</span>
        </div>
      </div>
      <div class="offer-card weekend">
        <i class="fas fa-calendar-week"></i>
        <div>
          <h3>Weekend Specials</h3>
          <p>Saturday & Sunday</p>
          <span class="offer-tag">Buy 1 Get 1 Free</span>
        </div>
      </div>
      <div class="offer-card group">
        <i class="fas fa-users"></i>
        <div>
          <h3>Group Discount</h3>
          <p>For 5+ people</p>
          <span class="offer-tag">10% OFF on total bill</span>
        </div>
      </div>
    `;
    return;
  }
  
  const icons = ['fa-clock', 'fa-calendar-week', 'fa-users', 'fa-tag', 'fa-gift'];
  const classes = ['happy-hour', 'weekend', 'group', 'happy-hour', 'weekend'];
  
  offersGrid.innerHTML = activeOffers.map((offer, i) => `
    <div class="offer-card ${classes[i % classes.length]}">
      <i class="fas ${icons[i % icons.length]}"></i>
      <div>
        <h3>${escapeHtml(offer.title)}</h3>
        <p>${escapeHtml(offer.description)}</p>
        <span class="offer-tag">${escapeHtml(offer.discount)}</span>
      </div>
    </div>
  `).join('');
}

// ============================================
// APPLY TESTIMONIALS VISIBILITY
// ============================================

function applyTestimonialsVisibility() {
  const config = loadHomepageConfig();
  const testimonialsSection = document.querySelector('.testimonials-section');
  
  if (testimonialsSection) {
    testimonialsSection.style.display = config.visibility?.showTestimonials ? 'block' : 'none';
  }
}

// ============================================
// ADD TO CART
// ============================================

async function addToCart(foodId, btn) {
  if (!isAuthenticated()) {
    if (confirm('Please login to add items to cart. Go to login page?')) {
      window.location.href = '/customer/login.html';
    }
    return;
  }
  
  const token = getToken();
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE}/api/cart/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ foodId, quantity: 1 })
    });
    
    if (!response.ok) throw new Error('Add to cart failed');
    
    btn.innerHTML = '<i class="fas fa-check"></i> Added!';
    btn.style.background = '#4caf50';
    
    showNotification('Added to cart!', 'success');
    updateCartCount();
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.background = '';
      btn.disabled = false;
    }, 1500);
    
  } catch (error) {
    console.error('Error adding to cart:', error);
    showNotification('Failed to add to cart', 'error');
    btn.innerHTML = originalHTML;
    btn.disabled = false;
  }
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

if (heroSearchBtn) {
  heroSearchBtn.addEventListener('click', () => {
    const query = heroSearchInput?.value.trim();
    if (query) {
      window.location.href = `/customer/menu.html?search=${encodeURIComponent(query)}`;
    }
  });
  
  if (heroSearchInput) {
    heroSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') heroSearchBtn.click();
    });
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
// INITIALIZE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Apply visibility settings FIRST
  applyVisibilitySettings();
  applyTestimonialsVisibility();
  
  // Then load content (functions will check visibility internally)
  loadTodaySpecials();
  loadChefSpecials();
  loadOffers();
});