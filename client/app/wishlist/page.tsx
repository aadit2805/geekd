'use client';

import { useState, useEffect } from 'react';
import { getWishlist, addToWishlist, removeFromWishlist, convertWishlistToCafe, type WishlistItem } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PlacesAutocomplete, type PlaceResult } from '@/components/PlacesAutocomplete';
import { MapPin, Trash2, Plus, X } from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';

export default function WishlistPage() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const data = await getWishlist();
      setWishlist(data);
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlace = async (place: PlaceResult) => {
    setError(null);
    try {
      const newItem = await addToWishlist({
        name: place.name,
        address: place.address,
        city: place.city,
        place_id: place.place_id,
        photo_reference: place.photo_reference,
        lat: place.lat,
        lng: place.lng,
      });
      setWishlist(prev => [newItem, ...prev]);
      setShowAdd(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add to wishlist');
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await removeFromWishlist(id);
      setWishlist(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  const handleVisit = async (id: number) => {
    try {
      await convertWishlistToCafe(id);
      setWishlist(prev => prev.filter(item => item.id !== id));
      router.push('/journal');
    } catch (error) {
      console.error('Error marking as visited:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-taupe border-t-coffee rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="font-serif text-3xl text-coffee mb-1">Wishlist</h1>
          <p className="text-sm text-taupe-dark">
            {wishlist.length} {wishlist.length === 1 ? 'cafe' : 'cafes'} to try
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className={clsx(
            "p-2 rounded-full transition-colors",
            showAdd ? "bg-taupe/20 text-coffee" : "bg-coffee text-white hover:bg-espresso"
          )}
        >
          {showAdd ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </motion.div>

      {/* Add New */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-white border border-(--taupe)/20 rounded-xl p-4">
              <p className="text-sm text-mocha mb-3">Search for a cafe to add</p>
              <PlacesAutocomplete
                onPlaceSelect={handleAddPlace}
                placeholder="Search cafes..."
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wishlist Items */}
      {wishlist.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <MapPin className="w-12 h-12 mx-auto mb-4 text-taupe" />
          <p className="text-mocha mb-2">No cafes on your wishlist yet</p>
          <p className="text-sm text-taupe-dark mb-6">
            Add cafes you want to visit
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-coffee text-white rounded-lg hover:bg-espresso transition-colors"
          >
            Add a cafe
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {wishlist.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white border border-(--taupe)/20 rounded-xl p-4 group"
            >
              <div className="flex gap-4">
                {item.photo_reference && (
                  <img
                    src={item.photo_reference}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-coffee truncate">{item.name}</h3>
                  {item.address && (
                    <p className="text-sm text-taupe-dark truncate mt-0.5">{item.address}</p>
                  )}
                  {item.city && (
                    <p className="text-xs text-taupe mt-1">{item.city}</p>
                  )}
                  <button
                    onClick={() => handleVisit(item.id)}
                    className="mt-2 px-3 py-1.5 text-xs bg-sage text-white rounded-lg hover:bg-sage/80 transition-colors"
                  >
                    Mark as Visited
                  </button>
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-2 text-taupe-dark hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all self-start"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Map Link */}
      {wishlist.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <Link
            href="/map"
            className="text-sm text-terracotta hover:text-coffee transition-colors"
          >
            View on map →
          </Link>
        </motion.div>
      )}
    </div>
  );
}
