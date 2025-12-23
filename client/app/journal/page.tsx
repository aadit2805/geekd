'use client';

import { useState, useEffect, useRef } from 'react';
import { getCafes, createCafe, createDrink, getDrinkTypes, getLastDrink, type Cafe, type Drink } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Select from '@radix-ui/react-select';
import { clsx } from 'clsx';
import { PlacesAutocomplete, type PlaceResult } from '@/components/PlacesAutocomplete';

export default function LogPage() {
  const router = useRouter();
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [drinkTypes, setDrinkTypes] = useState<string[]>([]);
  const [lastDrink, setLastDrink] = useState<Drink | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewCafe, setShowNewCafe] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Form state
  const [selectedCafeId, setSelectedCafeId] = useState<string>('');
  const [drinkType, setDrinkType] = useState('');
  const [rating, setRating] = useState<number>(4);
  const [notes, setNotes] = useState('');

  // New cafe form
  const [newCafeName, setNewCafeName] = useState('');
  const [newCafeAddress, setNewCafeAddress] = useState('');
  const [newCafeCity, setNewCafeCity] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const [cafesData, typesData, lastData] = await Promise.all([
        getCafes(),
        getDrinkTypes(),
        getLastDrink(),
      ]);
      setCafes(cafesData);
      setDrinkTypes(typesData);
      setLastDrink(lastData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleQuickLog = async () => {
    if (!lastDrink) return;
    setLoading(true);
    try {
      await createDrink({
        cafe_id: lastDrink.cafe_id,
        drink_type: lastDrink.drink_type,
        rating: Number(lastDrink.rating),
      });
      router.push('/history');
    } catch (error) {
      console.error('Error quick logging:', error);
      setLoading(false);
    }
  };

  const handlePlaceSelect = (place: PlaceResult) => {
    setSelectedPlace(place);
    setNewCafeName(place.name);
    setNewCafeAddress(place.address);
    setNewCafeCity(place.city);
  };

  const handleCreateCafe = async () => {
    if (!newCafeName.trim()) return;

    try {
      const newCafe = await createCafe({
        name: newCafeName,
        address: newCafeAddress || undefined,
        city: newCafeCity || undefined,
        place_id: selectedPlace?.place_id,
        photo_reference: selectedPlace?.photo_reference,
        lat: selectedPlace?.lat,
        lng: selectedPlace?.lng,
      });

      setNewCafeName('');
      setNewCafeAddress('');
      setNewCafeCity('');
      setSelectedPlace(null);
      setShowNewCafe(false);
      setCafes(prev => [newCafe, ...prev]);
      setSelectedCafeId(String(newCafe.id));
    } catch (error) {
      console.error('Error creating cafe:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCafeId || !drinkType.trim()) return;

    setLoading(true);
    try {
      await createDrink({
        cafe_id: Number(selectedCafeId),
        drink_type: drinkType,
        rating,
        notes: notes || undefined,
      });
      router.push('/history');
    } catch (error) {
      console.error('Error logging drink:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDrinkTypes = drinkTypes.filter(
    (type) => type.toLowerCase().includes(drinkType.toLowerCase()) && type.toLowerCase() !== drinkType.toLowerCase()
  );

  return (
    <div className="max-w-md mx-auto">
      {/* Quick Log */}
      {lastDrink && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          type="button"
          onClick={handleQuickLog}
          disabled={loading}
          className="w-full mb-8 p-4 bg-[var(--linen)] border border-[var(--taupe)]/20 rounded-xl hover:border-[var(--terracotta)]/40 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--taupe-dark)] mb-0.5">Quick repeat</p>
              <p className="font-medium text-[var(--coffee)]">
                {lastDrink.drink_type} <span className="text-[var(--mocha)] font-normal">at</span> {lastDrink.cafe_name}
              </p>
            </div>
            <span className="text-sm text-[var(--terracotta)] opacity-0 group-hover:opacity-100 transition-opacity">
              Log →
            </span>
          </div>
        </motion.button>
      )}

      <motion.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Cafe */}
        <div>
          <label className="block text-xs font-medium text-[var(--mocha)] mb-2">Cafe</label>
          <Select.Root key={`cafe-${cafes.length}-${selectedCafeId}`} value={selectedCafeId} onValueChange={setSelectedCafeId}>
            <Select.Trigger
              className={clsx(
                "w-full px-4 py-3 text-left bg-white border border-[var(--taupe)]/30 rounded-lg",
                "hover:border-[var(--taupe)]/50 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-[var(--coffee)]/20",
                "data-[placeholder]:text-[var(--taupe-dark)]"
              )}
            >
              <Select.Value placeholder="Select cafe..." />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="bg-white border border-[var(--taupe)]/20 rounded-lg shadow-xl z-50 max-h-[280px] overflow-auto"
                position="popper"
                sideOffset={4}
              >
                <Select.Viewport className="p-1">
                  {cafes.map((cafe) => (
                    <Select.Item
                      key={cafe.id}
                      value={String(cafe.id)}
                      className="px-3 py-2 rounded cursor-pointer outline-none hover:bg-[var(--linen)] data-[highlighted]:bg-[var(--linen)]"
                    >
                      <Select.ItemText>
                        <span className="text-[var(--coffee)]">{cafe.name}</span>
                        {cafe.city && <span className="text-[var(--taupe-dark)] ml-2 text-sm">{cafe.city}</span>}
                      </Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          <button
            type="button"
            onClick={() => setShowNewCafe(!showNewCafe)}
            className="mt-2 text-sm text-[var(--terracotta)] hover:text-[var(--coffee)] transition-colors"
          >
            {showNewCafe ? '− Cancel' : '+ New cafe'}
          </button>

          <AnimatePresence>
            {showNewCafe && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-4 bg-white border border-[var(--taupe)]/20 rounded-lg space-y-3">
                  <PlacesAutocomplete onPlaceSelect={handlePlaceSelect} placeholder="Search places..." />

                  {selectedPlace && (
                    <div className="p-3 bg-[var(--linen)] rounded-lg">
                      <p className="font-medium text-[var(--coffee)] text-sm">{selectedPlace.name}</p>
                      <p className="text-xs text-[var(--mocha)]">{selectedPlace.address}</p>
                    </div>
                  )}

                  <div className="text-xs text-[var(--taupe-dark)] pt-2 border-t border-[var(--taupe)]/10">Or manually:</div>
                  <input
                    type="text"
                    value={newCafeName}
                    onChange={(e) => { setNewCafeName(e.target.value); setSelectedPlace(null); }}
                    placeholder="Cafe name"
                    className="w-full px-3 py-2 text-sm bg-[var(--bone)] border border-[var(--taupe)]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--coffee)]/20"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newCafeCity}
                      onChange={(e) => setNewCafeCity(e.target.value)}
                      placeholder="City"
                      className="px-3 py-2 text-sm bg-[var(--bone)] border border-[var(--taupe)]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--coffee)]/20"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCafe}
                      disabled={!newCafeName.trim()}
                      className="px-3 py-2 text-sm bg-[var(--coffee)] text-white rounded-lg hover:bg-[var(--espresso)] disabled:opacity-50 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Drink */}
        <div className="relative" ref={autocompleteRef}>
          <label className="block text-xs font-medium text-[var(--mocha)] mb-2">Drink</label>
          <input
            type="text"
            value={drinkType}
            onChange={(e) => { setDrinkType(e.target.value); setShowAutocomplete(true); }}
            onFocus={() => setShowAutocomplete(true)}
            placeholder="Cortado, Latte, Pour Over..."
            className="w-full px-4 py-3 bg-white border border-[var(--taupe)]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--coffee)]/20"
            required
          />

          <AnimatePresence>
            {showAutocomplete && filteredDrinkTypes.length > 0 && drinkType.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--taupe)]/20 rounded-lg shadow-lg z-50"
              >
                {filteredDrinkTypes.slice(0, 4).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setDrinkType(type); setShowAutocomplete(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-[var(--coffee)] hover:bg-[var(--linen)]"
                  >
                    {type}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {drinkTypes.length > 0 && !drinkType && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {drinkTypes.slice(0, 4).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDrinkType(type)}
                  className="px-2.5 py-1 text-xs bg-[var(--linen)] text-[var(--mocha)] rounded-full hover:bg-[var(--taupe)]/30 transition-colors"
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rating */}
        <div>
          <label className="block text-xs font-medium text-[var(--mocha)] mb-2">Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={clsx(
                  "flex-1 py-3 rounded-lg text-sm font-medium transition-all",
                  rating === n
                    ? "bg-[var(--coffee)] text-white"
                    : "bg-white border border-[var(--taupe)]/30 text-[var(--mocha)] hover:border-[var(--coffee)]/30"
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-[var(--taupe-dark)] px-1">
            <span>Skip it</span>
            <span>Perfect</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-[var(--mocha)] mb-2">
            Notes <span className="text-[var(--taupe-dark)] font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Tasting notes, the vibe..."
            className="w-full px-4 py-3 bg-white border border-[var(--taupe)]/30 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--coffee)]/20"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !selectedCafeId || !drinkType.trim()}
          className={clsx(
            "w-full py-3.5 rounded-lg font-medium transition-all",
            "bg-[var(--coffee)] text-white hover:bg-[var(--espresso)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {loading ? 'Saving...' : 'Log Entry'}
        </button>
      </motion.form>
    </div>
  );
}
