import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// GET all cafes (sorted by most recently visited, then by name)
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(`
      SELECT c.*,
             COUNT(d.id) as drink_count,
             MAX(d.logged_at) as last_visit
      FROM cafes c
      LEFT JOIN drinks d ON c.id = d.cafe_id AND d.user_id = $1
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY last_visit DESC NULLS LAST, c.name ASC
    `, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cafes:', error);
    res.status(500).json({ error: 'Failed to fetch cafes' });
  }
});

// GET single cafe
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const result = await pool.query(
      'SELECT * FROM cafes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cafe not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching cafe:', error);
    res.status(500).json({ error: 'Failed to fetch cafe' });
  }
});

// POST create cafe
router.post('/', async (req, res) => {
  try {
    const { name, address, city, place_id, photo_reference, lat, lng } = req.body;
    const userId = req.userId;

    if (!name) {
      return res.status(400).json({ error: 'Cafe name is required' });
    }

    // Check if cafe with same place_id already exists for this user
    if (place_id) {
      const existing = await pool.query(
        'SELECT id FROM cafes WHERE place_id = $1 AND user_id = $2',
        [place_id, userId]
      );
      if (existing.rows.length > 0) {
        // Return existing cafe instead of creating duplicate
        const existingCafe = await pool.query('SELECT * FROM cafes WHERE id = $1', [existing.rows[0].id]);
        return res.status(200).json(existingCafe.rows[0]);
      }
    }

    const result = await pool.query(
      `INSERT INTO cafes (name, address, city, place_id, photo_reference, lat, lng, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, address || null, city || null, place_id || null, photo_reference || null, lat || null, lng || null, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating cafe:', error);
    res.status(500).json({ error: 'Failed to create cafe' });
  }
});

export default router;
