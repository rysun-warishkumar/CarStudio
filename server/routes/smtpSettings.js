const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../database/config');
const { auth, authorize } = require('../middleware/auth');
const smtpService = require('../services/smtpService');

const router = express.Router();

// Get SMTP settings
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const [settings] = await pool.execute(
      'SELECT id, smtp_host, smtp_port, smtp_user, from_name, from_email, smtp_secure, is_active FROM smtp_settings ORDER BY created_at DESC LIMIT 1'
    );

    if (settings.length === 0) {
      return res.json({
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        from_name: 'Car Detailing Studio',
        from_email: '',
        smtp_secure: false,
        is_active: false
      });
    }

    // Don't send the password in response
    const { smtp_pass, ...safeSettings } = settings[0];
    res.json(safeSettings);
  } catch (error) {
    console.error('Get SMTP settings error:', error);
    res.status(500).json({ error: 'Failed to fetch SMTP settings' });
  }
});

// Update SMTP settings
router.put('/', [
  auth,
  authorize('admin'),
  body('smtp_host').notEmpty().withMessage('SMTP host is required'),
  body('smtp_port').isInt({ min: 1, max: 65535 }).withMessage('Valid SMTP port is required'),
  body('smtp_user').notEmpty().withMessage('SMTP username is required'),
  body('smtp_pass').notEmpty().withMessage('SMTP password is required'),
  body('from_name').notEmpty().withMessage('From name is required'),
  body('from_email').isEmail().withMessage('Valid from email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_pass,
      from_name,
      from_email,
      smtp_secure = false,
      is_active = true
    } = req.body;

    // Check if settings exist
    const [existing] = await pool.execute('SELECT id FROM smtp_settings LIMIT 1');

    if (existing.length > 0) {
      // Update existing settings
      await pool.execute(
        `UPDATE smtp_settings SET 
         smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?, 
         from_name = ?, from_email = ?, smtp_secure = ?, is_active = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [smtp_host, smtp_port, smtp_user, smtp_pass, from_name, from_email, smtp_secure, is_active, existing[0].id]
      );
    } else {
      // Insert new settings
      await pool.execute(
        `INSERT INTO smtp_settings 
         (smtp_host, smtp_port, smtp_user, smtp_pass, from_name, from_email, smtp_secure, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [smtp_host, smtp_port, smtp_user, smtp_pass, from_name, from_email, smtp_secure, is_active]
      );
    }

    res.json({ message: 'SMTP settings updated successfully' });
  } catch (error) {
    console.error('Update SMTP settings error:', error);
    res.status(500).json({ error: 'Failed to update SMTP settings' });
  }
});

// Test SMTP connection
router.post('/test', [
  auth,
  authorize('admin'),
  body('smtp_host').notEmpty().withMessage('SMTP host is required'),
  body('smtp_port').isInt({ min: 1, max: 65535 }).withMessage('Valid SMTP port is required'),
  body('smtp_user').notEmpty().withMessage('SMTP username is required'),
  body('smtp_pass').notEmpty().withMessage('SMTP password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { smtp_host, smtp_port, smtp_user, smtp_pass } = req.body;

    // Temporarily set environment variables for testing
    const originalHost = process.env.SMTP_HOST;
    const originalPort = process.env.SMTP_PORT;
    const originalUser = process.env.SMTP_USER;
    const originalPass = process.env.SMTP_PASS;

    process.env.SMTP_HOST = smtp_host;
    process.env.SMTP_PORT = smtp_port.toString();
    process.env.SMTP_USER = smtp_user;
    process.env.SMTP_PASS = smtp_pass;

    // Test connection
    const result = await smtpService.testConnection();

    // Restore original environment variables
    process.env.SMTP_HOST = originalHost;
    process.env.SMTP_PORT = originalPort;
    process.env.SMTP_USER = originalUser;
    process.env.SMTP_PASS = originalPass;

    res.json(result);
  } catch (error) {
    console.error('Test SMTP connection error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to test SMTP connection: ' + error.message 
    });
  }
});

// Send test email
router.post('/test-email', [
  auth,
  authorize('admin'),
  body('smtp_host').notEmpty().withMessage('SMTP host is required'),
  body('smtp_port').isInt({ min: 1, max: 65535 }).withMessage('Valid SMTP port is required'),
  body('smtp_user').notEmpty().withMessage('SMTP username is required'),
  body('smtp_pass').notEmpty().withMessage('SMTP password is required'),
  body('test_email').isEmail().withMessage('Valid test email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { smtp_host, smtp_port, smtp_user, smtp_pass, test_email } = req.body;

    // Temporarily set environment variables for testing
    const originalHost = process.env.SMTP_HOST;
    const originalPort = process.env.SMTP_PORT;
    const originalUser = process.env.SMTP_USER;
    const originalPass = process.env.SMTP_PASS;

    process.env.SMTP_HOST = smtp_host;
    process.env.SMTP_PORT = smtp_port.toString();
    process.env.SMTP_USER = smtp_user;
    process.env.SMTP_PASS = smtp_pass;

    // Create test booking data
    const testBookingData = {
      id: 999,
      customer_name: 'Test Customer',
      customer_phone: '+91 98765 43210',
      customer_email: test_email,
      booking_date: new Date().toISOString().split('T')[0],
      booking_time: '10:00',
      vehicle_make: 'Test Car',
      vehicle_model: 'Test Model',
      vehicle_registration: 'TEST123',
      status: 'confirmed',
      services: [
        {
          serviceName: 'Test Service',
          quantity: 1,
          price: 500
        }
      ],
      total_amount: 500
    };

    // Send test email
    const result = await smtpService.sendBookingConfirmation(testBookingData);

    // Restore original environment variables
    process.env.SMTP_HOST = originalHost;
    process.env.SMTP_PORT = originalPort;
    process.env.SMTP_USER = originalUser;
    process.env.SMTP_PASS = originalPass;

    res.json(result);
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test email: ' + error.message 
    });
  }
});

module.exports = router;
