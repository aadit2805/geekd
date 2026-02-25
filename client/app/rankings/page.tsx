'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getRankings, removeFromRankings, type RankedDrink, type QualityTier } from '@/lib/api';
import { getPhotoUrl } from '@/lib/photos';
import { Trash2, Coffee } from 'lucide-react';
import { clsx } from 'clsx';

const tierConfig = {
  good: { label: 'Good', color: 'bg-green-500', lightBg: 'bg-green-50', text: 'text-green-600', range: '6.0 - 10.0' },
  mid: { label: 'Mid', color: 'bg-yellow-500', lightBg: 'bg-yellow-50', text: 'text-yellow-600', range: '3.0 - 5.9' },
  bad: { label: 'Bad', color: 'bg-red-400', lightBg: 'bg-red-50', text: 'text-red-500', range: '0.0 - 2.9' },
};

export default function RankingsPage() {
  const [rankings, setRankings] = useState<RankedDrink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const rankingsData = await getRankings();
      setRankings(rankingsData);
    } catch (error) {
      console.error('Error loading rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (drinkId: number) => {
    try {
      await removeFromRankings(drinkId);
      await loadData();
    } catch (error) {
      console.error('Error removing drink:', error);
    }
  };

  // Group rankings by tier
  const groupedRankings = rankings.reduce((acc, drink) => {
    const tier = drink.quality_tier;
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(drink);
    return acc;
  }, {} as Record<QualityTier, RankedDrink[]>);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="animate-pulse text-mocha">Loading rankings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-serif text-3xl text-coffee mb-2">Your Rankings</h1>
        <p className="text-mocha text-sm">
          {rankings.length === 0
            ? 'Log some drinks to start ranking'
            : `${rankings.length} drink${rankings.length !== 1 ? 's' : ''} ranked`
          }
        </p>
      </motion.div>

      {rankings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 bg-linen rounded-2xl border border-(--taupe)/20"
        >
          <Coffee className="w-12 h-12 text-taupe-dark mx-auto mb-4" />
          <p className="text-mocha mb-2">No rankings yet</p>
          <p className="text-sm text-taupe-dark">
            Log a drink and rate it to start building your rankings
          </p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {(['good', 'mid', 'bad'] as QualityTier[]).map((tier) => {
            const tierDrinks = groupedRankings[tier] || [];
            const config = tierConfig[tier];

            if (tierDrinks.length === 0) return null;

            return (
              <motion.div
                key={tier}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Tier Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={clsx("w-3 h-3 rounded-full", config.color)} />
                  <h2 className="font-medium text-coffee">{config.label}</h2>
                  <span className="text-xs text-taupe-dark">{config.range}</span>
                  <span className="text-xs text-taupe-dark ml-auto">{tierDrinks.length} drinks</span>
                </div>

                {/* Drinks List */}
                <div className="space-y-2">
                  {tierDrinks
                    .slice()
                    .sort((a, b) => b.score - a.score)
                    .map((drink, index) => (
                    <motion.div
                      key={drink.drink_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-(--taupe)/15 hover:border-(--taupe)/30 transition-all group"
                    >
                      {/* Score */}
                      <div className={clsx(
                        "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-medium",
                        config.lightBg, config.text
                      )}>
                        {Number(drink.score).toFixed(1)}
                      </div>

                      {/* Photo */}
                      {drink.cafe_photo ? (
                        <img
                          src={getPhotoUrl(drink.cafe_photo) || ''}
                          alt={drink.cafe_name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-linen flex items-center justify-center flex-shrink-0">
                          <Coffee className="w-4 h-4 text-taupe-dark" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-coffee text-sm truncate">{drink.drink_type}</p>
                        <p className="text-xs text-mocha truncate">{drink.cafe_name}</p>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => handleRemove(drink.drink_id)}
                        className="p-2 text-taupe-dark hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
