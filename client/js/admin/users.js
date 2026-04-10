import { getToken, formatDate, isAdmin, showNotification } from '../customer/global.js';

if (!isAdmin()) {
  alert('Access denied. Admin only.');
  window.location.href = '../customer/login.html';
}

const usersList = document.getElementById('users-list');
const roleFilter = document.getElementById('role-filter');
const statusFilter = document.getElementById('status-filter');
const searchInput = document.getElementById('search-input');

let currentUsers = [];
let currentPage = 1;
const itemsPerPage = 10;

// Load users
async function loadUsers() {
  if (!usersList) return;
  
  usersList.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading users...</p></div>';
  
  try {
    // Get from localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    currentUsers = users;
    
    // Update stats
    updateStats(users);
    
    // Apply filters
    let filtered = [...users];
    
    if (roleFilter?.value) {
      filtered = filtered.filter(u => u.role === roleFilter.value);
    }
    if (statusFilter?.value) {
      filtered = filtered.filter(u => statusFilter.value === 'active' ? u.isActive !== false : u.isActive === false);
    }
    if (searchInput?.value) {
      const search = searchInput.value.toLowerCase();
      filtered = filtered.filter(u => 
        u.name?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search) ||
        u.phone?.includes(search)
      );
    }
    
    renderUsers(filtered);
  } catch (error) {
    console.error('Error loading users:', error);
    usersList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading users</p></div>';
  }
}

function updateStats(users) {
  document.getElementById('total-users-stat').textContent = users.filter(u => u.role === 'customer').length;
  document.getElementById('active-users-stat').textContent = users.filter(u => u.isActive !== false).length;
  
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
  document.getElementById('new-users-week').textContent = users.filter(u => 
    new Date(u.createdAt) > oneWeekAgo
  ).length;
  
  document.getElementById('staff-count-stat').textContent = users.filter(u => 
    u.role === 'staff' || u.role === 'admin'
  ).length;
}

function renderUsers(users) {
  if (!usersList) return;
  
  if (users.length === 0) {
    usersList.innerHTML = '<div class="empty-state"><i class="fas fa-users-slash"></i><p>No users found</p></div>';
    return;
  }
  
  // Pagination
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const paginated = users.slice(start, start + itemsPerPage);
  
  usersList.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Role</th>
          <th>Status</th>
          <th>Joined</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${paginated.map(user => `
          <tr>
            <td><strong>${escapeHtml(user.name || 'N/A')}</strong></td>
            <td>${escapeHtml(user.email || 'N/A')}</td>
            <td>${user.phone || 'N/A'}</td>
            <td>
              <select class="role-select" data-id="${user._id || user.id}" data-role="${user.role || 'customer'}">
                <option value="customer" ${user.role === 'customer' ? 'selected' : ''}>Customer</option>
                <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Staff</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </td>
            <td>
              <span class="badge ${user.isActive !== false ? 'badge-success' : 'badge-danger'}">
                ${user.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>${formatDate(user.createdAt || new Date())}</td>
            <td>
              <button class="btn-toggle-status" data-id="${user._id || user.id}" data-active="${user.isActive !== false}">
                <i class="fas ${user.isActive !== false ? 'fa-ban' : 'fa-check-circle'}"></i>
                ${user.isActive !== false ? 'Deactivate' : 'Activate'}
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  // Render pagination
  renderPagination(totalPages);
  
  // Add event listeners
  document.querySelectorAll('.role-select').forEach(select => {
    select.addEventListener('change', async () => {
      const userId = select.dataset.id;
      const newRole = select.value;
      await updateUserRole(userId, newRole);
    });
  });
  
  document.querySelectorAll('.btn-toggle-status').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.id;
      await toggleUserStatus(userId);
    });
  });
}

function renderPagination(totalPages) {
  const container = document.getElementById('pagination-container');
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }
  
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  container.innerHTML = html;
  
  document.querySelectorAll('.pagination-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      loadUsers();
    });
  });
}

async function updateUserRole(userId, newRole) {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const userIndex = users.findIndex(u => (u._id || u.id) === userId);
  if (userIndex !== -1) {
    users[userIndex].role = newRole;
    localStorage.setItem('users', JSON.stringify(users));
    showNotification('User role updated', 'success');
    loadUsers();
  }
}

async function toggleUserStatus(userId) {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const userIndex = users.findIndex(u => (u._id || u.id) === userId);
  if (userIndex !== -1) {
    users[userIndex].isActive = users[userIndex].isActive === false ? true : false;
    localStorage.setItem('users', JSON.stringify(users));
    showNotification('User status updated', 'success');
    loadUsers();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    return m;
  });
}

// Event listeners
if (roleFilter) roleFilter.addEventListener('change', () => { currentPage = 1; loadUsers(); });
if (statusFilter) statusFilter.addEventListener('change', () => { currentPage = 1; loadUsers(); });
if (searchInput) {
  let timeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => { currentPage = 1; loadUsers(); }, 500);
  });
}

// Export users
document.getElementById('export-users')?.addEventListener('click', () => {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const csv = ['Name,Email,Phone,Role,Status,Joined'];
  users.forEach(u => {
    csv.push(`${u.name || ''},${u.email || ''},${u.phone || ''},${u.role || 'customer'},${u.isActive !== false ? 'Active' : 'Inactive'},${new Date(u.createdAt).toLocaleDateString()}`);
  });
  
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('Users exported successfully!', 'success');
});

// Logout
document.getElementById('logout-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../customer/login.html';
});

// Initialize
loadUsers();