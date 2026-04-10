import { getToken, getUser, showNotification, isAuthenticated } from './global.js';

// Check if user is logged in
if (!isAuthenticated()) {
  window.location.href = '/customer/login.html';
}

const user = getUser();

// Display user info
document.getElementById('profile-name').textContent = user.name;
document.getElementById('profile-email').textContent = user.email;
document.getElementById('display-name').textContent = user.name;
document.getElementById('display-email').textContent = user.email;
document.getElementById('display-phone').textContent = user.phone || 'Not provided';
document.getElementById('display-joined').textContent = new Date(user.createdAt || Date.now()).toLocaleDateString();
document.getElementById('display-address').textContent = user.address?.street || 'Not provided';

// Load full profile from server
async function loadProfile() {
  const token = getToken();
  try {
    const response = await fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Failed to load profile');
    const profile = await response.json();
    
    document.getElementById('edit-name').value = profile.name;
    document.getElementById('edit-phone').value = profile.phone || '';
    document.getElementById('edit-address').value = profile.address?.street || '';
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

// Edit profile
document.getElementById('edit-profile-btn').addEventListener('click', () => {
  document.getElementById('profile-info').style.display = 'none';
  document.getElementById('edit-profile-form').style.display = 'block';
  loadProfile();
});

document.getElementById('cancel-edit').addEventListener('click', () => {
  document.getElementById('edit-profile-form').style.display = 'none';
  document.getElementById('profile-info').style.display = 'block';
});

document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const token = getToken();
  const updateData = {
    name: document.getElementById('edit-name').value,
    phone: document.getElementById('edit-phone').value,
    address: {
      street: document.getElementById('edit-address').value
    }
  };
  
  try {
    const response = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) throw new Error('Update failed');
    
    const data = await response.json();
    
    // Update local storage
    const updatedUser = { ...user, ...updateData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    showNotification('Profile updated successfully', 'success');
    
    // Refresh display
    document.getElementById('display-name').textContent = updateData.name;
    document.getElementById('display-phone').textContent = updateData.phone || 'Not provided';
    document.getElementById('display-address').textContent = updateData.address.street || 'Not provided';
    document.getElementById('profile-name').textContent = updateData.name;
    
    document.getElementById('edit-profile-form').style.display = 'none';
    document.getElementById('profile-info').style.display = 'block';
    
  } catch (error) {
    console.error('Error updating profile:', error);
    showNotification('Failed to update profile', 'error');
  }
});

// Change password
document.getElementById('change-password-btn').addEventListener('click', () => {
  document.getElementById('profile-info').style.display = 'none';
  document.getElementById('change-password-form').style.display = 'block';
});

document.getElementById('cancel-password').addEventListener('click', () => {
  document.getElementById('change-password-form').style.display = 'none';
  document.getElementById('profile-info').style.display = 'block';
});

document.getElementById('password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  if (newPassword !== confirmPassword) {
    showNotification('New passwords do not match', 'error');
    return;
  }
  
  const token = getToken();
  
  try {
    const response = await fetch('/api/users/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    showNotification('Password changed successfully', 'success');
    
    // Clear form
    document.getElementById('password-form').reset();
    document.getElementById('change-password-form').style.display = 'none';
    document.getElementById('profile-info').style.display = 'block';
    
  } catch (error) {
    console.error('Error changing password:', error);
    showNotification(error.message || 'Failed to change password', 'error');
  }
});

// Initial load
loadProfile();