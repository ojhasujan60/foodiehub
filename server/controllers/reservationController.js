const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');

// Get available time slots
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date, guests } = req.query;
    const selectedDate = new Date(date);
    
    const tables = await Table.find({ 
      capacity: { $gte: parseInt(guests) || 1 },
      isActive: true
    });
    
    const startDate = new Date(selectedDate.setHours(0, 0, 0));
    const endDate = new Date(selectedDate.setHours(23, 59, 59));
    
    const reservations = await Reservation.find({
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['Pending', 'Confirmed', 'Arrived'] },
      isArchived: false
    });
    
    const timeSlots = [];
    for (let hour = 11; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        const availableTables = tables.filter(table => {
          const isBooked = reservations.some(res => 
            res.table.toString() === table._id.toString() && 
            res.time === time
          );
          return !isBooked;
        });
        
        if (availableTables.length > 0) {
          timeSlots.push({
            time,
            availableTables: availableTables.map(t => ({ 
              id: t._id, 
              number: t.tableNumber, 
              capacity: t.capacity,
              location: t.location
            }))
          });
        }
      }
    }
    
    res.json(timeSlots);
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ message: 'Error fetching available slots' });
  }
};

// Create reservation
exports.createReservation = async (req, res) => {
  try {
    const { date, time, numberOfGuests, tableId, specialRequests, occasion, duration, phone, email } = req.body;
    
    console.log('Creating reservation:', { date, time, numberOfGuests, tableId, phone, email });
    
    const existingReservation = await Reservation.findOne({
      table: tableId,
      date: new Date(date),
      time,
      status: { $in: ['Pending', 'Confirmed', 'Arrived'] },
      isArchived: false
    });
    
    if (existingReservation) {
      return res.status(400).json({ message: 'Table not available at this time' });
    }
    
    // Get user details for notifications
    const user = req.user;
    const userPhone = phone || user.phone;
    const userEmail = email || user.email;
    
    const reservation = new Reservation({
      user: req.user._id,
      table: tableId,
      date: new Date(date),
      time,
      numberOfGuests,
      specialRequests,
      occasion: occasion || 'Casual',
      duration: duration || 120,
      status: 'Confirmed'
    });
    
    await reservation.save();
    await reservation.populate('table');
    await reservation.populate('user', 'name email phone');
    
    // Create in-app notification
    await Notification.create({
      user: req.user._id,
      type: 'reservation',
      title: 'Reservation Confirmed',
      message: `Your reservation #${reservation.reservationNumber} for ${numberOfGuests} guests on ${new Date(date).toLocaleDateString()} at ${time} is confirmed`,
      data: { reservationId: reservation._id }
    });
    
    // Send Email if provided
    if (userEmail) {
      try {
        await sendEmail({
          to: userEmail,
          subject: 'Reservation Confirmed - FoodieHub',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ff6b6b;">Reservation Confirmed! 🎉</h2>
              <p>Dear ${user.name},</p>
              <p>Your table reservation has been confirmed. Here are the details:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background: #f8f9fa;">
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reservation #</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${reservation.reservationNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date & Time</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${new Date(date).toLocaleDateString()} at ${time}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Guests</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${numberOfGuests}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Table</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">Table ${reservation.table?.tableNumber} (${reservation.table?.location})</td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td style="padding: 10px; border: 1px solid #ddd;"><strong>Occasion</strong></td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${occasion || 'Casual'}</td>
                </tr>
              </table>
              ${specialRequests ? `<p><strong>Special Requests:</strong> ${specialRequests}</p>` : ''}
              <p>We look forward to serving you!</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">© 2025 FoodieHub. All rights reserved.</p>
            </div>
          `
        });
        console.log(`📧 Email sent to ${userEmail}`);
      } catch (emailError) {
        console.error('Error sending email:', emailError.message);
      }
    }
    
    // Send SMS if phone number provided
    if (userPhone) {
      try {
        await sendSMS({
          to: userPhone,
          message: `FoodieHub: Reservation confirmed for ${new Date(date).toLocaleDateString()} at ${time}, Table ${reservation.table?.tableNumber}. Thank you!`
        });
        console.log(`📱 SMS sent to ${userPhone}`);
      } catch (smsError) {
        console.error('Error sending SMS:', smsError.message);
      }
    }
    
    res.status(201).json(reservation);
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ message: 'Error creating reservation', error: error.message });
  }
};

// Get active reservations (not archived)
exports.getUserReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ 
      user: req.user._id,
      isArchived: false
    })
      .populate('table')
      .sort({ date: 1, time: 1 });
    
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ message: 'Error fetching reservations' });
  }
};

// Get reservation history (archived)
exports.getUserReservationHistory = async (req, res) => {
  try {
    const reservations = await Reservation.find({ 
      user: req.user._id,
      isArchived: true
    })
      .populate('table')
      .sort({ date: -1, time: -1 });
    
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservation history:', error);
    res.status(500).json({ message: 'Error fetching reservation history' });
  }
};

// Cancel reservation
exports.cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await Reservation.findById(id).populate('user', 'name email phone');
    
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    
    if (reservation.user._id.toString() !== req.user._id.toString() && req.user.role === 'customer') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Only allow cancellation if reservation is in the future
    if (new Date(reservation.date) < new Date() && reservation.status !== 'Pending') {
      return res.status(400).json({ message: 'Cannot cancel past reservations' });
    }
    
    reservation.status = 'Cancelled';
    reservation.cancelledAt = new Date();
    reservation.isArchived = true;
    await reservation.save();
    
    await Notification.create({
      user: req.user._id,
      type: 'reservation',
      title: 'Reservation Cancelled',
      message: `Your reservation #${reservation.reservationNumber} for ${reservation.date.toLocaleDateString()} at ${reservation.time} has been cancelled`,
      data: { reservationId: reservation._id }
    });
    
    // Send cancellation email
    if (reservation.user.email) {
      try {
        await sendEmail({
          to: reservation.user.email,
          subject: 'Reservation Cancelled - FoodieHub',
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2 style="color: #f44336;">Reservation Cancelled</h2>
              <p>Dear ${reservation.user.name},</p>
              <p>Your reservation for ${reservation.date.toLocaleDateString()} at ${reservation.time} has been cancelled.</p>
              <p>If you didn't request this cancellation, please contact us immediately.</p>
              <p>We hope to serve you soon!</p>
            </div>
          `
        });
        console.log(`📧 Cancellation email sent to ${reservation.user.email}`);
      } catch (emailError) {
        console.error('Error sending cancellation email:', emailError.message);
      }
    }
    
    res.json({ message: 'Reservation cancelled', reservation });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ message: 'Error cancelling reservation' });
  }
};

// Get all active reservations (Staff/Admin)
exports.getAllReservations = async (req, res) => {
  try {
    const { date, status, archived } = req.query;
    let filter = { isArchived: archived === 'true' };
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }
    if (status && status !== '') filter.status = status;
    
    let query = Reservation.find(filter)
      .populate('table')
      .populate('user', 'name email phone')
      .sort({ date: 1, time: 1 });
    
    const reservations = await query;
    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ message: 'Error fetching reservations' });
  }
};

// Update reservation status (Staff/Admin)
exports.updateReservationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const reservation = await Reservation.findById(id).populate('user', 'name email phone');
    
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    
    const oldStatus = reservation.status;
    reservation.status = status;
    
    // Archive when completed or cancelled or no-show
    if (status === 'Completed' || status === 'Cancelled' || status === 'No-Show') {
      reservation.isArchived = true;
      reservation.completedAt = new Date();
    }
    
    await reservation.save();
    
    await Notification.create({
      user: reservation.user._id,
      type: 'reservation',
      title: 'Reservation Updated',
      message: `Your reservation #${reservation.reservationNumber} status has been updated from ${oldStatus} to ${status}`,
      data: { reservationId: reservation._id }
    });
    
    // Send status update email
    if (reservation.user.email && (status === 'Confirmed' || status === 'Arrived')) {
      try {
        await sendEmail({
          to: reservation.user.email,
          subject: `Reservation ${status} - FoodieHub`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2 style="color: #4caf50;">Reservation ${status}</h2>
              <p>Dear ${reservation.user.name},</p>
              <p>Your reservation for ${reservation.date.toLocaleDateString()} at ${reservation.time} is now <strong>${status}</strong>.</p>
              ${status === 'Arrived' ? '<p>Please proceed to your table. A staff member will assist you.</p>' : ''}
              <p>Thank you for choosing FoodieHub!</p>
            </div>
          `
        });
        console.log(`📧 Status update email sent to ${reservation.user.email}`);
      } catch (emailError) {
        console.error('Error sending status email:', emailError.message);
      }
    }
    
    res.json(reservation);
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({ message: 'Error updating reservation status' });
  }
};

// Update reservation (Admin full access)
exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const reservation = await Reservation.findByIdAndUpdate(id, updateData, { new: true })
      .populate('table')
      .populate('user', 'name email');
    
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    
    await Notification.create({
      user: reservation.user._id,
      type: 'reservation',
      title: 'Reservation Modified',
      message: `Your reservation #${reservation.reservationNumber} has been modified. New details: ${reservation.date.toLocaleDateString()} at ${reservation.time}`,
      data: { reservationId: reservation._id }
    });
    
    res.json(reservation);
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({ message: 'Error updating reservation' });
  }
};

// Delete reservation (Admin)
exports.deleteReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await Reservation.findByIdAndDelete(id);
    
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    
    res.json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(500).json({ message: 'Error deleting reservation' });
  }
};

// Auto-archive past reservations (Run daily)
exports.archivePastReservations = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pastReservations = await Reservation.find({
      date: { $lt: today },
      isArchived: false,
      status: { $ne: 'Cancelled' }
    });
    
    for (const reservation of pastReservations) {
      if (reservation.status === 'Confirmed' || reservation.status === 'Pending') {
        reservation.status = 'No-Show';
      }
      reservation.isArchived = true;
      reservation.completedAt = new Date();
      await reservation.save();
      
      console.log(`📦 Archived reservation #${reservation.reservationNumber}`);
    }
    
    console.log(`📦 Archived ${pastReservations.length} past reservations`);
  } catch (error) {
    console.error('Error archiving reservations:', error);
  }
};

// Get reservation statistics
exports.getReservationStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [
      totalActive,
      totalArchived,
      todayReservations,
      upcomingReservations
    ] = await Promise.all([
      Reservation.countDocuments({ isArchived: false }),
      Reservation.countDocuments({ isArchived: true }),
      Reservation.countDocuments({ 
        date: { $gte: today, $lt: tomorrow },
        isArchived: false
      }),
      Reservation.countDocuments({ 
        date: { $gte: today },
        status: { $in: ['Confirmed', 'Pending'] },
        isArchived: false
      })
    ]);
    
    res.json({
      totalActive,
      totalArchived,
      todayReservations,
      upcomingReservations
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};