import { getToken, showNotification, isAdmin } from '../customer/global.js';

if (!isAdmin()) {
  alert('Access denied. Admin only.');
  window.location.href = '../customer/login.html';
}

const addStaffForm = document.getElementById('add-staff-form');
const staffList = document.getElementById('staff-list');

// Initialize default staff if empty
function initializeDefaultStaff() {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const staffExists = users.some(u => u.role === 'staff' || u.role === 'admin');
  
  if (!staffExists) {
    const defaultStaff = [
      {
        _id: 'admin1',
        name: 'Admin User',
        email: 'admin@foodiehub.com',
        phone: '9800000000',
        password: 'Admin@123',
        role: 'admin',
        department: 'Management',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        _id: 'staff1',
        name: 'Chef Ram',
        email: 'chef@foodiehub.com',
        phone: '9800000010',
        password: 'Chef@123',
        role: 'staff',
        department: 'Kitchen',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        _id: 'staff2',
        name: 'Waiter Shyam',
        email: 'waiter@foodiehub.com',
        phone: '9800000011',
        password: 'Waiter@123',
        role: 'staff',
        department: 'Service',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
    
    defaultStaff.forEach(staff => {
      if (!users.some(u => u.email === staff.email)) {
        users.push(staff);
      }
    });
    
    localStorage.setItem('users', JSON.stringify(users));
  }
}

// Load staff members
async function loadStaff() {
  if (!staffList) return;
  
  staffList.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading staff...</p></div>';
  
  try {
    initializeDefaultStaff();
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const staff = users.filter(u => u.role === 'staff' || u.role === 'admin');
    
    updateStats(staff);
    renderStaff(staff);
  } catch (error) {
    console.error('Error loading staff:', error);
    staffList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading staff</p></div>';
  }
}

function updateStats(staff) {
  document.getElementById('total-staff-stat').textContent = staff.length;
  document.getElementById('active-staff-stat').textContent = staff.filter(s => s.isActive !== false).length;
  document.getElementById('admin-count-stat').textContent = staff.filter(s => s.role === 'admin').length;
  document.getElementById('staff-only-stat').textContent = staff.filter(s => s.role === 'staff').length;
}

function renderStaff(staff) {
  if (!staffList) return;
  
  if (staff.length === 0) {
    staffList.innerHTML = '<div class="empty-state"><i class="fas fa-user-tie"></i><p>No staff members found</p></div>';
    return;
  }
  
  staffList.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Role</th>
          <th>Department</th>
          <th>Status</th>
          <th>Joined</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${staff.map(member => `
          <tr>
            <td><strong>${escapeHtml(member.name)}</strong></td>
            <td>${escapeHtml(member.email)}</td>
            <td>${member.phone || 'N/A'}</td>
            <td>
              <select class="role-select" data-id="${member._id}" data-role="${member.role}">
                <option value="staff" ${member.role === 'staff' ? 'selected' : ''}>Staff</option>
                <option value="admin" ${member.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </td>
            <td>
              <select class="dept-select" data-id="${member._id}">
                <option value="Kitchen" ${member.department === 'Kitchen' ? 'selected' : ''}>Kitchen</option>
                <option value="Service" ${member.department === 'Service' ? 'selected' : ''}>Service</option>
                <option value="Management" ${member.department === 'Management' ? 'selected' : ''}>Management</option>
                <option value="Other" ${member.department === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </td>
            <td>
              <span class="badge ${member.isActive !== false ? 'badge-success' : 'badge-danger'}">
                ${member.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>${new Date(member.createdAt).toLocaleDateString()}</td>
            <td>
              <button class="btn-toggle-status" data-id="${member._id}" data-active="${member.isActive !== false}" style="background: ${member.isActive !== false ? '#f44336' : '#4caf50'}; color: white; border: none; padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.7rem;">
                <i class="fas ${member.isActive !== false ? 'fa-ban' : 'fa-check-circle'}"></i>
                ${member.isActive !== false ? 'Deactivate' : 'Activate'}
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  // Role change handlers
  document.querySelectorAll('.role-select').forEach(select => {
    select.addEventListener('change', async () => {
      const userId = select.dataset.id;
      const newRole = select.value;
      await updateStaffRole(userId, newRole);
    });
  });
  
  // Department change handlers
  document.querySelectorAll('.dept-select').forEach(select => {
    select.addEventListener('change', async () => {
      const userId = select.dataset.id;
      const newDept = select.value;
      await updateStaffDepartment(userId, newDept);
    });
  });
  
  // Status toggle handlers
  document.querySelectorAll('.btn-toggle-status').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.id;
      await toggleStaffStatus(userId);
    });
  });
}

async function updateStaffRole(userId, newRole) {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const userIndex = users.findIndex(u => u._id === userId);
  if (userIndex !== -1) {
    users[userIndex].role = newRole;
    localStorage.setItem('users', JSON.stringify(users));
    showNotification('Staff role updated', 'success');
    loadStaff();
  }
}

async function updateStaffDepartment(userId, newDept) {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const userIndex = users.findIndex(u => u._id === userId);
  if (userIndex !== -1) {
    users[userIndex].department = newDept;
    localStorage.setItem('users', JSON.stringify(users));
    showNotification('Department updated', 'success');
  }
}

async function toggleStaffStatus(userId) {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const userIndex = users.findIndex(u => u._id === userId);
  if (userIndex !== -1) {
    users[userIndex].isActive = users[userIndex].isActive === false ? true : false;
    localStorage.setItem('users', JSON.stringify(users));
    showNotification(`Staff ${users[userIndex].isActive ? 'activated' : 'deactivated'}`, 'success');
    loadStaff();
  }
}

// Add new staff
if (addStaffForm) {
  addStaffForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('staff-name').value.trim();
    const email = document.getElementById('staff-email').value.trim();
    const phone = document.getElementById('staff-phone').value.trim();
    const password = document.getElementById('staff-password').value;
    const role = document.getElementById('staff-role').value;
    const department = document.getElementById('staff-department').value;
    
    // Validate
    if (!name || !email || !phone || !password) {
      showNotification('All fields are required', 'error');
      return;
    }
    
    if (password.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if email already exists
    if (users.some(u => u.email === email)) {
      showNotification('Email already exists', 'error');
      return;
    }
    
    const newStaff = {
      _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      email,
      phone,
      password,
      role,
      department,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    users.push(newStaff);
    localStorage.setItem('users', JSON.stringify(users));
    
    showNotification(`${name} added successfully!`, 'success');
    addStaffForm.reset();
    loadStaff();
  });
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

// Logout
document.getElementById('logout-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../customer/login.html';
});

// Initialize
loadStaff();