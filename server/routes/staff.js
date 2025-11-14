const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../database/config');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all staff members
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', position = '', is_active = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        s.*,
        u.username, u.email, u.role
      FROM staff s
      JOIN users u ON s.user_id = u.id
    `;

    const whereConditions = [];
    const params = [];

    if (search) {
      whereConditions.push('(s.first_name LIKE ? OR s.last_name LIKE ? OR s.phone LIKE ? OR s.email LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (position) {
      whereConditions.push('s.position = ?');
      params.push(position);
    }

    if (is_active !== '') {
      whereConditions.push('s.is_active = ?');
      params.push(is_active === 'true' ? 1 : 0);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' ORDER BY s.first_name, s.last_name LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [staff] = await pool.execute(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM staff s
      JOIN users u ON s.user_id = u.id
    `;

    if (whereConditions.length > 0) {
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
    }

    const [countResult] = await pool.execute(countQuery, params.slice(0, -2));

    res.json({
      staff,
      pagination: {
        current: parseInt(page),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get staff member by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const [staff] = await pool.execute(
      `SELECT 
        s.*,
        u.username, u.email, u.role
       FROM staff s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [id]
    );

    if (staff.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Get assigned job cards
    const [jobCards] = await pool.execute(
      `SELECT 
        jc.*,
        b.booking_date, b.booking_time,
        c.first_name, c.last_name, c.phone,
        v.vehicle_number, v.brand, v.model
       FROM job_cards jc
       JOIN bookings b ON jc.booking_id = b.id
       JOIN customers c ON b.customer_id = c.id
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE jc.assigned_technician_id = ?
       ORDER BY jc.created_at DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      staff: staff[0],
      recentJobCards: jobCards
    });

  } catch (error) {
    console.error('Get staff member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create staff member with user account in single transaction
router.post('/', [
  auth,
  authorize('admin', 'manager'),
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['technician', 'manager', 'admin', 'customer_service']).withMessage('Valid role is required'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('hire_date').notEmpty().withMessage('Hire date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      username, email, password, role,
      first_name, last_name, phone, position, hire_date, salary 
    } = req.body;

    // Auto-sync role with position if role is not provided
    const finalRole = role || position;

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check if username already exists
      const [existingUsername] = await connection.execute(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (existingUsername.length > 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Check if email already exists
      const [existingEmail] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingEmail.length > 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: 'Email already exists' });
      }

      // Check if phone already exists in staff
      const [duplicatePhone] = await connection.execute(
        'SELECT id FROM staff WHERE phone = ?',
        [phone]
      );

      if (duplicatePhone.length > 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: 'Phone number already exists' });
      }

      // Hash password
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user account
      const [userResult] = await connection.execute(
        'INSERT INTO users (username, email, password, role, is_active) VALUES (?, ?, ?, ?, 1)',
        [username, email, hashedPassword, finalRole]
      );

      const userId = userResult.insertId;

      // Create staff member
      const [staffResult] = await connection.execute(
        `INSERT INTO staff (user_id, first_name, last_name, email, phone, position, hire_date, salary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, first_name, last_name, email, phone, position, hire_date, salary]
      );

      // Commit transaction
      await connection.commit();
      connection.release();

      res.status(201).json({
        message: 'Staff member created successfully with user account',
        staffId: staffResult.insertId,
        userId: userId,
        username,
        email,
        role: finalRole,
        firstName: first_name,
        lastName: last_name,
        position
      });

    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Create staff with user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Update staff member
router.put('/:id', [
  auth,
  authorize('admin', 'manager'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('position').notEmpty().withMessage('Position is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { first_name, last_name, email, phone, position, hire_date, salary, is_active, role } = req.body;

    // Auto-sync role with position if role is not provided
    const finalRole = role || position;

    // Check if staff member exists and get user_id
    const [staff] = await pool.execute(
      'SELECT id, user_id FROM staff WHERE id = ?',
      [id]
    );

    if (staff.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const userId = staff[0].user_id;

    // Check if phone/email already exists with another staff member
    if (email) {
      const [duplicateEmail] = await pool.execute(
        'SELECT id FROM staff WHERE email = ? AND id != ?',
        [email, id]
      );

      if (duplicateEmail.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    const [duplicatePhone] = await pool.execute(
      'SELECT id FROM staff WHERE phone = ? AND id != ?',
      [phone, id]
    );

    if (duplicatePhone.length > 0) {
      return res.status(400).json({ error: 'Phone number already exists' });
    }

    // Update staff member
    await pool.execute(
      `UPDATE staff 
       SET first_name = ?, last_name = ?, email = ?, phone = ?, position = ?, hire_date = ?, salary = ?, is_active = ?
       WHERE id = ?`,
      [first_name, last_name, email, phone, position, hire_date, salary, is_active, id]
    );

    // Update user role if provided
    if (finalRole) {
      await pool.execute(
        'UPDATE users SET role = ? WHERE id = ?',
        [finalRole, userId]
      );
    }

    res.json({ message: 'Staff member updated successfully' });

  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available technicians
router.get('/technicians/available', auth, async (req, res) => {
  try {
    const [technicians] = await pool.execute(
      `SELECT 
        s.id, s.first_name, s.last_name, s.phone,
        COUNT(jc.id) as active_jobs
       FROM staff s
       LEFT JOIN job_cards jc ON s.id = jc.assigned_technician_id AND jc.status IN ('assigned', 'in_progress')
       WHERE s.position = 'technician' AND s.is_active = 1
       GROUP BY s.id
       ORDER BY active_jobs ASC, s.first_name`
    );

    res.json({ technicians });

  } catch (error) {
    console.error('Get available technicians error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available users for staff creation (users who don't have staff records)
router.get('/available-users', auth, async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT u.id, u.username, u.email, u.role, u.is_active
       FROM users u
       LEFT JOIN staff s ON u.id = s.user_id
       WHERE s.user_id IS NULL AND u.is_active = 1
       ORDER BY u.username`
    );

    res.json({ users });
  } catch (error) {
    console.error('Get available users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign technician to job card
router.post('/:id/assign-job', [
  auth,
  authorize('admin', 'manager'),
  body('job_card_id').isInt().withMessage('Valid job card ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { job_card_id } = req.body;

    // Check if staff member exists and is a technician
    const [staff] = await pool.execute(
      'SELECT id, position FROM staff WHERE id = ? AND is_active = 1',
      [id]
    );

    if (staff.length === 0) {
      return res.status(404).json({ error: 'Staff member not found or inactive' });
    }

    if (staff[0].position !== 'technician') {
      return res.status(400).json({ error: 'Only technicians can be assigned to job cards' });
    }

    // Check if job card exists and is not already assigned
    const [jobCards] = await pool.execute(
      'SELECT id, assigned_technician_id FROM job_cards WHERE id = ?',
      [job_card_id]
    );

    if (jobCards.length === 0) {
      return res.status(404).json({ error: 'Job card not found' });
    }

    if (jobCards[0].assigned_technician_id) {
      return res.status(400).json({ error: 'Job card is already assigned to a technician' });
    }

    // Assign technician to job card
    await pool.execute(
      'UPDATE job_cards SET assigned_technician_id = ? WHERE id = ?',
      [id, job_card_id]
    );

    res.json({ message: 'Technician assigned to job card successfully' });

  } catch (error) {
    console.error('Assign technician error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get staff performance statistics
router.get('/:id/performance', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = 'month' } = req.query;

    // Check authorization: technicians can only view their own performance
    if (req.user.role === 'technician') {
      // Get the staff ID for the current user
      const [currentStaff] = await pool.execute(
        'SELECT id FROM staff WHERE user_id = ?',
        [req.user.id]
      );
      
      if (currentStaff.length === 0) {
        return res.status(403).json({ error: 'Staff record not found' });
      }
      
      const currentStaffId = currentStaff[0].id;
      
      if (parseInt(id) !== currentStaffId) {
        return res.status(403).json({ error: 'Not authorized to view other staff performance' });
      }
    }

    let dateFilter = '';
    if (period === 'week') {
      dateFilter = 'AND jc.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateFilter = 'AND jc.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } else if (period === 'year') {
      dateFilter = 'AND jc.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
    }

    // Get job completion statistics
    const [jobStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN jc.status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
        SUM(CASE WHEN jc.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_jobs,
        AVG(TIMESTAMPDIFF(MINUTE, jc.start_time, jc.end_time)) as avg_completion_time
       FROM job_cards jc
       WHERE jc.assigned_technician_id = ? ${dateFilter}`,
      [id]
    );

    // Get recent job history
    const [recentJobs] = await pool.execute(
      `SELECT 
        jc.*,
        b.booking_date, b.booking_time,
        c.first_name, c.last_name,
        v.vehicle_number, v.brand, v.model
       FROM job_cards jc
       JOIN bookings b ON jc.booking_id = b.id
       JOIN customers c ON b.customer_id = c.id
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE jc.assigned_technician_id = ?
       ORDER BY jc.created_at DESC
       LIMIT 20`,
      [id]
    );

    res.json({
      performance: {
        totalJobs: jobStats[0].total_jobs || 0,
        completedJobs: jobStats[0].completed_jobs || 0,
        inProgressJobs: jobStats[0].in_progress_jobs || 0,
        completionRate: jobStats[0].total_jobs > 0 ? (jobStats[0].completed_jobs / jobStats[0].total_jobs * 100).toFixed(2) : 0,
        avgCompletionTime: jobStats[0].avg_completion_time || 0
      },
      recentJobs
    });

  } catch (error) {
    console.error('Get staff performance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get staff statistics overview
router.get('/stats/overview', auth, async (req, res) => {
  try {
    // Get staff count by position
    const [positionStats] = await pool.execute(
      `SELECT 
        position,
        COUNT(*) as count,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count
       FROM staff
       GROUP BY position
       ORDER BY count DESC`
    );

    // Get total staff count
    const [totalStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_staff,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_staff
       FROM staff`
    );

    // Get technician workload
    const [technicianWorkload] = await pool.execute(
      `SELECT 
        s.first_name, s.last_name,
        COUNT(jc.id) as active_jobs
       FROM staff s
       LEFT JOIN job_cards jc ON s.id = jc.assigned_technician_id AND jc.status IN ('assigned', 'in_progress')
       WHERE s.position = 'technician' AND s.is_active = 1
       GROUP BY s.id
       ORDER BY active_jobs DESC`
    );

    res.json({
      stats: {
        totalStaff: totalStats[0].total_staff || 0,
        activeStaff: totalStats[0].active_staff || 0
      },
      positionStats,
      technicianWorkload
    });

  } catch (error) {
    console.error('Get staff stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get job cards assigned to staff member
router.get('/:id/job-cards', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify staff member exists
    const [staff] = await pool.execute(
      'SELECT id, first_name, last_name FROM staff WHERE id = ?',
      [id]
    );

    if (staff.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Check authorization: technicians can only view their own job cards
    if (req.user.role === 'technician') {
      // Get the staff ID for the current user
      const [currentStaff] = await pool.execute(
        'SELECT id FROM staff WHERE user_id = ?',
        [req.user.id]
      );
      
      if (currentStaff.length === 0) {
        return res.status(403).json({ error: 'Staff record not found' });
      }
      
      const currentStaffId = currentStaff[0].id;
      
      if (parseInt(id) !== currentStaffId) {
        return res.status(403).json({ error: 'Not authorized to view other staff job cards' });
      }
    }

    // Get assigned job cards with customer and vehicle details
    const [jobCards] = await pool.execute(
      `SELECT 
        jc.*,
        b.booking_date, b.booking_time, b.total_amount, b.notes as booking_notes,
        c.first_name, c.last_name, c.phone,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        v.vehicle_number, v.brand, v.model, v.color,
        CONCAT(v.brand, ' ', v.model) as vehicle_brand_model
       FROM job_cards jc
       JOIN bookings b ON jc.booking_id = b.id
       JOIN customers c ON b.customer_id = c.id
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE jc.assigned_technician_id = ?
       ORDER BY jc.created_at DESC`,
      [id]
    );

    // Get services for each job card
    for (let jobCard of jobCards) {
      const [services] = await pool.execute(
        `SELECT 
          bs.service_id, bs.quantity, bs.price,
          s.name as service_name
         FROM booking_services bs
         JOIN services s ON bs.service_id = s.id
         WHERE bs.booking_id = ?`,
        [jobCard.booking_id]
      );
      jobCard.services = services;
    }

    res.json({ jobCards });

  } catch (error) {
    console.error('Get staff job cards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Safe delete staff member (handles foreign key constraints)
router.delete('/:id/safe-delete', [
  auth,
  authorize('admin', 'manager')
], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if staff member exists
    const [staff] = await pool.execute(
      'SELECT id, first_name, last_name FROM staff WHERE id = ?',
      [id]
    );

    if (staff.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const staffMember = staff[0];

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Delete job card photos for job cards assigned to this staff member
      await connection.execute(
        `DELETE jcp FROM job_card_photos jcp
         INNER JOIN job_cards jc ON jcp.job_card_id = jc.id
         WHERE jc.assigned_technician_id = ?`,
        [id]
      );

      // 2. Delete job cards assigned to this staff member
      await connection.execute(
        'DELETE FROM job_cards WHERE assigned_technician_id = ?',
        [id]
      );

      // 3. Delete the staff member
      await connection.execute(
        'DELETE FROM staff WHERE id = ?',
        [id]
      );

      // 4. Optionally delete the associated user account (you can comment this out if you want to keep the user account)
      const [userResult] = await connection.execute(
        'SELECT user_id FROM staff WHERE id = ?',
        [id]
      );

      if (userResult.length > 0) {
        const userId = userResult[0].user_id;
        await connection.execute(
          'DELETE FROM users WHERE id = ?',
          [userId]
        );
      }

      // Commit transaction
      await connection.commit();
      connection.release();

      res.json({
        message: `Staff member ${staffMember.first_name} ${staffMember.last_name} deleted successfully`,
        deletedStaffId: id,
        deletedJobCards: 'All assigned job cards and related data have been removed'
      });

    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Safe delete staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
