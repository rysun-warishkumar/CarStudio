
const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../database/config');
const { auth, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Multer config for service images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });

// Upload service image
router.post('/upload-image', auth, authorize('admin', 'manager'), upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// Upload package image
router.post('/packages/upload-image', auth, authorize('admin', 'manager'), upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// Get all service categories
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.execute(
      'SELECT * FROM service_categories WHERE is_active = 1 ORDER BY name'
    );

    res.json({ data: categories });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create service category
router.post('/categories', [
  auth,
  authorize('admin', 'manager'),
  body('name').notEmpty().withMessage('Category name is required'),
  body('description').optional().isString().withMessage('Description must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    // Check if category already exists
    const [existingCategories] = await pool.execute(
      'SELECT id FROM service_categories WHERE name = ?',
      [name]
    );

    if (existingCategories.length > 0) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const [result] = await pool.execute(
      'INSERT INTO service_categories (name, description) VALUES (?, ?)',
      [name, description]
    );

    res.status(201).json({
      message: 'Service category created successfully',
      categoryId: result.insertId
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update service category
router.put('/categories/:id', [
  auth,
  authorize('admin', 'manager'),
  body('name').notEmpty().withMessage('Category name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description } = req.body;

    // Check if category exists
    const [categories] = await pool.execute(
      'SELECT id FROM service_categories WHERE id = ?',
      [id]
    );

    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if name already exists with another category
    const [duplicateCategories] = await pool.execute(
      'SELECT id FROM service_categories WHERE name = ? AND id != ?',
      [name, id]
    );

    if (duplicateCategories.length > 0) {
      return res.status(400).json({ error: 'Category name already exists' });
    }

    await pool.execute(
      'UPDATE service_categories SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );

    res.json({ message: 'Service category updated successfully' });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all services with filters
router.get('/', async (req, res) => {
  try {
    const { category_id = '', search = '', is_active = '' } = req.query;

    let query = `
      SELECT 
        s.*,
        sc.name as category_name
      FROM services s
      JOIN service_categories sc ON s.category_id = sc.id
    `;

    const whereConditions = [];
    const params = [];

    if (category_id) {
      whereConditions.push('s.category_id = ?');
      params.push(category_id);
    }

    if (search) {
      whereConditions.push('(s.name LIKE ? OR s.description LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (is_active !== '') {
      whereConditions.push('s.is_active = ?');
      params.push(is_active === 'true' ? 1 : 0);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' ORDER BY sc.name, s.name';

    const [services] = await pool.execute(query, params);

    res.json({ data: services });

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete service
router.delete('/:id', [auth, authorize('admin', 'manager')], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if service exists
    const [services] = await pool.execute(
      'SELECT id FROM services WHERE id = ?',
      [id]
    );

    if (services.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Delete booking services first
      await connection.execute('DELETE FROM booking_services WHERE service_id = ?', [id]);
      
      // Delete package services
      await connection.execute('DELETE FROM package_services WHERE service_id = ?', [id]);
      
      // Delete the service
      await connection.execute('DELETE FROM services WHERE id = ?', [id]);

      await connection.commit();

      res.json({ message: 'Service deleted successfully' });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get service by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const [services] = await pool.execute(
      `SELECT 
        s.*,
        sc.name as category_name
       FROM services s
       JOIN service_categories sc ON s.category_id = sc.id
       WHERE s.id = ?`,
      [id]
    );

    if (services.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ service: services[0] });

  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new service
router.post('/', [
  auth,
  authorize('admin', 'manager'),
  body('category_id').isInt().withMessage('Valid category ID is required'),
  body('name').notEmpty().withMessage('Service name is required'),
  body('base_price').isFloat({ min: 0 }).withMessage('Valid base price is required'),
  body('duration_minutes').optional().isInt({ min: 1 }).withMessage('Valid duration is required'),
  body('image_url').optional().isString().isLength({ max: 255 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category_id, name, description, base_price, duration_minutes = 60, image_url } = req.body;

    // Check if category exists
    const [categories] = await pool.execute(
      'SELECT id FROM service_categories WHERE id = ? AND is_active = 1',
      [category_id]
    );

    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found or inactive' });
    }

    // Check if service name already exists in the same category
    const [existingServices] = await pool.execute(
      'SELECT id FROM services WHERE name = ? AND category_id = ?',
      [name, category_id]
    );

    if (existingServices.length > 0) {
      return res.status(400).json({ error: 'Service with this name already exists in this category' });
    }

    const [result] = await pool.execute(
      `INSERT INTO services (category_id, name, description, base_price, duration_minutes, image_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [category_id, name, description, base_price, duration_minutes, image_url || null]
    );

    res.status(201).json({
      message: 'Service created successfully',
      serviceId: result.insertId
    });

  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update service
router.put('/:id', [
  auth,
  authorize('admin', 'manager'),
  body('name').notEmpty().withMessage('Service name is required'),
  body('base_price').isFloat({ min: 0 }).withMessage('Valid base price is required'),
  body('image_url').optional().isString().isLength({ max: 255 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { category_id, name, description, base_price, duration_minutes, is_active, image_url } = req.body;

    // Check if service exists
    const [services] = await pool.execute(
      'SELECT id FROM services WHERE id = ?',
      [id]
    );

    if (services.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Check if category exists (if category_id is provided)
    if (category_id) {
      const [categories] = await pool.execute(
        'SELECT id FROM service_categories WHERE id = ? AND is_active = 1',
        [category_id]
      );

      if (categories.length === 0) {
        return res.status(404).json({ error: 'Category not found or inactive' });
      }
    }

    // Check if service name already exists in the same category
    const [duplicateServices] = await pool.execute(
      'SELECT id FROM services WHERE name = ? AND category_id = ? AND id != ?',
      [name, category_id || services[0].category_id, id]
    );

    if (duplicateServices.length > 0) {
      return res.status(400).json({ error: 'Service name already exists in this category' });
    }

    // Ensure no undefined values are sent to MySQL
    const updatedCategoryId = category_id !== undefined ? category_id : services[0].category_id;
    const updatedName = name !== undefined ? name : services[0].name;
    const updatedDescription = description !== undefined ? description : services[0].description;
    const updatedBasePrice = base_price !== undefined ? base_price : services[0].base_price;
    const updatedDuration = duration_minutes !== undefined ? duration_minutes : services[0].duration_minutes;
    const updatedIsActive = is_active !== undefined ? is_active : services[0].is_active;
    const updatedImageUrl = image_url !== undefined ? image_url : services[0].image_url;

    await pool.execute(
      `UPDATE services 
       SET category_id = ?, name = ?, description = ?, base_price = ?, duration_minutes = ?, is_active = ?, image_url = ?
       WHERE id = ?`,
      [
        updatedCategoryId ?? null,
        updatedName ?? null,
        updatedDescription ?? null,
        updatedBasePrice ?? null,
        updatedDuration ?? null,
        updatedIsActive ?? null,
        updatedImageUrl ?? null,
        id
      ]
    );

    res.json({ message: 'Service updated successfully' });

  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all service packages
router.get('/packages/all', async (req, res) => {
  try {
    const { search = '' } = req.query;

    let query = 'SELECT * FROM service_packages WHERE is_active = 1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY name';

    const [packages] = await pool.execute(query, params);

    // Get services for each package
    for (let pkg of packages) {
      const [packageServices] = await pool.execute(
        `SELECT 
          ps.*,
          s.name as service_name, s.description as service_description, s.base_price, s.image_url
         FROM package_services ps
         JOIN services s ON ps.service_id = s.id
         WHERE ps.package_id = ?`,
        [pkg.id]
      );
      pkg.services = packageServices;
    }

    res.json({ data: packages });

  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available services for package creation
router.get('/packages/available-services', async (req, res) => {
  try {
    const { search = '', category_id = '' } = req.query;

    let query = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.base_price,
        s.duration_minutes,
        s.image_url,
        sc.name as category_name
      FROM services s
      JOIN service_categories sc ON s.category_id = sc.id
    `;
    const params = [];

    if (search) {
      query += ' AND (s.name LIKE ? OR s.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (category_id) {
      query += ' AND s.category_id = ?';
      params.push(category_id);
    }

    query += ' ORDER BY sc.name, s.name';

    const [services] = await pool.execute(query, params);

    res.json({ data: services });

  } catch (error) {
    console.error('Get available services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get package by ID with services
router.get('/packages/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [packages] = await pool.execute(
      'SELECT * FROM service_packages WHERE id = ? AND is_active = 1',
      [id]
    );

    if (packages.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const package = packages[0];

    // Get services for this package
    const [packageServices] = await pool.execute(
      `SELECT 
        ps.*,
        s.name as service_name, s.description as service_description, s.base_price, s.image_url
       FROM package_services ps
       JOIN services s ON ps.service_id = s.id
       WHERE ps.package_id = ?`,
      [id]
    );

    package.services = packageServices;

    res.json({ package });

  } catch (error) {
    console.error('Get package error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create service package
router.post('/packages', [
  auth,
  authorize('admin', 'manager'),
  body('name').notEmpty().withMessage('Package name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('services').isArray().withMessage('Services array is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, price, validity_days = 365, services, image_url } = req.body;

    // Check if package name already exists
    const [existingPackages] = await pool.execute(
      'SELECT id FROM service_packages WHERE name = ?',
      [name]
    );

    if (existingPackages.length > 0) {
      return res.status(400).json({ error: 'Package with this name already exists' });
    }

    // Validate services
    for (const service of services) {
      if (!service.service_id) {
        return res.status(400).json({ error: 'Service ID is required for each service' });
      }
      
      const [serviceDetails] = await pool.execute(
        'SELECT id FROM services WHERE id = ?',
        [service.service_id]
      );

      if (serviceDetails.length === 0) {
        return res.status(400).json({ error: `Service with ID ${service.service_id} not found` });
      }
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create package with image_url
      const [packageResult] = await connection.execute(
        'INSERT INTO service_packages (name, description, price, validity_days, image_url) VALUES (?, ?, ?, ?, ?)',
        [name, description, price, validity_days, image_url || null]
      );

      const packageId = packageResult.insertId;

      // Add package services
      for (const service of services) {
        await connection.execute(
          'INSERT INTO package_services (package_id, service_id, quantity) VALUES (?, ?, ?)',
          [packageId, service.service_id, service.quantity || 1]
        );
      }

      await connection.commit();

      res.status(201).json({
        message: 'Service package created successfully',
        packageId
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update service package
router.put('/packages/:id', [
  auth,
  authorize('admin', 'manager'),
  body('name').notEmpty().withMessage('Package name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, price, validity_days, is_active, image_url, services } = req.body;

    // Check if package exists
    const [packages] = await pool.execute(
      'SELECT id FROM service_packages WHERE id = ?',
      [id]
    );

    if (packages.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Check if package name already exists with another package
    const [duplicatePackages] = await pool.execute(
      'SELECT id FROM service_packages WHERE name = ? AND id != ?',
      [name, id]
    );

    if (duplicatePackages.length > 0) {
      return res.status(400).json({ error: 'Package name already exists' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update package
      await connection.execute(
        'UPDATE service_packages SET name = ?, description = ?, price = ?, validity_days = ?, is_active = ?, image_url = ? WHERE id = ?',
        [name, description, price, validity_days || 365, is_active || 1, image_url || null, id]
      );

      // Update services if provided
      if (services && Array.isArray(services)) {
        // Validate services
        for (const service of services) {
          if (!service.service_id) {
            return res.status(400).json({ error: 'Service ID is required for each service' });
          }
          
          const [serviceDetails] = await connection.execute(
            'SELECT id FROM services WHERE id = ?',
            [service.service_id]
          );

          if (serviceDetails.length === 0) {
            return res.status(400).json({ error: `Service with ID ${service.service_id} not found` });
          }
        }

        // Remove existing package services
        await connection.execute('DELETE FROM package_services WHERE package_id = ?', [id]);

        // Add new package services
        for (const service of services) {
          await connection.execute(
            'INSERT INTO package_services (package_id, service_id, quantity) VALUES (?, ?, ?)',
            [id, service.service_id, service.quantity || 1]
          );
        }
      }

      await connection.commit();

      res.json({ message: 'Service package updated successfully' });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get package statistics
router.get('/packages/stats', auth, async (req, res) => {
  try {
    // Get package usage statistics
    const [packageStats] = await pool.execute(
      `SELECT 
        sp.name,
        sp.price,
        COUNT(DISTINCT sp.id) as package_count,
        COUNT(ps.service_id) as total_services_included
       FROM service_packages sp
       LEFT JOIN package_services ps ON sp.id = ps.package_id
       WHERE sp.is_active = 1
       GROUP BY sp.id
       ORDER BY sp.name`
    );

    // Get total packages count
    const [totalPackages] = await pool.execute(
      'SELECT COUNT(*) as total FROM service_packages WHERE is_active = 1'
    );

    res.json({
      packageStats,
      totalPackages: totalPackages[0].total
    });

  } catch (error) {
    console.error('Get package stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete service package
router.delete('/packages/:id', [auth, authorize('admin', 'manager')], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if package exists
    const [packages] = await pool.execute(
      'SELECT id FROM service_packages WHERE id = ?',
      [id]
    );

    if (packages.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Delete package services first
      await connection.execute('DELETE FROM package_services WHERE package_id = ?', [id]);
      
      // Delete the package
      await connection.execute('DELETE FROM service_packages WHERE id = ?', [id]);

      await connection.commit();

      res.json({ message: 'Service package deleted successfully' });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get service statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    // Get service usage statistics
    const [serviceStats] = await pool.execute(
      `SELECT 
        s.name,
        COUNT(bs.id) as usage_count,
        SUM(bs.quantity) as total_quantity,
        SUM(bs.price * bs.quantity) as total_revenue
       FROM services s
       LEFT JOIN booking_services bs ON s.id = bs.service_id
       LEFT JOIN bookings b ON bs.booking_id = b.id
       WHERE s.is_active = 1 AND (b.status = 'completed' OR b.status IS NULL)
       GROUP BY s.id
       ORDER BY usage_count DESC`
    );

    // Get category statistics
    const [categoryStats] = await pool.execute(
      `SELECT 
        sc.name,
        COUNT(s.id) as service_count,
        COUNT(bs.id) as usage_count
       FROM service_categories sc
       LEFT JOIN services s ON sc.id = s.category_id AND s.is_active = 1
       LEFT JOIN booking_services bs ON s.id = bs.service_id
       LEFT JOIN bookings b ON bs.booking_id = b.id AND b.status = 'completed'
       WHERE sc.is_active = 1
       GROUP BY sc.id
       ORDER BY usage_count DESC`
    );

    res.json({
      serviceStats,
      categoryStats
    });

  } catch (error) {
    console.error('Get service stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate service IDs (for debugging)
router.post('/validate', [auth, authorize('admin', 'manager')], async (req, res) => {
  try {
    const { service_ids } = req.body;
    
    if (!Array.isArray(service_ids)) {
      return res.status(400).json({ error: 'service_ids must be an array' });
    }

    const results = [];
    
    for (const serviceId of service_ids) {
      const [services] = await pool.execute(
        'SELECT id, name, base_price, is_active, category_id FROM services WHERE id = ?',
        [serviceId]
      );
      
      if (services.length === 0) {
        results.push({
          service_id: serviceId,
          exists: false,
          error: 'Service not found'
        });
      } else {
        const service = services[0];
        results.push({
          service_id: serviceId,
          exists: true,
          name: service.name,
          base_price: service.base_price,
          is_active: service.is_active === 1,
          category_id: service.category_id,
          error: service.is_active === 0 ? 'Service is inactive' : null
        });
      }
    }

    res.json({
      message: 'Service validation completed',
      results,
      summary: {
        total: service_ids.length,
        found: results.filter(r => r.exists).length,
        active: results.filter(r => r.exists && r.is_active).length,
        inactive: results.filter(r => r.exists && !r.is_active).length,
        not_found: results.filter(r => !r.exists).length
      }
    });

  } catch (error) {
    console.error('Service validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
