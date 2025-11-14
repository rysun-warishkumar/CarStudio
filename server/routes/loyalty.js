const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../database/config');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get customer loyalty points
router.get('/customer/:customerId', auth, async (req, res) => {
  try {
    const { customerId } = req.params;

    // Get customer loyalty info
    const [customers] = await pool.execute(
      'SELECT loyalty_points, membership_type, total_spent FROM customers WHERE id = ?',
      [customerId]
    );

    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get loyalty transaction history
    const [transactions] = await pool.execute(
      `SELECT 
        transaction_type, points, reference_type, transaction_date
       FROM loyalty_transactions 
       WHERE customer_id = ?
       ORDER BY transaction_date DESC
       LIMIT 20`,
      [customerId]
    );

    res.json({
      loyaltyInfo: customers[0],
      transactions
    });

  } catch (error) {
    console.error('Get customer loyalty error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Award loyalty points
router.post('/award-points', [
  auth,
  authorize('admin', 'manager'),
  body('customer_id').isInt().withMessage('Valid customer ID is required'),
  body('points').isInt({ min: 1 }).withMessage('Valid points are required'),
  body('reference_type').isIn(['purchase', 'referral', 'bonus']).withMessage('Valid reference type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer_id, points, reference_type, reference_id, notes } = req.body;

    // Check if customer exists
    const [customers] = await pool.execute(
      'SELECT id FROM customers WHERE id = ?',
      [customer_id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Add loyalty transaction
      await connection.execute(
        'INSERT INTO loyalty_transactions (customer_id, transaction_type, points, reference_type, reference_id) VALUES (?, "earned", ?, ?, ?)',
        [customer_id, points, reference_type, reference_id]
      );

      // Update customer loyalty points
      await connection.execute(
        'UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?',
        [points, customer_id]
      );

      await connection.commit();

      res.json({ message: 'Loyalty points awarded successfully' });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Award loyalty points error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Redeem loyalty points
router.post('/redeem-points', [
  auth,
  authorize('admin', 'manager'),
  body('customer_id').isInt().withMessage('Valid customer ID is required'),
  body('points').isInt({ min: 1 }).withMessage('Valid points are required'),
  body('reference_type').isIn(['discount', 'service', 'product']).withMessage('Valid reference type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer_id, points, reference_type, reference_id, notes } = req.body;

    // Check if customer exists and has sufficient points
    const [customers] = await pool.execute(
      'SELECT id, loyalty_points FROM customers WHERE id = ?',
      [customer_id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customers[0].loyalty_points < points) {
      return res.status(400).json({ error: 'Insufficient loyalty points' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Add loyalty transaction
      await connection.execute(
        'INSERT INTO loyalty_transactions (customer_id, transaction_type, points, reference_type, reference_id) VALUES (?, "redeemed", ?, ?, ?)',
        [customer_id, points, reference_type, reference_id]
      );

      // Update customer loyalty points
      await connection.execute(
        'UPDATE customers SET loyalty_points = loyalty_points - ? WHERE id = ?',
        [points, customer_id]
      );

      await connection.commit();

      res.json({ message: 'Loyalty points redeemed successfully' });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Redeem loyalty points error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update customer membership type
router.put('/membership/:customerId', [
  auth,
  authorize('admin', 'manager'),
  body('membership_type').isIn(['basic', 'premium', 'vip']).withMessage('Valid membership type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customerId } = req.params;
    const { membership_type } = req.body;

    // Check if customer exists
    const [customers] = await pool.execute(
      'SELECT id FROM customers WHERE id = ?',
      [customerId]
    );

    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Update membership type
    await pool.execute(
      'UPDATE customers SET membership_type = ? WHERE id = ?',
      [membership_type, customerId]
    );

    res.json({ message: 'Membership type updated successfully' });

  } catch (error) {
    console.error('Update membership error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get loyalty statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    // Loyalty program statistics
    const [loyaltyStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_customers,
        SUM(loyalty_points) as total_points,
        AVG(loyalty_points) as avg_points,
        COUNT(CASE WHEN loyalty_points > 0 THEN 1 END) as active_members,
        COUNT(CASE WHEN membership_type = 'premium' THEN 1 END) as premium_members,
        COUNT(CASE WHEN membership_type = 'vip' THEN 1 END) as vip_members
       FROM customers`
    );

    // Points distribution
    const [pointsDistribution] = await pool.execute(
      `SELECT 
        CASE 
          WHEN loyalty_points = 0 THEN 'No Points'
          WHEN loyalty_points BETWEEN 1 AND 100 THEN '1-100 Points'
          WHEN loyalty_points BETWEEN 101 AND 500 THEN '101-500 Points'
          WHEN loyalty_points BETWEEN 501 AND 1000 THEN '501-1000 Points'
          ELSE '1000+ Points'
        END as points_range,
        COUNT(*) as customer_count
       FROM customers
       GROUP BY points_range
       ORDER BY customer_count DESC`
    );

    // Recent loyalty transactions
    const [recentTransactions] = await pool.execute(
      `SELECT 
        lt.*,
        c.first_name, c.last_name
       FROM loyalty_transactions lt
       JOIN customers c ON lt.customer_id = c.id
       ORDER BY lt.transaction_date DESC
       LIMIT 20`
    );

    // Top loyalty customers
    const [topLoyaltyCustomers] = await pool.execute(
      `SELECT 
        first_name, last_name, phone, email,
        loyalty_points, membership_type, total_spent
       FROM customers
       WHERE loyalty_points > 0
       ORDER BY loyalty_points DESC
       LIMIT 10`
    );

    res.json({
      stats: {
        totalCustomers: loyaltyStats[0].total_customers || 0,
        totalPoints: loyaltyStats[0].total_points || 0,
        avgPoints: loyaltyStats[0].avg_points || 0,
        activeMembers: loyaltyStats[0].active_members || 0,
        premiumMembers: loyaltyStats[0].premium_members || 0,
        vipMembers: loyaltyStats[0].vip_members || 0
      },
      pointsDistribution,
      recentTransactions,
      topLoyaltyCustomers
    });

  } catch (error) {
    console.error('Get loyalty stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get loyalty transaction history
router.get('/transactions', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      customer_id = '', 
      transaction_type = '',
      date_from = '',
      date_to = ''
    } = req.query;
    
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        lt.*,
        c.first_name, c.last_name, c.phone
       FROM loyalty_transactions lt
       JOIN customers c ON lt.customer_id = c.id
    `;

    const whereConditions = [];
    const params = [];

    if (customer_id) {
      whereConditions.push('lt.customer_id = ?');
      params.push(customer_id);
    }

    if (transaction_type) {
      whereConditions.push('lt.transaction_type = ?');
      params.push(transaction_type);
    }

    if (date_from) {
      whereConditions.push('DATE(lt.transaction_date) >= ?');
      params.push(date_from);
    }

    if (date_to) {
      whereConditions.push('DATE(lt.transaction_date) <= ?');
      params.push(date_to);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' ORDER BY lt.transaction_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [transactions] = await pool.execute(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM loyalty_transactions lt
      JOIN customers c ON lt.customer_id = c.id
    `;

    if (whereConditions.length > 0) {
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
    }

    const [countResult] = await pool.execute(countQuery, params.slice(0, -2));

    res.json({
      transactions,
      pagination: {
        current: parseInt(page),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get loyalty transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auto-award points for completed bookings
router.post('/auto-award/:bookingId', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Check if booking exists and is completed
    const [bookings] = await pool.execute(
      `SELECT 
        b.id, b.customer_id, b.total_amount,
        c.loyalty_points
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       WHERE b.id = ? AND b.status = 'completed'`,
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Completed booking not found' });
    }

    // Calculate points (1 point per 10 rupees spent)
    const pointsToAward = Math.floor(bookings[0].total_amount / 10);

    if (pointsToAward <= 0) {
      return res.status(400).json({ error: 'No points to award for this booking' });
    }

    // Check if points already awarded
    const [existingAward] = await pool.execute(
      'SELECT id FROM loyalty_transactions WHERE reference_type = "purchase" AND reference_id = ?',
      [bookingId]
    );

    if (existingAward.length > 0) {
      return res.status(400).json({ error: 'Points already awarded for this booking' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Add loyalty transaction
      await connection.execute(
        'INSERT INTO loyalty_transactions (customer_id, transaction_type, points, reference_type, reference_id) VALUES (?, "earned", ?, "purchase", ?)',
        [bookings[0].customer_id, pointsToAward, bookingId]
      );

      // Update customer loyalty points
      await connection.execute(
        'UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?',
        [pointsToAward, bookings[0].customer_id]
      );

      await connection.commit();

      res.json({ 
        message: 'Loyalty points awarded automatically',
        pointsAwarded: pointsToAward
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Auto-award points error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
