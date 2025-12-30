'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { parseNaturalLanguage, type ParsedDrinkInput, type Cafe } from '@/lib/api';

interface NaturalLanguageInputProps {
  onParsed: (data: ParsedDrinkInput, needsNewCafe: boolean) => void;
  existingCafes: Cafe[];
}

export function NaturalLanguageInput({ onParsed, existingCafes }: NaturalLanguageInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<{
    data: ParsedDrinkInput;
    interpretation: string;
  } | null>(null);

  const handleParse = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);
    setParsedResult(null);

    try {
      const response = await parseNaturalLanguage(text);

      if (!response.success || !response.data) {
        setError(response.error || 'Failed to parse input');
        return;
      }

      setParsedResult({
        data: response.data,
        interpretation: response.raw_interpretation || 'Parsed your entry',
      });
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Parse error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseResult = () => {
    if (!parsedResult) return;

    const needsNewCafe = !!(parsedResult.data.cafe_name && !parsedResult.data.cafe_id);
    onParsed(parsedResult.data, needsNewCafe);

    // Reset state
    setText('');
    setParsedResult(null);
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setText('');
    setParsedResult(null);
    setError(null);
    setIsExpanded(false);
  };

  return (
    <div className="mb-6">
      {!isExpanded ? (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full p-4 bg-gradient-to-r from-terracotta/10 to-coffee/10 border border-terracotta/20 rounded-xl hover:border-terracotta/40 transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg">
              <Sparkles className="w-4 h-4 text-terracotta" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-coffee text-sm">Quick add with AI</p>
              <p className="text-xs text-mocha">
                Type naturally: "amazing cortado at Blue Bottle, fruity, $6"
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-taupe-dark group-hover:text-coffee transition-colors" />
          </div>
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white border border-terracotta/20 rounded-xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-terracotta" />
              <span className="font-medium text-coffee text-sm">AI Quick Add</span>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="text-taupe-dark hover:text-coffee transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Had an amazing pour over at Blue Bottle, super fruity and bright, $6..."
            rows={3}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-bone border border-(--taupe)/30 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-(--terracotta)/20 text-sm disabled:opacity-50"
          />

          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg"
              >
                {error}
              </motion.p>
            )}

            {parsedResult && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-3"
              >
                <p className="text-xs text-mocha italic">
                  {parsedResult.interpretation}
                </p>

                <div className="bg-linen rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {parsedResult.data.drink_type && (
                      <div>
                        <span className="text-taupe-dark text-xs">Drink:</span>
                        <p className="text-coffee font-medium">{parsedResult.data.drink_type}</p>
                      </div>
                    )}
                    {parsedResult.data.cafe_name && (
                      <div>
                        <span className="text-taupe-dark text-xs">
                          Cafe{parsedResult.data.cafe_id ? '' : ' (will search)'}:
                        </span>
                        <p className="text-coffee font-medium">
                          {parsedResult.data.matched_cafe_name || parsedResult.data.cafe_name}
                        </p>
                        {parsedResult.data.location_hint && !parsedResult.data.cafe_id && (
                          <p className="text-taupe-dark text-xs">{parsedResult.data.location_hint}</p>
                        )}
                      </div>
                    )}
                    {parsedResult.data.rating && (
                      <div>
                        <span className="text-taupe-dark text-xs">Rating:</span>
                        <p className="text-coffee font-medium">{parsedResult.data.rating}/5</p>
                      </div>
                    )}
                    {parsedResult.data.price && (
                      <div>
                        <span className="text-taupe-dark text-xs">Price:</span>
                        <p className="text-coffee font-medium">${parsedResult.data.price}</p>
                      </div>
                    )}
                  </div>

                  {parsedResult.data.flavor_tags.length > 0 && (
                    <div>
                      <span className="text-taupe-dark text-xs">Flavors:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parsedResult.data.flavor_tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs bg-coffee/10 text-coffee rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsedResult.data.notes && (
                    <div>
                      <span className="text-taupe-dark text-xs">Notes:</span>
                      <p className="text-coffee text-sm">{parsedResult.data.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUseResult}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-coffee text-white rounded-lg hover:bg-espresso transition-colors text-sm font-medium"
                  >
                    <Check className="w-4 h-4" />
                    Use these values
                  </button>
                  <button
                    type="button"
                    onClick={() => { setParsedResult(null); setError(null); }}
                    className="px-4 py-2.5 text-sm text-mocha hover:text-coffee border border-(--taupe)/30 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!parsedResult && (
            <button
              type="button"
              onClick={handleParse}
              disabled={!text.trim() || isLoading}
              className={clsx(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                "bg-terracotta text-white hover:bg-terracotta/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Parse with AI
                </>
              )}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}
