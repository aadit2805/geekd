import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// Score calculation based on tier and position
// Good: 6.0-10.0, Mid: 3.0-5.9, Bad: 0.0-2.9
// Higher rank (lower number) = higher score within tier
const calculateScore = (tier: string, rank: number, totalInTier: number): number => {
  const tierRanges: Record<string, { min: number; max: number }> = {
    good: { min: 6.0, max: 10.0 },
    mid: { min: 3.0, max: 5.9 },
    bad: { min: 0.0, max: 2.9 },
  };

  const range = tierRanges[tier] || tierRanges.mid;
  if (totalInTier <= 1) return range.max;

  // rank 1 = highest score, higher ranks = lower scores
  const position = (rank - 1) / (totalInTier - 1); // 0 to 1
  return Math.round((range.max - position * (range.max - range.min)) * 10) / 10;
};

// Recalculate all scores in a tier after ranking changes (batched single query)
const recalculateScores = async (userId: string, tier: string) => {
  const result = await pool.query(`
    SELECT id, tier_rank FROM drink_rankings
    WHERE user_id = $1 AND quality_tier = $2
    ORDER BY tier_rank ASC
  `, [userId, tier]);

  const total = result.rows.length;
  if (total === 0) return;

  // Build a single UPDATE with CASE expression instead of N separate queries
  const ids: number[] = [];
  const cases: string[] = [];
  result.rows.forEach((row, i) => {
    const score = calculateScore(tier, row.tier_rank, total);
    ids.push(row.id);
    cases.push(`WHEN ${row.id} THEN ${score}`);
  });

  await pool.query(`
    UPDATE drink_rankings
    SET score = CASE id ${cases.join(' ')} END,
        updated_at = NOW()
    WHERE id = ANY($1)
  `, [ids]);
};

// GET all rankings for user (with drink and cafe details)
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(`
      SELECT
        dr.id as ranking_id,
        dr.quality_tier,
        dr.tier_rank,
        dr.score,
        dr.created_at as ranked_at,
        d.id as drink_id,
        d.drink_type,
        d.logged_at,
        d.notes,
        c.id as cafe_id,
        c.name as cafe_name,
        c.city as cafe_city,
        c.photo_reference as cafe_photo
      FROM drink_rankings dr
      JOIN drinks d ON dr.drink_id = d.id
      JOIN cafes c ON d.cafe_id = c.id
      WHERE dr.user_id = $1
      ORDER BY dr.score DESC, dr.created_at DESC
    `, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rankings:', error);
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

// GET rankings by tier
router.get('/tier/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    const userId = req.userId;

    if (!['good', 'mid', 'bad'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const result = await pool.query(`
      SELECT
        dr.id as ranking_id,
        dr.quality_tier,
        dr.tier_rank,
        dr.score,
        d.id as drink_id,
        d.drink_type,
        d.logged_at,
        c.id as cafe_id,
        c.name as cafe_name,
        c.city as cafe_city,
        c.photo_reference as cafe_photo
      FROM drink_rankings dr
      JOIN drinks d ON dr.drink_id = d.id
      JOIN cafes c ON d.cafe_id = c.id
      WHERE dr.user_id = $1 AND dr.quality_tier = $2
      ORDER BY dr.tier_rank ASC
    `, [userId, tier]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tier rankings:', error);
    res.status(500).json({ error: 'Failed to fetch tier rankings' });
  }
});

// GET unranked drinks
router.get('/unranked', async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(`
      SELECT
        d.id as drink_id,
        d.drink_type,
        COALESCE(d.quality_tier, 'good') as quality_tier,
        d.logged_at,
        d.notes,
        c.id as cafe_id,
        c.name as cafe_name,
        c.city as cafe_city,
        c.photo_reference as cafe_photo
      FROM drinks d
      JOIN cafes c ON d.cafe_id = c.id
      LEFT JOIN drink_rankings dr ON d.id = dr.drink_id AND dr.user_id = $1
      WHERE d.user_id = $1 AND dr.id IS NULL
      ORDER BY d.logged_at DESC
    `, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching unranked drinks:', error);
    res.status(500).json({ error: 'Failed to fetch unranked drinks' });
  }
});

// GET check if drink is ranked
router.get('/check/:drinkId', async (req, res) => {
  try {
    const { drinkId } = req.params;
    const userId = req.userId;
    const result = await pool.query(
      'SELECT tier_rank, quality_tier, score FROM drink_rankings WHERE drink_id = $1 AND user_id = $2',
      [drinkId, userId]
    );
    res.json({
      isRanked: result.rows.length > 0,
      rank: result.rows[0]?.tier_rank || null,
      tier: result.rows[0]?.quality_tier || null,
      score: result.rows[0]?.score || null,
    });
  } catch (error) {
    console.error('Error checking ranking:', error);
    res.status(500).json({ error: 'Failed to check ranking' });
  }
});

// GET count of drinks in each tier (for comparison flow)
router.get('/counts', async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(`
      SELECT quality_tier, COUNT(*) as count
      FROM drink_rankings
      WHERE user_id = $1
      GROUP BY quality_tier
    `, [userId]);

    const counts = { good: 0, mid: 0, bad: 0 };
    for (const row of result.rows) {
      counts[row.quality_tier as keyof typeof counts] = parseInt(row.count);
    }
    res.json(counts);
  } catch (error) {
    console.error('Error fetching counts:', error);
    res.status(500).json({ error: 'Failed to fetch counts' });
  }
});

// POST add drink to rankings at specific position within tier
router.post('/', async (req, res) => {
  try {
    const { drink_id, tier, rank } = req.body;
    const userId = req.userId;

    if (!drink_id || !tier || rank === undefined) {
      return res.status(400).json({ error: 'drink_id, tier, and rank are required' });
    }

    if (!['good', 'mid', 'bad'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    // Verify drink exists and belongs to user
    const drinkCheck = await pool.query(
      'SELECT id, quality_tier FROM drinks WHERE id = $1 AND user_id = $2',
      [drink_id, userId]
    );
    if (drinkCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    // Check if drink is already ranked
    const existingRank = await pool.query(
      'SELECT id FROM drink_rankings WHERE drink_id = $1 AND user_id = $2',
      [drink_id, userId]
    );
    if (existingRank.rows.length > 0) {
      return res.status(400).json({ error: 'Drink is already ranked' });
    }

    // Shift existing rankings in this tier down to make room
    await pool.query(`
      UPDATE drink_rankings
      SET tier_rank = tier_rank + 1, updated_at = NOW()
      WHERE user_id = $1 AND quality_tier = $2 AND tier_rank >= $3
    `, [userId, tier, rank]);

    // Insert new ranking (score will be set by recalculateScores below)
    const result = await pool.query(`
      INSERT INTO drink_rankings (user_id, drink_id, quality_tier, tier_rank, score)
      VALUES ($1, $2, $3, $4, 0)
      RETURNING *
    `, [userId, drink_id, tier, rank]);

    // Update the drink's quality_tier
    await pool.query(
      'UPDATE drinks SET quality_tier = $1 WHERE id = $2',
      [tier, drink_id]
    );

    // Recalculate all scores in this tier
    await recalculateScores(userId as string, tier);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding ranking:', error);
    res.status(500).json({ error: 'Failed to add ranking' });
  }
});

// PUT reorder rankings within a tier
router.put('/reorder', async (req, res) => {
  try {
    const { tier, rankings } = req.body; // rankings = Array of { drink_id, rank }
    const userId = req.userId;

    if (!tier || !Array.isArray(rankings)) {
      return res.status(400).json({ error: 'tier and rankings array required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Temporarily set all ranks to negative
      await client.query(`
        UPDATE drink_rankings
        SET tier_rank = -tier_rank - 1000
        WHERE user_id = $1 AND quality_tier = $2
      `, [userId, tier]);

      // Update each ranking
      for (const { drink_id, rank } of rankings) {
        await client.query(`
          UPDATE drink_rankings
          SET tier_rank = $1, updated_at = NOW()
          WHERE user_id = $2 AND drink_id = $3 AND quality_tier = $4
        `, [rank, userId, drink_id, tier]);
      }

      await client.query('COMMIT');

      // Recalculate scores
      await recalculateScores(userId as string, tier);

      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error reordering rankings:', error);
    res.status(500).json({ error: 'Failed to reorder rankings' });
  }
});

// DELETE remove drink from rankings
router.delete('/:drinkId', async (req, res) => {
  try {
    const { drinkId } = req.params;
    const userId = req.userId;

    // Get current rank and tier before deleting
    const current = await pool.query(
      'SELECT tier_rank, quality_tier FROM drink_rankings WHERE drink_id = $1 AND user_id = $2',
      [drinkId, userId]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Ranking not found' });
    }

    const { tier_rank: deletedRank, quality_tier: tier } = current.rows[0];

    // Delete the ranking
    await pool.query(
      'DELETE FROM drink_rankings WHERE drink_id = $1 AND user_id = $2',
      [drinkId, userId]
    );

    // Shift remaining rankings up
    await pool.query(`
      UPDATE drink_rankings
      SET tier_rank = tier_rank - 1, updated_at = NOW()
      WHERE user_id = $1 AND quality_tier = $2 AND tier_rank > $3
    `, [userId, tier, deletedRank]);

    // Recalculate scores
    await recalculateScores(userId as string, tier);

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing ranking:', error);
    res.status(500).json({ error: 'Failed to remove ranking' });
  }
});

export default router;
