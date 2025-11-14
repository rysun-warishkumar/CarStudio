const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../database/config');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all inventory items
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', low_stock = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM inventory_items WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ? OR category LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (low_stock === 'true') {
      query += ' AND current_stock <= min_stock_level';
    }

    query += ' ORDER BY name LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [items] = await pool.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM inventory_items WHERE 1=1';
    if (search) {
      countQuery += ' AND (name LIKE ? OR description LIKE ? OR category LIKE ?)';
    }
    if (low_stock === 'true') {
      countQuery += ' AND current_stock <= min_stock_level';
    }

    const [countResult] = await pool.execute(countQuery, search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []);

    res.json({
      items,
      pagination: {
        current: parseInt(page),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inventory item by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const [items] = await pool.execute(
      'SELECT * FROM inventory_items WHERE id = ?',
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Get recent transactions
    const [transactions] = await pool.execute(
      'SELECT * FROM inventory_transactions WHERE item_id = ? ORDER BY transaction_date DESC LIMIT 10',
      [id]
    );

    res.json({
      item: items[0],
      recentTransactions: transactions
    });

  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create inventory item
router.post('/', [
  auth,
  authorize('admin', 'manager'),
  body('name').notEmpty().withMessage('Item name is required'),
  body('current_stock').isInt({ min: 0 }).withMessage('Valid current stock is required'),
  body('min_stock_level').isInt({ min: 0 }).withMessage('Valid minimum stock level is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, category, unit, current_stock, min_stock_level, cost_per_unit, supplier } = req.body;

    // Check if item already exists
    const [existingItems] = await pool.execute(
      'SELECT id FROM inventory_items WHERE name = ?',
      [name]
    );

    if (existingItems.length > 0) {
      return res.status(400).json({ error: 'Item with this name already exists' });
    }

    const [result] = await pool.execute(
      `INSERT INTO inventory_items (name, description, category, unit, current_stock, min_stock_level, cost_per_unit, supplier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, category, unit || 'pieces', current_stock, min_stock_level, cost_per_unit, supplier]
    );

    // Add initial stock transaction
    if (current_stock > 0) {
      await pool.execute(
        'INSERT INTO inventory_transactions (item_id, transaction_type, quantity, reference_type, notes) VALUES (?, "in", ?, "adjustment", "Initial stock")',
        [result.insertId, current_stock]
      );
    }

    res.status(201).json({
      message: 'Inventory item created successfully',
      itemId: result.insertId
    });

  } catch (error) {
    console.error('Create inventory item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update inventory item
router.put('/:id', [
  auth,
  authorize('admin', 'manager'),
  body('name').notEmpty().withMessage('Item name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, category, unit, min_stock_level, cost_per_unit, supplier, is_active } = req.body;

    // Check if item exists
    const [items] = await pool.execute(
      'SELECT id FROM inventory_items WHERE id = ?',
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Check if name already exists with another item
    const [duplicateItems] = await pool.execute(
      'SELECT id FROM inventory_items WHERE name = ? AND id != ?',
      [name, id]
    );

    if (duplicateItems.length > 0) {
      return res.status(400).json({ error: 'Item name already exists' });
    }

    await pool.execute(
      `UPDATE inventory_items 
       SET name = ?, description = ?, category = ?, unit = ?, min_stock_level = ?, cost_per_unit = ?, supplier = ?, is_active = ?
       WHERE id = ?`,
      [name, description, category, unit, min_stock_level, cost_per_unit, supplier, is_active, id]
    );

    res.json({ message: 'Inventory item updated successfully' });

  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add stock (in transaction)
router.post('/:id/add-stock', [
  auth,
  authorize('admin', 'manager'),
  body('quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { quantity, notes } = req.body;

    // Check if item exists
    const [items] = await pool.execute(
      'SELECT id, current_stock FROM inventory_items WHERE id = ?',
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update current stock
      await connection.execute(
        'UPDATE inventory_items SET current_stock = current_stock + ? WHERE id = ?',
        [quantity, id]
      );

      // Add transaction record
      await connection.execute(
        'INSERT INTO inventory_transactions (item_id, transaction_type, quantity, reference_type, reference_id, notes) VALUES (?, "in", ?, "purchase", ?, ?)',
        [id, quantity, null, notes || 'Stock added']
      );

      await connection.commit();

      res.json({ message: 'Stock added successfully' });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Add stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove stock (out transaction)
router.post('/:id/remove-stock', [
  auth,
  authorize('admin', 'manager'),
  body('quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
  body('reference_type').isIn(['usage', 'adjustment']).withMessage('Valid reference type is required'),
  body('reference_id').optional().isInt().withMessage('Reference ID must be an integer'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { quantity, reference_type, reference_id, notes } = req.body;

    // Check if item exists and has sufficient stock
    const [items] = await pool.execute(
      'SELECT id, current_stock FROM inventory_items WHERE id = ?',
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    if (items[0].current_stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update current stock
      await connection.execute(
        'UPDATE inventory_items SET current_stock = current_stock - ? WHERE id = ?',
        [quantity, id]
      );

      // Add transaction record
      await connection.execute(
        'INSERT INTO inventory_transactions (item_id, transaction_type, quantity, reference_type, reference_id, notes) VALUES (?, "out", ?, ?, ?, ?)',
        [id, quantity, reference_type, reference_id || null, notes || 'Stock removed']
      );

      await connection.commit();

      res.json({ message: 'Stock removed successfully' });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Remove stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get low stock alerts
router.get('/alerts/low-stock', auth, async (req, res) => {
  try {
    const [lowStockItems] = await pool.execute(
      'SELECT * FROM inventory_items WHERE current_stock <= min_stock_level AND is_active = 1 ORDER BY (min_stock_level - current_stock) DESC'
    );

    res.json({ lowStockItems });

  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inventory statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    // Get total items and value - count all items, not just active ones
    const [totalStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(current_stock * CAST(cost_per_unit AS DECIMAL(10,2))), 0) as total_value,
        SUM(CASE WHEN current_stock <= min_stock_level THEN 1 ELSE 0 END) as low_stock_items
       FROM inventory_items`
    );

    // Get category breakdown - include all items
    const [categoryStats] = await pool.execute(
      `SELECT 
        category,
        COUNT(*) as item_count,
        SUM(current_stock) as total_stock,
        COALESCE(SUM(current_stock * CAST(cost_per_unit AS DECIMAL(10,2))), 0) as category_value
       FROM inventory_items 
       WHERE category IS NOT NULL
       GROUP BY category
       ORDER BY category_value DESC`
    );

    // Get recent transactions - ensure proper JOIN and ordering
    const [recentTransactions] = await pool.execute(
      `SELECT 
        it.*,
        ii.name as item_name
       FROM inventory_transactions it
       JOIN inventory_items ii ON it.item_id = ii.id
       ORDER BY it.transaction_date DESC
       LIMIT 10`
    );

    const response = {
      stats: {
        totalItems: parseInt(totalStats[0].total_items) || 0,
        totalValue: parseFloat(totalStats[0].total_value) || 0,
        lowStockItems: parseInt(totalStats[0].low_stock_items) || 0
      },
      categoryStats,
      recentTransactions
    };

    res.json(response);

  } catch (error) {
    console.error('Get inventory stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete inventory item
router.delete('/:id', [
  auth,
  authorize('admin', 'manager')
], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if item exists
    const [items] = await pool.execute(
      'SELECT id FROM inventory_items WHERE id = ?',
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Soft delete by setting is_active to false
    await pool.execute(
      'UPDATE inventory_items SET is_active = 0 WHERE id = ?',
      [id]
    );

    res.json({ message: 'Inventory item deleted successfully' });

  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
