import { getToken, showNotification, formatCurrency, isAdmin } from '../customer/global.js';

if (!isAdmin()) {
  alert('Access denied. Admin only.');
  window.location.href = '../customer/login.html';
}

const addFoodForm = document.getElementById('add-food-form');
const foodListContainer = document.getElementById('food-list');
const categoryFilter = document.getElementById('category-filter');
const searchFood = document.getElementById('search-food');

let currentFoods = [];
let currentCategory = '';
let currentSearch = '';

// Initialize default menu if empty
function initializeDefaultMenu() {
  const existing = localStorage.getItem('menu');
  if (!existing || JSON.parse(existing).length === 0) {
    const defaultMenu = [
      {
        _id: '1',
        name: 'Butter Chicken',
        price: 350,
        category: 'Main Course',
        cuisine: 'Indian',
        description: 'Creamy tomato-based curry with tender chicken pieces',
        isVegetarian: false,
        isPopular: true,
        isAvailable: true,
        spicyLevel: 2,
        preparationTime: 25,
        image: '/uploads/default-food.jpg',
        createdAt: new Date().toISOString()
      },
      {
        _id: '2',
        name: 'Paneer Tikka',
        price: 280,
        category: 'Appetizer',
        cuisine: 'Indian',
        description: 'Marinated paneer cubes grilled to perfection',
        isVegetarian: true,
        isPopular: true,
        isAvailable: true,
        spicyLevel: 2,
        preparationTime: 20,
        image: '/uploads/default-food.jpg',
        createdAt: new Date().toISOString()
      },
      {
        _id: '3',
        name: 'Chicken Momo',
        price: 180,
        category: 'Appetizer',
        cuisine: 'Nepali',
        description: 'Steamed dumplings filled with spiced chicken',
        isVegetarian: false,
        isPopular: true,
        isAvailable: true,
        spicyLevel: 3,
        preparationTime: 15,
        image: '/uploads/default-food.jpg',
        createdAt: new Date().toISOString()
      },
      {
        _id: '4',
        name: 'Gulab Jamun',
        price: 120,
        category: 'Dessert',
        cuisine: 'Indian',
        description: 'Deep-fried milk solids soaked in sugar syrup',
        isVegetarian: true,
        isPopular: true,
        isAvailable: true,
        spicyLevel: 0,
        preparationTime: 10,
        image: '/uploads/default-food.jpg',
        createdAt: new Date().toISOString()
      },
      {
        _id: '5',
        name: 'Masala Chai',
        price: 60,
        category: 'Beverage',
        cuisine: 'Indian',
        description: 'Traditional spiced tea with milk',
        isVegetarian: true,
        isPopular: false,
        isAvailable: true,
        spicyLevel: 1,
        preparationTime: 5,
        image: '/uploads/default-food.jpg',
        createdAt: new Date().toISOString()
      },
      {
        _id: '6',
        name: 'Chicken Biryani',
        price: 320,
        category: 'Main Course',
        cuisine: 'Indian',
        description: 'Fragrant basmati rice cooked with spiced chicken',
        isVegetarian: false,
        isPopular: true,
        isAvailable: true,
        spicyLevel: 3,
        preparationTime: 30,
        image: '/uploads/default-food.jpg',
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem('menu', JSON.stringify(defaultMenu));
  }
}

// Fetch all foods
async function fetchFoods() {
  if (!foodListContainer) return;
  
  foodListContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading menu...</p></div>';
  
  try {
    initializeDefaultMenu();
    const foods = JSON.parse(localStorage.getItem('menu') || '[]');
    currentFoods = foods;
    renderFoodList(foods);
    return foods;
  } catch (error) {
    console.error('Error fetching foods:', error);
    foodListContainer.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading foods.</p></div>';
    return [];
  }
}

function renderFoodList(foods) {
  if (!foodListContainer) return;
  
  let filtered = [...foods];
  
  if (currentCategory) {
    filtered = filtered.filter(f => f.category === currentCategory);
  }
  if (currentSearch) {
    filtered = filtered.filter(f => 
      f.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(currentSearch.toLowerCase()))
    );
  }
  
  if (filtered.length === 0) {
    foodListContainer.innerHTML = '<div class="empty-state"><i class="fas fa-utensils"></i><p>No food items found.</p></div>';
    return;
  }
  
  foodListContainer.innerHTML = filtered.map(food => `
    <div class="food-card" data-id="${food._id}" data-name="${escapeHtml(food.name)}">
      <img src="${food.image || '/uploads/default-food.jpg'}" alt="${escapeHtml(food.name)}" onerror="this.src='/uploads/default-food.jpg'">
      <div class="food-info">
        <h3>${escapeHtml(food.name)}</h3>
        <p class="price">${formatCurrency(food.price)}</p>
        <p class="category"><i class="fas fa-tag"></i> ${food.category} • ${food.cuisine || 'Various'}</p>
        <p class="description" style="font-size: 0.8rem; color: #666; margin: 0.3rem 0;">${escapeHtml(food.description?.substring(0, 60) || '')}${food.description?.length > 60 ? '...' : ''}</p>
        <div class="food-badges">
          ${food.isVegetarian ? '<span class="badge badge-success"><i class="fas fa-leaf"></i> Veg</span>' : ''}
          ${food.isPopular ? '<span class="badge badge-warning"><i class="fas fa-crown"></i> Chef\'s Special</span>' : ''}
          ${food.isTodaySpecial ? '<span class="badge badge-info" style="background: #ff6b6b; color: white;"><i class="fas fa-fire"></i> Today\'s Special</span>' : ''}
          <span class="badge ${food.isAvailable ? 'badge-success' : 'badge-danger'}">
            ${food.isAvailable ? 'Available' : 'Unavailable'}
          </span>
          <span class="badge badge-info" style="background: #e3f2fd; color: #1976d2;">
            <i class="fas fa-clock"></i> ${food.preparationTime || 20} min
          </span>
          <span class="badge" style="background: #fff3e0; color: #ff9800;">
            🌶️ ${food.spicyLevel || 2}/5
          </span>
        </div>
        <div class="food-actions">
          <button class="btn-edit" data-id="${food._id}"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn-toggle" data-id="${food._id}" data-available="${food.isAvailable}">
            <i class="fas ${food.isAvailable ? 'fa-eye-slash' : 'fa-eye'}"></i>
            ${food.isAvailable ? 'Hide' : 'Show'}
          </button>
          <button class="btn-delete" data-id="${food._id}"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>
    </div>
  `).join('');
  
  // Add event listeners
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      editFood(id);
    });
  });
  
  document.querySelectorAll('.btn-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await toggleAvailability(id);
    });
  });
  
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const card = btn.closest('.food-card');
      const foodName = card?.dataset.name || 'this item';
      if (confirm(`Are you sure you want to delete "${foodName}"?`)) {
        await deleteFood(id);
      }
    });
  });
}

// Save food function
function saveFood(food) {
  const foods = JSON.parse(localStorage.getItem('menu') || '[]');
  
  // Set default image if none provided
  if (!food.image || food.image === '') {
    food.image = '/uploads/default-food.jpg';
  }
  
  // Add new fields
  food.isTodaySpecial = food.isTodaySpecial || false;
  food.isOutOfStock = false;
  food.displayOrder = foods.length + 1;
  
  foods.push(food);
  localStorage.setItem('menu', JSON.stringify(foods));
  
  showNotification(`"${food.name}" added successfully!`, 'success');
  addFoodForm.reset();
  
  const imagePreview = document.getElementById('image-preview');
  if (imagePreview) imagePreview.style.display = 'none';
  
  fetchFoods();
  
  // Scroll to new item
  setTimeout(() => {
    const newCard = document.querySelector(`.food-card[data-name="${food.name}"]`);
    if (newCard) {
      newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      newCard.style.transition = 'all 0.3s ease';
      newCard.style.boxShadow = '0 0 0 4px #ff6b6b, 0 8px 20px rgba(0,0,0,0.15)';
      newCard.style.transform = 'scale(1.02)';
      setTimeout(() => {
        newCard.style.boxShadow = '';
        newCard.style.transform = '';
      }, 3000);
    }
  }, 300);
}

// Add food
if (addFoodForm) {
  addFoodForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(addFoodForm);
    const foodName = formData.get('name');
    
    if (!foodName) {
      showNotification('Please enter a food name', 'error');
      return;
    }
    
    // Disable submit button
    const submitBtn = addFoodForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    submitBtn.disabled = true;
    
    try {
      const newFood = {
        _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: foodName,
        price: parseFloat(formData.get('price')),
        category: formData.get('category'),
        cuisine: formData.get('cuisine'),
        description: formData.get('description') || '',
        isVegetarian: formData.get('isVegetarian') === 'true',
        isPopular: formData.get('isPopular') === 'true',
        isTodaySpecial: formData.get('isTodaySpecial') === 'true',
        isAvailable: true,
        isOutOfStock: false,
        spicyLevel: parseInt(formData.get('spicyLevel')) || 2,
        preparationTime: parseInt(formData.get('preparationTime')) || 20,
        image: '/uploads/default-food.jpg',
        createdAt: new Date().toISOString()
      };
      
      // Handle image upload
      const imageFile = formData.get('image');
      if (imageFile && imageFile.size > 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newFood.image = e.target.result;
          saveFood(newFood);
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        };
        reader.readAsDataURL(imageFile);
      } else {
        saveFood(newFood);
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
      
    } catch (error) {
      console.error('Error adding food:', error);
      showNotification('Failed to add food', 'error');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

// Image preview functionality
const imageInput = document.getElementById('food-image-input');
const imagePreview = document.getElementById('image-preview');

if (imageInput) {
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        imagePreview.src = event.target.result;
        imagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });
}

// Delete food
async function deleteFood(foodId) {
  const foods = JSON.parse(localStorage.getItem('menu') || '[]');
  const updatedFoods = foods.filter(f => f._id !== foodId);
  localStorage.setItem('menu', JSON.stringify(updatedFoods));
  
  showNotification('Food deleted successfully', 'success');
  fetchFoods();
}

// Toggle availability
async function toggleAvailability(foodId) {
  const foods = JSON.parse(localStorage.getItem('menu') || '[]');
  const foodIndex = foods.findIndex(f => f._id === foodId);
  if (foodIndex !== -1) {
    foods[foodIndex].isAvailable = !foods[foodIndex].isAvailable;
    localStorage.setItem('menu', JSON.stringify(foods));
    showNotification(`Item ${foods[foodIndex].isAvailable ? 'shown' : 'hidden'}`, 'success');
    fetchFoods();
  }
}

// Edit food
function editFood(foodId) {
  const foods = JSON.parse(localStorage.getItem('menu') || '[]');
  const food = foods.find(f => f._id === foodId);
  
  if (food) {
    // Populate form for editing
    const nameInput = document.querySelector('input[name="name"]');
    const priceInput = document.querySelector('input[name="price"]');
    const categorySelect = document.querySelector('select[name="category"]');
    const cuisineSelect = document.querySelector('select[name="cuisine"]');
    const descTextarea = document.querySelector('textarea[name="description"]');
    const prepTimeInput = document.querySelector('input[name="preparationTime"]');
    const spicyInput = document.querySelector('input[name="spicyLevel"]');
    const vegCheckbox = document.querySelector('input[name="isVegetarian"]');
    const popularCheckbox = document.querySelector('input[name="isPopular"]');
    const todaySpecialCheckbox = document.querySelector('input[name="isTodaySpecial"]');
    
    if (nameInput) nameInput.value = food.name;
    if (priceInput) priceInput.value = food.price;
    if (categorySelect) categorySelect.value = food.category;
    if (cuisineSelect) cuisineSelect.value = food.cuisine || 'Indian';
    if (descTextarea) descTextarea.value = food.description || '';
    if (prepTimeInput) prepTimeInput.value = food.preparationTime || 20;
    if (spicyInput) spicyInput.value = food.spicyLevel || 2;
    if (vegCheckbox) vegCheckbox.checked = food.isVegetarian || false;
    if (popularCheckbox) popularCheckbox.checked = food.isPopular || false;
    if (todaySpecialCheckbox) todaySpecialCheckbox.checked = food.isTodaySpecial || false;
    
    // Change form to update mode
    const submitBtn = addFoodForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Food Item';
    
    // Store editing ID
    addFoodForm.dataset.editingId = foodId;
    
    // Scroll to form
    addFoodForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Show cancel button if not exists
    let cancelBtn = document.getElementById('cancel-edit-btn');
    if (!cancelBtn) {
      cancelBtn = document.createElement('button');
      cancelBtn.id = 'cancel-edit-btn';
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn-secondary';
      cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel Edit';
      cancelBtn.style.marginLeft = '1rem';
      submitBtn.parentNode.appendChild(cancelBtn);
      
      cancelBtn.addEventListener('click', () => {
        addFoodForm.reset();
        addFoodForm.dataset.editingId = '';
        submitBtn.innerHTML = originalText;
        cancelBtn.remove();
        addFoodForm.onsubmit = originalSubmit;
      });
    }
    
    // Override form submit for editing
    const originalSubmit = addFoodForm.onsubmit;
    addFoodForm.onsubmit = async (e) => {
      e.preventDefault();
      
      const editingId = addFoodForm.dataset.editingId;
      if (!editingId) return;
      
      const formData = new FormData(addFoodForm);
      const foods = JSON.parse(localStorage.getItem('menu') || '[]');
      const foodIndex = foods.findIndex(f => f._id === editingId);
      
      if (foodIndex !== -1) {
        foods[foodIndex] = {
          ...foods[foodIndex],
          name: formData.get('name'),
          price: parseFloat(formData.get('price')),
          category: formData.get('category'),
          cuisine: formData.get('cuisine'),
          description: formData.get('description') || '',
          isVegetarian: formData.get('isVegetarian') === 'true',
          isPopular: formData.get('isPopular') === 'true',
          isTodaySpecial: formData.get('isTodaySpecial') === 'true',
          spicyLevel: parseInt(formData.get('spicyLevel')) || 2,
          preparationTime: parseInt(formData.get('preparationTime')) || 20,
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('menu', JSON.stringify(foods));
        showNotification('Food item updated successfully!', 'success');
        
        addFoodForm.reset();
        addFoodForm.dataset.editingId = '';
        submitBtn.innerHTML = originalText;
        addFoodForm.onsubmit = originalSubmit;
        if (cancelBtn) cancelBtn.remove();
        
        fetchFoods();
      }
    };
  }
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

// Filter event listeners
if (categoryFilter) {
  categoryFilter.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    renderFoodList(currentFoods);
  });
}

if (searchFood) {
  let timeout;
  searchFood.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      currentSearch = e.target.value;
      renderFoodList(currentFoods);
    }, 300);
  });
}

// Logout
document.getElementById('logout-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../customer/login.html';
});

// Load foods
fetchFoods();