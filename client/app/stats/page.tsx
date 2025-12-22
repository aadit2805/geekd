'use client';

import { useState, useEffect } from 'react';
import { getStats, deleteAllUserData, type Stats } from '@/lib/api';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAllData = async () => {
    setDeleting(true);
    try {
      await deleteAllUserData();
      window.location.reload();
    } catch (error) {
      console.error('Error deleting data:', error);
      setDeleting(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-[var(--taupe)] border-t-[var(--coffee)] rounded-full"
        />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-32">
        <p className="text-[var(--latte)]">Unable to load insights</p>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Calculate max rating for trend chart
  const maxTrendRating = stats.rating_trends.length > 0
    ? Math.max(...stats.rating_trends.map(t => Number(t.avg_rating)))
    : 5;

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <h1 className="font-[family-name:var(--font-serif)] text-4xl md:text-5xl text-[var(--coffee)] mb-4">
          Insights
        </h1>
        <p className="text-[var(--latte)] tracking-wide">
          Patterns in your palate
        </p>
      </motion.div>

      {/* Key Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
      >
        {/* Total Drinks */}
        <motion.div
          variants={itemVariants}
          className="bg-white border border-[var(--taupe)]/20 rounded-2xl p-8 text-center"
        >
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--latte)] mb-4">
            Total Entries
          </p>
          <p className="font-[family-name:var(--font-serif)] text-6xl md:text-7xl text-[var(--coffee)]">
            {stats.total_drinks}
          </p>
          <p className="text-sm text-[var(--mocha)] mt-4">
            {stats.total_drinks === 1 ? 'coffee documented' : 'coffees documented'}
          </p>
        </motion.div>

        {/* Average Rating */}
        <motion.div
          variants={itemVariants}
          className="bg-white border border-[var(--taupe)]/20 rounded-2xl p-8 text-center"
        >
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--latte)] mb-4">
            Average Rating
          </p>
          <div className="flex items-baseline justify-center gap-2">
            <p className="font-[family-name:var(--font-serif)] text-6xl md:text-7xl text-[var(--coffee)]">
              {Number(stats.average_rating).toFixed(1)}
            </p>
            <span className="text-2xl text-[var(--latte)]">/ 5</span>
          </div>
          <p className="text-sm text-[var(--mocha)] mt-4">
            {Number(stats.average_rating) >= 4 ? 'You have refined taste' :
             Number(stats.average_rating) >= 3 ? 'A discerning palate' :
             'Still exploring'}
          </p>
        </motion.div>
      </motion.div>

      {/* Rating Trends Chart */}
      {stats.rating_trends.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="font-[family-name:var(--font-serif)] text-2xl text-[var(--coffee)] mb-6">
            Rating Trend
          </h2>
          <div className="bg-white border border-[var(--taupe)]/20 rounded-2xl p-6">
            <div className="flex items-end gap-2 h-40">
              {stats.rating_trends.map((trend, index) => {
                const height = (Number(trend.avg_rating) / 5) * 100;
                const date = new Date(trend.week);
                return (
                  <motion.div
                    key={trend.week}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.05 }}
                    className="flex-1 group relative"
                  >
                    <div
                      className={clsx(
                        "w-full rounded-t-lg transition-colors",
                        "bg-gradient-to-t from-[var(--terracotta-muted)] to-[var(--terracotta)]",
                        "group-hover:from-[var(--terracotta)] group-hover:to-[var(--sage)]"
                      )}
                      style={{ height: '100%' }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-[var(--espresso)] text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {Number(trend.avg_rating).toFixed(1)} avg ({trend.drink_count} drinks)
                      </div>
                    </div>
                    {/* Week label */}
                    <p className="text-[10px] text-[var(--taupe-dark)] text-center mt-2">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Best Day & Time */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
      >
        {/* Best Day */}
        {stats.best_day && (
          <div className="bg-white border border-[var(--taupe)]/20 rounded-2xl p-6">
            <h3 className="text-xs tracking-[0.2em] uppercase text-[var(--latte)] mb-4">
              Best Day for Coffee
            </h3>
            <p className="font-[family-name:var(--font-serif)] text-3xl text-[var(--coffee)] mb-2">
              {stats.best_day.day}
            </p>
            <p className="text-sm text-[var(--mocha)] mb-4">
              {Number(stats.best_day.avg_rating).toFixed(1)} avg rating
            </p>
            <div className="space-y-2">
              {stats.best_day.all_days.slice(0, 5).map((day, idx) => (
                <div key={day.day} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--taupe-dark)] w-12">{day.day.slice(0, 3)}</span>
                  <div className="flex-1 h-2 bg-[var(--linen)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(Number(day.avg_rating) / 5) * 100}%` }}
                      transition={{ duration: 0.5, delay: 0.4 + idx * 0.05 }}
                      className={clsx(
                        "h-full rounded-full",
                        idx === 0 ? "bg-[var(--terracotta)]" : "bg-[var(--taupe)]"
                      )}
                    />
                  </div>
                  <span className="text-xs text-[var(--mocha)] w-8">{Number(day.avg_rating).toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Best Time */}
        {stats.best_time && (
          <div className="bg-white border border-[var(--taupe)]/20 rounded-2xl p-6">
            <h3 className="text-xs tracking-[0.2em] uppercase text-[var(--latte)] mb-4">
              Best Time for Coffee
            </h3>
            <p className="font-[family-name:var(--font-serif)] text-3xl text-[var(--coffee)] mb-2 capitalize">
              {stats.best_time.time}
            </p>
            <p className="text-sm text-[var(--mocha)] mb-4">
              {Number(stats.best_time.avg_rating).toFixed(1)} avg rating
            </p>
            <div className="flex gap-3">
              {stats.best_time.all_times.map((time, idx) => (
                <div
                  key={time.time_of_day}
                  className={clsx(
                    "flex-1 p-3 rounded-xl text-center transition-colors",
                    idx === 0
                      ? "bg-[var(--terracotta)]/10 border border-[var(--terracotta)]/30"
                      : "bg-[var(--linen)]"
                  )}
                >
                  <p className="text-xs text-[var(--mocha)] capitalize mb-1">{time.time_of_day}</p>
                  <p className={clsx(
                    "font-medium",
                    idx === 0 ? "text-[var(--terracotta)]" : "text-[var(--coffee)]"
                  )}>
                    {Number(time.avg_rating).toFixed(1)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Loyalty Streaks */}
      {(stats.current_streak || stats.longest_streak) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
        >
          {stats.current_streak && stats.current_streak.count > 1 && (
            <div className="bg-gradient-to-br from-[var(--sage)]/10 to-[var(--sage)]/5 border border-[var(--sage)]/30 rounded-2xl p-6">
              <h3 className="text-xs tracking-[0.2em] uppercase text-[var(--sage-dark)] mb-4">
                Current Streak
              </h3>
              <p className="font-[family-name:var(--font-serif)] text-4xl text-[var(--coffee)] mb-2">
                {stats.current_streak.count} visits
              </p>
              <p className="text-sm text-[var(--mocha)]">
                in a row at <span className="font-medium">{stats.current_streak.cafe_name}</span>
              </p>
            </div>
          )}

          {stats.longest_streak && stats.longest_streak.count > 1 && (
            <div className="bg-white border border-[var(--taupe)]/20 rounded-2xl p-6">
              <h3 className="text-xs tracking-[0.2em] uppercase text-[var(--latte)] mb-4">
                Longest Streak
              </h3>
              <p className="font-[family-name:var(--font-serif)] text-4xl text-[var(--coffee)] mb-2">
                {stats.longest_streak.count} visits
              </p>
              <p className="text-sm text-[var(--mocha)]">
                at <span className="font-medium">{stats.longest_streak.cafe_name}</span>
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Two Column Layout for Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Top Cafes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="font-[family-name:var(--font-serif)] text-2xl text-[var(--coffee)] mb-6">
            Favorite Haunts
          </h2>
          {stats.top_cafes.length === 0 ? (
            <div className="bg-white border border-[var(--taupe)]/20 rounded-xl p-8 text-center">
              <p className="text-[var(--latte)]">No cafes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.top_cafes.map((cafe, index) => (
                <motion.div
                  key={cafe.cafe_name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="bg-white border border-[var(--taupe)]/20 rounded-xl p-5 flex items-center justify-between group hover:border-[var(--taupe)]/40 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <span className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      index === 0 ? "bg-[var(--terracotta)] text-white" :
                      index === 1 ? "bg-[var(--sage)] text-white" :
                      "bg-[var(--linen)] text-[var(--mocha)]"
                    )}>
                      {index + 1}
                    </span>
                    <span className="font-medium text-[var(--coffee)]">
                      {cafe.cafe_name}
                    </span>
                  </div>
                  <span className="text-sm text-[var(--latte)]">
                    {cafe.visit_count} {Number(cafe.visit_count) === 1 ? 'visit' : 'visits'}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Drink Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          <h2 className="font-[family-name:var(--font-serif)] text-2xl text-[var(--coffee)] mb-6">
            Your Orders
          </h2>
          {stats.drink_type_breakdown.length === 0 ? (
            <div className="bg-white border border-[var(--taupe)]/20 rounded-xl p-8 text-center">
              <p className="text-[var(--latte)]">No drinks yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.drink_type_breakdown.map((type, index) => {
                const maxCount = Math.max(...stats.drink_type_breakdown.map(t => Number(t.count)));
                const percentage = (Number(type.count) / maxCount) * 100;

                return (
                  <motion.div
                    key={type.drink_type}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + index * 0.1 }}
                    className="group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-[var(--coffee)]">
                        {type.drink_type}
                      </span>
                      <span className="text-sm text-[var(--latte)]">
                        {type.count}
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--linen)] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, delay: 0.65 + index * 0.1, ease: "easeOut" }}
                        className={clsx(
                          "h-full rounded-full",
                          index === 0 ? "bg-gradient-to-r from-[var(--terracotta-muted)] to-[var(--terracotta)]" :
                          index === 1 ? "bg-gradient-to-r from-[var(--sage)] to-[var(--sage-dark)]" :
                          "bg-[var(--taupe)]"
                        )}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quote / Mood */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-20 text-center"
      >
        <div className="inline-block border-t border-b border-[var(--taupe)]/30 py-8 px-12">
          <p className="font-[family-name:var(--font-serif)] text-xl italic text-[var(--mocha)]">
            {stats.total_drinks === 0
              ? '"The first cup is for the guest, the second for enjoyment."'
              : Number(stats.average_rating) >= 4
              ? '"Life is too short for bad coffee."'
              : '"Every cup is a journey of discovery."'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
