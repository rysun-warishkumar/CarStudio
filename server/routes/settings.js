const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { pool } = require('../database/config');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/settings';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get system settings
router.get('/', auth, async (req, res) => {
  try {
    const [settings] = await pool.execute(
      'SELECT * FROM system_settings WHERE id = 1'
    );

    if (settings.length === 0) {
      // Create default settings if none exist
      const defaultSettings = {
        theme_colors: { primary: '#3B82F6', secondary: '#1E40AF' },
        business_name: 'Car Studio',
        business_email: 'info@carstudio.com',
        business_phone: '+91 98765 43210',
        business_address: '123 Car Studio Lane, Auto City',
        website: 'https://carstudio.com',
        gst_number: '',
        pan_number: '',
        logo_url: null,
        dark_mode: false,
        email_notifications: true,
        sms_notifications: true,
        whatsapp_notifications: false,
        sms_api_key: '',
        whatsapp_api_key: '',
        payment_api_key: '',
        two_factor_auth: false,
        session_timeout: 30,
        strong_password_policy: true,
        currency: 'INR',
        gst_rate: 18,
        service_tax_rate: 5,
        payment_methods: ['cash', 'card', 'upi']
      };

      await pool.execute(
        `INSERT INTO system_settings SET ?`,
        [defaultSettings]
      );

      res.json({ settings: defaultSettings });
    } else {
      // Parse JSON fields and clean string fields
      const settingsData = settings[0];
      
      // Clean string fields that might have extra quotes
      const stringFields = ['business_name', 'business_email', 'business_phone', 'business_address', 'website', 'gst_number', 'pan_number'];
      stringFields.forEach(field => {
        if (settingsData[field] && typeof settingsData[field] === 'string') {
          settingsData[field] = settingsData[field].replace(/^["']|["']$/g, '').trim();
        }
      });
      
      if (settingsData.theme_colors) {
        try {
          settingsData.theme_colors = JSON.parse(settingsData.theme_colors);
        } catch (e) {
          settingsData.theme_colors = { primary: '#3B82F6', secondary: '#1E40AF' };
        }
      }
      if (settingsData.payment_methods) {
        try {
          settingsData.payment_methods = JSON.parse(settingsData.payment_methods);
        } catch (e) {
          settingsData.payment_methods = ['cash', 'card', 'upi'];
        }
      }

      res.json({ settings: settingsData });
    }

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update system settings
router.put('/', [
  auth,
  authorize('admin'),
  upload.single('logo')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateData = {};

    // Handle file upload
    if (req.file) {
      updateData.logo_url = `/uploads/settings/${req.file.filename}`;
    }

    // Handle form fields
    Object.keys(req.body).forEach(key => {
      if (key === 'theme_colors') {
        try {
          // If it's already a string, parse it first
          const themeData = typeof req.body[key] === 'string' ? JSON.parse(req.body[key]) : req.body[key];
          updateData[key] = JSON.stringify(themeData);
        } catch (e) {
          // If parsing fails, use default theme
          updateData[key] = JSON.stringify({ primary: '#3B82F6', secondary: '#1E40AF' });
        }
      } else if (key === 'payment_methods') {
        // Handle multiple checkbox values
        if (!updateData[key]) {
          updateData[key] = [];
        }
        if (Array.isArray(req.body[key])) {
          updateData[key] = JSON.stringify(req.body[key]);
        } else {
          // Single value case
          updateData[key] = JSON.stringify([req.body[key]]);
        }
      } else if (key === 'dark_mode' || key === 'email_notifications' || 
                 key === 'sms_notifications' || key === 'whatsapp_notifications' ||
                 key === 'two_factor_auth' || key === 'strong_password_policy') {
        updateData[key] = req.body[key] === 'true' ? 1 : 0;
      } else if (key === 'session_timeout' || key === 'gst_rate' || key === 'service_tax_rate') {
        updateData[key] = parseFloat(req.body[key]) || 0;
      } else {
        // Clean the string value - remove any extra quotes and trim whitespace
        let value = req.body[key];
        if (typeof value === 'string') {
          // Remove surrounding quotes if they exist
          value = value.replace(/^["']|["']$/g, '');
          // Trim whitespace
          value = value.trim();
        }
        updateData[key] = value || '';
      }
    });

    // Check if settings exist
    const [existingSettings] = await pool.execute(
      'SELECT id FROM system_settings WHERE id = 1'
    );

    if (existingSettings.length === 0) {
      // Create new settings
      const insertFields = Object.keys(updateData).join(', ');
      const insertValues = Object.values(updateData);
      const placeholders = insertValues.map(() => '?').join(', ');
      
      await pool.execute(
        `INSERT INTO system_settings (${insertFields}) VALUES (${placeholders})`,
        insertValues
      );
    } else {
      // Update existing settings
      const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const updateValues = Object.values(updateData);
      updateValues.push(1); // for WHERE id = 1

      await pool.execute(
        `UPDATE system_settings SET ${updateFields} WHERE id = ?`,
        updateValues
      );
    }

    // Get updated settings
    const [updatedSettings] = await pool.execute(
      'SELECT * FROM system_settings WHERE id = 1'
    );

    const settingsData = updatedSettings[0];
    if (settingsData.theme_colors) {
      try {
        settingsData.theme_colors = JSON.parse(settingsData.theme_colors);
      } catch (e) {
        settingsData.theme_colors = { primary: '#3B82F6', secondary: '#1E40AF' };
      }
    }
    if (settingsData.payment_methods) {
      try {
        settingsData.payment_methods = JSON.parse(settingsData.payment_methods);
      } catch (e) {
        settingsData.payment_methods = ['cash', 'card', 'upi'];
      }
    }

    res.json({ 
      message: 'Settings updated successfully',
      settings: settingsData
    });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get public settings (for customer portal)
router.get('/public', async (req, res) => {
  try {
    const [settings] = await pool.execute(
      'SELECT business_name, business_email, business_phone, business_address, website, logo_url, theme_colors FROM system_settings WHERE id = 1'
    );

    if (settings.length === 0) {
      return res.json({ 
        business_name: 'Car Studio',
        business_email: 'info@carstudio.com',
        business_phone: '+91 98765 43210',
        business_address: '123 Car Studio Lane, Auto City',
        website: 'https://carstudio.com',
        logo_url: null,
        theme_colors: { primary: '#3B82F6', secondary: '#1E40AF' }
      });
    }

    const settingsData = settings[0];
    if (settingsData.theme_colors) {
      settingsData.theme_colors = JSON.parse(settingsData.theme_colors);
    }

    res.json({ settings: settingsData });

  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset settings to default
router.post('/reset', [auth, authorize('admin')], async (req, res) => {
  try {
    const defaultSettings = {
      theme_colors: { primary: '#3B82F6', secondary: '#1E40AF' },
      business_name: 'Car Studio',
      business_email: 'info@carstudio.com',
      business_phone: '+91 98765 43210',
      business_address: '123 Car Studio Lane, Auto City',
      website: 'https://carstudio.com',
      gst_number: '',
      pan_number: '',
      logo_url: null,
      dark_mode: false,
      email_notifications: true,
      sms_notifications: true,
      whatsapp_notifications: false,
      sms_api_key: '',
      whatsapp_api_key: '',
      payment_api_key: '',
      two_factor_auth: false,
      session_timeout: 30,
      strong_password_policy: true,
      currency: 'INR',
      gst_rate: 18,
      service_tax_rate: 5,
      payment_methods: ['cash', 'card', 'upi']
    };

    await pool.execute(
      'UPDATE system_settings SET ? WHERE id = 1',
      [defaultSettings]
    );

    res.json({ 
      message: 'Settings reset to default successfully',
      settings: defaultSettings
    });

  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
