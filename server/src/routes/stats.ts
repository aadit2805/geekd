import { Router } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    // Run all independent queries in parallel
    const [
      totalResult,
      cafesVisitedResult,
      drinkTypesResult,
      dailyStreakResult,
      longestDailyStreakResult,
      thisWeekResult,
      thisMonthResult,
      avgResult,
      topCafesResult,
      drinkTypeBreakdownResult,
      trendsResult,
      bestDayResult,
      bestTimeResult,
      streakResult,
      longestStreakResult,
      priceStatsResult,
      monthSpendResult,
      priceByCafeResult,
      flavorTagsResult,
    ] = await Promise.all([
      // Total drinks
      pool.query(
        'SELECT COUNT(*) as total FROM drinks WHERE user_id = $1',
        [userId]
      ),
      // Total unique cafes visited
      pool.query(
        'SELECT COUNT(DISTINCT cafe_id) as count FROM drinks WHERE user_id = $1',
        [userId]
      ),
      // Total unique drink types tried
      pool.query(
        'SELECT COUNT(DISTINCT drink_type) as count FROM drinks WHERE user_id = $1',
        [userId]
      ),
      // Current daily streak
      pool.query(`
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
      `, [userId]),
      // Longest daily streak ever
      pool.query(`
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
      `, [userId]),
      // This week's drinks
      pool.query(`
        SELECT COUNT(*) as count
        FROM drinks
        WHERE user_id = $1 AND logged_at >= DATE_TRUNC('week', CURRENT_DATE)
      `, [userId]),
      // This month's drinks
      pool.query(`
        SELECT COUNT(*) as count
        FROM drinks
        WHERE user_id = $1 AND logged_at >= DATE_TRUNC('month', CURRENT_DATE)
      `, [userId]),
      // Average rating
      pool.query(
        'SELECT AVG(rating) as avg FROM drinks WHERE user_id = $1',
        [userId]
      ),
      // Top cafes by visit count
      pool.query(`
        SELECT c.name as cafe_name, COUNT(d.id) as visit_count
        FROM cafes c
        JOIN drinks d ON c.id = d.cafe_id
        WHERE d.user_id = $1
        GROUP BY c.id, c.name
        ORDER BY visit_count DESC
        LIMIT 5
      `, [userId]),
      // Drink type breakdown
      pool.query(`
        SELECT drink_type, COUNT(*) as count
        FROM drinks
        WHERE user_id = $1
        GROUP BY drink_type
        ORDER BY count DESC
      `, [userId]),
      // Rating trends (weekly averages for last 12 weeks)
      pool.query(`
        SELECT
          DATE_TRUNC('week', logged_at) as week,
          ROUND(AVG(rating)::numeric, 2) as avg_rating,
          COUNT(*) as drink_count
        FROM drinks
        WHERE user_id = $1 AND logged_at > NOW() - INTERVAL '12 weeks'
        GROUP BY DATE_TRUNC('week', logged_at)
        ORDER BY week ASC
      `, [userId]),
      // Best day of week
      pool.query(`
        SELECT
          EXTRACT(DOW FROM logged_at) as day_of_week,
          ROUND(AVG(rating)::numeric, 2) as avg_rating,
          COUNT(*) as drink_count
        FROM drinks
        WHERE user_id = $1
        GROUP BY EXTRACT(DOW FROM logged_at)
        ORDER BY avg_rating DESC
      `, [userId]),
      // Best time of day
      pool.query(`
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
      `, [userId]),
      // Current cafe streak
      pool.query(`
        WITH ordered_drinks AS (
          SELECT cafe_id, logged_at,
                 cafe_id != LAG(cafe_id, 1, cafe_id) OVER (ORDER BY logged_at DESC) as is_break
          FROM drinks
          WHERE user_id = $1
          ORDER BY logged_at DESC
        )
        SELECT
          d.cafe_id,
          c.name as cafe_name,
          COUNT(*) as streak_count
        FROM ordered_drinks d
        JOIN cafes c ON d.cafe_id = c.id
        WHERE NOT EXISTS (
          SELECT 1 FROM ordered_drinks sub
          WHERE sub.is_break = true AND sub.logged_at > d.logged_at
        )
        GROUP BY d.cafe_id, c.name
        LIMIT 1
      `, [userId]),
      // Longest cafe streak ever
      pool.query(`
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
      `, [userId]),
      // Price statistics
      pool.query(`
        SELECT
          COALESCE(SUM(price), 0) as total_spent,
          COALESCE(AVG(price), 0) as avg_price,
          COUNT(price) as drinks_with_price
        FROM drinks
        WHERE user_id = $1 AND price IS NOT NULL
      `, [userId]),
      // This month's spending
      pool.query(`
        SELECT COALESCE(SUM(price), 0) as total
        FROM drinks
        WHERE user_id = $1 AND price IS NOT NULL AND logged_at >= DATE_TRUNC('month', CURRENT_DATE)
      `, [userId]),
      // Price by cafe
      pool.query(`
        SELECT c.name as cafe_name, ROUND(AVG(d.price)::numeric, 2) as avg_price, COUNT(*) as count
        FROM drinks d
        JOIN cafes c ON d.cafe_id = c.id
        WHERE d.user_id = $1 AND d.price IS NOT NULL
        GROUP BY c.id, c.name
        HAVING COUNT(*) >= 2
        ORDER BY avg_price DESC
      `, [userId]),
      // Flavor tags
      pool.query(`
        SELECT unnest(flavor_tags) as tag, COUNT(*) as count
        FROM drinks
        WHERE user_id = $1 AND flavor_tags IS NOT NULL
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 10
      `, [userId]),
    ]);

    const total_drinks = parseInt(totalResult.rows[0].total);
    const cafes_visited = parseInt(cafesVisitedResult.rows[0].count);
    const drink_types_tried = parseInt(drinkTypesResult.rows[0].count);
    const current_streak = parseInt(dailyStreakResult.rows[0]?.streak || '0');
    const longest_streak = parseInt(longestDailyStreakResult.rows[0]?.streak || '0');
    const drinks_this_week = parseInt(thisWeekResult.rows[0].count);
    const drinks_this_month = parseInt(thisMonthResult.rows[0].count);
    const average_rating = parseFloat(avgResult.rows[0].avg) || 0;

    const totalSpent = parseFloat(priceStatsResult.rows[0].total_spent) || 0;
    const avgPrice = parseFloat(priceStatsResult.rows[0].avg_price) || 0;
    const drinksWithPrice = parseInt(priceStatsResult.rows[0].drinks_with_price) || 0;
    const spentThisMonth = parseFloat(monthSpendResult.rows[0].total) || 0;

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
      total_spent: Math.round(totalSpent * 100) / 100,
      avg_price: Math.round(avgPrice * 100) / 100,
      spent_this_month: Math.round(spentThisMonth * 100) / 100,
      drinks_with_price: drinksWithPrice,
      price_by_cafe: priceByCafeResult.rows,
      top_flavor_tags: flavorTagsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
