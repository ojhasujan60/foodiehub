import { getToken, showNotification, formatDate, isAdmin } from '../customer/global.js';

// Check if user is admin
if (!isAdmin()) {
  alert('Access denied. Admin only.');
  window.location.href = '/customer/login.html';
}

// DOM Elements - Admin Reservations Page
const tablesGrid = document.getElementById('tables-grid');
const reservationsList = document.getElementById('reservations-list');
const dateFilter = document.getElementById('date-filter');
const statusFilter = document.getElementById('status-filter');
const searchFilter = document.getElementById('search-filter');
const addTableBtn = document.getElementById('add-table-btn');
const newReservationBtn = document.getElementById('new-reservation-btn');

// Stats Elements
const todayResCountSpan = document.getElementById('today-res-count');
const totalTablesSpan = document.getElementById('total-tables');
const availableTablesSpan = document.getElementById('available-tables');
const upcomingResSpan = document.getElementById('upcoming-res');

let currentTables = [];
let currentReservations = [];

// ============================================
// TABLE MANAGEMENT
// ============================================

async function loadTables() {
  if (!tablesGrid) return;
  
  const token = getToken();
  try {
    const response = await fetch('/api/tables', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const tables = await response.json();
    currentTables = tables;
    renderTables(tables);
    updateTableStats(tables);
  } catch (error) {
    console.error('Error loading tables:', error);
    if (tablesGrid) {
      tablesGrid.innerHTML = '<div class="empty-state">Error loading tables</div>';
    }
  }
}

function renderTables(tables) {
  if (!tablesGrid) return;
  
  if (tables.length === 0) {
    tablesGrid.innerHTML = '<div class="empty-state">No tables configured</div>';
    return;
  }
  
  tablesGrid.innerHTML = tables.map(table => `
    <div class="table-card-admin ${table.isAvailable ? 'available' : 'occupied'}" data-id="${table._id}">
      <div class="table-number-admin">Table ${table.tableNumber}</div>
      <div class="table-capacity-admin"><i class="fas fa-users"></i> ${table.capacity}</div>
      <div class="table-location-admin">${table.location}</div>
      <div class="table-actions">
        <button class="edit-table" data-id="${table._id}" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="toggle-table" data-id="${table._id}" data-available="${table.isAvailable}" title="${table.isAvailable ? 'Mark Occupied' : 'Mark Available'}">
          <i class="fas ${table.isAvailable ? 'fa-check-circle' : 'fa-ban'}"></i>
        </button>
        <button class="delete-table" data-id="${table._id}" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners for table actions
  document.querySelectorAll('.toggle-table').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const tableId = btn.dataset.id;
      await toggleTableStatus(tableId);
    });
  });
  
  document.querySelectorAll('.delete-table').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const tableId = btn.dataset.id;
      if (confirm('Delete this table permanently?')) {
        await deleteTable(tableId);
      }
    });
  });
  
  document.querySelectorAll('.edit-table').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      alert('Edit feature coming soon!');
    });
  });
}

async function toggleTableStatus(tableId) {
  const token = getToken();
  const table = currentTables.find(t => t._id === tableId);
  if (!table) return;
  
  try {
    const response = await fetch(`/api/tables/${tableId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ isAvailable: !table.isAvailable })
    });
    
    if (!response.ok) throw new Error('Update failed');
    
    showNotification(`Table ${table.tableNumber} ${!table.isAvailable ? 'available' : 'occupied'}`, 'success');
    loadTables();
    loadReservations();
  } catch (error) {
    showNotification('Failed to update table', 'error');
  }
}

async function deleteTable(tableId) {
  const token = getToken();
  try {
    const response = await fetch(`/api/tables/${tableId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Delete failed');
    
    showNotification('Table deleted', 'success');
    loadTables();
  } catch (error) {
    showNotification('Failed to delete table', 'error');
  }
}

function updateTableStats(tables) {
  const totalTables = tables.length;
  const availableTables = tables.filter(t => t.isAvailable).length;
  
  if (totalTablesSpan) totalTablesSpan.textContent = totalTables;
  if (availableTablesSpan) availableTablesSpan.textContent = availableTables;
}

// ============================================
// RESERVATION MANAGEMENT
// ============================================

async function loadReservations() {
  if (!reservationsList) return;
  
  reservationsList.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading reservations...</p></div>';
  
  const token = getToken();
  const today = new Date().toISOString().split('T')[0];
  
  try {
    let url = '/api/reservations/all';
    const params = new URLSearchParams();
    
    if (dateFilter && dateFilter.value === 'today') {
      params.append('date', today);
    } else if (dateFilter && dateFilter.value === 'tomorrow') {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      params.append('date', tomorrow);
    }
    
    if (statusFilter && statusFilter.value) params.append('status', statusFilter.value);
    
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    let reservations = await response.json();
    currentReservations = reservations;
    
    // Apply search filter
    const search = searchFilter ? searchFilter.value.toLowerCase() : '';
    if (search) {
      reservations = reservations.filter(r => 
        (r.user?.name && r.user.name.toLowerCase().includes(search)) ||
        (r.user?.email && r.user.email.toLowerCase().includes(search)) ||
        (r.user?.phone && r.user.phone.includes(search)) ||
        (r.table?.tableNumber && r.table.tableNumber.toString().includes(search))
      );
    }
    
    renderReservations(reservations);
    updateReservationStats(reservations);
  } catch (error) {
    console.error('Error loading reservations:', error);
    if (reservationsList) {
      reservationsList.innerHTML = '<div class="empty-state">Error loading reservations</div>';
    }
  }
}

function renderReservations(reservations) {
  if (!reservationsList) return;
  
  if (reservations.length === 0) {
    reservationsList.innerHTML = '<div class="empty-state">No reservations found</div>';
    return;
  }
  
  reservationsList.innerHTML = reservations.map(res => `
    <div class="admin-reservation-card" data-id="${res._id}">
      <div class="reservation-row-admin">
        <div class="reservation-info-admin">
          <div>
            <span class="reservation-time-admin">${res.time}</span>
            <span class="reservation-customer-admin"> • ${escapeHtml(res.user?.name || 'Guest')}</span>
          </div>
          <div class="reservation-meta-admin">
            <span><i class="fas fa-users"></i> ${res.numberOfGuests} guests</span>
            <span><i class="fas fa-chair"></i> Table ${res.table?.tableNumber || 'N/A'}</span>
            <span><i class="fas fa-phone"></i> ${res.user?.phone || 'No phone'}</span>
            <span><i class="fas fa-calendar"></i> ${formatDate(res.date)}</span>
          </div>
          ${res.specialRequests ? `<div style="font-size: 0.7rem; color: #666; margin-top: 0.25rem;"><i class="fas fa-comment"></i> ${escapeHtml(res.specialRequests)}</div>` : ''}
        </div>
        <div>
          <span class="status-badge-admin status-${res.status.toLowerCase()}">${res.status}</span>
        </div>
        <div class="reservation-actions-admin">
          <select class="btn-status" data-id="${res._id}" data-status="${res.status}" style="background: #2196f3; color: white; border: none; padding: 0.3rem 0.7rem; border-radius: 6px;">
            <option value="Confirmed" ${res.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="Arrived" ${res.status === 'Arrived' ? 'selected' : ''}>Arrived</option>
            <option value="Completed" ${res.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${res.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
          <button class="btn-edit-res" data-id="${res._id}"><i class="fas fa-edit"></i></button>
          <button class="btn-delete-res" data-id="${res._id}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>
  `).join('');
  
  // Add event listeners for reservation actions
  document.querySelectorAll('.btn-status').forEach(select => {
    select.addEventListener('change', async () => {
      const id = select.dataset.id;
      const newStatus = select.value;
      await updateReservationStatus(id, newStatus, select);
    });
  });
  
  document.querySelectorAll('.btn-delete-res').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('Delete this reservation?')) {
        await deleteReservation(id);
      }
    });
  });
  
  document.querySelectorAll('.btn-edit-res').forEach(btn => {
    btn.addEventListener('click', () => {
      alert('Edit feature coming soon!');
    });
  });
}

async function updateReservationStatus(id, newStatus, selectElement) {
  const token = getToken();
  try {
    const response = await fetch(`/api/reservations/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) throw new Error('Update failed');
    
    showNotification(`Reservation ${newStatus}`, 'success');
    loadReservations();
    loadTables();
  } catch (error) {
    showNotification('Failed to update', 'error');
    if (selectElement) selectElement.value = selectElement.dataset.status;
  }
}

async function deleteReservation(id) {
  const token = getToken();
  try {
    const response = await fetch(`/api/reservations/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Delete failed');
    
    showNotification('Reservation deleted', 'success');
    loadReservations();
  } catch (error) {
    showNotification('Failed to delete', 'error');
  }
}

function updateReservationStats(reservations) {
  const today = new Date().toISOString().split('T')[0];
  const todayRes = reservations.filter(r => r.date.split('T')[0] === today).length;
  const upcoming = reservations.filter(r => new Date(r.date) >= new Date() && r.status === 'Confirmed').length;
  
  if (todayResCountSpan) todayResCountSpan.textContent = todayRes;
  if (upcomingResSpan) upcomingResSpan.textContent = upcoming;
}

// ============================================
// MODAL HANDLERS
// ============================================

// Add Table Modal
const tableModal = document.getElementById('table-modal');
const closeModal = document.querySelector('.modal-close');
const addTableForm = document.getElementById('add-table-form');

if (addTableBtn) {
  addTableBtn.addEventListener('click', () => {
    if (tableModal) tableModal.classList.add('active');
  });
}

if (closeModal) {
  closeModal.addEventListener('click', () => {
    if (tableModal) tableModal.classList.remove('active');
  });
}

if (addTableForm) {
  addTableForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = getToken();
    
    const tableData = {
      tableNumber: parseInt(document.getElementById('table-number').value),
      capacity: parseInt(document.getElementById('table-capacity').value),
      location: document.getElementById('table-location').value
    };
    
    try {
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(tableData)
      });
      
      if (!response.ok) throw new Error('Failed to add table');
      
      showNotification('Table added successfully', 'success');
      if (tableModal) tableModal.classList.remove('active');
      addTableForm.reset();
      loadTables();
    } catch (error) {
      showNotification('Failed to add table', 'error');
    }
  });
}

// New Reservation Modal
const resModal = document.getElementById('reservation-modal');
const closeResModal = document.querySelector('.modal-close-res');

if (newReservationBtn) {
  newReservationBtn.addEventListener('click', () => {
    if (resModal) resModal.classList.add('active');
    const resDateInput = document.getElementById('res-date');
    if (resDateInput) {
      resDateInput.value = new Date().toISOString().split('T')[0];
    }
  });
}

if (closeResModal) {
  closeResModal.addEventListener('click', () => {
    if (resModal) resModal.classList.remove('active');
  });
}

// Close modals on outside click
window.addEventListener('click', (e) => {
  if (tableModal && e.target === tableModal) tableModal.classList.remove('active');
  if (resModal && e.target === resModal) resModal.classList.remove('active');
});

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
if (dateFilter) {
  dateFilter.addEventListener('change', loadReservations);
}
if (statusFilter) {
  statusFilter.addEventListener('change', loadReservations);
}
if (searchFilter) {
  let timeout;
  searchFilter.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(loadReservations, 500);
  });
}

// Initial load
loadTables();
loadReservations();

// Auto-refresh every 30 seconds
setInterval(() => {
  loadTables();
  loadReservations();
}, 30000);