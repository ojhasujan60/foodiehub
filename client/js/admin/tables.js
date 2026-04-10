import { getToken, showNotification, isAdmin } from '../customer/global.js';

if (!isAdmin()) {
  alert('Access denied. Admin only.');
  window.location.href = '../customer/login.html';
}

const addTableForm = document.getElementById('add-table-form');
const tablesGridView = document.getElementById('tables-grid-view');
const tablesList = document.getElementById('tables-list');

// Initialize default tables if empty
function initializeDefaultTables() {
  const existing = localStorage.getItem('tables');
  if (!existing || JSON.parse(existing).length === 0) {
    const defaultTables = [
      { _id: '1', tableNumber: 1, capacity: 2, location: 'Indoor', shape: 'Square', isAvailable: true, createdAt: new Date().toISOString() },
      { _id: '2', tableNumber: 2, capacity: 2, location: 'Indoor', shape: 'Square', isAvailable: true, createdAt: new Date().toISOString() },
      { _id: '3', tableNumber: 3, capacity: 4, location: 'Indoor', shape: 'Round', isAvailable: true, createdAt: new Date().toISOString() },
      { _id: '4', tableNumber: 4, capacity: 4, location: 'Indoor', shape: 'Round', isAvailable: false, createdAt: new Date().toISOString() },
      { _id: '5', tableNumber: 5, capacity: 6, location: 'Outdoor', shape: 'Rectangle', isAvailable: true, createdAt: new Date().toISOString() },
      { _id: '6', tableNumber: 6, capacity: 6, location: 'Outdoor', shape: 'Rectangle', isAvailable: true, createdAt: new Date().toISOString() },
      { _id: '7', tableNumber: 7, capacity: 2, location: 'Balcony', shape: 'Square', isAvailable: true, createdAt: new Date().toISOString() },
      { _id: '8', tableNumber: 8, capacity: 8, location: 'VIP', shape: 'Round', isAvailable: true, createdAt: new Date().toISOString() }
    ];
    localStorage.setItem('tables', JSON.stringify(defaultTables));
  }
}

// Fetch all tables
async function fetchTables() {
  initializeDefaultTables();
  
  if (tablesGridView) tablesGridView.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading tables...</p></div>';
  if (tablesList) tablesList.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading tables...</p></div>';
  
  try {
    const tables = JSON.parse(localStorage.getItem('tables') || '[]');
    updateStats(tables);
    renderTablesGrid(tables);
    renderTablesList(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    if (tablesGridView) tablesGridView.innerHTML = '<div class="empty-state">Error loading tables</div>';
    if (tablesList) tablesList.innerHTML = '<div class="empty-state">Error loading tables</div>';
  }
}

function updateStats(tables) {
  document.getElementById('total-tables-stat').textContent = tables.length;
  document.getElementById('available-tables-stat').textContent = tables.filter(t => t.isAvailable !== false).length;
  document.getElementById('occupied-tables-stat').textContent = tables.filter(t => t.isAvailable === false).length;
  document.getElementById('total-capacity-stat').textContent = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);
}

function renderTablesGrid(tables) {
  if (!tablesGridView) return;
  
  if (tables.length === 0) {
    tablesGridView.innerHTML = '<div class="empty-state"><i class="fas fa-chair"></i><p>No tables yet</p></div>';
    return;
  }
  
  tablesGridView.innerHTML = tables.sort((a, b) => a.tableNumber - b.tableNumber).map(table => `
    <div class="table-card-admin ${table.isAvailable !== false ? 'available' : 'occupied'}" data-id="${table._id}">
      <div class="table-number-admin">Table ${table.tableNumber}</div>
      <div class="table-capacity-admin"><i class="fas fa-users"></i> ${table.capacity} seats</div>
      <div class="table-location-admin"><i class="fas fa-map-marker-alt"></i> ${table.location}</div>
      <div class="table-shape-admin" style="font-size: 0.65rem; color: #666; margin-top: 0.2rem;">
        <i class="fas fa-${table.shape === 'Round' ? 'circle' : table.shape === 'Square' ? 'square' : 'stop'}"></i> ${table.shape || 'Square'}
      </div>
      <div class="table-actions">
        <button class="edit-table" data-id="${table._id}" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="toggle-table" data-id="${table._id}" data-available="${table.isAvailable !== false}" title="${table.isAvailable !== false ? 'Mark Occupied' : 'Mark Available'}">
          <i class="fas ${table.isAvailable !== false ? 'fa-check-circle' : 'fa-ban'}"></i>
        </button>
        <button class="delete-table" data-id="${table._id}" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
  
  // Event listeners
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
      const tableId = btn.dataset.id;
      editTable(tableId);
    });
  });
}

function renderTablesList(tables) {
  if (!tablesList) return;
  
  if (tables.length === 0) {
    tablesList.innerHTML = '<div class="empty-state"><i class="fas fa-chair"></i><p>No tables yet</p></div>';
    return;
  }
  
  tablesList.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Table #</th>
          <th>Capacity</th>
          <th>Location</th>
          <th>Shape</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${tables.sort((a, b) => a.tableNumber - b.tableNumber).map(table => `
          <tr>
            <td><strong>Table ${table.tableNumber}</strong></td>
            <td>${table.capacity} seats</td>
            <td>${table.location}</td>
            <td>${table.shape || 'Square'}</td>
            <td>
              <span class="badge ${table.isAvailable !== false ? 'badge-success' : 'badge-danger'}">
                ${table.isAvailable !== false ? 'Available' : 'Occupied'}
              </span>
            </td>
            <td>
              <button class="btn-edit-list" data-id="${table._id}" style="background: #ff9800; color: white; border: none; padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.7rem;">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn-toggle-list" data-id="${table._id}" data-available="${table.isAvailable !== false}" style="background: #2196f3; color: white; border: none; padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.7rem;">
                <i class="fas ${table.isAvailable !== false ? 'fa-eye-slash' : 'fa-eye'}"></i>
              </button>
              <button class="btn-delete-list" data-id="${table._id}" style="background: #f44336; color: white; border: none; padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.7rem;">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  document.querySelectorAll('.btn-toggle-list').forEach(btn => {
    btn.addEventListener('click', async () => {
      await toggleTableStatus(btn.dataset.id);
    });
  });
  
  document.querySelectorAll('.btn-delete-list').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Delete this table permanently?')) {
        await deleteTable(btn.dataset.id);
      }
    });
  });
  
  document.querySelectorAll('.btn-edit-list').forEach(btn => {
    btn.addEventListener('click', () => {
      editTable(btn.dataset.id);
    });
  });
}

// Add table
if (addTableForm) {
  addTableForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(addTableForm);
    const tableNumber = parseInt(formData.get('tableNumber'));
    const capacity = parseInt(formData.get('capacity'));
    const location = formData.get('location');
    const shape = formData.get('shape');
    
    const tables = JSON.parse(localStorage.getItem('tables') || '[]');
    
    // Check if table number already exists
    if (tables.some(t => t.tableNumber === tableNumber)) {
      showNotification('Table number already exists', 'error');
      return;
    }
    
    const newTable = {
      _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      tableNumber,
      capacity,
      location,
      shape,
      isAvailable: true,
      createdAt: new Date().toISOString()
    };
    
    tables.push(newTable);
    localStorage.setItem('tables', JSON.stringify(tables));
    
    showNotification(`Table ${tableNumber} added successfully!`, 'success');
    addTableForm.reset();
    fetchTables();
  });
}

async function toggleTableStatus(tableId) {
  const tables = JSON.parse(localStorage.getItem('tables') || '[]');
  const tableIndex = tables.findIndex(t => t._id === tableId);
  if (tableIndex !== -1) {
    tables[tableIndex].isAvailable = tables[tableIndex].isAvailable === false ? true : false;
    localStorage.setItem('tables', JSON.stringify(tables));
    showNotification(`Table ${tables[tableIndex].tableNumber} ${tables[tableIndex].isAvailable ? 'available' : 'occupied'}`, 'success');
    fetchTables();
  }
}

async function deleteTable(tableId) {
  const tables = JSON.parse(localStorage.getItem('tables') || '[]');
  const updatedTables = tables.filter(t => t._id !== tableId);
  localStorage.setItem('tables', JSON.stringify(updatedTables));
  showNotification('Table deleted successfully', 'success');
  fetchTables();
}

function editTable(tableId) {
  const tables = JSON.parse(localStorage.getItem('tables') || '[]');
  const table = tables.find(t => t._id === tableId);
  
  if (table) {
    // Populate form
    const numberInput = document.querySelector('input[name="tableNumber"]');
    const capacityInput = document.querySelector('input[name="capacity"]');
    const locationSelect = document.querySelector('select[name="location"]');
    const shapeSelect = document.querySelector('select[name="shape"]');
    
    if (numberInput) numberInput.value = table.tableNumber;
    if (capacityInput) capacityInput.value = table.capacity;
    if (locationSelect) locationSelect.value = table.location;
    if (shapeSelect) shapeSelect.value = table.shape || 'Square';
    
    // Scroll to form
    addTableForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Change button
    const submitBtn = addTableForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Table';
    
    addTableForm.dataset.editingId = tableId;
    
    // Add cancel button
    let cancelBtn = document.getElementById('cancel-table-edit');
    if (!cancelBtn) {
      cancelBtn = document.createElement('button');
      cancelBtn.id = 'cancel-table-edit';
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn-secondary';
      cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
      cancelBtn.style.marginLeft = '1rem';
      submitBtn.parentNode.appendChild(cancelBtn);
      
      cancelBtn.addEventListener('click', () => {
        addTableForm.reset();
        addTableForm.dataset.editingId = '';
        submitBtn.innerHTML = originalText;
        cancelBtn.remove();
      });
    }
    
    // Override submit
    addTableForm.onsubmit = async (e) => {
      e.preventDefault();
      
      const editingId = addTableForm.dataset.editingId;
      if (!editingId) return;
      
      const formData = new FormData(addTableForm);
      const tables = JSON.parse(localStorage.getItem('tables') || '[]');
      const tableIndex = tables.findIndex(t => t._id === editingId);
      
      if (tableIndex !== -1) {
        const newNumber = parseInt(formData.get('tableNumber'));
        
        // Check if new number conflicts with other table
        if (tables.some(t => t._id !== editingId && t.tableNumber === newNumber)) {
          showNotification('Table number already exists', 'error');
          return;
        }
        
        tables[tableIndex] = {
          ...tables[tableIndex],
          tableNumber: newNumber,
          capacity: parseInt(formData.get('capacity')),
          location: formData.get('location'),
          shape: formData.get('shape'),
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('tables', JSON.stringify(tables));
        showNotification('Table updated successfully!', 'success');
        
        addTableForm.reset();
        addTableForm.dataset.editingId = '';
        submitBtn.innerHTML = originalText;
        if (cancelBtn) cancelBtn.remove();
        addTableForm.onsubmit = null;
        
        fetchTables();
      }
    };
  }
}

// Logout
document.getElementById('logout-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../customer/login.html';
});

// Initialize
fetchTables();