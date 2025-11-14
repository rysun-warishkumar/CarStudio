
const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../database/config');
const { auth, authorize } = require('../middleware/auth');
const moment = require('moment');
const smtpService = require('../services/smtpService');

const router = express.Router();

// Public booking endpoint (no auth)
router.post('/public', [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('date').isDate().withMessage('Valid booking date is required'),
  body('time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid booking time is required'),
  body('service_id').isInt().withMessage('Valid service ID is required'),
  body('vehicle_number').notEmpty().withMessage('Vehicle number is required'),
  body('vehicle_brand').notEmpty().withMessage('Vehicle brand is required'),
  body('vehicle_model').notEmpty().withMessage('Vehicle model is required'),
  body('vehicle_type').isIn(['hatchback', 'sedan', 'suv', 'luxury', 'commercial']).withMessage('Valid vehicle type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, 
      phone, 
      date, 
      time, 
      service_id,
      vehicle_number,
      vehicle_brand,
      vehicle_model,
      vehicle_type,
      vehicle_color,
      vehicle_year
    } = req.body;
    
    const [firstName, ...lastNameArr] = name.trim().split(' ');
    const lastName = lastNameArr.join(' ') || '-';

    // Check if customer exists by phone
    let [customers] = await pool.execute('SELECT * FROM customers WHERE phone = ?', [phone]);
    let customerId;
    if (customers.length === 0) {
      // Create new customer
      const [result] = await pool.execute(
        'INSERT INTO customers (first_name, last_name, phone) VALUES (?, ?, ?)',
        [firstName, lastName, phone]
      );
      customerId = result.insertId;
    } else {
      customerId = customers[0].id;
    }

    // Check if vehicle with this number already exists
    let [existingVehicles] = await pool.execute('SELECT * FROM vehicles WHERE vehicle_number = ?', [vehicle_number]);
    let vehicleId;
    
    if (existingVehicles.length > 0) {
      // Vehicle exists, check if it belongs to this customer
      if (existingVehicles[0].customer_id === customerId) {
        vehicleId = existingVehicles[0].id;
      } else {
        return res.status(400).json({ error: 'Vehicle number already registered with another customer' });
      }
    } else {
      // Create new vehicle for this customer
      const [vResult] = await pool.execute(
        `INSERT INTO vehicles (customer_id, vehicle_number, vehicle_type, brand, model, color, year) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [customerId, vehicle_number, vehicle_type, vehicle_brand, vehicle_model, vehicle_color || null, vehicle_year || null]
      );
      vehicleId = vResult.insertId;
    }

    // Check if booking time is available
    const [existingBookings] = await pool.execute(
      `SELECT id FROM bookings 
       WHERE booking_date = ? AND booking_time = ? AND status NOT IN ('cancelled', 'completed')`,
      [date, time]
    );
    if (existingBookings.length > 0) {
      return res.status(400).json({ error: 'Booking time slot is not available' });
    }

    // Get service price
    const [serviceRows] = await pool.execute('SELECT base_price FROM services WHERE id = ?', [service_id]);
    if (serviceRows.length === 0) {
      return res.status(400).json({ error: 'Service not found' });
    }
    const price = serviceRows[0].base_price;

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      // Create booking
      const [bookingResult] = await connection.execute(
        `INSERT INTO bookings (customer_id, vehicle_id, booking_date, booking_time, total_amount, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
        [customerId, vehicleId, date, time, price]
      );
      const bookingId = bookingResult.insertId;

      // Add booking_services
      await connection.execute(
        'INSERT INTO booking_services (booking_id, service_id, quantity, price) VALUES (?, ?, ?, ?)',
        [bookingId, service_id, 1, price]
      );

      // Create job card
      await connection.execute(
        'INSERT INTO job_cards (booking_id, status) VALUES (?, "assigned")',
        [bookingId]
      );

      await connection.commit();
      
      // Send confirmation email
      try {
        // Get booking details for email
        const [bookingDetails] = await pool.execute(`
          SELECT 
            b.id, b.booking_date, b.booking_time, b.total_amount, b.status,
            c.first_name, c.last_name, c.phone, c.email,
            v.brand as vehicle_make, v.model as vehicle_model, v.vehicle_number as vehicle_registration,
            s.name as service_name, bs.quantity, bs.price
          FROM bookings b
          JOIN customers c ON b.customer_id = c.id
          JOIN vehicles v ON b.vehicle_id = v.id
          JOIN booking_services bs ON b.id = bs.booking_id
          JOIN services s ON bs.service_id = s.id
          WHERE b.id = ?
        `, [bookingId]);
        
        if (bookingDetails.length > 0) {
          const booking = bookingDetails[0];
          const services = bookingDetails.map(row => ({
            serviceName: row.service_name,
            quantity: row.quantity,
            price: row.price
          }));
          
          const emailData = {
            ...booking,
            customer_name: `${booking.first_name} ${booking.last_name}`,
            customer_phone: booking.phone,
            customer_email: booking.email,
            services: services
          };
          
          // Send email asynchronously (don't wait for it)
          smtpService.sendBookingConfirmation(emailData)
            .then(result => {
              if (result.success) {
                console.log('✅ Booking confirmation email sent for booking #', bookingId);
              } else {
                console.log('⚠️ Failed to send booking confirmation email:', result.message);
              }
            })
            .catch(error => {
              console.error('❌ Email sending error:', error.message);
            });
        }
      } catch (emailError) {
        console.error('❌ Error preparing email data:', emailError.message);
        // Don't fail the booking if email fails
      }
      
      res.status(201).json({ message: 'Booking created successfully', bookingId });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Public booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Get all bookings with filters
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      date = '', 
      customer_id = '',
      search = ''
    } = req.query;
    
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        b.*,
        c.first_name, c.last_name, c.phone, c.email,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        v.vehicle_number, v.brand, v.model, v.vehicle_type,
        v.brand as vehicle_make, v.model as vehicle_model,
        v.vehicle_number as vehicle_registration
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN vehicles v ON b.vehicle_id = v.id
    `;

    const whereConditions = [];
    const params = [];

    if (status) {
      whereConditions.push('b.status = ?');
      params.push(status);
    }

    if (date) {
      whereConditions.push('DATE(b.booking_date) = ?');
      params.push(date);
    }

    if (customer_id) {
      whereConditions.push('b.customer_id = ?');
      params.push(customer_id);
    }

    if (search) {
      whereConditions.push('(c.first_name LIKE ? OR c.last_name LIKE ? OR c.phone LIKE ? OR v.vehicle_number LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' GROUP BY b.id ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [bookings] = await pool.execute(query, params);

    // Get services for each booking
    for (let booking of bookings) {
      const [services] = await pool.execute(
        `SELECT 
          bs.*,
          s.name as service_name, s.description as service_description
         FROM booking_services bs
         JOIN services s ON bs.service_id = s.id
         WHERE bs.booking_id = ?`,
        [booking.id]
      );
      booking.services = services;
    }

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT b.id) as total 
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN vehicles v ON b.vehicle_id = v.id
    `;

    if (whereConditions.length > 0) {
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
    }

    const [countResult] = await pool.execute(countQuery, params.slice(0, -2));

    res.json({
      bookings,
      pagination: {
        current: parseInt(page),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get booking by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get booking details
    const [bookings] = await pool.execute(
      `SELECT 
        b.*,
        c.first_name, c.last_name, c.phone, c.email, c.address,
        v.vehicle_number, v.brand, v.model, v.vehicle_type, v.color, v.year
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.id = ?`,
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Get booking services
    const [bookingServices] = await pool.execute(
      `SELECT 
        bs.*,
        s.name as service_name, s.description as service_description
       FROM booking_services bs
       JOIN services s ON bs.service_id = s.id
       WHERE bs.booking_id = ?`,
      [id]
    );

    // Get job card if exists
    const [jobCards] = await pool.execute(
      `SELECT 
        jc.*,
        s.first_name as technician_first_name, s.last_name as technician_last_name
       FROM job_cards jc
       LEFT JOIN staff s ON jc.assigned_technician_id = s.id
       WHERE jc.booking_id = ?`,
      [id]
    );

    res.json({
      booking: bookings[0],
      services: bookingServices,
      jobCard: jobCards[0] || null
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new booking (admin only)
router.post('/', [
  auth,
  authorize('admin', 'manager'),
  body('customer_id').isInt().withMessage('Valid customer ID is required'),
  body('vehicle_id').isInt().withMessage('Valid vehicle ID is required'),
  body('booking_date').isISO8601().withMessage('Valid booking date is required'),
  body('booking_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid booking time is required'),
  body('services').isArray().withMessage('Services array is required'),
  body('services.*.service_id').isInt().withMessage('Valid service ID is required'),
  body('services.*.quantity').optional().isInt({ min: 1 }).withMessage('Valid quantity is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer_id, vehicle_id, booking_date, booking_time, services, notes } = req.body;

    // Validate customer exists
    const [customers] = await pool.execute('SELECT id FROM customers WHERE id = ?', [customer_id]);
    if (customers.length === 0) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    // Validate vehicle exists and belongs to customer
    const [vehicles] = await pool.execute(
      'SELECT id FROM vehicles WHERE id = ? AND customer_id = ?',
      [vehicle_id, customer_id]
    );
    if (vehicles.length === 0) {
      return res.status(400).json({ error: 'Vehicle not found or does not belong to the selected customer' });
    }

    // Validate services exist and are active
    for (const service of services) {
      const [serviceDetails] = await pool.execute(
        'SELECT id, name, base_price, is_active FROM services WHERE id = ?',
        [service.service_id]
      );

      if (serviceDetails.length === 0) {
        return res.status(400).json({ 
          error: `Service with ID ${service.service_id} not found`,
          details: `Please check if service ID ${service.service_id} exists in the database`
        });
      }

      if (!serviceDetails[0].is_active) {
        return res.status(400).json({ 
          error: `Service "${serviceDetails[0].name}" (ID: ${service.service_id}) is inactive`,
          details: 'Please select an active service or activate this service first'
        });
      }
    }

    // Check if booking time is available
    const [existingBookings] = await pool.execute(
      `SELECT id FROM bookings 
       WHERE booking_date = ? AND booking_time = ? AND status NOT IN ('cancelled', 'completed')`,
      [booking_date, booking_time]
    );
    if (existingBookings.length > 0) {
      return res.status(400).json({ error: 'Booking time slot is not available' });
    }

    // Calculate total amount
    let totalAmount = 0;
    for (const service of services) {
      const [serviceDetails] = await pool.execute(
        'SELECT base_price FROM services WHERE id = ?',
        [service.service_id]
      );
      totalAmount += serviceDetails[0].base_price * (service.quantity || 1);
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      // Create booking
      const [bookingResult] = await connection.execute(
        `INSERT INTO bookings (customer_id, vehicle_id, booking_date, booking_time, total_amount, status, notes) 
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        [customer_id, vehicle_id, booking_date, booking_time, totalAmount, notes || null]
      );
      const bookingId = bookingResult.insertId;

      // Add booking_services
      for (const service of services) {
        const [serviceDetails] = await connection.execute(
          'SELECT base_price FROM services WHERE id = ?',
          [service.service_id]
        );
        const price = serviceDetails[0].base_price;
        
        await connection.execute(
          'INSERT INTO booking_services (booking_id, service_id, quantity, price) VALUES (?, ?, ?, ?)',
          [bookingId, service.service_id, service.quantity || 1, price]
        );
      }

      // Create job card
      await connection.execute(
        'INSERT INTO job_cards (booking_id, status) VALUES (?, "assigned")',
        [bookingId]
      );

      await connection.commit();
      
      // Send confirmation email
      try {
        // Get booking details for email
        const [bookingDetails] = await pool.execute(`
          SELECT 
            b.id, b.booking_date, b.booking_time, b.total_amount, b.status,
            c.first_name, c.last_name, c.phone, c.email,
            v.brand as vehicle_make, v.model as vehicle_model, v.vehicle_number as vehicle_registration,
            s.name as service_name, bs.quantity, bs.price
          FROM bookings b
          JOIN customers c ON b.customer_id = c.id
          JOIN vehicles v ON b.vehicle_id = v.id
          JOIN booking_services bs ON b.id = bs.booking_id
          JOIN services s ON bs.service_id = s.id
          WHERE b.id = ?
        `, [bookingId]);
        
        if (bookingDetails.length > 0) {
          const booking = bookingDetails[0];
          const services = bookingDetails.map(row => ({
            serviceName: row.service_name,
            quantity: row.quantity,
            price: row.price
          }));
          
          const emailData = {
            ...booking,
            customer_name: `${booking.first_name} ${booking.last_name}`,
            customer_phone: booking.phone,
            customer_email: booking.email,
            services: services
          };
          
          // Send email asynchronously (don't wait for it)
          smtpService.sendBookingConfirmation(emailData)
            .then(result => {
              if (result.success) {
                console.log('✅ Booking confirmation email sent for booking #', bookingId);
              } else {
                console.log('⚠️ Failed to send booking confirmation email:', result.message);
              }
            })
            .catch(error => {
              console.error('❌ Email sending error:', error.message);
            });
        }
      } catch (emailError) {
        console.error('❌ Error preparing email data:', emailError.message);
        // Don't fail the booking if email fails
      }
      
      res.status(201).json({ 
        message: 'Booking created successfully', 
        bookingId,
        totalAmount 
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update booking status (admin only)
router.put('/:id/status', [
  auth,
  authorize('admin'),
  body('status').isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']).withMessage('Valid status is required'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    // Check if booking exists
    const [bookings] = await pool.execute(
      'SELECT id, status FROM bookings WHERE id = ?',
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Update booking status and notes
    await pool.execute(
      'UPDATE bookings SET status = ?, notes = ? WHERE id = ?',
      [status, notes || null, id]
    );

    // Update job card status if exists
    if (status === 'in_progress') {
      await pool.execute(
        'UPDATE job_cards SET status = "in_progress", start_time = NOW() WHERE booking_id = ?',
        [id]
      );
    } else if (status === 'completed') {
      await pool.execute(
        'UPDATE job_cards SET status = "completed", end_time = NOW() WHERE booking_id = ?',
        [id]
      );
    }

    // Send status update email
    try {
      console.log('📧 Sending status update email for booking #', id);
      
      // Get booking details for email
      const [bookingDetails] = await pool.execute(`
        SELECT
          b.id, b.booking_date, b.booking_time, b.total_amount, b.status,
          c.first_name, c.last_name, c.phone, c.email,
          v.brand as vehicle_make, v.model as vehicle_model, v.vehicle_number as vehicle_registration,
          s.name as service_name, bs.quantity, bs.price
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        JOIN vehicles v ON b.vehicle_id = v.id
        JOIN booking_services bs ON b.id = bs.booking_id
        JOIN services s ON bs.service_id = s.id
        WHERE b.id = ?
      `, [id]);

      if (bookingDetails.length > 0) {
        const booking = bookingDetails[0];
        const services = bookingDetails.map(row => ({
          serviceName: row.service_name,
          quantity: row.quantity,
          price: row.price
        }));

        const emailData = {
          ...booking,
          customer_name: `${booking.first_name} ${booking.last_name}`,
          customer_phone: booking.phone,
          customer_email: booking.email,
          services: services
        };

        // Send status update email asynchronously
        smtpService.sendStatusUpdateEmail(emailData, status, notes)
          .then(result => {
            if (result.success) {
              console.log('✅ Status update email sent for booking #', id);
            } else {
              console.log('⚠️ Failed to send status update email:', result.message);
            }
          })
          .catch(error => {
            console.error('❌ Email sending error:', error.message);
          });
      }
    } catch (emailError) {
      console.error('❌ Error preparing status update email data:', emailError.message);
      // Don't fail the status update if email fails
    }

    res.json({ message: 'Booking status updated successfully' });

  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available time slots for a date
router.get('/available-slots/:date', auth, async (req, res) => {
  try {
    const { date } = req.params;
    const { duration = 60 } = req.query; // Default 60 minutes

    // Validate date
    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Studio working hours (9 AM to 7 PM)
    const workingHours = {
      start: '09:00',
      end: '19:00'
    };

    // Generate time slots
    const slots = [];
    let currentTime = moment(workingHours.start, 'HH:mm');
    const endTime = moment(workingHours.end, 'HH:mm');

    while (currentTime.isBefore(endTime)) {
      const slotTime = currentTime.format('HH:mm');
      
      // Check if slot is available
      const [existingBookings] = await pool.execute(
        `SELECT id FROM bookings 
         WHERE booking_date = ? AND booking_time = ? AND status NOT IN ('cancelled', 'completed')`,
        [date, slotTime]
      );

      slots.push({
        time: slotTime,
        available: existingBookings.length === 0
      });

      currentTime.add(30, 'minutes'); // 30-minute intervals
    }

    res.json({ date, slots });

  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get booking statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    if (period === 'week') {
      dateFilter = 'AND booking_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateFilter = 'AND booking_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    } else if (period === 'year') {
      dateFilter = 'AND booking_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
    }

    // Get booking statistics
    const [bookingStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_bookings,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_booking_value
       FROM bookings 
       WHERE 1=1 ${dateFilter}`
    );

    // Get today's bookings
    const [todayBookings] = await pool.execute(
      `SELECT COUNT(*) as today_bookings, SUM(total_amount) as today_revenue
       FROM bookings 
       WHERE booking_date = CURDATE()`
    );

    res.json({
      stats: {
        totalBookings: bookingStats[0].total_bookings || 0,
        completedBookings: bookingStats[0].completed_bookings || 0,
        cancelledBookings: bookingStats[0].cancelled_bookings || 0,
        pendingBookings: bookingStats[0].pending_bookings || 0,
        inProgressBookings: bookingStats[0].in_progress_bookings || 0,
        totalRevenue: bookingStats[0].total_revenue || 0,
        avgBookingValue: bookingStats[0].avg_booking_value || 0,
        todayBookings: todayBookings[0].today_bookings || 0,
        todayRevenue: todayBookings[0].today_revenue || 0
      }
    });

  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel booking
router.put('/:id/cancel', [
  auth,
  authorize('admin', 'manager', 'customer_service'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Check if booking exists and can be cancelled
    const [bookings] = await pool.execute(
      'SELECT id, status FROM bookings WHERE id = ?',
      [id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (bookings[0].status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel completed booking' });
    }

    if (bookings[0].status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    // Update booking status
    await pool.execute(
      'UPDATE bookings SET status = "cancelled", notes = CONCAT(IFNULL(notes, ""), " | Cancelled: ", ?) WHERE id = ?',
      [reason || 'No reason provided', id]
    );

    res.json({ message: 'Booking cancelled successfully' });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
