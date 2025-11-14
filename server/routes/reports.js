const express = require('express');
const { pool } = require('../database/config');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get dashboard overview
router.get('/dashboard', auth, async (req, res) => {
  try {
    // Today's statistics
    const [todayStats] = await pool.execute(
      `SELECT 
        COUNT(DISTINCT b.id) as today_bookings,
        SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as today_completed,
        SUM(b.total_amount) as today_revenue,
        COUNT(DISTINCT jc.id) as today_job_cards,
        SUM(CASE WHEN jc.status = 'completed' THEN 1 ELSE 0 END) as today_jobs_completed
       FROM bookings b
       LEFT JOIN job_cards jc ON b.id = jc.booking_id
       WHERE DATE(b.booking_date) = CURDATE()`
    );

    // This month's statistics
    const [monthStats] = await pool.execute(
      `SELECT 
        COUNT(DISTINCT b.id) as month_bookings,
        SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as month_completed,
        SUM(b.total_amount) as month_revenue,
        AVG(b.total_amount) as avg_booking_value
       FROM bookings b
       WHERE MONTH(b.booking_date) = MONTH(CURDATE()) AND YEAR(b.booking_date) = YEAR(CURDATE())`
    );

    // Pending bookings
    const [pendingBookings] = await pool.execute(
      `SELECT COUNT(*) as pending_count
       FROM bookings 
       WHERE status IN ('pending', 'confirmed', 'in_progress')`
    );

    // Low stock alerts
    const [lowStockCount] = await pool.execute(
      `SELECT COUNT(*) as low_stock_count
       FROM inventory_items 
       WHERE current_stock <= min_stock_level AND is_active = 1`
    );

    // Recent bookings with service names
    const [recentBookings] = await pool.execute(
      `SELECT 
        b.id, b.booking_date, b.booking_time, b.status, b.total_amount,
        c.first_name, c.last_name, c.phone,
        v.vehicle_number, v.brand, v.model,
        GROUP_CONCAT(s.name SEPARATOR ', ') as service_names
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN booking_services bs ON b.id = bs.booking_id
       LEFT JOIN services s ON bs.service_id = s.id
       GROUP BY b.id
       ORDER BY b.created_at DESC
       LIMIT 5`
    );

    // Top services
    const [topServices] = await pool.execute(
      `SELECT 
        s.name,
        COUNT(bs.id) as usage_count,
        SUM(bs.price * bs.quantity) as total_revenue
       FROM services s
       LEFT JOIN booking_services bs ON s.id = bs.service_id
       LEFT JOIN bookings b ON bs.booking_id = b.id AND b.status = 'completed'
       WHERE s.is_active = 1
       GROUP BY s.id
       ORDER BY usage_count DESC
       LIMIT 5`
    );

    // Get total customers count
    const [totalCustomers] = await pool.execute(
      'SELECT COUNT(*) as total_customers FROM customers'
    );

    // Get pending jobs count
    const [pendingJobs] = await pool.execute(
      'SELECT COUNT(*) as pending_jobs FROM job_cards WHERE status IN ("assigned", "in_progress", "qc_check")'
    );

    // Get low stock items
    const [lowStockItems] = await pool.execute(
      `SELECT name, current_stock, min_stock_level, unit
       FROM inventory_items 
       WHERE current_stock <= min_stock_level AND is_active = 1
       LIMIT 5`
    );

    // Format recent bookings for frontend
    const formattedRecentBookings = recentBookings.map(booking => ({
      customer_name: `${booking.first_name} ${booking.last_name}`,
      service_name: booking.service_names || 'Car Detailing Service',
      vehicle_model: `${booking.brand} ${booking.model}`,
      status: booking.status,
      booking_date: booking.booking_date,
      total_amount: booking.total_amount
    }));

    // Generate sample revenue data (you can replace this with actual data)
    const revenueData = [
      { month: 'Jan', revenue: 45000 },
      { month: 'Feb', revenue: 52000 },
      { month: 'Mar', revenue: 48000 },
      { month: 'Apr', revenue: 61000 },
      { month: 'May', revenue: 55000 },
      { month: 'Jun', revenue: 67000 }
    ];

    // Generate sample service distribution data
    const serviceDistribution = topServices.map(service => ({
      name: service.name,
      value: service.usage_count || 0
    }));

    res.json({
      today: {
        bookings: todayStats[0].today_bookings || 0,
        revenue: todayStats[0].today_revenue || 0
      },
      total: {
        customers: totalCustomers[0].total_customers || 0
      },
      pending: {
        jobs: pendingJobs[0].pending_jobs || 0
      },
      recentBookings: formattedRecentBookings,
      lowStock: lowStockItems,
      revenueData,
      serviceDistribution
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get revenue report
router.get('/revenue', auth, async (req, res) => {
  try {
    const { period = 'month', start_date, end_date } = req.query;

    let dateFilter = '';
    let groupBy = '';

    if (start_date && end_date) {
      dateFilter = `WHERE b.booking_date BETWEEN '${start_date}' AND '${end_date}'`;
      groupBy = 'GROUP BY DATE(b.booking_date) ORDER BY DATE(b.booking_date)';
    } else {
      switch (period) {
        case 'week':
          dateFilter = 'WHERE b.booking_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
          groupBy = 'GROUP BY DATE(b.booking_date) ORDER BY DATE(b.booking_date)';
          break;
        case 'month':
          dateFilter = 'WHERE b.booking_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
          groupBy = 'GROUP BY DATE(b.booking_date) ORDER BY DATE(b.booking_date)';
          break;
        case 'year':
          dateFilter = 'WHERE YEAR(b.booking_date) = YEAR(CURDATE())';
          groupBy = 'GROUP BY MONTH(b.booking_date) ORDER BY MONTH(b.booking_date)';
          break;
      }
    }

    const [revenueData] = await pool.execute(
      `SELECT 
        ${period === 'year' ? 'MONTH(b.booking_date) as period' : 'DATE(b.booking_date) as period'},
        COUNT(b.id) as bookings,
        SUM(b.total_amount) as revenue,
        AVG(b.total_amount) as avg_booking_value
       FROM bookings b
       ${dateFilter}
       ${groupBy}`
    );

    // Get revenue by service category
    const [categoryRevenue] = await pool.execute(
      `SELECT 
        sc.name as category,
        COUNT(bs.id) as bookings,
        SUM(bs.price * bs.quantity) as revenue
       FROM service_categories sc
       LEFT JOIN services s ON sc.id = s.category_id
       LEFT JOIN booking_services bs ON s.id = bs.service_id
       LEFT JOIN bookings b ON bs.booking_id = b.id AND b.status = 'completed'
       ${dateFilter.replace('b.booking_date', 'b.booking_date')}
       GROUP BY sc.id
       ORDER BY revenue DESC`
    );

    res.json({
      revenueData,
      categoryRevenue
    });

  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer analytics
router.get('/customers', auth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let dateFilter = '';
    if (period === 'week') {
      dateFilter = 'AND c.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateFilter = 'AND c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } else if (period === 'year') {
      dateFilter = 'AND c.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
    }

    // Customer statistics
    const [customerStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN loyalty_points > 0 THEN 1 END) as loyalty_customers,
        AVG(total_spent) as avg_customer_spend,
        SUM(total_spent) as total_customer_spend
       FROM customers c
       WHERE 1=1 ${dateFilter}`
    );

    // Top customers
    const [topCustomers] = await pool.execute(
      `SELECT 
        c.first_name, c.last_name, c.phone, c.email,
        COUNT(b.id) as total_bookings,
        SUM(b.total_amount) as total_spent,
        c.loyalty_points
       FROM customers c
       LEFT JOIN bookings b ON c.id = b.customer_id AND b.status = 'completed'
       GROUP BY c.id
       ORDER BY total_spent DESC
       LIMIT 10`
    );

    // Customer growth
    const [customerGrowth] = await pool.execute(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_customers
       FROM customers
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date`
    );

    // Vehicle type distribution
    const [vehicleDistribution] = await pool.execute(
      `SELECT 
        vehicle_type,
        COUNT(*) as count
       FROM vehicles
       GROUP BY vehicle_type
       ORDER BY count DESC`
    );

    res.json({
      stats: {
        totalCustomers: customerStats[0].total_customers || 0,
        loyaltyCustomers: customerStats[0].loyalty_customers || 0,
        avgCustomerSpend: customerStats[0].avg_customer_spend || 0,
        totalCustomerSpend: customerStats[0].total_customer_spend || 0
      },
      topCustomers,
      customerGrowth,
      vehicleDistribution
    });

  } catch (error) {
    console.error('Get customer analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get staff performance report
router.get('/staff-performance', auth, async (req, res) => {
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

    // Staff performance statistics
    const [staffPerformance] = await pool.execute(
      `SELECT 
        s.first_name, s.last_name, s.position,
        COUNT(jc.id) as total_jobs,
        SUM(CASE WHEN jc.status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
        AVG(TIMESTAMPDIFF(MINUTE, jc.start_time, jc.end_time)) as avg_completion_time,
        (SUM(CASE WHEN jc.status = 'completed' THEN 1 ELSE 0 END) / COUNT(jc.id) * 100) as completion_rate
       FROM staff s
       LEFT JOIN job_cards jc ON s.id = jc.assigned_technician_id ${dateFilter}
       WHERE s.position = 'technician' AND s.is_active = 1
       GROUP BY s.id
       ORDER BY completed_jobs DESC`
    );

    // Technician workload
    const [technicianWorkload] = await pool.execute(
      `SELECT 
        s.first_name, s.last_name,
        COUNT(jc.id) as active_jobs,
        COUNT(CASE WHEN jc.status = 'in_progress' THEN 1 END) as in_progress_jobs
       FROM staff s
       LEFT JOIN job_cards jc ON s.id = jc.assigned_technician_id AND jc.status IN ('assigned', 'in_progress')
       WHERE s.position = 'technician' AND s.is_active = 1
       GROUP BY s.id
       ORDER BY active_jobs DESC`
    );

    res.json({
      staffPerformance,
      technicianWorkload
    });

  } catch (error) {
    console.error('Get staff performance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inventory report
router.get('/inventory', auth, async (req, res) => {
  try {
    // Inventory overview
    const [inventoryOverview] = await pool.execute(
      `SELECT 
        COUNT(*) as total_items,
        SUM(current_stock) as total_stock,
        SUM(current_stock * IFNULL(cost_per_unit, 0)) as total_value,
        COUNT(CASE WHEN current_stock <= min_stock_level THEN 1 END) as low_stock_items
       FROM inventory_items
       WHERE is_active = 1`
    );

    // Category breakdown
    const [categoryBreakdown] = await pool.execute(
      `SELECT 
        category,
        COUNT(*) as item_count,
        SUM(current_stock) as total_stock,
        SUM(current_stock * IFNULL(cost_per_unit, 0)) as category_value
       FROM inventory_items
       WHERE is_active = 1 AND category IS NOT NULL
       GROUP BY category
       ORDER BY category_value DESC`
    );

    // Low stock items
    const [lowStockItems] = await pool.execute(
      `SELECT 
        name, category, current_stock, min_stock_level, unit
       FROM inventory_items
       WHERE current_stock <= min_stock_level AND is_active = 1
       ORDER BY (min_stock_level - current_stock) DESC`
    );

    // Recent transactions
    const [recentTransactions] = await pool.execute(
      `SELECT 
        it.*,
        ii.name as item_name
       FROM inventory_transactions it
       JOIN inventory_items ii ON it.item_id = ii.id
       ORDER BY it.transaction_date DESC
       LIMIT 20`
    );

    res.json({
      overview: {
        totalItems: inventoryOverview[0].total_items || 0,
        totalStock: inventoryOverview[0].total_stock || 0,
        totalValue: inventoryOverview[0].total_value || 0,
        lowStockItems: inventoryOverview[0].low_stock_items || 0
      },
      categoryBreakdown,
      lowStockItems,
      recentTransactions
    });

  } catch (error) {
    console.error('Get inventory report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get service analytics
router.get('/services', auth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let dateFilter = '';
    if (period === 'week') {
      dateFilter = 'AND b.booking_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateFilter = 'AND b.booking_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    } else if (period === 'year') {
      dateFilter = 'AND b.booking_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
    }

    // Service performance
    const [servicePerformance] = await pool.execute(
      `SELECT 
        s.name, s.description,
        COUNT(bs.id) as usage_count,
        SUM(bs.quantity) as total_quantity,
        SUM(bs.price * bs.quantity) as total_revenue,
        AVG(bs.price) as avg_price
       FROM services s
       LEFT JOIN booking_services bs ON s.id = bs.service_id
       LEFT JOIN bookings b ON bs.booking_id = b.id AND b.status = 'completed' ${dateFilter}
       WHERE s.is_active = 1
       GROUP BY s.id
       ORDER BY total_revenue DESC`
    );

    // Service category performance
    const [categoryPerformance] = await pool.execute(
      `SELECT 
        sc.name as category,
        COUNT(bs.id) as total_bookings,
        SUM(bs.price * bs.quantity) as total_revenue,
        AVG(bs.price) as avg_price
       FROM service_categories sc
       LEFT JOIN services s ON sc.id = s.category_id
       LEFT JOIN booking_services bs ON s.id = bs.service_id
       LEFT JOIN bookings b ON bs.booking_id = b.id AND b.status = 'completed' ${dateFilter}
       WHERE sc.is_active = 1
       GROUP BY sc.id
       ORDER BY total_revenue DESC`
    );

    // Popular service combinations
    const [serviceCombinations] = await pool.execute(
      `SELECT 
        GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ' + ') as service_combination,
        COUNT(*) as booking_count,
        AVG(b.total_amount) as avg_booking_value
       FROM bookings b
       JOIN booking_services bs ON b.id = bs.booking_id
       JOIN services s ON bs.service_id = s.id
       WHERE b.status = 'completed' ${dateFilter}
       GROUP BY b.id
       HAVING COUNT(*) > 1
       ORDER BY booking_count DESC
       LIMIT 10`
    );

    res.json({
      servicePerformance,
      categoryPerformance,
      serviceCombinations
    });

  } catch (error) {
    console.error('Get service analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
