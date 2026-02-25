import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// DELETE all user data (drinks and cafes)
router.delete('/data', async (req, res) => {
  try {
    const userId = req.userId;

    // Delete in dependency order
    await pool.query('DELETE FROM drink_rankings WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM wishlist WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM drinks WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM cafes WHERE user_id = $1', [userId]);

    res.json({ message: 'All data deleted successfully' });
  } catch (error) {
    console.error('Error deleting user data:', error);
    res.status(500).json({ error: 'Failed to delete user data' });
  }
});

export default router;
