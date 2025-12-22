import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// GET unique drink types for autocomplete
router.get('/types', async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(`
      SELECT drink_type, COUNT(*) as count
      FROM drinks
      WHERE user_id = $1
      GROUP BY drink_type
      ORDER BY count DESC, drink_type ASC
    `, [userId]);
    res.json(result.rows.map(r => r.drink_type));
  } catch (error) {
    console.error('Error fetching drink types:', error);
    res.status(500).json({ error: 'Failed to fetch drink types' });
  }
});

// GET last drink for quick-log
router.get('/last', async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(`
      SELECT d.*, c.name as cafe_name, c.address as cafe_address, c.city as cafe_city
      FROM drinks d
      JOIN cafes c ON d.cafe_id = c.id
      WHERE d.user_id = $1
      ORDER BY d.logged_at DESC
      LIMIT 1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No drinks found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching last drink:', error);
    res.status(500).json({ error: 'Failed to fetch last drink' });
  }
});

// GET all drinks with optional filters
router.get('/', async (req, res) => {
  try {
    const { cafe_id, sort = 'logged_at', order = 'desc' } = req.query;
    const userId = req.userId;

    let query = `
      SELECT d.*, c.name as cafe_name, c.address as cafe_address, c.city as cafe_city
      FROM drinks d
      JOIN cafes c ON d.cafe_id = c.id
      WHERE d.user_id = $1
    `;

    const params: any[] = [userId];

    if (cafe_id) {
      query += ' AND d.cafe_id = $2';
      params.push(cafe_id);
    }

    const validSorts = ['logged_at', 'rating', 'created_at'];
    const sortColumn = validSorts.includes(sort as string) ? sort : 'logged_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY d.${sortColumn} ${sortOrder}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching drinks:', error);
    res.status(500).json({ error: 'Failed to fetch drinks' });
  }
});

// GET single drink
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const result = await pool.query(`
      SELECT d.*, c.name as cafe_name, c.address as cafe_address, c.city as cafe_city
      FROM drinks d
      JOIN cafes c ON d.cafe_id = c.id
      WHERE d.id = $1 AND d.user_id = $2
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching drink:', error);
    res.status(500).json({ error: 'Failed to fetch drink' });
  }
});

// POST create drink
router.post('/', async (req, res) => {
  try {
    const { cafe_id, drink_type, rating, notes, logged_at } = req.body;
    const userId = req.userId;

    // Validation
    if (!cafe_id || !drink_type || rating === undefined) {
      return res.status(400).json({
        error: 'cafe_id, drink_type, and rating are required'
      });
    }

    if (rating < 0 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 0 and 5'
      });
    }

    // Verify cafe belongs to user
    const cafeCheck = await pool.query(
      'SELECT id FROM cafes WHERE id = $1 AND user_id = $2',
      [cafe_id, userId]
    );
    if (cafeCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid cafe_id' });
    }

    const result = await pool.query(
      `INSERT INTO drinks (cafe_id, drink_type, rating, notes, logged_at, user_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [cafe_id, drink_type, rating, notes || null, logged_at || new Date(), userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating drink:', error);
    res.status(500).json({ error: 'Failed to create drink' });
  }
});

// DELETE drink
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const result = await pool.query(
      'DELETE FROM drinks WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    res.json({ message: 'Drink deleted successfully' });
  } catch (error) {
    console.error('Error deleting drink:', error);
    res.status(500).json({ error: 'Failed to delete drink' });
  }
});

export default router;
