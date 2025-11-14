const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../database/config');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all job cards with filters
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      technician_id = '',
      date = '',
      search = ''
    } = req.query;
    
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        jc.*,
        b.booking_date, b.booking_time, b.total_amount,
        c.first_name, c.last_name, c.phone,
        v.vehicle_number, v.brand, v.model, v.vehicle_type,
        s.first_name as technician_first_name, s.last_name as technician_last_name
      FROM job_cards jc
      JOIN bookings b ON jc.booking_id = b.id
      JOIN customers c ON b.customer_id = c.id
      JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN staff s ON jc.assigned_technician_id = s.id
    `;

    const whereConditions = [];
    const params = [];

    if (status) {
      whereConditions.push('jc.status = ?');
      params.push(status);
    }

    if (technician_id) {
      whereConditions.push('jc.assigned_technician_id = ?');
      params.push(technician_id);
    }

    if (date) {
      whereConditions.push('DATE(b.booking_date) = ?');
      params.push(date);
    }

    if (search) {
      whereConditions.push('(c.first_name LIKE ? OR c.last_name LIKE ? OR c.phone LIKE ? OR v.vehicle_number LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' ORDER BY jc.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [jobCards] = await pool.execute(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM job_cards jc
      JOIN bookings b ON jc.booking_id = b.id
      JOIN customers c ON b.customer_id = c.id
      JOIN vehicles v ON b.vehicle_id = v.id
    `;

    if (whereConditions.length > 0) {
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
    }

    const [countResult] = await pool.execute(countQuery, params.slice(0, -2));

    res.json({
      jobCards,
      pagination: {
        current: parseInt(page),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get job cards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get job card by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get job card details
    const [jobCards] = await pool.execute(
      `SELECT 
        jc.*,
        b.booking_date, b.booking_time, b.total_amount, b.status as booking_status,
        c.first_name, c.last_name, c.phone, c.email,
        v.vehicle_number, v.brand, v.model, v.vehicle_type, v.color, v.year,
        s.first_name as technician_first_name, s.last_name as technician_last_name, s.phone as technician_phone
       FROM job_cards jc
       JOIN bookings b ON jc.booking_id = b.id
       JOIN customers c ON b.customer_id = c.id
       JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN staff s ON jc.assigned_technician_id = s.id
       WHERE jc.id = ?`,
      [id]
    );

    if (jobCards.length === 0) {
      return res.status(404).json({ error: 'Job card not found' });
    }

    // Get booking services
    const [bookingServices] = await pool.execute(
      `SELECT 
        bs.*,
        s.name as service_name, s.description as service_description
       FROM booking_services bs
       JOIN services s ON bs.service_id = s.id
       WHERE bs.booking_id = ?`,
      [jobCards[0].booking_id]
    );

    // Get job card photos
    const [photos] = await pool.execute(
      'SELECT * FROM job_card_photos WHERE job_card_id = ? ORDER BY uploaded_at DESC',
      [id]
    );

    res.json({
      jobCard: jobCards[0],
      services: bookingServices,
      photos
    });

  } catch (error) {
    console.error('Get job card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update job card status
router.put('/:id/status', [
  auth,
  authorize('admin', 'manager', 'technician'),
  body('status').isIn(['assigned', 'in_progress', 'qc_check', 'completed', 'delivered']).withMessage('Valid status is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    // Check if job card exists
    const [jobCards] = await pool.execute(
      'SELECT id, status, assigned_technician_id FROM job_cards WHERE id = ?',
      [id]
    );

    if (jobCards.length === 0) {
      return res.status(404).json({ error: 'Job card not found' });
    }

    // Check if technician is authorized to update this job card
    if (req.user.role === 'technician') {
      // Get the staff ID for the current user
      const [staff] = await pool.execute(
        'SELECT id FROM staff WHERE user_id = ?',
        [req.user.id]
      );
      
      if (staff.length === 0) {
        return res.status(403).json({ error: 'Staff record not found' });
      }
      
      const staffId = staff[0].id;
      
      if (jobCards[0].assigned_technician_id !== staffId) {
        return res.status(403).json({ error: 'Not authorized to update this job card' });
      }
    }

    // Update job card status
    let updateQuery = 'UPDATE job_cards SET status = ?';
    const updateParams = [status];

    if (status === 'in_progress' && jobCards[0].status === 'assigned') {
      updateQuery += ', start_time = NOW()';
    } else if (status === 'completed' && jobCards[0].status === 'qc_check') {
      updateQuery += ', end_time = NOW()';
    }

    if (notes) {
      updateQuery += ', notes = ?';
      updateParams.push(notes);
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(id);

    await pool.execute(updateQuery, updateParams);

    // Update booking status if job card is completed
    if (status === 'completed') {
      await pool.execute(
        'UPDATE bookings SET status = "completed" WHERE id = (SELECT booking_id FROM job_cards WHERE id = ?)',
        [id]
      );
    }

    res.json({ message: 'Job card status updated successfully' });

  } catch (error) {
    console.error('Update job card status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign technician to job card
router.put('/:id/assign', [
  auth,
  authorize('admin', 'manager'),
  body('technician_id').isInt().withMessage('Valid technician ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { technician_id } = req.body;

    // Check if job card exists
    const [jobCards] = await pool.execute(
      'SELECT id FROM job_cards WHERE id = ?',
      [id]
    );

    if (jobCards.length === 0) {
      return res.status(404).json({ error: 'Job card not found' });
    }

    // Check if technician exists and is active
    const [technicians] = await pool.execute(
      'SELECT id FROM staff WHERE id = ? AND position = "technician" AND is_active = 1',
      [technician_id]
    );

    if (technicians.length === 0) {
      return res.status(404).json({ error: 'Technician not found or inactive' });
    }

    // Assign technician
    await pool.execute(
      'UPDATE job_cards SET assigned_technician_id = ? WHERE id = ?',
      [technician_id, id]
    );

    res.json({ message: 'Technician assigned successfully' });

  } catch (error) {
    console.error('Assign technician error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload job card photo
router.post('/:id/photos', [
  auth,
  authorize('admin', 'manager', 'technician'),
  body('photo_type').isIn(['before', 'after', 'during']).withMessage('Valid photo type is required'),
  body('photo_url').notEmpty().withMessage('Photo URL is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { photo_type, photo_url } = req.body;

    // Check if job card exists
    const [jobCards] = await pool.execute(
      'SELECT id, assigned_technician_id FROM job_cards WHERE id = ?',
      [id]
    );

    if (jobCards.length === 0) {
      return res.status(404).json({ error: 'Job card not found' });
    }

    // Check if technician is authorized to upload photos for this job card
    if (req.user.role === 'technician') {
      // Get the staff ID for the current user
      const [staff] = await pool.execute(
        'SELECT id FROM staff WHERE user_id = ?',
        [req.user.id]
      );
      
      if (staff.length === 0) {
        return res.status(403).json({ error: 'Staff record not found' });
      }
      
      const staffId = staff[0].id;
      
      if (jobCards[0].assigned_technician_id !== staffId) {
        return res.status(403).json({ error: 'Not authorized to upload photos for this job card' });
      }
    }

    // Add photo record
    const [result] = await pool.execute(
      'INSERT INTO job_card_photos (job_card_id, photo_type, photo_url) VALUES (?, ?, ?)',
      [id, photo_type, photo_url]
    );

    res.status(201).json({
      message: 'Photo uploaded successfully',
      photoId: result.insertId
    });

  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get job card statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateFilter = '';
    if (period === 'week') {
      dateFilter = 'AND jc.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateFilter = 'AND jc.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } else if (period === 'year') {
      dateFilter = 'AND jc.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
    }

    // Get job card statistics
    const [jobCardStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_job_cards,
        SUM(CASE WHEN jc.status = 'assigned' THEN 1 ELSE 0 END) as assigned_jobs,
        SUM(CASE WHEN jc.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_jobs,
        SUM(CASE WHEN jc.status = 'qc_check' THEN 1 ELSE 0 END) as qc_check_jobs,
        SUM(CASE WHEN jc.status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
        SUM(CASE WHEN jc.status = 'delivered' THEN 1 ELSE 0 END) as delivered_jobs,
        AVG(TIMESTAMPDIFF(MINUTE, jc.start_time, jc.end_time)) as avg_completion_time
       FROM job_cards jc
       WHERE 1=1 ${dateFilter}`
    );

    // Get today's job cards
    const [todayJobCards] = await pool.execute(
      `SELECT COUNT(*) as today_jobs, 
              SUM(CASE WHEN jc.status = 'completed' THEN 1 ELSE 0 END) as today_completed
       FROM job_cards jc
       WHERE DATE(jc.created_at) = CURDATE()`
    );

    // Get technician workload
    const [technicianWorkload] = await pool.execute(
      `SELECT 
        s.first_name, s.last_name,
        COUNT(jc.id) as total_jobs,
        SUM(CASE WHEN jc.status = 'completed' THEN 1 ELSE 0 END) as completed_jobs
       FROM staff s
       LEFT JOIN job_cards jc ON s.id = jc.assigned_technician_id ${dateFilter}
       WHERE s.position = 'technician' AND s.is_active = 1
       GROUP BY s.id
       ORDER BY total_jobs DESC`
    );

    res.json({
      stats: {
        totalJobCards: jobCardStats[0].total_job_cards || 0,
        assignedJobs: jobCardStats[0].assigned_jobs || 0,
        inProgressJobs: jobCardStats[0].in_progress_jobs || 0,
        qcCheckJobs: jobCardStats[0].qc_check_jobs || 0,
        completedJobs: jobCardStats[0].completed_jobs || 0,
        deliveredJobs: jobCardStats[0].delivered_jobs || 0,
        avgCompletionTime: jobCardStats[0].avg_completion_time || 0,
        todayJobs: todayJobCards[0].today_jobs || 0,
        todayCompleted: todayJobCards[0].today_completed || 0
      },
      technicianWorkload
    });

  } catch (error) {
    console.error('Get job card stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get job cards by technician
router.get('/technician/:technicianId', auth, async (req, res) => {
  try {
    const { technicianId } = req.params;
    const { status = '' } = req.query;

    let query = `
      SELECT 
        jc.*,
        b.booking_date, b.booking_time,
        c.first_name, c.last_name, c.phone,
        v.vehicle_number, v.brand, v.model
       FROM job_cards jc
       JOIN bookings b ON jc.booking_id = b.id
       JOIN customers c ON b.customer_id = c.id
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE jc.assigned_technician_id = ?
    `;

    const params = [technicianId];

    if (status) {
      query += ' AND jc.status = ?';
      params.push(status);
    }

    query += ' ORDER BY jc.created_at DESC';

    const [jobCards] = await pool.execute(query, params);

    res.json({ jobCards });

  } catch (error) {
    console.error('Get technician job cards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
