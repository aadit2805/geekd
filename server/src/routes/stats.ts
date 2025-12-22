import { Router } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    // Total drinks
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM drinks WHERE user_id = $1',
      [userId]
    );
    const total_drinks = parseInt(totalResult.rows[0].total);

    // Average rating
    const avgResult = await pool.query(
      'SELECT AVG(rating) as avg FROM drinks WHERE user_id = $1',
      [userId]
    );
    const average_rating = parseFloat(avgResult.rows[0].avg) || 0;

    // Top cafes by visit count
    const topCafesResult = await pool.query(`
      SELECT c.name as cafe_name, COUNT(d.id) as visit_count
      FROM cafes c
      JOIN drinks d ON c.id = d.cafe_id
      WHERE d.user_id = $1
      GROUP BY c.id, c.name
      ORDER BY visit_count DESC
      LIMIT 5
    `, [userId]);

    // Drink type breakdown
    const drinkTypesResult = await pool.query(`
      SELECT drink_type, COUNT(*) as count
      FROM drinks
      WHERE user_id = $1
      GROUP BY drink_type
      ORDER BY count DESC
    `, [userId]);

    // Rating trends over time (weekly averages for last 12 weeks)
    const trendsResult = await pool.query(`
      SELECT
        DATE_TRUNC('week', logged_at) as week,
        ROUND(AVG(rating)::numeric, 2) as avg_rating,
        COUNT(*) as drink_count
      FROM drinks
      WHERE user_id = $1 AND logged_at > NOW() - INTERVAL '12 weeks'
      GROUP BY DATE_TRUNC('week', logged_at)
      ORDER BY week ASC
    `, [userId]);

    // Best day of week
    const bestDayResult = await pool.query(`
      SELECT
        EXTRACT(DOW FROM logged_at) as day_of_week,
        ROUND(AVG(rating)::numeric, 2) as avg_rating,
        COUNT(*) as drink_count
      FROM drinks
      WHERE user_id = $1
      GROUP BY EXTRACT(DOW FROM logged_at)
      ORDER BY avg_rating DESC
    `, [userId]);

    // Best time of day (morning, afternoon, evening)
    const bestTimeResult = await pool.query(`
      SELECT
        CASE
          WHEN EXTRACT(HOUR FROM logged_at) < 12 THEN 'morning'
          WHEN EXTRACT(HOUR FROM logged_at) < 17 THEN 'afternoon'
          ELSE 'evening'
        END as time_of_day,
        ROUND(AVG(rating)::numeric, 2) as avg_rating,
        COUNT(*) as drink_count
      FROM drinks
      WHERE user_id = $1
      GROUP BY time_of_day
      ORDER BY avg_rating DESC
    `, [userId]);

    // Current streak (consecutive visits to same cafe)
    const streakResult = await pool.query(`
      WITH ordered_drinks AS (
        SELECT cafe_id, logged_at,
               LAG(cafe_id) OVER (ORDER BY logged_at) as prev_cafe_id
        FROM drinks
        WHERE user_id = $1
        ORDER BY logged_at DESC
      ),
      streak AS (
        SELECT cafe_id
        FROM ordered_drinks
        WHERE cafe_id = prev_cafe_id OR prev_cafe_id IS NULL
        LIMIT 100
      )
      SELECT
        d.cafe_id,
        c.name as cafe_name,
        COUNT(*) as streak_count
      FROM (
        SELECT cafe_id, logged_at,
               cafe_id != LAG(cafe_id, 1, cafe_id) OVER (ORDER BY logged_at DESC) as is_break
        FROM drinks
        WHERE user_id = $1
        ORDER BY logged_at DESC
      ) d
      JOIN cafes c ON d.cafe_id = c.id
      WHERE NOT EXISTS (
        SELECT 1 FROM (
          SELECT cafe_id, logged_at,
                 cafe_id != LAG(cafe_id, 1, cafe_id) OVER (ORDER BY logged_at DESC) as is_break
          FROM drinks
          WHERE user_id = $1
        ) sub
        WHERE sub.is_break = true AND sub.logged_at > d.logged_at
      )
      GROUP BY d.cafe_id, c.name
      LIMIT 1
    `, [userId]);

    // Longest streak ever
    const longestStreakResult = await pool.query(`
      WITH streaks AS (
        SELECT
          cafe_id,
          logged_at,
          cafe_id != LAG(cafe_id) OVER (ORDER BY logged_at) AS new_streak
        FROM drinks
        WHERE user_id = $1
      ),
      streak_groups AS (
        SELECT
          cafe_id,
          SUM(CASE WHEN new_streak THEN 1 ELSE 0 END) OVER (ORDER BY logged_at) as streak_id
        FROM streaks
      )
      SELECT
        c.name as cafe_name,
        COUNT(*) as streak_count
      FROM streak_groups sg
      JOIN cafes c ON sg.cafe_id = c.id
      GROUP BY sg.streak_id, c.name
      ORDER BY streak_count DESC
      LIMIT 1
    `, [userId]);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    res.json({
      total_drinks,
      average_rating: Math.round(average_rating * 10) / 10,
      top_cafes: topCafesResult.rows,
      drink_type_breakdown: drinkTypesResult.rows,
      rating_trends: trendsResult.rows,
      best_day: bestDayResult.rows.length > 0 ? {
        day: dayNames[parseInt(bestDayResult.rows[0].day_of_week)],
        avg_rating: bestDayResult.rows[0].avg_rating,
        drink_count: bestDayResult.rows[0].drink_count,
        all_days: bestDayResult.rows.map(r => ({
          day: dayNames[parseInt(r.day_of_week)],
          avg_rating: r.avg_rating,
          drink_count: r.drink_count
        }))
      } : null,
      best_time: bestTimeResult.rows.length > 0 ? {
        time: bestTimeResult.rows[0].time_of_day,
        avg_rating: bestTimeResult.rows[0].avg_rating,
        all_times: bestTimeResult.rows
      } : null,
      current_streak: streakResult.rows.length > 0 ? {
        cafe_name: streakResult.rows[0].cafe_name,
        count: parseInt(streakResult.rows[0].streak_count)
      } : null,
      longest_streak: longestStreakResult.rows.length > 0 ? {
        cafe_name: longestStreakResult.rows[0].cafe_name,
        count: parseInt(longestStreakResult.rows[0].streak_count)
      } : null,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
