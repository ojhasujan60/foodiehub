import { getToken, showNotification, isAdmin } from '../customer/global.js';

if (!isAdmin()) {
  alert('Access denied. Admin only.');
  window.location.href = '../customer/login.html';
}

// Default homepage config
const defaultConfig = {
  hero: {
    title: "Welcome to Sujan's Foodie Hub",
    subtitle: "Authentic Nepali Flavors | Warm Ambiance | Exceptional Service",
    btnPrimary: "Explore Menu",
    btnSecondary: "Book a Table"
  },
  visibility: {
    showChefSpecial: true,
    showTodaySpecial: true,
    showOffers: true,
    showTestimonials: true
  },
  chefSpecialCount: 4,
  todaySpecialCount: 4,
  offers: [
    { id: '1', title: 'Happy Hours', description: 'Monday - Friday | 5:00 PM - 7:00 PM', discount: '20% OFF', active: true },
    { id: '2', title: 'Weekend Specials', description: 'Saturday & Sunday', discount: 'Buy 1 Get 1 Free', active: true },
    { id: '3', title: 'Group Discount', description: 'For 5+ people', discount: '10% OFF on total bill', active: true }
  ]
};

// Load config
function loadConfig() {
  const saved = localStorage.getItem('homepageConfig');
  const config = saved ? JSON.parse(saved) : defaultConfig;
  
  document.getElementById('hero-title').value = config.hero.title;
  document.getElementById('hero-subtitle').value = config.hero.subtitle;
  document.getElementById('hero-btn-primary').value = config.hero.btnPrimary;
  document.getElementById('hero-btn-secondary').value = config.hero.btnSecondary;
  
  document.getElementById('show-chef-special').checked = config.visibility.showChefSpecial;
  document.getElementById('show-today-special').checked = config.visibility.showTodaySpecial;
  document.getElementById('show-offers').checked = config.visibility.showOffers;
  document.getElementById('show-testimonials').checked = config.visibility.showTestimonials;
  
  document.getElementById('chef-special-count').value = config.chefSpecialCount;
  document.getElementById('today-special-count').value = config.todaySpecialCount;
  
  renderOffers(config.offers);
}

// Render offers
function renderOffers(offers) {
  const container = document.getElementById('offers-list');
  
  if (!offers || offers.length === 0) {
    container.innerHTML = '<p style="color: #666;">No offers configured. Click "Add Offer" to create one.</p>';
    return;
  }
  
  container.innerHTML = offers.map(offer => `
    <div class="offer-item" data-id="${offer.id}" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; margin-bottom: 0.75rem;">
      <div style="flex: 3;">
        <input type="text" class="offer-title" value="${escapeHtml(offer.title)}" placeholder="Offer Title" style="width: 100%; padding: 0.4rem; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="flex: 3;">
        <input type="text" class="offer-desc" value="${escapeHtml(offer.description)}" placeholder="Description" style="width: 100%; padding: 0.4rem; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="flex: 2;">
        <input type="text" class="offer-discount" value="${escapeHtml(offer.discount)}" placeholder="Discount" style="width: 100%; padding: 0.4rem; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="flex: 1;">
        <label class="checkbox-label">
          <input type="checkbox" class="offer-active" ${offer.active ? 'checked' : ''}> Active
        </label>
      </div>
      <div>
        <button class="delete-offer" data-id="${offer.id}" style="background: #f44336; color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 4px; cursor: pointer;">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
  
  // Delete handlers
  document.querySelectorAll('.delete-offer').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      const item = btn.closest('.offer-item');
      item.remove();
    });
  });
}

// Save config
function saveConfig() {
  const offers = [];
  document.querySelectorAll('.offer-item').forEach(item => {
    offers.push({
      id: item.dataset.id || Date.now().toString() + Math.random().toString(36).substr(2, 5),
      title: item.querySelector('.offer-title').value,
      description: item.querySelector('.offer-desc').value,
      discount: item.querySelector('.offer-discount').value,
      active: item.querySelector('.offer-active').checked
    });
  });
  
  const config = {
    hero: {
      title: document.getElementById('hero-title').value,
      subtitle: document.getElementById('hero-subtitle').value,
      btnPrimary: document.getElementById('hero-btn-primary').value,
      btnSecondary: document.getElementById('hero-btn-secondary').value
    },
    visibility: {
      showChefSpecial: document.getElementById('show-chef-special').checked,
      showTodaySpecial: document.getElementById('show-today-special').checked,
      showOffers: document.getElementById('show-offers').checked,
      showTestimonials: document.getElementById('show-testimonials').checked
    },
    chefSpecialCount: parseInt(document.getElementById('chef-special-count').value),
    todaySpecialCount: parseInt(document.getElementById('today-special-count').value),
    offers: offers
  };
  
  localStorage.setItem('homepageConfig', JSON.stringify(config));
  showNotification('Homepage settings saved successfully!', 'success');
}

// Add offer
function addOffer() {
  const container = document.getElementById('offers-list');
  const newId = Date.now().toString();
  
  const newOfferHtml = `
    <div class="offer-item" data-id="${newId}" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; margin-bottom: 0.75rem;">
      <div style="flex: 3;">
        <input type="text" class="offer-title" placeholder="Offer Title" value="New Offer" style="width: 100%; padding: 0.4rem; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="flex: 3;">
        <input type="text" class="offer-desc" placeholder="Description" style="width: 100%; padding: 0.4rem; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="flex: 2;">
        <input type="text" class="offer-discount" placeholder="Discount" style="width: 100%; padding: 0.4rem; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="flex: 1;">
        <label class="checkbox-label">
          <input type="checkbox" class="offer-active" checked> Active
        </label>
      </div>
      <div>
        <button class="delete-offer" data-id="${newId}" style="background: #f44336; color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 4px; cursor: pointer;">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', newOfferHtml);
  
  // Add delete handler
  const lastOffer = container.lastElementChild;
  lastOffer.querySelector('.delete-offer').addEventListener('click', (e) => {
    lastOffer.remove();
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}

// Event listeners
document.getElementById('save-homepage')?.addEventListener('click', saveConfig);
document.getElementById('add-offer')?.addEventListener('click', addOffer);

// Logout
document.getElementById('logout-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../customer/login.html';
});

// Initialize
loadConfig();