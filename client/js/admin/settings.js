import { getToken, showNotification, isAdmin } from '../customer/global.js';

// Check admin access
if (!isAdmin()) {
  alert('Access denied. Admin only.');
  window.location.href = '../customer/login.html';
}

// Default settings
const defaultSettings = {
  restaurant: {
    name: "Sujan's FoodieHub",
    phone: "+977 980-0000000",
    email: "info@sujansfoodiehub.com",
    website: "",
    address: "123 Food Street, New Baneshwor, Kathmandu, Nepal"
  },
  hours: {
    monday: { open: "11:00", close: "22:00", isOpen: true },
    tuesday: { open: "11:00", close: "22:00", isOpen: true },
    wednesday: { open: "11:00", close: "22:00", isOpen: true },
    thursday: { open: "11:00", close: "22:00", isOpen: true },
    friday: { open: "11:00", close: "22:00", isOpen: true },
    saturday: { open: "10:00", close: "23:00", isOpen: true },
    sunday: { open: "10:00", close: "23:00", isOpen: true }
  },
  financial: {
    taxRate: 5,
    serviceCharge: 0,
    deliveryFee: 50,
    currency: "NPR"
  },
  orders: {
    defaultStatus: "Confirmed",
    autoConfirm: false,
    minOrderAmount: 0,
    maxPrepTime: 45
  },
  system: {
    allowGuestOrders: true,
    requireLoginReservation: true,
    sendOrderSMS: false,
    sendOrderEmail: true,
    notificationSound: "bell",
    refreshInterval: 30
  }
};

// Load settings from localStorage
function loadSettings() {
  const saved = localStorage.getItem('restaurantSettings');
  const settings = saved ? JSON.parse(saved) : defaultSettings;
  
  // Populate restaurant info
  document.getElementById('restaurant-name').value = settings.restaurant.name || defaultSettings.restaurant.name;
  document.getElementById('restaurant-phone').value = settings.restaurant.phone || defaultSettings.restaurant.phone;
  document.getElementById('restaurant-email').value = settings.restaurant.email || defaultSettings.restaurant.email;
  document.getElementById('restaurant-website').value = settings.restaurant.website || '';
  document.getElementById('restaurant-address').value = settings.restaurant.address || defaultSettings.restaurant.address;
  
  // Populate hours
  renderHoursEditor(settings.hours || defaultSettings.hours);
  
  // Populate financial
  const financial = settings.financial || defaultSettings.financial;
  document.getElementById('tax-rate').value = financial.taxRate;
  document.getElementById('service-charge').value = financial.serviceCharge;
  document.getElementById('delivery-fee').value = financial.deliveryFee;
  document.getElementById('currency').value = financial.currency;
  
  // Populate order settings
  const orders = settings.orders || defaultSettings.orders;
  document.getElementById('default-order-status').value = orders.defaultStatus;
  document.getElementById('auto-confirm').value = orders.autoConfirm.toString();
  document.getElementById('min-order-amount').value = orders.minOrderAmount;
  document.getElementById('max-prep-time').value = orders.maxPrepTime;
  
  // Populate system settings
  const system = settings.system || defaultSettings.system;
  document.getElementById('allow-guest-orders').checked = system.allowGuestOrders;
  document.getElementById('require-login-reservation').checked = system.requireLoginReservation;
  document.getElementById('send-order-sms').checked = system.sendOrderSMS;
  document.getElementById('send-order-email').checked = system.sendOrderEmail;
  document.getElementById('notification-sound').value = system.notificationSound;
  document.getElementById('refresh-interval').value = system.refreshInterval;
}

// Render hours editor
function renderHoursEditor(hours) {
  const container = document.getElementById('hours-container');
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  container.innerHTML = days.map((day, index) => `
    <div class="hours-row" data-day="${day}">
      <label class="checkbox-label">
        <input type="checkbox" class="day-toggle" data-day="${day}" ${hours[day]?.isOpen !== false ? 'checked' : ''}>
        ${dayNames[index]}
      </label>
      <input type="time" class="open-time" data-day="${day}" value="${hours[day]?.open || '11:00'}" ${hours[day]?.isOpen === false ? 'disabled' : ''}>
      <input type="time" class="close-time" data-day="${day}" value="${hours[day]?.close || '22:00'}" ${hours[day]?.isOpen === false ? 'disabled' : ''}>
    </div>
  `).join('');
  
  // Toggle time inputs when checkbox changes
  document.querySelectorAll('.day-toggle').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const day = e.target.dataset.day;
      const row = document.querySelector(`.hours-row[data-day="${day}"]`);
      const openInput = row.querySelector('.open-time');
      const closeInput = row.querySelector('.close-time');
      openInput.disabled = !e.target.checked;
      closeInput.disabled = !e.target.checked;
      
      // Apply to all days if "same hours" is checked
      if (document.getElementById('same-hours-all-days')?.checked) {
        document.querySelectorAll('.day-toggle').forEach(toggle => {
          toggle.checked = e.target.checked;
        });
        document.querySelectorAll('.open-time').forEach(input => {
          input.disabled = !e.target.checked;
          input.value = openInput.value;
        });
        document.querySelectorAll('.close-time').forEach(input => {
          input.disabled = !e.target.checked;
          input.value = closeInput.value;
        });
      }
    });
  });
  
  // Sync time inputs when "same hours" is used
  document.querySelectorAll('.open-time, .close-time').forEach(input => {
    input.addEventListener('change', (e) => {
      if (document.getElementById('same-hours-all-days')?.checked) {
        const isOpen = e.target.classList.contains('open-time');
        const value = e.target.value;
        document.querySelectorAll(isOpen ? '.open-time' : '.close-time').forEach(inp => {
          inp.value = value;
        });
      }
    });
  });
}

// Save all settings
function saveSettings() {
  const hours = {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  days.forEach(day => {
    const row = document.querySelector(`.hours-row[data-day="${day}"]`);
    if (row) {
      const toggle = row.querySelector('.day-toggle');
      const openInput = row.querySelector('.open-time');
      const closeInput = row.querySelector('.close-time');
      
      hours[day] = {
        isOpen: toggle?.checked || false,
        open: openInput?.value || '11:00',
        close: closeInput?.value || '22:00'
      };
    }
  });
  
  const settings = {
    restaurant: {
      name: document.getElementById('restaurant-name').value,
      phone: document.getElementById('restaurant-phone').value,
      email: document.getElementById('restaurant-email').value,
      website: document.getElementById('restaurant-website').value,
      address: document.getElementById('restaurant-address').value
    },
    hours: hours,
    financial: {
      taxRate: parseFloat(document.getElementById('tax-rate').value) || 5,
      serviceCharge: parseFloat(document.getElementById('service-charge').value) || 0,
      deliveryFee: parseFloat(document.getElementById('delivery-fee').value) || 50,
      currency: document.getElementById('currency').value
    },
    orders: {
      defaultStatus: document.getElementById('default-order-status').value,
      autoConfirm: document.getElementById('auto-confirm').value === 'true',
      minOrderAmount: parseFloat(document.getElementById('min-order-amount').value) || 0,
      maxPrepTime: parseInt(document.getElementById('max-prep-time').value) || 45
    },
    system: {
      allowGuestOrders: document.getElementById('allow-guest-orders').checked,
      requireLoginReservation: document.getElementById('require-login-reservation').checked,
      sendOrderSMS: document.getElementById('send-order-sms').checked,
      sendOrderEmail: document.getElementById('send-order-email').checked,
      notificationSound: document.getElementById('notification-sound').value,
      refreshInterval: parseInt(document.getElementById('refresh-interval').value) || 30
    }
  };
  
  localStorage.setItem('restaurantSettings', JSON.stringify(settings));
  showNotification('Settings saved successfully!', 'success');
}

// Export all data
function exportData() {
  const exportObj = {
    settings: JSON.parse(localStorage.getItem('restaurantSettings') || '{}'),
    users: JSON.parse(localStorage.getItem('users') || '[]'),
    menu: JSON.parse(localStorage.getItem('menu') || '[]'),
    orders: JSON.parse(localStorage.getItem('orders') || '[]'),
    reservations: JSON.parse(localStorage.getItem('reservations') || '[]'),
    tables: JSON.parse(localStorage.getItem('tables') || '[]'),
    staff: JSON.parse(localStorage.getItem('staff') || '[]')
  };
  
  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `foodiehub-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('Data exported successfully!', 'success');
}

// Import data
function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      if (data.settings) localStorage.setItem('restaurantSettings', JSON.stringify(data.settings));
      if (data.users) localStorage.setItem('users', JSON.stringify(data.users));
      if (data.menu) localStorage.setItem('menu', JSON.stringify(data.menu));
      if (data.orders) localStorage.setItem('orders', JSON.stringify(data.orders));
      if (data.reservations) localStorage.setItem('reservations', JSON.stringify(data.reservations));
      if (data.tables) localStorage.setItem('tables', JSON.stringify(data.tables));
      if (data.staff) localStorage.setItem('staff', JSON.stringify(data.staff));
      
      showNotification('Data imported successfully! Reloading...', 'success');
      setTimeout(() => location.reload(), 1500);
    } catch (error) {
      showNotification('Invalid backup file', 'error');
    }
  };
  reader.readAsText(file);
}

// Clear all data
function clearAllData() {
  if (!confirm('WARNING: This will delete ALL restaurant data! This cannot be undone. Are you absolutely sure?')) {
    return;
  }
  
  if (!confirm('FINAL WARNING: All users, orders, menu items, and settings will be permanently deleted. Continue?')) {
    return;
  }
  
  localStorage.clear();
  
  // Restore default settings
  localStorage.setItem('restaurantSettings', JSON.stringify(defaultSettings));
  localStorage.setItem('users', JSON.stringify([]));
  localStorage.setItem('menu', JSON.stringify([]));
  localStorage.setItem('orders', JSON.stringify([]));
  localStorage.setItem('reservations', JSON.stringify([]));
  localStorage.setItem('tables', JSON.stringify([]));
  
  showNotification('All data cleared. Reloading...', 'success');
  setTimeout(() => location.reload(), 1500);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../customer/login.html';
  });
  
  // Save all
  document.getElementById('save-all-settings')?.addEventListener('click', saveSettings);
  
  // Export
  document.getElementById('export-data')?.addEventListener('click', exportData);
  
  // Import
  document.getElementById('import-data')?.addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  
  document.getElementById('import-file')?.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      importData(e.target.files[0]);
      e.target.value = '';
    }
  });
  
  // Clear data
  document.getElementById('clear-data')?.addEventListener('click', clearAllData);
  
  // Same hours checkbox
  document.getElementById('same-hours-all-days')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      const firstRow = document.querySelector('.hours-row');
      if (firstRow) {
        const isOpen = firstRow.querySelector('.day-toggle')?.checked || false;
        const openTime = firstRow.querySelector('.open-time')?.value || '11:00';
        const closeTime = firstRow.querySelector('.close-time')?.value || '22:00';
        
        document.querySelectorAll('.day-toggle').forEach(toggle => {
          toggle.checked = isOpen;
        });
        document.querySelectorAll('.open-time').forEach(input => {
          input.disabled = !isOpen;
          input.value = openTime;
        });
        document.querySelectorAll('.close-time').forEach(input => {
          input.disabled = !isOpen;
          input.value = closeTime;
        });
      }
    }
  });
});