import { getToken, showNotification, formatDate, isStaff, getUser } from '../customer/global.js';

const API_BASE = 'http://localhost:3001';

if (!isStaff()) {
  alert('Access denied. Staff only.');
  window.location.href = '../customer/login.html';
}

// DOM Elements
const reservationsList = document.getElementById('reservations-list');
const newReservationBtn = document.getElementById('new-reservation-btn');
const reservationForm = document.getElementById('staff-reservation-form');
const dateInput = document.getElementById('res-date');
const timeSelect = document.getElementById('res-time');
const guestsSelect = document.getElementById('res-guests');
const tableSelect = document.getElementById('res-table');
const statusFilter = document.getElementById('status-filter');
const searchInput = document.getElementById('search-reservations');
const todayResCount = document.getElementById('today-res-count');
const upcomingResCount = document.getElementById('upcoming-res-count');
const arrivedCount = document.getElementById('arrived-count');
const completedCount = document.getElementById('completed-count');

let currentFilter = 'today';
let allReservations = [];
let allTables = [];

// ============================================
// INITIALIZE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  const userNameSpan = document.getElementById('user-name');
  if (userNameSpan && user) {
    userNameSpan.textContent = user.name?.split(' ')[0] || 'Staff';
  }
  
  const adminLink = document.getElementById('admin-link');
  if (adminLink && user?.role === 'admin') {
    adminLink.style.display = 'block';
  }
  
  const today = new Date().toISOString().split('T')[0];
  if (dateInput) {
    dateInput.min = today;
    dateInput.value = today;
  }
  
  loadAllTables();
  loadTimeSlots();
  loadReservations();
  loadStats();
  
  setInterval(() => {
    loadReservations();
    loadStats();
  }, 30000);
});

document.getElementById('logout-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../customer/login.html';
});

// ============================================
// NEW RESERVATION BUTTON
// ============================================

if (newReservationBtn) {
  newReservationBtn.addEventListener('click', () => {
    reservationForm?.reset();
    const today = new Date().toISOString().split('T')[0];
    if (dateInput) dateInput.value = today;
    if (timeSelect) timeSelect.innerHTML = '<option value="">Select time</option>';
    
    const bookingPanel = document.querySelector('.booking-panel');
    if (bookingPanel) {
      bookingPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      bookingPanel.style.transition = 'all 0.3s';
      bookingPanel.style.boxShadow = '0 0 0 3px #ff6b6b';
      setTimeout(() => bookingPanel.style.boxShadow = '', 2000);
    }
    
    document.getElementById('res-cust-name')?.focus();
    loadTimeSlots();
  });
}

// ============================================
// LOAD TABLES
// ============================================

async function loadAllTables() {
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE}/api/tables`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Failed to load tables');
    allTables = await response.json();
    renderTableSelect();
    renderTableAvailability();
  } catch (error) {
    console.error('Error loading tables:', error);
  }
}

function renderTableSelect() {
  if (!tableSelect) return;
  
  const availableTables = allTables.filter(t => t.isAvailable !== false);
  
  let options = '<option value="">Auto-assign</option>';
  if (availableTables.length > 0) {
    options += '<optgroup label="Available">';
    availableTables.sort((a, b) => a.tableNumber - b.tableNumber).forEach(table => {
      options += `<option value="${table._id}">Table ${table.tableNumber} (${table.capacity} seats)</option>`;
    });
    options += '</optgroup>';
  }
  
  tableSelect.innerHTML = options;
}

function renderTableAvailability() {
  const container = document.getElementById('table-availability-summary');
  if (!container) return;
  
  const available = allTables.filter(t => t.isAvailable !== false).length;
  const total = allTables.length;
  
  container.innerHTML = `
    <div class="availability-row">
      <span>Total Available:</span>
      <strong>${available}/${total}</strong>
    </div>
  `;
}

// ============================================
// LOAD TIME SLOTS
// ============================================

async function loadTimeSlots() {
  const guests = guestsSelect?.value || '2';
  const date = dateInput?.value;
  
  if (!date) return;
  
  if (timeSelect) timeSelect.innerHTML = '<option value="">Loading...</option>';
  
  try {
    const response = await fetch(`${API_BASE}/api/reservations/available-slots?date=${date}&guests=${guests}`);
    const slots = await response.json();
    
    if (slots.length === 0) {
      timeSelect.innerHTML = '<option value="">No slots available</option>';
      return;
    }
    
    timeSelect.innerHTML = '<option value="">Select time</option>' +
      slots.map(s => `<option value="${s.time}">${s.time}</option>`).join('');
  } catch (error) {
    console.error('Error loading slots:', error);
    timeSelect.innerHTML = '<option value="">Error loading</option>';
  }
}

// ============================================
// LOAD RESERVATIONS
// ============================================

async function loadReservations() {
  if (!reservationsList) return;
  
  reservationsList.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div></div>';
  
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE}/api/reservations/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Failed to load');
    allReservations = await response.json();
    filterAndRender();
  } catch (error) {
    console.error('Error:', error);
    reservationsList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading</p></div>';
  }
}

function filterAndRender() {
  let filtered = [...allReservations];
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  if (currentFilter === 'today') {
    filtered = filtered.filter(r => r.date?.split('T')[0] === today);
  } else if (currentFilter === 'tomorrow') {
    filtered = filtered.filter(r => r.date?.split('T')[0] === tomorrow);
  } else if (currentFilter === 'week') {
    const nextWeek = new Date(Date.now() + 7 * 86400000);
    filtered = filtered.filter(r => new Date(r.date) >= new Date(today) && new Date(r.date) <= nextWeek);
  }
  
  if (statusFilter?.value) {
    filtered = filtered.filter(r => r.status === statusFilter.value);
  }
  
  if (searchInput?.value) {
    const search = searchInput.value.toLowerCase();
    filtered = filtered.filter(r => 
      (r.user?.name && r.user.name.toLowerCase().includes(search)) ||
      (r.user?.phone && r.user.phone.includes(search)) ||
      (r.guestName && r.guestName.toLowerCase().includes(search))
    );
  }
  
  filtered.sort((a, b) => {
    if (a.date === b.date) return (a.time || '').localeCompare(b.time || '');
    return new Date(a.date) - new Date(b.date);
  });
  
  renderReservations(filtered);
}

function renderReservations(reservations) {
  if (!reservationsList) return;
  
  if (reservations.length === 0) {
    reservationsList.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>No reservations found</p></div>';
    return;
  }
  
  reservationsList.innerHTML = reservations.map(res => `
    <div class="reservation-card-clean" data-id="${res._id}">
      <div class="reservation-header-clean">
        <div>
          <span class="customer-name">${escapeHtml(res.user?.name || res.guestName || 'Guest')}</span>
          <span class="customer-phone">${res.user?.phone || res.guestPhone || ''}</span>
        </div>
        <span class="reservation-time"><i class="far fa-clock"></i> ${res.time}</span>
      </div>
      
      <div class="reservation-details-clean">
        <span><i class="fas fa-calendar"></i> ${formatDate(res.date)}</span>
        <span><i class="fas fa-users"></i> ${res.numberOfGuests} guests</span>
        <span><i class="fas fa-chair"></i> Table ${res.table?.tableNumber || '—'}</span>
      </div>
      
      ${res.specialRequests ? `
        <div style="font-size: 0.7rem; color: #ff9800; margin-bottom: 0.5rem;">
          <i class="fas fa-comment"></i> ${escapeHtml(res.specialRequests)}
        </div>
      ` : ''}
      
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span class="status-badge-clean status-${res.status?.toLowerCase() || 'pending'}">${res.status || 'Pending'}</span>
        <select class="status-update" data-id="${res._id}" style="padding: 0.2rem 0.4rem; border-radius: 4px; border: 1px solid #ddd; font-size: 0.65rem;">
          <option value="Pending" ${res.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Confirmed" ${res.status === 'Confirmed' ? 'selected' : ''}>Confirm</option>
          <option value="Arrived" ${res.status === 'Arrived' ? 'selected' : ''}>Arrived</option>
          <option value="Completed" ${res.status === 'Completed' ? 'selected' : ''}>Complete</option>
          <option value="Cancelled" ${res.status === 'Cancelled' ? 'selected' : ''}>Cancel</option>
        </select>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.status-update').forEach(select => {
    select.addEventListener('change', async (e) => {
      const id = select.dataset.id;
      const newStatus = select.value;
      await updateStatus(id, newStatus);
    });
  });
}

// ============================================
// UPDATE STATUS
// ============================================

async function updateStatus(id, newStatus) {
  const token = getToken();
  
  try {
    const response = await fetch(`${API_BASE}/api/reservations/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) throw new Error('Update failed');
    
    showNotification(`Status updated to ${newStatus}`, 'success');
    
    const res = allReservations.find(r => r._id === id);
    if (res?.table?._id) {
      const isAvailable = (newStatus === 'Completed' || newStatus === 'Cancelled');
      await fetch(`${API_BASE}/api/tables/${res.table._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isAvailable })
      });
      loadAllTables();
    }
    
    loadReservations();
    loadStats();
  } catch (error) {
    showNotification('Failed to update', 'error');
  }
}

// ============================================
// LOAD STATS
// ============================================

async function loadStats() {
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE}/api/reservations/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const reservations = await response.json();
    const today = new Date().toISOString().split('T')[0];
    
    const todayRes = reservations.filter(r => r.date?.split('T')[0] === today);
    const upcoming = reservations.filter(r => new Date(r.date) >= new Date(today) && r.status === 'Confirmed');
    const arrived = todayRes.filter(r => r.status === 'Arrived');
    const completed = todayRes.filter(r => r.status === 'Completed');
    
    if (todayResCount) todayResCount.textContent = todayRes.length;
    if (upcomingResCount) upcomingResCount.textContent = upcoming.length;
    if (arrivedCount) arrivedCount.textContent = arrived.length;
    if (completedCount) completedCount.textContent = completed.length;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// ============================================
// CREATE RESERVATION
// ============================================

if (reservationForm) {
  reservationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = getToken();
    const name = document.getElementById('res-cust-name').value.trim();
    const phone = document.getElementById('res-cust-phone').value.trim();
    const time = timeSelect?.value;
    const guests = guestsSelect?.value;
    const tableId = tableSelect?.value;
    
    if (!name) { showNotification('Enter customer name', 'error'); return; }
    if (!phone) { showNotification('Enter phone number', 'error'); return; }
    if (!time) { showNotification('Select a time', 'error'); return; }
    
    const submitBtn = reservationForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    submitBtn.disabled = true;
    
    try {
      const response = await fetch(`${API_BASE}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: dateInput.value,
          time,
          numberOfGuests: parseInt(guests),
          tableId: tableId || null,
          specialRequests: document.getElementById('res-requests')?.value || '',
          guestName: name,
          guestPhone: phone
        })
      });
      
      if (!response.ok) throw new Error('Failed to create');
      
      showNotification('Reservation created!', 'success');
      reservationForm.reset();
      dateInput.value = new Date().toISOString().split('T')[0];
      timeSelect.innerHTML = '<option value="">Select time</option>';
      
      loadReservations();
      loadStats();
      loadTimeSlots();
      loadAllTables();
      
    } catch (error) {
      showNotification('Failed to create', 'error');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

// ============================================
// EVENT LISTENERS
// ============================================

if (dateInput) dateInput.addEventListener('change', loadTimeSlots);
if (guestsSelect) guestsSelect.addEventListener('change', loadTimeSlots);

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    filterAndRender();
  });
});

if (statusFilter) statusFilter.addEventListener('change', filterAndRender);

if (searchInput) {
  let timeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(filterAndRender, 300);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]);
}