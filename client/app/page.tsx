'use client';

import { useState, useEffect, useRef } from 'react';
import { getCafes, createCafe, createDrink, getDrinkTypes, getLastDrink, type Cafe, type Drink } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Select from '@radix-ui/react-select';
import * as Slider from '@radix-ui/react-slider';
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
  const [rating, setRating] = useState<number>(3.5);
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

  const handleQuickLog = () => {
    if (!lastDrink) return;
    setSelectedCafeId(String(lastDrink.cafe_id));
    setDrinkType(lastDrink.drink_type);
    setRating(Number(lastDrink.rating));
    setNotes('');
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

      // Update cafes list and auto-select the new cafe
      setCafes(prev => [newCafe, ...prev]);

      // Clear form
      setNewCafeName('');
      setNewCafeAddress('');
      setNewCafeCity('');
      setSelectedPlace(null);
      setShowNewCafe(false);

      // Auto-select after state updates
      setTimeout(() => {
        setSelectedCafeId(String(newCafe.id));
      }, 0);
    } catch (error) {
      console.error('Error creating cafe:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCafeId || !drinkType.trim()) {
      return;
    }

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

  const ratingLabels = ['Skip', 'Meh', 'Decent', 'Good', 'Great', 'Perfect'];

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h1 className="font-[family-name:var(--font-serif)] text-4xl md:text-5xl text-[var(--coffee)] mb-4">
          New Entry
        </h1>
        <p className="text-[var(--latte)] tracking-wide">
          Document your coffee moment
        </p>
      </motion.div>

      {/* Quick Log */}
      {lastDrink && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mb-10"
        >
          <button
            type="button"
            onClick={handleQuickLog}
            className="w-full p-4 bg-[var(--card)] border border-[var(--taupe)]/30 rounded-xl hover:border-[var(--terracotta)]/50 hover:shadow-md transition-all duration-300 text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs tracking-[0.15em] uppercase text-[var(--latte)] mb-1">
                  Quick Log
                </p>
                <p className="font-medium text-[var(--coffee)]">
                  {lastDrink.drink_type} at {lastDrink.cafe_name}
                </p>
                <p className="text-sm text-[var(--mocha)]">
                  Rated {Number(lastDrink.rating).toFixed(1)}
                </p>
              </div>
              <span className="text-[var(--terracotta)] opacity-0 group-hover:opacity-100 transition-opacity">
                Repeat
              </span>
            </div>
          </button>
        </motion.div>
      )}

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        onSubmit={handleSubmit}
        className="space-y-10"
      >
        {/* Cafe Selection */}
        <div className="space-y-3">
          <label className="block text-xs tracking-[0.15em] uppercase text-[var(--mocha)]">
            Where
          </label>
          <Select.Root value={selectedCafeId} onValueChange={setSelectedCafeId}>
            <Select.Trigger
              className={clsx(
                "w-full px-4 py-4 text-left bg-[var(--card)] border border-[var(--taupe)]/40 rounded-lg text-[var(--espresso)]",
                "hover:border-[var(--taupe)] transition-colors duration-200",
                "focus:outline-none focus:ring-2 focus:ring-[var(--sage)]/30 focus:border-[var(--sage)]",
                "data-[placeholder]:text-[var(--taupe-dark)]"
              )}
            >
              <Select.Value placeholder="Select a cafe..." />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="bg-white border border-[var(--taupe)]/30 rounded-lg shadow-xl overflow-hidden z-50 max-h-[300px]"
                position="popper"
                sideOffset={4}
              >
                <Select.Viewport className="p-2">
                  {cafes.map((cafe, index) => (
                    <Select.Item
                      key={cafe.id}
                      value={String(cafe.id)}
                      className={clsx(
                        "px-4 py-3 rounded-md cursor-pointer outline-none",
                        "hover:bg-[var(--linen)] focus:bg-[var(--linen)]",
                        "data-[highlighted]:bg-[var(--linen)]"
                      )}
                    >
                      <Select.ItemText>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="block font-medium text-[var(--coffee)]">{cafe.name}</span>
                            {cafe.city && (
                              <span className="block text-sm text-[var(--latte)]">{cafe.city}</span>
                            )}
                          </div>
                          {index === 0 && cafe.last_visit && (
                            <span className="text-xs text-[var(--sage)] bg-[var(--sage)]/10 px-2 py-1 rounded">
                              Recent
                            </span>
                          )}
                        </div>
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
            className="text-sm text-[var(--terracotta)] hover:text-[var(--coffee)] transition-colors tracking-wide"
          >
            {showNewCafe ? '− Cancel' : '+ Add new cafe'}
          </button>

          {/* Inline New Cafe Form */}
          <AnimatePresence>
            {showNewCafe && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-5 bg-white border border-[var(--taupe)]/30 rounded-xl space-y-4">
                  <div>
                    <label className="block text-xs tracking-[0.15em] uppercase text-[var(--mocha)] mb-2">
                      Search for a cafe
                    </label>
                    <PlacesAutocomplete
                      onPlaceSelect={handlePlaceSelect}
                      placeholder="Search Google Places..."
                    />
                  </div>

                  {selectedPlace && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-[var(--linen)] rounded-xl space-y-2"
                    >
                      {selectedPlace.photo_reference && (
                        <img
                          src={selectedPlace.photo_reference}
                          alt={selectedPlace.name}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      )}
                      <p className="font-medium text-[var(--coffee)]">{selectedPlace.name}</p>
                      <p className="text-sm text-[var(--mocha)]">{selectedPlace.address}</p>
                    </motion.div>
                  )}

                  <div className="border-t border-[var(--taupe)]/20 pt-4">
                    <p className="text-xs text-[var(--taupe-dark)] mb-3">Or enter manually:</p>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newCafeName}
                        onChange={(e) => {
                          setNewCafeName(e.target.value);
                          setSelectedPlace(null);
                        }}
                        placeholder="Cafe name"
                        className="w-full px-4 py-3 bg-[var(--bone-light)] border border-[var(--taupe)]/40 rounded-lg text-[var(--espresso)] placeholder:text-[var(--taupe-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)]/30 focus:border-[var(--sage)]"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={newCafeAddress}
                          onChange={(e) => setNewCafeAddress(e.target.value)}
                          placeholder="Address"
                          className="w-full px-4 py-3 bg-[var(--bone-light)] border border-[var(--taupe)]/40 rounded-lg text-[var(--espresso)] placeholder:text-[var(--taupe-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)]/30 focus:border-[var(--sage)]"
                        />
                        <input
                          type="text"
                          value={newCafeCity}
                          onChange={(e) => setNewCafeCity(e.target.value)}
                          placeholder="City"
                          className="w-full px-4 py-3 bg-[var(--bone-light)] border border-[var(--taupe)]/40 rounded-lg text-[var(--espresso)] placeholder:text-[var(--taupe-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)]/30 focus:border-[var(--sage)]"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateCafe}
                    disabled={!newCafeName.trim()}
                    className="w-full py-3 px-4 rounded-lg font-medium transition-colors bg-[var(--coffee)] text-[var(--card)] hover:bg-[var(--espresso)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Cafe
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Drink Type with Autocomplete */}
        <div className="space-y-3 relative" ref={autocompleteRef}>
          <label className="block text-xs tracking-[0.15em] uppercase text-[var(--mocha)]">
            What
          </label>
          <input
            type="text"
            value={drinkType}
            onChange={(e) => {
              setDrinkType(e.target.value);
              setShowAutocomplete(true);
            }}
            onFocus={() => setShowAutocomplete(true)}
            placeholder="Cortado, Latte, Pour Over..."
            className={clsx(
              "w-full px-4 py-4 bg-[var(--card)] border border-[var(--taupe)]/40 rounded-lg text-[var(--espresso)]",
              "hover:border-[var(--taupe)] transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-[var(--sage)]/30 focus:border-[var(--sage)]",
              "placeholder:text-[var(--taupe-dark)]"
            )}
            required
          />

          {/* Autocomplete Dropdown */}
          <AnimatePresence>
            {showAutocomplete && filteredDrinkTypes.length > 0 && drinkType.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--taupe)]/30 rounded-lg shadow-xl z-50 overflow-hidden"
              >
                {filteredDrinkTypes.slice(0, 5).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setDrinkType(type);
                      setShowAutocomplete(false);
                    }}
                    className="w-full px-4 py-3 text-left text-[var(--coffee)] hover:bg-[var(--linen)] transition-colors"
                  >
                    {type}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick type buttons */}
          {drinkTypes.length > 0 && !drinkType && (
            <div className="flex flex-wrap gap-2 mt-2">
              {drinkTypes.slice(0, 4).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDrinkType(type)}
                  className="px-3 py-1.5 text-sm bg-[var(--linen)] text-[var(--mocha)] rounded-full hover:bg-[var(--taupe)] hover:text-[var(--coffee)] transition-colors"
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rating */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="block text-xs tracking-[0.15em] uppercase text-[var(--mocha)]">
              How was it
            </label>
            <span className="text-lg font-[family-name:var(--font-serif)] text-[var(--coffee)]">
              {rating.toFixed(1)} <span className="text-sm text-[var(--latte)]">/ 5</span>
            </span>
          </div>

          <Slider.Root
            value={[rating]}
            onValueChange={([val]) => setRating(val)}
            min={0}
            max={5}
            step={0.5}
            className="relative flex items-center select-none touch-none w-full h-6"
          >
            <Slider.Track className="bg-[var(--linen)] relative grow rounded-full h-2">
              <Slider.Range className="absolute bg-gradient-to-r from-[var(--terracotta-muted)] to-[var(--terracotta)] rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb
              className={clsx(
                "block w-6 h-6 bg-white rounded-full shadow-lg border-2 border-[var(--terracotta)]",
                "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[var(--terracotta)]/30",
                "transition-transform cursor-grab active:cursor-grabbing"
              )}
            />
          </Slider.Root>

          <div className="flex justify-between text-xs text-[var(--taupe-dark)]">
            {ratingLabels.map((label, i) => (
              <span key={label} className={clsx(
                "transition-colors",
                Math.round(rating) === i && "text-[var(--coffee)] font-medium"
              )}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-3">
          <label className="block text-xs tracking-[0.15em] uppercase text-[var(--mocha)]">
            Notes
            <span className="normal-case tracking-normal text-[var(--taupe-dark)] ml-2">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Tasting notes, the vibe, who you were with..."
            className={clsx(
              "w-full px-4 py-4 bg-[var(--card)] border border-[var(--taupe)]/40 rounded-lg resize-none text-[var(--espresso)]",
              "hover:border-[var(--taupe)] transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-[var(--sage)]/30 focus:border-[var(--sage)]",
              "placeholder:text-[var(--taupe-dark)]"
            )}
          />
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={loading || !selectedCafeId || !drinkType.trim()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={clsx(
            "w-full py-4 px-6 rounded-lg font-medium tracking-wide transition-all duration-300",
            "bg-[var(--coffee)] text-[var(--card)] hover:bg-[var(--espresso)]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          )}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-[var(--card)]/30 border-t-[var(--card)] rounded-full"
              />
              Saving...
            </span>
          ) : (
            'Save Entry'
          )}
        </motion.button>
      </motion.form>

    </div>
  );
}
