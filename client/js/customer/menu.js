import { getToken, showNotification, formatCurrency, updateCartCount, isAuthenticated } from './global.js';

const menuContent = document.getElementById('menu-content');
const categoryNav = document.getElementById('category-nav');
const itemModal = document.getElementById('item-modal');
const closeModal = document.querySelector('.modal-close-item');
const scrollToTopBtn = document.getElementById('scroll-to-top');

let allFoods = [];
let activeCategory = 'Appetizer';

// Categories - can be made dynamic from localStorage
const categories = [
  { id: 'Appetizer', name: 'Appetizers', icon: 'fa-utensils', color: '#ff6b6b' },
  { id: 'Main Course', name: 'Main Course', icon: 'fa-hamburger', color: '#ff6b6b' },
  { id: 'Dessert', name: 'Desserts', icon: 'fa-ice-cream', color: '#ff6b6b' },
  { id: 'Beverage', name: 'Drinks', icon: 'fa-coffee', color: '#ff6b6b' }
];

// Get URL parameters for search/item highlight
const urlParams = new URLSearchParams(window.location.search);
const searchQuery = urlParams.get('search') || '';
const highlightItem = urlParams.get('item') || '';

// Scroll to top button
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    scrollToTopBtn?.classList.add('show');
  } else {
    scrollToTopBtn?.classList.remove('show');
  }
});

if (scrollToTopBtn) {
  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ============================================
// FETCH MENU
// ============================================

async function fetchMenu() {
  if (!menuContent) return;
  
  menuContent.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading menu...</p></div>';
  
  try {
    // Get menu from localStorage
    const menu = JSON.parse(localStorage.getItem('menu') || '[]');
    
    // Filter out unavailable and out of stock items
    allFoods = menu.filter(food => food.isAvailable === true && !food.isOutOfStock);
    
    // Apply search filter if present
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allFoods = allFoods.filter(food => 
        food.name.toLowerCase().includes(query) ||
        (food.description && food.description.toLowerCase().includes(query)) ||
        food.category.toLowerCase().includes(query)
      );
    }
    
    renderMenu();
    setupCategoryNavigation();
    
    // Highlight specific item if requested
    if (highlightItem) {
      setTimeout(() => {
        const itemElement = document.querySelector(`[data-food-id="${highlightItem}"]`);
        if (itemElement) {
          itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          itemElement.style.boxShadow = '0 0 0 3px #ff6b6b';
          setTimeout(() => itemElement.style.boxShadow = '', 2000);
        }
      }, 500);
    }
  } catch (error) {
    console.error('Error fetching menu:', error);
    menuContent.innerHTML = '<div class="empty-state-modern"><i class="fas fa-exclamation-circle"></i><p>Failed to load menu. Please try again.</p></div>';
  }
}

// ============================================
// RENDER MENU
// ============================================

function renderMenu() {
  if (!menuContent) return;
  
  let html = '';
  let hasItems = false;
  
  for (const category of categories) {
    const categoryFoods = allFoods.filter(food => food.category === category.id);
    
    if (categoryFoods.length === 0) continue;
    hasItems = true;
    
    html += `
      <div class="menu-section" id="section-${category.id.replace(/ /g, '-')}" data-category="${category.id}">
        <div class="section-header">
          <div class="section-title">
            <i class="fas ${category.icon}" style="color: ${category.color};"></i>
            <h2>${category.name}</h2>
          </div>
          <div class="section-count">${categoryFoods.length} items</div>
        </div>
        <div class="horizontal-scroll">
          <div class="scroll-container">
            ${categoryFoods.map(food => `
              <div class="menu-card" data-food-id="${food._id}">
                <div class="menu-card-image">
                  <img src="${food.image || '/uploads/default-food.jpg'}" alt="${escapeHtml(food.name)}" onerror="this.src='/uploads/default-food.jpg'">
                  ${food.isTodaySpecial ? '<span class="menu-badge today-special"><i class="fas fa-fire"></i> Today\'s Special</span>' : ''}
                  ${food.isPopular && !food.isTodaySpecial ? '<span class="menu-badge popular"><i class="fas fa-star"></i> Popular</span>' : ''}
                </div>
                <div class="menu-card-info">
                  <h3 class="menu-card-title">${escapeHtml(food.name)}</h3>
                  <p class="menu-card-description">${escapeHtml(food.description?.substring(0, 60) || 'Delicious dish')}${food.description?.length > 60 ? '...' : ''}</p>
                  <div class="menu-card-footer">
                    <span class="menu-card-price"><span class="currency-symbol">रु</span> ${food.price}</span>
                    <button class="menu-add-btn" data-id="${food._id}">
                      <i class="fas fa-plus"></i> Add
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
  
  if (!hasItems) {
    let message = 'No items available in menu.';
    if (searchQuery) {
      message = `No items found for "${searchQuery}". <a href="menu.html">Clear search</a>`;
    }
    menuContent.innerHTML = `<div class="empty-state-modern"><i class="fas fa-utensils"></i><p>${message}</p></div>`;
    return;
  }
  
  menuContent.innerHTML = html;
  
  // Add event listeners
  document.querySelectorAll('.menu-add-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const foodId = btn.dataset.id;
      await addToCart(foodId, btn);
    });
  });
  
  document.querySelectorAll('.menu-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.menu-add-btn')) {
        const foodId = card.dataset.foodId;
        showItemDetails(foodId);
      }
    });
  });
}

// ============================================
// CATEGORY NAVIGATION
// ============================================

function setupCategoryNavigation() {
  if (!categoryNav) return;
  
  const categoryItems = document.querySelectorAll('.category-item');
  
  categoryItems.forEach(item => {
    item.addEventListener('click', () => {
      const category = item.dataset.category;
      activeCategory = category;
      
      categoryItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      const sectionId = `section-${category.replace(/ /g, '-')}`;
      const section = document.getElementById(sectionId);
      
      if (section) {
        const offset = 80;
        const elementPosition = section.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    });
  });
  
  // Update active category on scroll
  window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('.menu-section');
    const scrollPosition = window.scrollY + 100;
    
    let currentSection = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionBottom = sectionTop + section.offsetHeight;
      
      if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
        currentSection = section.dataset.category;
      }
    });
    
    if (currentSection && currentSection !== activeCategory) {
      activeCategory = currentSection;
      
      categoryItems.forEach(item => {
        if (item.dataset.category === currentSection) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }
  });
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
  
  // Get current cart
  let cart = JSON.parse(localStorage.getItem('cart') || '{"items":[]}');
  const food = allFoods.find(f => f._id === foodId);
  
  if (!food) {
    showNotification('Item not found', 'error');
    return;
  }
  
  try {
    const existingItem = cart.items?.find(item => 
      item.foodId === foodId || item.foodId?._id === foodId
    );
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.items = cart.items || [];
      cart.items.push({
        foodId: foodId,
        name: food.name,
        price: food.price,
        quantity: 1
      });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Animate button
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Added!';
    btn.style.background = '#4caf50';
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.background = '';
    }, 1500);
    
    showNotification('Added to cart!', 'success');
    updateCartCount();
    
  } catch (error) {
    console.error('Error adding to cart:', error);
    showNotification('Failed to add to cart', 'error');
  }
}

// ============================================
// ITEM DETAILS MODAL
// ============================================

function showItemDetails(foodId) {
  const food = allFoods.find(f => f._id === foodId);
  if (!food) return;
  
  const modalContent = document.getElementById('modal-item-details');
  document.getElementById('modal-item-name').textContent = food.name;
  
  modalContent.innerHTML = `
    <div style="text-align: center;">
      <img src="${food.image || '/uploads/default-food.jpg'}" alt="${escapeHtml(food.name)}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 12px; margin-bottom: 1rem;">
      
      <div style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1rem;">
        ${food.isVegetarian ? '<span class="badge badge-success"><i class="fas fa-leaf"></i> Vegetarian</span>' : ''}
        ${food.isPopular ? '<span class="badge badge-warning"><i class="fas fa-crown"></i> Chef\'s Special</span>' : ''}
        ${food.isTodaySpecial ? '<span class="badge badge-info" style="background: #ff6b6b; color: white;"><i class="fas fa-fire"></i> Today\'s Special</span>' : ''}
        <span class="badge" style="background: #fff3e0; color: #ff9800;">🌶️ Spicy: ${food.spicyLevel}/5</span>
      </div>
      
      <p style="color: #666; margin-bottom: 1rem;">${escapeHtml(food.description || 'No description available')}</p>
      
      <div style="margin-bottom: 1rem; text-align: left; background: #f8f9fa; padding: 1rem; border-radius: 8px;">
        <div><strong>Category:</strong> ${food.category}</div>
        <div><strong>Cuisine:</strong> ${food.cuisine || 'Various'}</div>
        <div><strong>Preparation Time:</strong> ${food.preparationTime || 20} minutes</div>
      </div>
      
      <div style="font-size: 1.8rem; font-weight: bold; color: #ff6b6b; margin-bottom: 1rem;">${formatCurrency(food.price)}</div>
      
      <button class="btn-primary" id="modal-add-btn" data-id="${food._id}" style="width: 100%;">
        <i class="fas fa-plus"></i> Add to Cart
      </button>
    </div>
  `;
  
  itemModal.classList.add('active');
  
  const modalAddBtn = document.getElementById('modal-add-btn');
  if (modalAddBtn) {
    modalAddBtn.addEventListener('click', async () => {
      const foodId = modalAddBtn.dataset.id;
      await addToCart(foodId, modalAddBtn);
      itemModal.classList.remove('active');
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
// MODAL CLOSE
// ============================================

if (closeModal) {
  closeModal.addEventListener('click', () => {
    itemModal.classList.remove('active');
  });
}

window.addEventListener('click', (e) => {
  if (e.target === itemModal) {
    itemModal.classList.remove('active');
  }
});

// ============================================
// INITIALIZE
// ============================================

fetchMenu();