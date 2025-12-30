'use client';

import { useState, useEffect, useRef } from 'react';
import { getCafes, createCafe, createDrink, getDrinkTypes, getLastDrink, getRecommendations, type Cafe, type Drink, type ParsedDrinkInput, type FlavorRecommendation } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Select from '@radix-ui/react-select';
import { clsx } from 'clsx';
import { PlacesAutocomplete, type PlaceResult } from '@/components/PlacesAutocomplete';
import { NaturalLanguageInput } from '@/components/NaturalLanguageInput';
import { DollarSign, Lightbulb, RefreshCw } from 'lucide-react';

const FLAVOR_TAGS = [
  'Fruity', 'Nutty', 'Chocolatey', 'Caramel', 'Floral',
  'Bright', 'Smooth', 'Bold', 'Bitter', 'Sweet',
  'Earthy', 'Spicy', 'Citrus', 'Berry', 'Creamy'
];

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
  const [price, setPrice] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // New cafe form
  const [newCafeName, setNewCafeName] = useState('');
  const [newCafeAddress, setNewCafeAddress] = useState('');
  const [newCafeCity, setNewCafeCity] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [placesSearchQuery, setPlacesSearchQuery] = useState<string>('');

  // AI Recommendations
  const [recommendation, setRecommendation] = useState<FlavorRecommendation | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);

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
      loadRecommendations();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadRecommendations = async () => {
    setLoadingRec(true);
    try {
      const response = await getRecommendations();
      if (response.success && response.recommendation) {
        setRecommendation(response.recommendation);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoadingRec(false);
    }
  };

  const handleAIParsed = (data: ParsedDrinkInput, needsNewCafe: boolean) => {
    // Set drink details
    if (data.drink_type) setDrinkType(data.drink_type);
    if (data.rating) setRating(data.rating);
    if (data.price) setPrice(String(data.price));
    if (data.flavor_tags.length > 0) setSelectedTags(data.flavor_tags);
    if (data.notes) setNotes(data.notes);

    // Handle cafe
    if (data.cafe_id) {
      setSelectedCafeId(String(data.cafe_id));
    } else if (data.cafe_name && needsNewCafe) {
      // Open new cafe form with search query pre-filled
      setShowNewCafe(true);
      setNewCafeName(data.cafe_name);
      // Set the places search query to pre-populate and trigger autocomplete
      if (data.places_search_query) {
        setPlacesSearchQuery(data.places_search_query);
      } else {
        setPlacesSearchQuery(data.cafe_name);
      }
    }
  };

  const handleQuickLog = () => {
    if (!lastDrink) return;
    setSelectedCafeId(String(lastDrink.cafe_id));
    setDrinkType(lastDrink.drink_type);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handlePlaceSelect = async (place: PlaceResult) => {
    try {
      const newCafe = await createCafe({
        name: place.name,
        address: place.address || undefined,
        city: place.city || undefined,
        place_id: place.place_id,
        photo_reference: place.photo_reference,
        lat: place.lat,
        lng: place.lng,
      });

      setShowNewCafe(false);
      setCafes(prev => [newCafe, ...prev]);
      setSelectedCafeId(String(newCafe.id));
      setSelectedPlace(null);
      setNewCafeName('');
      setNewCafeAddress('');
      setNewCafeCity('');
      setPlacesSearchQuery('');
    } catch (error) {
      console.error('Error creating cafe:', error);
      // Fall back to manual entry if auto-create fails
      setSelectedPlace(place);
      setNewCafeName(place.name);
      setNewCafeAddress(place.address);
      setNewCafeCity(place.city);
      setPlacesSearchQuery('');
    }
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
      setPlacesSearchQuery('');
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
        price: price ? parseFloat(price) : undefined,
        flavor_tags: selectedTags.length > 0 ? selectedTags : undefined,
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
      {/* AI Quick Add */}
      <NaturalLanguageInput onParsed={handleAIParsed} existingCafes={cafes} />

      {/* AI Recommendation */}
      {recommendation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg mt-0.5">
                <Lightbulb className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-coffee font-medium mb-1">Try something new</p>
                <p className="text-sm text-mocha">{recommendation.suggestion}</p>
                {recommendation.recommended_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {recommendation.recommended_tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (!selectedTags.includes(tag)) {
                            setSelectedTags(prev => [...prev, tag]);
                          }
                        }}
                        className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full hover:bg-amber-200 transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={loadRecommendations}
              disabled={loadingRec}
              className="p-1.5 text-taupe-dark hover:text-coffee transition-colors"
              title="Get new suggestion"
            >
              <RefreshCw className={clsx("w-4 h-4", loadingRec && "animate-spin")} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Quick Log */}
      {lastDrink && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          type="button"
          onClick={handleQuickLog}
          className="w-full mb-8 p-4 bg-linen border border-(--taupe)/20 rounded-xl hover:border-(--terracotta)/40 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-taupe-dark mb-0.5">Quick repeat</p>
              <p className="font-medium text-coffee">
                {lastDrink.drink_type} <span className="text-mocha font-normal">at</span> {lastDrink.cafe_name}
              </p>
            </div>
            <span className="text-sm text-terracotta opacity-0 group-hover:opacity-100 transition-opacity">
              Fill →
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
          <label className="block text-xs font-medium text-mocha mb-2">Cafe</label>
          <Select.Root key={`cafe-${cafes.length}-${selectedCafeId}`} value={selectedCafeId} onValueChange={setSelectedCafeId}>
            <Select.Trigger
              className={clsx(
                "w-full px-4 py-3 text-left bg-white border border-(--taupe)/30 rounded-lg",
                "hover:border-(--taupe)/50 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-(--coffee)/20",
                "data-placeholder:text-taupe-dark"
              )}
            >
              <Select.Value placeholder="Select cafe..." />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="bg-white border border-(--taupe)/20 rounded-lg shadow-xl z-50 max-h-[280px] overflow-auto"
                position="popper"
                sideOffset={4}
              >
                <Select.Viewport className="p-1">
                  {cafes.map((cafe) => (
                    <Select.Item
                      key={cafe.id}
                      value={String(cafe.id)}
                      className="px-3 py-2 rounded cursor-pointer outline-none hover:bg-linen data-highlighted:bg-linen"
                    >
                      <Select.ItemText>
                        <span className="text-coffee">{cafe.name}</span>
                        {cafe.city && <span className="text-taupe-dark ml-2 text-sm">{cafe.city}</span>}
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
            className="mt-2 text-sm text-terracotta hover:text-coffee transition-colors"
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
                <div className="mt-3 p-4 bg-white border border-(--taupe)/20 rounded-lg space-y-3">
                  <PlacesAutocomplete onPlaceSelect={handlePlaceSelect} placeholder="Search places..." initialValue={placesSearchQuery} />

                  {selectedPlace && (
                    <div className="p-3 bg-linen rounded-lg">
                      <p className="font-medium text-coffee text-sm">{selectedPlace.name}</p>
                      <p className="text-xs text-mocha">{selectedPlace.address}</p>
                    </div>
                  )}

                  <div className="text-xs text-taupe-dark pt-2 border-t border-(--taupe)/10">Or manually:</div>
                  <input
                    type="text"
                    value={newCafeName}
                    onChange={(e) => { setNewCafeName(e.target.value); setSelectedPlace(null); }}
                    placeholder="Cafe name"
                    className="w-full px-3 py-2 text-sm bg-bone border border-(--taupe)/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--coffee)/20"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newCafeCity}
                      onChange={(e) => setNewCafeCity(e.target.value)}
                      placeholder="City"
                      className="px-3 py-2 text-sm bg-bone border border-(--taupe)/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--coffee)/20"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCafe}
                      disabled={!newCafeName.trim()}
                      className="px-3 py-2 text-sm bg-coffee text-white rounded-lg hover:bg-espresso disabled:opacity-50 transition-colors"
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
          <label className="block text-xs font-medium text-mocha mb-2">Drink</label>
          <input
            type="text"
            value={drinkType}
            onChange={(e) => { setDrinkType(e.target.value); setShowAutocomplete(true); }}
            onFocus={() => setShowAutocomplete(true)}
            placeholder="Cortado, Latte, Pour Over..."
            className="w-full px-4 py-3 bg-white border border-(--taupe)/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--coffee)/20"
            required
          />

          <AnimatePresence>
            {showAutocomplete && filteredDrinkTypes.length > 0 && drinkType.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-(--taupe)/20 rounded-lg shadow-lg z-50"
              >
                {filteredDrinkTypes.slice(0, 4).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setDrinkType(type); setShowAutocomplete(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-coffee hover:bg-linen"
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
                  className="px-2.5 py-1 text-xs bg-linen text-mocha rounded-full hover:bg-(--taupe)/30 transition-colors"
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rating */}
        <div>
          <label className="block text-xs font-medium text-mocha mb-2">Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={clsx(
                  "flex-1 py-3 rounded-lg text-sm font-medium transition-all",
                  rating === n
                    ? "bg-coffee text-white"
                    : "bg-white border border-(--taupe)/30 text-mocha hover:border-(--coffee)/30"
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-taupe-dark px-1">
            <span>Skip it</span>
            <span>Perfect</span>
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-medium text-mocha mb-2">
            Price <span className="text-taupe-dark font-normal">(optional)</span>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-taupe-dark" />
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full pl-9 pr-4 py-3 bg-white border border-(--taupe)/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--coffee)/20"
            />
          </div>
        </div>

        {/* Flavor Tags */}
        <div>
          <label className="block text-xs font-medium text-mocha mb-2">
            Flavor Profile <span className="text-taupe-dark font-normal">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {FLAVOR_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={clsx(
                  "px-3 py-1.5 text-xs rounded-full transition-all",
                  selectedTags.includes(tag)
                    ? "bg-coffee text-white"
                    : "bg-linen text-mocha hover:bg-(--taupe)/20"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-mocha mb-2">
            Notes <span className="text-taupe-dark font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Tasting notes, the vibe..."
            className="w-full px-4 py-3 bg-white border border-(--taupe)/30 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-(--coffee)/20"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !selectedCafeId || !drinkType.trim()}
          className={clsx(
            "w-full py-3.5 rounded-lg font-medium transition-all",
            "bg-coffee text-white hover:bg-espresso",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {loading ? 'Saving...' : 'Log Entry'}
        </button>
      </motion.form>
    </div>
  );
}
