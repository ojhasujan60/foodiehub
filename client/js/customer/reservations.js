import { getToken, showNotification, formatDate, isAuthenticated, getUser } from './global.js';

if (!isAuthenticated()) {
  window.location.href = '/customer/login.html';
}

// DOM Elements
const reservationsList = document.getElementById('reservations-list');
const periodFilter = document.getElementById('period-filter');
const modal = document.getElementById('reservation-modal');
const newReservationBtn = document.getElementById('new-reservation-btn');
const closeModal = document.querySelector('.modal-close-res');
const reservationForm = document.getElementById('reservation-form');
const dateInput = document.getElementById('res-date');
const timeSelect = document.getElementById('res-time');
const guestsSelect = document.getElementById('res-guests');
const phoneInput = document.getElementById('res-phone');
const emailInput = document.getElementById('res-email');

let availableSlots = [];
let currentPeriod = 'this_month';
let currentUser = getUser();

// Pre-fill user details
if (phoneInput && currentUser?.phone) {
  phoneInput.value = currentUser.phone;
}
if (emailInput && currentUser?.email) {
  emailInput.value = currentUser.email;
}

// Set min date to today
const today = new Date().toISOString().split('T')[0];
if (dateInput) {
  dateInput.min = today;
  dateInput.value = today;
}

// Helper function to filter reservations by time period
function filterByPeriod(reservations, period) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  switch(period) {
    case 'this_month':
      return reservations.filter(res => {
        const resDate = new Date(res.date);
        return resDate.getMonth() === currentMonth && resDate.getFullYear() === currentYear;
      });
    case 'last_month':
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return reservations.filter(res => {
        const resDate = new Date(res.date);
        return resDate.getMonth() === lastMonth && resDate.getFullYear() === lastMonthYear;
      });
    case 'last_3_months':
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return reservations.filter(res => new Date(res.date) >= threeMonthsAgo);
    case 'this_year':
      return reservations.filter(res => {
        const resDate = new Date(res.date);
        return resDate.getFullYear() === currentYear;
      });
    case 'all':
    default:
      return reservations;
  }
}

// Load time slots
async function loadTimeSlots() {
  const guests = guestsSelect?.value;
  const date = dateInput?.value;
  
  if (!date || !guests) return;
  
  if (timeSelect) {
    timeSelect.innerHTML = '<option value="">Loading times...</option>';
  }
  
  try {
    const response = await fetch(`/api/reservations/available-slots?date=${date}&guests=${guests}`);
    const slots = await response.json();
    availableSlots = slots;
    
    if (slots.length === 0) {
      if (timeSelect) timeSelect.innerHTML = '<option value="">No available slots</option>';
      return;
    }
    
    if (timeSelect) {
      timeSelect.innerHTML = '<option value="">Select time</option>' +
        slots.map(slot => `<option value="${slot.time}">${slot.time}</option>`).join('');
    }
  } catch (error) {
    console.error('Error loading slots:', error);
    if (timeSelect) timeSelect.innerHTML = '<option value="">Error loading times</option>';
  }
}

// Load my reservations with period filter
async function loadMyReservations() {
  if (!reservationsList) return;
  
  const token = getToken();
  reservationsList.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading your reservations...</p></div>';
  
  try {
    const response = await fetch('/api/reservations/my', {
      headers: { Authorization: `Bearer ${token}` }
    });
    let reservations = await response.json();
    
    // Apply time period filter
    reservations = filterByPeriod(reservations, currentPeriod);
    
    renderReservations(reservations);
  } catch (error) {
    console.error('Error loading reservations:', error);
    reservationsList.innerHTML = '<div class="empty-state-modern"><i class="fas fa-exclamation-circle"></i><p>Error loading reservations</p></div>';
  }
}

function renderReservations(reservations) {
  if (!reservationsList) return;
  
  const periodNames = {
    'this_month': 'this month',
    'last_month': 'last month',
    'last_3_months': 'the last 3 months',
    'this_year': 'this year',
    'all': ''
  };
  
  if (reservations.length === 0) {
    let emptyMessage = `No reservations found`;
    if (periodNames[currentPeriod]) {
      emptyMessage += ` for ${periodNames[currentPeriod]}`;
    }
    
    reservationsList.innerHTML = `
      <div class="empty-state-modern">
        <i class="fas fa-calendar-times"></i>
        <h3>${emptyMessage}</h3>
        <p>You haven't made any reservations${periodNames[currentPeriod] ? ` ${periodNames[currentPeriod]}` : ''}</p>
        <button id="empty-new-res" class="btn-primary">Make a Reservation</button>
      </div>
    `;
    const emptyBtn = document.getElementById('empty-new-res');
    if (emptyBtn) emptyBtn.addEventListener('click', () => openModal());
    return;
  }
  
  // Separate upcoming and past
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  
  const upcoming = reservations.filter(r => new Date(r.date) >= todayDate && r.status !== 'Cancelled');
  const past = reservations.filter(r => new Date(r.date) < todayDate || r.status === 'Cancelled');
  
  let html = '';
  
  if (upcoming.length > 0) {
    html += `<h3 class="reservation-section-title"><i class="fas fa-clock"></i> Upcoming Reservations</h3>`;
    html += upcoming.map(res => `
      <div class="reservation-card-modern" id="res-${res._id}" data-id="${res._id}">
        <div class="reservation-header">
          <div>
            <h3>${formatDate(res.date)} at ${res.time}</h3>
            <p><i class="fas fa-users"></i> ${res.numberOfGuests} guests • <i class="fas fa-chair"></i> Table ${res.table?.tableNumber || 'N/A'}</p>
            ${res.occasion !== 'Casual' ? `<p><i class="fas fa-gift"></i> ${res.occasion}</p>` : ''}
          </div>
          <div class="reservation-badge badge-${res.status.toLowerCase()}">
            ${getReservationStatusIcon(res.status)} ${res.status}
          </div>
        </div>
        ${res.specialRequests ? `<div class="special-request"><i class="fas fa-comment"></i> ${escapeHtml(res.specialRequests)}</div>` : ''}
        <div class="reservation-actions">
          <button class="btn-cancel-res" data-id="${res._id}"><i class="fas fa-times"></i> Cancel</button>
        </div>
      </div>
    `).join('');
  }
  
  if (past.length > 0) {
    html += `<h3 class="reservation-section-title"><i class="fas fa-history"></i> Past Reservations</h3>`;
    html += past.map(res => `
      <div class="reservation-card-modern past">
        <div class="reservation-header">
          <div>
            <h3>${formatDate(res.date)} at ${res.time}</h3>
            <p><i class="fas fa-users"></i> ${res.numberOfGuests} guests • <i class="fas fa-chair"></i> Table ${res.table?.tableNumber || 'N/A'}</p>
          </div>
          <div class="reservation-badge badge-${res.status.toLowerCase()}">
            ${getReservationStatusIcon(res.status)} ${res.status}
          </div>
        </div>
      </div>
    `).join('');
  }
  
  reservationsList.innerHTML = html;
  
  // Add cancel handlers
  document.querySelectorAll('.btn-cancel-res').forEach(btn => {
    btn.addEventListener('click', () => cancelReservation(btn.dataset.id));
  });
}

function getReservationStatusIcon(status) {
  const icons = {
    'Pending': '<i class="fas fa-clock"></i>',
    'Confirmed': '<i class="fas fa-check-circle"></i>',
    'Arrived': '<i class="fas fa-user-check"></i>',
    'Completed': '<i class="fas fa-check-double"></i>',
    'Cancelled': '<i class="fas fa-times-circle"></i>',
    'No-Show': '<i class="fas fa-user-slash"></i>'
  };
  return icons[status] || '<i class="fas fa-info-circle"></i>';
}

// Cancel reservation
async function cancelReservation(id) {
  if (!confirm('Are you sure you want to cancel this reservation?')) return;
  
  const token = getToken();
  try {
    const response = await fetch(`/api/reservations/${id}/cancel`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Cancellation failed');
    
    showNotification('Reservation cancelled', 'success');
    loadMyReservations();
  } catch (error) {
    showNotification('Failed to cancel', 'error');
  }
}

// Create reservation
if (reservationForm) {
  reservationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = getToken();
    const selectedTime = timeSelect?.value;
    const phoneNumber = phoneInput?.value;
    const emailAddress = emailInput?.value;
    
    if (!selectedTime) {
      showNotification('Please select a time', 'error');
      return;
    }
    
    if (!phoneNumber) {
      showNotification('Phone number is required', 'error');
      phoneInput?.focus();
      return;
    }
    
    if (!emailAddress) {
      showNotification('Email address is required', 'error');
      emailInput?.focus();
      return;
    }
    
    // Find selected time slot
    const slot = availableSlots.find(s => s.time === selectedTime);
    if (!slot || slot.availableTables.length === 0) {
      showNotification('No tables available for this time', 'error');
      return;
    }
    
    const tableId = slot.availableTables[0].id;
    
    const reservationData = {
      date: dateInput?.value,
      time: selectedTime,
      numberOfGuests: parseInt(guestsSelect?.value || 1),
      tableId: tableId,
      occasion: document.getElementById('res-occasion')?.value || 'Casual',
      specialRequests: document.getElementById('res-requests')?.value || '',
      phone: phoneNumber,
      email: emailAddress
    };
    
    const submitBtn = reservationForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;
    
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reservationData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      showNotification('Reservation confirmed! Check your email and SMS.', 'success');
      reservationForm.reset();
      if (dateInput) dateInput.value = today;
      if (timeSelect) timeSelect.innerHTML = '<option value="">Select time</option>';
      if (phoneInput && currentUser?.phone) phoneInput.value = currentUser.phone;
      if (emailInput && currentUser?.email) emailInput.value = currentUser.email;
      
      // Refresh to show new reservation
      loadMyReservations();
      modal.classList.remove('active');
      
    } catch (error) {
      console.error('Error creating reservation:', error);
      showNotification(error.message || 'Failed to create reservation', 'error');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

// Modal functions
function openModal() {
  modal.classList.add('active');
  if (dateInput) dateInput.value = today;
  loadTimeSlots();
}

function closeModalWindow() {
  modal.classList.remove('active');
}

if (newReservationBtn) newReservationBtn.addEventListener('click', openModal);
if (closeModal) closeModal.addEventListener('click', closeModalWindow);
window.addEventListener('click', (e) => {
  if (e.target === modal) closeModalWindow();
});

// Period filter change
if (periodFilter) {
  periodFilter.addEventListener('change', (e) => {
    currentPeriod = e.target.value;
    loadMyReservations();
  });
}

// Event listeners for date/guest changes
if (dateInput) dateInput.addEventListener('change', loadTimeSlots);
if (guestsSelect) guestsSelect.addEventListener('change', loadTimeSlots);

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Initial load
loadTimeSlots();
loadMyReservations();