const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../database/config');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all customers
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        c.*,
        COUNT(v.id) as vehicle_count,
        SUM(c.total_spent) as total_spent
      FROM customers c
      LEFT JOIN vehicles v ON c.id = v.customer_id
    `;

    const params = [];

    if (search) {
      query += ` WHERE c.first_name LIKE ? OR c.last_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` GROUP BY c.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [customers] = await pool.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM customers';
    if (search) {
      countQuery += ` WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?`;
    }
    const [countResult] = await pool.execute(countQuery, search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : []);

    res.json({
      customers,
      pagination: {
        current: parseInt(page),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const [customers] = await pool.execute(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get customer vehicles
    const [vehicles] = await pool.execute(
      'SELECT * FROM vehicles WHERE customer_id = ?',
      [id]
    );

    // Get customer bookings
    const [bookings] = await pool.execute(
      `SELECT b.*, v.vehicle_number, v.brand, v.model 
       FROM bookings b 
       JOIN vehicles v ON b.vehicle_id = v.id 
       WHERE b.customer_id = ? 
       ORDER BY b.created_at DESC 
       LIMIT 10`,
      [id]
    );

    res.json({
      customer: customers[0],
      vehicles,
      recentBookings: bookings
    });

  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new customer
router.post('/', [
  auth,
  authorize('admin', 'manager', 'customer_service'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('email').optional().isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { first_name, last_name, email, phone, address, city, state, pincode } = req.body;

    // Handle optional fields - convert undefined to null
    const emailValue = email || null;
    const addressValue = address || null;
    const cityValue = city || null;
    const stateValue = state || null;
    const pincodeValue = pincode || null;

    // Check if customer already exists
    const [existingCustomers] = await pool.execute(
      'SELECT id FROM customers WHERE phone = ? OR (email = ? AND email IS NOT NULL)',
      [phone, emailValue]
    );

    if (existingCustomers.length > 0) {
      return res.status(400).json({ error: 'Customer with this phone or email already exists' });
    }

    const [result] = await pool.execute(
      `INSERT INTO customers (first_name, last_name, email, phone, address, city, state, pincode) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, emailValue, phone, addressValue, cityValue, stateValue, pincodeValue]
    );

    res.status(201).json({
      message: 'Customer created successfully',
      customerId: result.insertId
    });

  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update customer
router.put('/:id', [
  auth,
  authorize('admin', 'manager', 'customer_service'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('phone').notEmpty().withMessage('Phone number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { first_name, last_name, email, phone, address, city, state, pincode } = req.body;

    // Handle optional fields - convert undefined to null
    const emailValue = email || null;
    const addressValue = address || null;
    const cityValue = city || null;
    const stateValue = state || null;
    const pincodeValue = pincode || null;

    // Check if customer exists
    const [existingCustomers] = await pool.execute(
      'SELECT id FROM customers WHERE id = ?',
      [id]
    );

    if (existingCustomers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if phone/email is already used by another customer
    const [duplicateCustomers] = await pool.execute(
      'SELECT id FROM customers WHERE (phone = ? OR (email = ? AND email IS NOT NULL)) AND id != ?',
      [phone, emailValue, id]
    );

    if (duplicateCustomers.length > 0) {
      return res.status(400).json({ error: 'Phone or email already exists with another customer' });
    }

    await pool.execute(
      `UPDATE customers 
       SET first_name = ?, last_name = ?, email = ?, phone = ?, address = ?, city = ?, state = ?, pincode = ?
       WHERE id = ?`,
      [first_name, last_name, emailValue, phone, addressValue, cityValue, stateValue, pincodeValue, id]
    );

    res.json({ message: 'Customer updated successfully' });

  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add vehicle to customer
router.post('/:id/vehicles', [
  auth,
  authorize('admin', 'manager', 'customer_service'),
  body('vehicle_number').notEmpty().withMessage('Vehicle number is required'),
  body('vehicle_type').isIn(['hatchback', 'sedan', 'suv', 'luxury', 'commercial']).withMessage('Valid vehicle type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { vehicle_number, vehicle_type, brand, model, year, color, registration_number } = req.body;

    // Handle optional fields - convert undefined to null
    const brandValue = brand || null;
    const modelValue = model || null;
    const yearValue = year || null;
    const colorValue = color || null;
    const registrationNumberValue = registration_number || null;

    // Check if customer exists
    const [customers] = await pool.execute(
      'SELECT id FROM customers WHERE id = ?',
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if vehicle number already exists
    const [existingVehicles] = await pool.execute(
      'SELECT id FROM vehicles WHERE vehicle_number = ?',
      [vehicle_number]
    );

    if (existingVehicles.length > 0) {
      return res.status(400).json({ error: 'Vehicle number already exists' });
    }

    const [result] = await pool.execute(
      `INSERT INTO vehicles (customer_id, vehicle_number, vehicle_type, brand, model, year, color, registration_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, vehicle_number, vehicle_type, brandValue, modelValue, yearValue, colorValue, registrationNumberValue]
    );

    res.status(201).json({
      message: 'Vehicle added successfully',
      vehicleId: result.insertId
    });

  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update vehicle
router.put('/vehicles/:vehicleId', [
  auth,
  authorize('admin', 'manager', 'customer_service'),
  body('vehicle_number').notEmpty().withMessage('Vehicle number is required'),
  body('vehicle_type').isIn(['hatchback', 'sedan', 'suv', 'luxury', 'commercial']).withMessage('Valid vehicle type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { vehicleId } = req.params;
    const { vehicle_number, vehicle_type, brand, model, year, color, registration_number } = req.body;

    // Handle optional fields - convert undefined to null
    const brandValue = brand || null;
    const modelValue = model || null;
    const yearValue = year || null;
    const colorValue = color || null;
    const registrationNumberValue = registration_number || null;

    // Check if vehicle exists
    const [vehicles] = await pool.execute(
      'SELECT id FROM vehicles WHERE id = ?',
      [vehicleId]
    );

    if (vehicles.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check if vehicle number already exists with another vehicle
    const [duplicateVehicles] = await pool.execute(
      'SELECT id FROM vehicles WHERE vehicle_number = ? AND id != ?',
      [vehicle_number, vehicleId]
    );

    if (duplicateVehicles.length > 0) {
      return res.status(400).json({ error: 'Vehicle number already exists' });
    }

    await pool.execute(
      `UPDATE vehicles 
       SET vehicle_number = ?, vehicle_type = ?, brand = ?, model = ?, year = ?, color = ?, registration_number = ?
       WHERE id = ?`,
      [vehicle_number, vehicle_type, brandValue, modelValue, yearValue, colorValue, registrationNumberValue, vehicleId]
    );

    res.json({ message: 'Vehicle updated successfully' });

  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete vehicle
router.delete('/vehicles/:vehicleId', [auth, authorize('admin', 'manager')], async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // Check if vehicle has any bookings
    const [bookings] = await pool.execute(
      'SELECT id FROM bookings WHERE vehicle_id = ?',
      [vehicleId]
    );

    if (bookings.length > 0) {
      return res.status(400).json({ error: 'Cannot delete vehicle with existing bookings' });
    }

    await pool.execute('DELETE FROM vehicles WHERE id = ?', [vehicleId]);

    res.json({ message: 'Vehicle deleted successfully' });

  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer statistics
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get booking statistics
    const [bookingStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
        SUM(total_amount) as total_spent
       FROM bookings 
       WHERE customer_id = ?`,
      [id]
    );

    // Get vehicle count
    const [vehicleCount] = await pool.execute(
      'SELECT COUNT(*) as vehicle_count FROM vehicles WHERE customer_id = ?',
      [id]
    );

    // Get loyalty points
    const [loyaltyPoints] = await pool.execute(
      'SELECT loyalty_points FROM customers WHERE id = ?',
      [id]
    );

    res.json({
      stats: {
        totalBookings: bookingStats[0].total_bookings || 0,
        completedBookings: bookingStats[0].completed_bookings || 0,
        cancelledBookings: bookingStats[0].cancelled_bookings || 0,
        totalSpent: bookingStats[0].total_spent || 0,
        vehicleCount: vehicleCount[0].vehicle_count || 0,
        loyaltyPoints: loyaltyPoints[0]?.loyalty_points || 0
      }
    });

  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Safe delete customer (handles all related records)
router.delete('/:id/safe-delete', [auth, authorize('admin')], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const [customers] = await pool.execute(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Delete job card photos (cascades from job_cards)
      await connection.execute(
        'DELETE jcp FROM job_card_photos jcp INNER JOIN job_cards jc ON jcp.job_card_id = jc.id INNER JOIN bookings b ON jc.booking_id = b.id WHERE b.customer_id = ?',
        [id]
      );

      // 2. Delete job cards
      await connection.execute(
        'DELETE jc FROM job_cards jc INNER JOIN bookings b ON jc.booking_id = b.id WHERE b.customer_id = ?',
        [id]
      );

      // 3. Delete billing records
      await connection.execute(
        'DELETE b FROM billing b INNER JOIN bookings bk ON b.booking_id = bk.id WHERE bk.customer_id = ?',
        [id]
      );

      // 4. Delete customer feedback
      await connection.execute(
        'DELETE cf FROM customer_feedback cf INNER JOIN bookings b ON cf.booking_id = b.id WHERE b.customer_id = ?',
        [id]
      );

      // 5. Delete booking services (cascades from bookings)
      await connection.execute(
        'DELETE bs FROM booking_services bs INNER JOIN bookings b ON bs.booking_id = b.id WHERE b.customer_id = ?',
        [id]
      );

      // 6. Delete bookings
      await connection.execute(
        'DELETE FROM bookings WHERE customer_id = ?',
        [id]
      );

      // 7. Delete loyalty transactions
      await connection.execute(
        'DELETE FROM loyalty_transactions WHERE customer_id = ?',
        [id]
      );

      // 8. Delete vehicles
      await connection.execute(
        'DELETE FROM vehicles WHERE customer_id = ?',
        [id]
      );

      // 9. Finally delete the customer
      await connection.execute(
        'DELETE FROM customers WHERE id = ?',
        [id]
      );

      await connection.commit();

      res.json({ 
        message: 'Customer and all related records deleted successfully',
        deletedCustomer: customers[0]
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Safe delete customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
