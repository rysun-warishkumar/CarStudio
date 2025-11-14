const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../database/config');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Generate invoice for booking
router.post('/generate-invoice', [
  auth,
  authorize('admin', 'manager', 'customer_service'),
  body('booking_id').isInt().withMessage('Valid booking ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { booking_id } = req.body;

    // Check if booking exists and is completed
    const [bookings] = await pool.execute(
      `SELECT 
        b.*,
        c.first_name, c.last_name, c.phone, c.email,
        v.vehicle_number, v.brand, v.model
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.id = ?`,
      [booking_id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (bookings[0].status !== 'completed') {
      return res.status(400).json({ error: 'Invoice can only be generated for completed bookings' });
    }

    // Check if invoice already exists
    const [existingInvoices] = await pool.execute(
      'SELECT id FROM billing WHERE booking_id = ?',
      [booking_id]
    );

    if (existingInvoices.length > 0) {
      return res.status(400).json({ error: 'Invoice already exists for this booking' });
    }

    // Get booking services
    const [bookingServices] = await pool.execute(
      `SELECT 
        bs.*,
        s.name as service_name
       FROM booking_services bs
       JOIN services s ON bs.service_id = s.id
       WHERE bs.booking_id = ?`,
      [booking_id]
    );

    // Calculate totals
    const subtotal = bookingServices.reduce((sum, service) => sum + (service.price * service.quantity), 0);
    const taxAmount = subtotal * 0.18; // 18% GST
    const totalAmount = subtotal + taxAmount;

    // Generate invoice number
    const [lastInvoice] = await pool.execute(
      'SELECT invoice_number FROM billing ORDER BY id DESC LIMIT 1'
    );

    let invoiceNumber = 'INV-001';
    if (lastInvoice.length > 0) {
      const lastNumber = parseInt(lastInvoice[0].invoice_number.split('-')[1]);
      invoiceNumber = `INV-${String(lastNumber + 1).padStart(3, '0')}`;
    }

    // Create invoice
    const [result] = await pool.execute(
      `INSERT INTO billing (booking_id, invoice_number, subtotal, tax_amount, total_amount, payment_status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [booking_id, invoiceNumber, subtotal, taxAmount, totalAmount]
    );

    res.status(201).json({
      message: 'Invoice generated successfully',
      invoiceId: result.insertId,
      invoiceNumber,
      totalAmount
    });

  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invoice by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const [invoices] = await pool.execute(
      `SELECT 
        b.*,
        bk.booking_date, bk.booking_time, bk.notes as booking_notes,
        c.first_name, c.last_name, c.phone, c.email, c.address, c.city, c.state, c.pincode,
        v.vehicle_number, v.brand, v.model, v.vehicle_type, v.color, v.year
       FROM billing b
       JOIN bookings bk ON b.booking_id = bk.id
       JOIN customers c ON bk.customer_id = c.id
       JOIN vehicles v ON bk.vehicle_id = v.id
       WHERE b.id = ?`,
      [id]
    );

    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get invoice services
    const [invoiceServices] = await pool.execute(
      `SELECT 
        bs.*,
        s.name as service_name, s.description as service_description
       FROM booking_services bs
       JOIN services s ON bs.service_id = s.id
       WHERE bs.booking_id = ?`,
      [invoices[0].booking_id]
    );

    res.json({
      invoice: invoices[0],
      services: invoiceServices
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update payment status
router.put('/:id/payment', [
  auth,
  authorize('admin', 'manager', 'customer_service'),
  body('payment_method').isIn(['cash', 'card', 'upi', 'bank_transfer']).withMessage('Valid payment method is required'),
  body('paid_amount').isFloat({ min: 0 }).withMessage('Valid paid amount is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { payment_method, paid_amount, notes } = req.body;

    // Check if invoice exists
    const [invoices] = await pool.execute(
      'SELECT id, total_amount, paid_amount FROM billing WHERE id = ?',
      [id]
    );

    if (invoices.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoices[0];
    const newPaidAmount = invoice.paid_amount + paid_amount;
    let paymentStatus = 'partial';

    if (newPaidAmount >= invoice.total_amount) {
      paymentStatus = 'paid';
    }

    // Update payment details
    await pool.execute(
      `UPDATE billing 
       SET payment_method = ?, paid_amount = ?, payment_status = ?, billing_date = NOW()
       WHERE id = ?`,
      [payment_method, newPaidAmount, paymentStatus, id]
    );

    // Update booking payment status
    await pool.execute(
      'UPDATE bookings SET payment_status = ? WHERE id = (SELECT booking_id FROM billing WHERE id = ?)',
      [paymentStatus, id]
    );

    res.json({ 
      message: 'Payment updated successfully',
      paymentStatus,
      remainingAmount: Math.max(0, invoice.total_amount - newPaidAmount)
    });

  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all invoices with filters
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      payment_status = '', 
      date_from = '', 
      date_to = '',
      search = ''
    } = req.query;
    
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        b.*,
        bk.booking_date,
        c.first_name, c.last_name, c.phone,
        v.vehicle_number, v.brand, v.model
       FROM billing b
       JOIN bookings bk ON b.booking_id = bk.id
       JOIN customers c ON bk.customer_id = c.id
       JOIN vehicles v ON bk.vehicle_id = v.id
    `;

    const whereConditions = [];
    const params = [];

    if (payment_status) {
      whereConditions.push('b.payment_status = ?');
      params.push(payment_status);
    }

    if (date_from) {
      whereConditions.push('DATE(b.billing_date) >= ?');
      params.push(date_from);
    }

    if (date_to) {
      whereConditions.push('DATE(b.billing_date) <= ?');
      params.push(date_to);
    }

    if (search) {
      whereConditions.push('(c.first_name LIKE ? OR c.last_name LIKE ? OR c.phone LIKE ? OR b.invoice_number LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' ORDER BY b.billing_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [invoices] = await pool.execute(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM billing b
      JOIN bookings bk ON b.booking_id = bk.id
      JOIN customers c ON bk.customer_id = c.id
      JOIN vehicles v ON bk.vehicle_id = v.id
    `;

    if (whereConditions.length > 0) {
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
    }

    const [countResult] = await pool.execute(countQuery, params.slice(0, -2));

    res.json({
      invoices,
      pagination: {
        current: parseInt(page),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get billing statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    if (period === 'week') {
      dateFilter = 'AND b.billing_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateFilter = 'AND b.billing_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } else if (period === 'year') {
      dateFilter = 'AND b.billing_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
    }

    // Get billing statistics
    const [billingStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_invoices,
        SUM(total_amount) as total_billed,
        SUM(paid_amount) as total_paid,
        SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_invoices,
        SUM(CASE WHEN payment_status = 'partial' THEN 1 ELSE 0 END) as partial_invoices,
        AVG(total_amount) as avg_invoice_value
       FROM billing b
       WHERE 1=1 ${dateFilter}`
    );

    // Get today's billing
    const [todayBilling] = await pool.execute(
      `SELECT 
        COUNT(*) as today_invoices,
        SUM(total_amount) as today_billed,
        SUM(paid_amount) as today_paid
       FROM billing b
       WHERE DATE(b.billing_date) = CURDATE()`
    );

    // Get payment method breakdown
    const [paymentMethods] = await pool.execute(
      `SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(paid_amount) as total_amount
       FROM billing b
       WHERE payment_status = 'paid' ${dateFilter}
       GROUP BY payment_method
       ORDER BY total_amount DESC`
    );

    res.json({
      stats: {
        totalInvoices: billingStats[0].total_invoices || 0,
        totalBilled: billingStats[0].total_billed || 0,
        totalPaid: billingStats[0].total_paid || 0,
        outstandingAmount: (billingStats[0].total_billed || 0) - (billingStats[0].total_paid || 0),
        paidInvoices: billingStats[0].paid_invoices || 0,
        pendingInvoices: billingStats[0].pending_invoices || 0,
        partialInvoices: billingStats[0].partial_invoices || 0,
        avgInvoiceValue: billingStats[0].avg_invoice_value || 0,
        todayInvoices: todayBilling[0].today_invoices || 0,
        todayBilled: todayBilling[0].today_billed || 0,
        todayPaid: todayBilling[0].today_paid || 0
      },
      paymentMethods
    });

  } catch (error) {
    console.error('Get billing stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get outstanding invoices
router.get('/outstanding/list', auth, async (req, res) => {
  try {
    const [outstandingInvoices] = await pool.execute(
      `SELECT 
        b.*,
        bk.booking_date,
        c.first_name, c.last_name, c.phone,
        v.vehicle_number, v.brand, v.model,
        (b.total_amount - b.paid_amount) as outstanding_amount
       FROM billing b
       JOIN bookings bk ON b.booking_id = bk.id
       JOIN customers c ON bk.customer_id = c.id
       JOIN vehicles v ON bk.vehicle_id = v.id
       WHERE b.payment_status IN ('pending', 'partial')
       ORDER BY b.billing_date ASC`
    );

    res.json({ outstandingInvoices });

  } catch (error) {
    console.error('Get outstanding invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
