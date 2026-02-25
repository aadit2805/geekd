'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coffee } from 'lucide-react';
import { clsx } from 'clsx';
import type { QualityTier, RankedDrink } from '@/lib/api';
import { getPhotoUrl } from '@/lib/photos';

interface DrinkToRank {
  id: number;
  drink_type: string;
  cafe_name: string;
  tier: QualityTier;
}

interface ComparisonModalProps {
  drink: DrinkToRank;
  tierRankings: RankedDrink[];
  onComplete: (rank: number) => void;
  onCancel: () => void;
}

const tierColors = {
  good: { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  mid: { bg: 'bg-yellow-500', light: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
  bad: { bg: 'bg-red-400', light: 'bg-red-50', text: 'text-red-500', border: 'border-red-200' },
};

export function ComparisonModal({ drink, tierRankings, onComplete, onCancel }: ComparisonModalProps) {
  // Binary search state
  const [low, setLow] = useState(0);
  const [high, setHigh] = useState(tierRankings.length);
  const [currentIndex, setCurrentIndex] = useState(Math.floor(tierRankings.length / 2));
  const [comparisons, setComparisons] = useState(0);

  const maxComparisons = Math.ceil(Math.log2(tierRankings.length + 1));
  const comparisonDrink = tierRankings[currentIndex];
  const colors = tierColors[drink.tier];

  // Derived directly from state — no useEffect needed
  const done = low >= high;
  const finalRank = done ? low + 1 : null;

  const handleChoice = (newDrinkIsBetter: boolean) => {
    setComparisons(c => c + 1);

    if (newDrinkIsBetter) {
      const newHigh = currentIndex;
      setHigh(newHigh);
      const newMid = Math.floor((low + newHigh) / 2);
      setCurrentIndex(newMid);
    } else {
      const newLow = currentIndex + 1;
      setLow(newLow);
      const newMid = Math.floor((newLow + high) / 2);
      setCurrentIndex(newMid);
    }
  };

  const handleConfirm = () => {
    if (finalRank !== null) {
      onComplete(finalRank);
    }
  };

  const DrinkCard = ({
    drinkData,
    isNew,
    onClick
  }: {
    drinkData: { drink_type: string; cafe_name: string; cafe_photo?: string | null; score?: number };
    isNew?: boolean;
    onClick?: () => void;
  }) => (
    <motion.button
      whileHover={onClick ? { scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={!onClick}
      className={clsx(
        "flex-1 p-4 rounded-2xl border-2 text-left transition-all",
        onClick ? "hover:shadow-lg cursor-pointer" : "cursor-default",
        isNew
          ? `${colors.light} ${colors.border}`
          : "bg-white border-(--taupe)/20 hover:border-(--taupe)/40"
      )}
    >
      {/* Photo */}
      {drinkData.cafe_photo ? (
        <img
          src={getPhotoUrl(drinkData.cafe_photo) || ''}
          alt={drinkData.cafe_name}
          className="w-full h-24 rounded-xl object-cover mb-3"
        />
      ) : (
        <div className="w-full h-24 rounded-xl bg-linen flex items-center justify-center mb-3">
          <Coffee className="w-8 h-8 text-taupe-dark" />
        </div>
      )}

      {/* Info */}
      <div className="space-y-1">
        {isNew && (
          <span className={clsx("inline-block px-2 py-0.5 text-xs rounded-full mb-1", colors.bg, "text-white")}>
            New
          </span>
        )}
        {drinkData.score !== undefined && (
          <span className="inline-block px-2 py-0.5 text-xs bg-coffee/10 text-coffee rounded-full mb-1">
            {Number(drinkData.score).toFixed(1)}
          </span>
        )}
        <h3 className="font-medium text-coffee leading-tight">{drinkData.drink_type}</h3>
        <p className="text-sm text-mocha">{drinkData.cafe_name}</p>
      </div>
    </motion.button>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-bone rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl"
        >
          {/* Header */}
          <div className={clsx("p-4 flex items-center justify-between", colors.light)}>
            <div>
              <h2 className="font-serif text-xl text-coffee">
                {done ? 'Ranked!' : 'Which was better?'}
              </h2>
              <p className="text-sm text-mocha">
                {done
                  ? `#${finalRank} in your ${drink.tier} drinks`
                  : `${comparisons + 1} of ~${maxComparisons}`
                }
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-taupe-dark hover:text-coffee transition-colors rounded-full hover:bg-white/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {!done && comparisonDrink ? (
              <>
                <p className="text-center text-sm text-mocha mb-4">
                  Tap the one you prefer
                </p>

                <div className="flex gap-3 mb-4">
                  <DrinkCard
                    drinkData={{
                      drink_type: drink.drink_type,
                      cafe_name: drink.cafe_name,
                    }}
                    isNew
                    onClick={() => handleChoice(true)}
                  />
                  <DrinkCard
                    drinkData={{
                      drink_type: comparisonDrink.drink_type,
                      cafe_name: comparisonDrink.cafe_name,
                      cafe_photo: comparisonDrink.cafe_photo,
                      score: comparisonDrink.score,
                    }}
                    onClick={() => handleChoice(false)}
                  />
                </div>

                {/* Progress */}
                <div className="flex justify-center gap-1">
                  {Array.from({ length: maxComparisons }).map((_, i) => (
                    <div
                      key={i}
                      className={clsx(
                        "w-2 h-2 rounded-full transition-colors",
                        i < comparisons ? colors.bg : "bg-taupe/30"
                      )}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Result */}
                <div className="text-center py-4">
                  <div className={clsx("inline-flex items-center justify-center w-16 h-16 rounded-full mb-3", colors.light)}>
                    <span className={clsx("text-2xl font-serif", colors.text)}>#{finalRank}</span>
                  </div>
                  <h3 className="font-medium text-coffee text-lg">{drink.drink_type}</h3>
                  <p className="text-mocha text-sm">{drink.cafe_name}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onCancel}
                    className="flex-1 py-3 px-4 rounded-xl border border-(--taupe)/30 text-mocha hover:bg-linen transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={clsx("flex-1 py-3 px-4 rounded-xl text-white transition-colors font-medium text-sm", colors.bg)}
                  >
                    Save Ranking
                  </button>
                </div>
              </>
            )}
          </div>

          {!done && (
            <div className="p-3 border-t border-(--taupe)/20 text-center">
              <button
                onClick={onCancel}
                className="text-xs text-taupe-dark hover:text-mocha transition-colors"
              >
                Skip ranking
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
