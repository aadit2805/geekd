import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// Helper function to sanitize text input
const sanitizeText = (text: string | null | undefined): string | null => {
  if (!text) return null;
  return text.replace(/<[^>]*>/g, '').substring(0, 1000);
};

// GET all wishlist items
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(`
      SELECT * FROM wishlist
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// POST add to wishlist
router.post('/', async (req, res) => {
  try {
    const { name, address, city, place_id, photo_reference, lat, lng, notes } = req.body;
    const userId = req.userId;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Check if already in wishlist (by place_id if available, otherwise by name)
    if (place_id) {
      const existing = await pool.query(
        'SELECT id FROM wishlist WHERE user_id = $1 AND place_id = $2',
        [userId, place_id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Already in wishlist' });
      }
    }

    // Check if already visited (exists in cafes)
    if (place_id) {
      const visited = await pool.query(
        'SELECT id FROM cafes WHERE user_id = $1 AND place_id = $2',
        [userId, place_id]
      );
      if (visited.rows.length > 0) {
        return res.status(400).json({ error: 'Already visited this cafe' });
      }
    }

    const result = await pool.query(
      `INSERT INTO wishlist (user_id, name, address, city, place_id, photo_reference, lat, lng, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [userId, sanitizeText(name), sanitizeText(address), sanitizeText(city), place_id, photo_reference, lat, lng, sanitizeText(notes)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// DELETE from wishlist
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const result = await pool.query(
      'DELETE FROM wishlist WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

// POST convert wishlist item to visited cafe
router.post('/:id/visit', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Get wishlist item
    const wishlistItem = await pool.query(
      'SELECT * FROM wishlist WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (wishlistItem.rows.length === 0) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    const item = wishlistItem.rows[0];

    // Create cafe from wishlist item
    const cafe = await pool.query(
      `INSERT INTO cafes (name, address, city, place_id, photo_reference, lat, lng, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [item.name, item.address, item.city, item.place_id, item.photo_reference, item.lat, item.lng, userId]
    );

    // Remove from wishlist
    await pool.query('DELETE FROM wishlist WHERE id = $1', [id]);

    res.json(cafe.rows[0]);
  } catch (error) {
    console.error('Error converting wishlist to cafe:', error);
    res.status(500).json({ error: 'Failed to convert wishlist item' });
  }
});

export default router;
