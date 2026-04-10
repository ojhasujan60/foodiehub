const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  reservationNumber: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 120 // minutes
  },
  numberOfGuests: {
    type: Number,
    required: true,
    min: 1
  },
  specialRequests: {
    type: String,
    default: ''
  },
  occasion: {
    type: String,
    enum: ['Casual', 'Birthday', 'Anniversary', 'Date', 'Business', 'Family'],
    default: 'Casual'
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Arrived', 'Completed', 'Cancelled', 'No-Show'],
    default: 'Pending'
  },
  isArchived: {
    type: Boolean,
    default: false // For completed/cancelled/no-show reservations
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate reservation number before saving
reservationSchema.pre('save', async function(next) {
  if (!this.reservationNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const count = await mongoose.model('Reservation').countDocuments();
    this.reservationNumber = `RES-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Reservation', reservationSchema);