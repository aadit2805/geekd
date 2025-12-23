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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-[var(--taupe)] border-t-[var(--coffee)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--mocha)]">Unable to load stats</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Streak Banner */}
      {stats.current_streak > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 bg-gradient-to-r from-[var(--terracotta)]/10 to-[var(--sage)]/10 border border-[var(--terracotta)]/20 rounded-xl text-center"
        >
          <p className="text-sm text-[var(--mocha)]">
            <span className="text-2xl font-medium text-[var(--coffee)]">{stats.current_streak}</span>
            {' '}day streak
          </p>
        </motion.div>
      )}

      {/* Key Numbers */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        <div className="bg-white border border-[var(--taupe)]/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-medium text-[var(--coffee)]">{stats.total_drinks}</p>
          <p className="text-xs text-[var(--taupe-dark)]">cups</p>
        </div>
        <div className="bg-white border border-[var(--taupe)]/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-medium text-[var(--coffee)]">{stats.cafes_visited}</p>
          <p className="text-xs text-[var(--taupe-dark)]">cafes</p>
        </div>
        <div className="bg-white border border-[var(--taupe)]/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-medium text-[var(--coffee)]">{Number(stats.average_rating).toFixed(1)}</p>
          <p className="text-xs text-[var(--taupe-dark)]">avg rating</p>
        </div>
        <div className="bg-white border border-[var(--taupe)]/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-medium text-[var(--coffee)]">{stats.longest_streak}</p>
          <p className="text-xs text-[var(--taupe-dark)]">best streak</p>
        </div>
      </motion.div>

      {/* Milestones */}
      {stats.milestones.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-xs font-medium text-[var(--taupe-dark)] mb-3">Milestones</h2>
          <div className="flex flex-wrap gap-2">
            {stats.milestones.map((m) => (
              <span
                key={m.label}
                className="px-3 py-1.5 text-sm bg-[var(--linen)] text-[var(--mocha)] rounded-full"
              >
                {m.label}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* This Week / Month */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 gap-4 mb-8"
      >
        <div className="bg-white border border-[var(--taupe)]/20 rounded-xl p-4">
          <p className="text-xs text-[var(--taupe-dark)] mb-1">This week</p>
          <p className="text-xl font-medium text-[var(--coffee)]">{stats.drinks_this_week} cups</p>
        </div>
        <div className="bg-white border border-[var(--taupe)]/20 rounded-xl p-4">
          <p className="text-xs text-[var(--taupe-dark)] mb-1">This month</p>
          <p className="text-xl font-medium text-[var(--coffee)]">{stats.drinks_this_month} cups</p>
        </div>
      </motion.div>

      {/* Top Cafes */}
      {stats.top_cafes.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xs font-medium text-[var(--taupe-dark)] mb-3">Top Cafes</h2>
          <div className="bg-white border border-[var(--taupe)]/20 rounded-xl divide-y divide-[var(--taupe)]/10">
            {stats.top_cafes.slice(0, 5).map((cafe, i) => (
              <div key={cafe.cafe_name} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span className={clsx(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                    i === 0 ? "bg-[var(--terracotta)] text-white" : "bg-[var(--linen)] text-[var(--mocha)]"
                  )}>
                    {i + 1}
                  </span>
                  <span className="text-[var(--coffee)]">{cafe.cafe_name}</span>
                </div>
                <span className="text-sm text-[var(--taupe-dark)]">{cafe.visit_count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Drink Types */}
      {stats.drink_type_breakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <h2 className="text-xs font-medium text-[var(--taupe-dark)] mb-3">Favorite Drinks</h2>
          <div className="bg-white border border-[var(--taupe)]/20 rounded-xl p-4 space-y-3">
            {stats.drink_type_breakdown.slice(0, 5).map((type, i) => {
              const max = Math.max(...stats.drink_type_breakdown.map(t => Number(t.count)));
              const pct = (Number(type.count) / max) * 100;
              return (
                <div key={type.drink_type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--coffee)]">{type.drink_type}</span>
                    <span className="text-[var(--taupe-dark)]">{type.count}</span>
                  </div>
                  <div className="h-1.5 bg-[var(--linen)] rounded-full">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className={clsx(
                        "h-full rounded-full",
                        i === 0 ? "bg-[var(--terracotta)]" : "bg-[var(--taupe)]"
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Best Day & Time */}
      {(stats.best_day || stats.best_time) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-4 mb-8"
        >
          {stats.best_day && (
            <div className="bg-white border border-[var(--taupe)]/20 rounded-xl p-4">
              <p className="text-xs text-[var(--taupe-dark)] mb-1">Best day</p>
              <p className="font-medium text-[var(--coffee)]">{stats.best_day.day}</p>
              <p className="text-xs text-[var(--mocha)]">{Number(stats.best_day.avg_rating).toFixed(1)} avg</p>
            </div>
          )}
          {stats.best_time && (
            <div className="bg-white border border-[var(--taupe)]/20 rounded-xl p-4">
              <p className="text-xs text-[var(--taupe-dark)] mb-1">Best time</p>
              <p className="font-medium text-[var(--coffee)] capitalize">{stats.best_time.time}</p>
              <p className="text-xs text-[var(--mocha)]">{Number(stats.best_time.avg_rating).toFixed(1)} avg</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Clear Data */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="pt-8 border-t border-[var(--taupe)]/20 text-center"
      >
        <AlertDialog.Root>
          <AlertDialog.Trigger asChild>
            <button className="text-xs text-[var(--taupe-dark)] hover:text-red-600 transition-colors">
              Clear all data
            </button>
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
            <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-xs shadow-xl z-50">
              <AlertDialog.Title className="font-medium text-[var(--coffee)] mb-2">
                Delete all data?
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-[var(--mocha)] mb-5">
                This permanently deletes all your entries and cafes.
              </AlertDialog.Description>
              <div className="flex gap-2">
                <AlertDialog.Cancel asChild>
                  <button className="flex-1 py-2 px-4 rounded-lg border border-[var(--taupe)]/30 text-sm text-[var(--mocha)] hover:bg-[var(--linen)] transition-colors">
                    Cancel
                  </button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <button
                    onClick={handleDeleteAllData}
                    disabled={deleting}
                    className="flex-1 py-2 px-4 rounded-lg bg-red-600 text-sm text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </motion.div>
    </div>
  );
}
