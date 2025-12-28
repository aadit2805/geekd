'use client';

import { useState, useEffect } from 'react';
import { getStats, deleteAllUserData, type Stats } from '@/lib/api';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
        <div className="w-6 h-6 border-2 border-taupe border-t-coffee rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-mocha">Unable to load stats</p>
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
          className="mb-8 p-4 bg-linear-to-r from-(--terracotta)/10 to-(--sage)/10 border border-(--terracotta)/20 rounded-xl text-center"
        >
          <p className="text-sm text-mocha">
            <span className="text-2xl font-medium text-coffee">{stats.current_streak}</span>
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
        <Card className="border-(--taupe)/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-medium text-coffee">{stats.total_drinks}</p>
            <p className="text-xs text-taupe-dark">cups</p>
          </CardContent>
        </Card>
        <Card className="border-(--taupe)/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-medium text-coffee">{stats.cafes_visited}</p>
            <p className="text-xs text-taupe-dark">cafes</p>
          </CardContent>
        </Card>
        <Card className="border-(--taupe)/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-medium text-coffee">{Number(stats.average_rating).toFixed(1)}</p>
            <p className="text-xs text-taupe-dark">avg rating</p>
          </CardContent>
        </Card>
        <Card className="border-(--taupe)/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-medium text-coffee">{stats.longest_streak}</p>
            <p className="text-xs text-taupe-dark">best streak</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Milestones */}
      {stats.milestones.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-xs font-medium text-taupe-dark mb-3">Milestones</h2>
          <div className="flex flex-wrap gap-2">
            {stats.milestones.map((m) => (
              <Badge
                key={m.label}
                variant="secondary"
                className="bg-linen text-mocha"
              >
                {m.label}
              </Badge>
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
        <div className="bg-white border border-(--taupe)/20 rounded-xl p-4">
          <p className="text-xs text-taupe-dark mb-1">This week</p>
          <p className="text-xl font-medium text-coffee">{stats.drinks_this_week} cups</p>
        </div>
        <div className="bg-white border border-(--taupe)/20 rounded-xl p-4">
          <p className="text-xs text-taupe-dark mb-1">This month</p>
          <p className="text-xl font-medium text-coffee">{stats.drinks_this_month} cups</p>
        </div>
      </motion.div>

      {/* Spending Stats */}
      {stats.drinks_with_price > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.17 }}
          className="mb-8"
        >
          <h2 className="text-xs font-medium text-taupe-dark mb-3">Spending</h2>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-white border border-(--taupe)/20 rounded-xl p-4 text-center">
              <p className="text-xl font-medium text-coffee">${stats.spent_this_month.toFixed(0)}</p>
              <p className="text-xs text-taupe-dark">this month</p>
            </div>
            <div className="bg-white border border-(--taupe)/20 rounded-xl p-4 text-center">
              <p className="text-xl font-medium text-coffee">${stats.total_spent.toFixed(0)}</p>
              <p className="text-xs text-taupe-dark">total</p>
            </div>
            <div className="bg-white border border-(--taupe)/20 rounded-xl p-4 text-center">
              <p className="text-xl font-medium text-coffee">${stats.avg_price.toFixed(2)}</p>
              <p className="text-xs text-taupe-dark">avg/cup</p>
            </div>
          </div>
          {stats.price_by_cafe.length > 0 && (
            <div className="bg-white border border-(--taupe)/20 rounded-xl p-4">
              <p className="text-xs text-taupe-dark mb-2">Price by cafe</p>
              <div className="space-y-2">
                {stats.price_by_cafe.slice(0, 3).map((cafe, i) => (
                  <div key={cafe.cafe_name} className="flex justify-between text-sm">
                    <span className="text-coffee truncate">{cafe.cafe_name}</span>
                    <span className="text-taupe-dark">${Number(cafe.avg_price).toFixed(2)}/cup</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Flavor Profile */}
      {stats.top_flavor_tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          className="mb-8"
        >
          <h2 className="text-xs font-medium text-taupe-dark mb-3">Your Flavor Profile</h2>
          <div className="bg-white border border-(--taupe)/20 rounded-xl p-4">
            <div className="flex flex-wrap gap-2">
              {stats.top_flavor_tags.map((tag, i) => (
                <span
                  key={tag.tag}
                  className={clsx(
                    "px-3 py-1.5 rounded-full text-sm",
                    i === 0 ? "bg-terracotta text-white" : "bg-linen text-mocha"
                  )}
                >
                  {tag.tag} <span className="opacity-60">({tag.count})</span>
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Top Cafes */}
      {stats.top_cafes.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xs font-medium text-taupe-dark mb-3">Top Cafes</h2>
          <div className="bg-white border border-(--taupe)/20 rounded-xl divide-y divide-(--taupe)/10">
            {stats.top_cafes.slice(0, 5).map((cafe, i) => (
              <div key={cafe.cafe_name} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span className={clsx(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                    i === 0 ? "bg-terracotta text-white" : "bg-linen text-mocha"
                  )}>
                    {i + 1}
                  </span>
                  <span className="text-coffee">{cafe.cafe_name}</span>
                </div>
                <span className="text-sm text-taupe-dark">{cafe.visit_count}</span>
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
          <h2 className="text-xs font-medium text-taupe-dark mb-3">Favorite Drinks</h2>
          <div className="bg-white border border-(--taupe)/20 rounded-xl p-4 space-y-3">
            {stats.drink_type_breakdown.slice(0, 5).map((type, i) => {
              const max = Math.max(...stats.drink_type_breakdown.map(t => Number(t.count)));
              const pct = (Number(type.count) / max) * 100;
              return (
                <div key={type.drink_type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-coffee">{type.drink_type}</span>
                    <span className="text-taupe-dark">{type.count}</span>
                  </div>
                  <div className="h-1.5 bg-linen rounded-full">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className={clsx(
                        "h-full rounded-full",
                        i === 0 ? "bg-terracotta" : "bg-taupe"
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
            <div className="bg-white border border-(--taupe)/20 rounded-xl p-4">
              <p className="text-xs text-taupe-dark mb-1">Best day</p>
              <p className="font-medium text-coffee">{stats.best_day.day}</p>
              <p className="text-xs text-mocha">{Number(stats.best_day.avg_rating).toFixed(1)} avg</p>
            </div>
          )}
          {stats.best_time && (
            <div className="bg-white border border-(--taupe)/20 rounded-xl p-4">
              <p className="text-xs text-taupe-dark mb-1">Best time</p>
              <p className="font-medium text-coffee capitalize">{stats.best_time.time}</p>
              <p className="text-xs text-mocha">{Number(stats.best_time.avg_rating).toFixed(1)} avg</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Clear Data */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="pt-8 border-t border-(--taupe)/20 text-center"
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-xs text-taupe-dark hover:text-red-600 h-auto py-1">
              Clear all data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-white max-w-xs">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-coffee">Delete all data?</AlertDialogTitle>
              <AlertDialogDescription className="text-mocha">
                This permanently deletes all your entries and cafes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-(--taupe)/30 text-mocha hover:bg-linen">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAllData}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </div>
  );
}
