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

    // Total unique cafes visited
    const cafesVisitedResult = await pool.query(
      'SELECT COUNT(DISTINCT cafe_id) as count FROM drinks WHERE user_id = $1',
      [userId]
    );
    const cafes_visited = parseInt(cafesVisitedResult.rows[0].count);

    // Total unique drink types tried
    const drinkTypesResult = await pool.query(
      'SELECT COUNT(DISTINCT drink_type) as count FROM drinks WHERE user_id = $1',
      [userId]
    );
    const drink_types_tried = parseInt(drinkTypesResult.rows[0].count);

    // Current daily streak (consecutive days with at least one drink)
    const dailyStreakResult = await pool.query(`
      WITH daily_logs AS (
        SELECT DISTINCT DATE(logged_at) as log_date
        FROM drinks
        WHERE user_id = $1
        ORDER BY log_date DESC
      ),
      streak_calc AS (
        SELECT log_date,
               log_date - (ROW_NUMBER() OVER (ORDER BY log_date DESC))::int as grp
        FROM daily_logs
      )
      SELECT COUNT(*) as streak
      FROM streak_calc
      WHERE grp = (SELECT grp FROM streak_calc WHERE log_date = CURRENT_DATE OR log_date = CURRENT_DATE - 1 LIMIT 1)
    `, [userId]);
    const current_streak = parseInt(dailyStreakResult.rows[0]?.streak || '0');

    // Longest daily streak ever
    const longestDailyStreakResult = await pool.query(`
      WITH daily_logs AS (
        SELECT DISTINCT DATE(logged_at) as log_date
        FROM drinks
        WHERE user_id = $1
        ORDER BY log_date
      ),
      streak_calc AS (
        SELECT log_date,
               log_date - (ROW_NUMBER() OVER (ORDER BY log_date))::int as grp
        FROM daily_logs
      )
      SELECT COUNT(*) as streak
      FROM streak_calc
      GROUP BY grp
      ORDER BY streak DESC
      LIMIT 1
    `, [userId]);
    const longest_streak = parseInt(longestDailyStreakResult.rows[0]?.streak || '0');

    // This week's drinks
    const thisWeekResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM drinks
      WHERE user_id = $1 AND logged_at >= DATE_TRUNC('week', CURRENT_DATE)
    `, [userId]);
    const drinks_this_week = parseInt(thisWeekResult.rows[0].count);

    // This month's drinks
    const thisMonthResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM drinks
      WHERE user_id = $1 AND logged_at >= DATE_TRUNC('month', CURRENT_DATE)
    `, [userId]);
    const drinks_this_month = parseInt(thisMonthResult.rows[0].count);

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
    const drinkTypeBreakdownResult = await pool.query(`
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

    // Calculate milestones
    const milestones = [];
    if (total_drinks >= 1) milestones.push({ type: 'drinks', value: 1, label: 'First Cup' });
    if (total_drinks >= 10) milestones.push({ type: 'drinks', value: 10, label: '10 Cups' });
    if (total_drinks >= 50) milestones.push({ type: 'drinks', value: 50, label: '50 Cups' });
    if (total_drinks >= 100) milestones.push({ type: 'drinks', value: 100, label: 'Century Club' });
    if (total_drinks >= 500) milestones.push({ type: 'drinks', value: 500, label: '500 Strong' });
    if (cafes_visited >= 5) milestones.push({ type: 'cafes', value: 5, label: '5 Cafes' });
    if (cafes_visited >= 10) milestones.push({ type: 'cafes', value: 10, label: '10 Cafes' });
    if (cafes_visited >= 25) milestones.push({ type: 'cafes', value: 25, label: 'Explorer' });
    if (drink_types_tried >= 5) milestones.push({ type: 'types', value: 5, label: 'Variety' });
    if (drink_types_tried >= 10) milestones.push({ type: 'types', value: 10, label: 'Adventurer' });
    if (longest_streak >= 7) milestones.push({ type: 'streak', value: 7, label: 'Week Warrior' });
    if (longest_streak >= 30) milestones.push({ type: 'streak', value: 30, label: 'Monthly Master' });

    res.json({
      total_drinks,
      average_rating: Math.round(average_rating * 10) / 10,
      cafes_visited,
      drink_types_tried,
      current_streak,
      longest_streak,
      drinks_this_week,
      drinks_this_month,
      milestones,
      top_cafes: topCafesResult.rows,
      drink_type_breakdown: drinkTypeBreakdownResult.rows,
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
      cafe_streak: streakResult.rows.length > 0 ? {
        cafe_name: streakResult.rows[0].cafe_name,
        count: parseInt(streakResult.rows[0].streak_count)
      } : null,
      longest_cafe_streak: longestStreakResult.rows.length > 0 ? {
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
