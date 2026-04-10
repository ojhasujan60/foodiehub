const Table = require('../models/Table');

// Get all tables
exports.getAllTables = async (req, res) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });
    res.json(tables);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching tables' });
  }
};

// Get available tables
exports.getAvailableTables = async (req, res) => {
  try {
    const { date, time, guests } = req.query;
    const tables = await Table.find({ isActive: true });
    
    // Filter by capacity
    let availableTables = tables.filter(t => t.capacity >= (parseInt(guests) || 1));
    
    // If date and time provided, check reservations
    if (date && time) {
      const Reservation = require('../models/Reservation');
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      const reservations = await Reservation.find({
        date: { $gte: startDate, $lt: endDate },
        time,
        status: { $in: ['Confirmed', 'Pending'] }
      });
      
      const bookedTableIds = reservations.map(r => r.table.toString());
      availableTables = availableTables.filter(t => !bookedTableIds.includes(t._id.toString()));
    }
    
    res.json(availableTables);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching available tables' });
  }
};

// Create table (admin only)
exports.createTable = async (req, res) => {
  try {
    const { tableNumber, capacity, location } = req.body;
    
    const existingTable = await Table.findOne({ tableNumber });
    if (existingTable) {
      return res.status(400).json({ message: 'Table number already exists' });
    }
    
    const table = new Table({ tableNumber, capacity, location });
    await table.save();
    
    res.status(201).json(table);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating table' });
  }
};

// Update table (admin only)
exports.updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const table = await Table.findByIdAndUpdate(id, updateData, { new: true });
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    
    res.json(table);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating table' });
  }
};

// Delete table (admin only)
exports.deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    const table = await Table.findByIdAndDelete(id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    
    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting table' });
  }
};