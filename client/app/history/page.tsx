'use client';

import { useState, useEffect } from 'react';
import { getDrinks, getCafes, deleteDrink, type Drink, type Cafe } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { clsx } from 'clsx';

export default function HistoryPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCafeId, setFilterCafeId] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [filterCafeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [drinksData, cafesData] = await Promise.all([
        getDrinks({
          cafe_id: filterCafeId !== 'all' ? Number(filterCafeId) : undefined,
          sort: 'logged_at',
          order: 'desc',
        }),
        getCafes(),
      ]);
      setDrinks(drinksData);
      setCafes(cafesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDrink(deleteId);
      setDrinks(drinks.filter(d => d.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting drink:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getRatingStyle = (rating: number | string) => {
    const r = Number(rating);
    if (r >= 4) return 'text-[var(--sage)]';
    if (r >= 3) return 'text-[var(--terracotta)]';
    return 'text-[var(--taupe-dark)]';
  };

  // Group drinks by date
  const groupedDrinks = drinks.reduce((acc, drink) => {
    const dateKey = new Date(drink.logged_at).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(drink);
    return acc;
  }, {} as Record<string, Drink[]>);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-2 px-2">
        <button
          onClick={() => setFilterCafeId('all')}
          className={clsx(
            "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors",
            filterCafeId === 'all'
              ? "bg-[var(--coffee)] text-white"
              : "bg-white border border-[var(--taupe)]/30 text-[var(--mocha)] hover:border-[var(--coffee)]/30"
          )}
        >
          All
        </button>
        {cafes.slice(0, 5).map((cafe) => (
          <button
            key={cafe.id}
            onClick={() => setFilterCafeId(String(cafe.id))}
            className={clsx(
              "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors",
              filterCafeId === String(cafe.id)
                ? "bg-[var(--coffee)] text-white"
                : "bg-white border border-[var(--taupe)]/30 text-[var(--mocha)] hover:border-[var(--coffee)]/30"
            )}
          >
            {cafe.name}
          </button>
        ))}
      </div>

      {/* Drinks List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[var(--taupe)] border-t-[var(--coffee)] rounded-full animate-spin" />
        </div>
      ) : drinks.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--mocha)]">No entries yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedDrinks).map(([dateKey, dayDrinks]) => (
            <div key={dateKey}>
              <p className="text-xs font-medium text-[var(--taupe-dark)] mb-2 px-1">
                {formatDate(dayDrinks[0].logged_at)}
              </p>
              <div className="bg-white rounded-xl border border-[var(--taupe)]/20 divide-y divide-[var(--taupe)]/10">
                <AnimatePresence mode="popLayout">
                  {dayDrinks.map((drink) => (
                    <motion.div
                      key={drink.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="group"
                    >
                      <div className="flex items-center gap-4 p-4">
                        {/* Rating */}
                        <div className={clsx("text-lg font-medium w-8 text-center", getRatingStyle(drink.rating))}>
                          {Number(drink.rating).toFixed(0)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium text-[var(--coffee)]">{drink.drink_type}</span>
                            <span className="text-sm text-[var(--taupe-dark)]">at {drink.cafe_name}</span>
                          </div>
                          {drink.notes && (
                            <p className="text-sm text-[var(--mocha)] mt-0.5 truncate">{drink.notes}</p>
                          )}
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteId(drink.id)}
                          className="text-xs text-[var(--taupe-dark)] hover:text-[var(--terracotta)] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Remove
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog.Root open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-xs shadow-xl z-50">
            <AlertDialog.Title className="font-medium text-[var(--coffee)] mb-2">
              Remove entry?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-[var(--mocha)] mb-5">
              This can't be undone.
            </AlertDialog.Description>
            <div className="flex gap-2">
              <AlertDialog.Cancel asChild>
                <button className="flex-1 py-2 px-4 rounded-lg border border-[var(--taupe)]/30 text-sm text-[var(--mocha)] hover:bg-[var(--linen)] transition-colors">
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2 px-4 rounded-lg bg-[var(--terracotta)] text-sm text-white hover:brightness-90 transition-all"
                >
                  Remove
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
