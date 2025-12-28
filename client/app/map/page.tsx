'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCafes, getWishlist, type Cafe, type WishlistItem } from '@/lib/api';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { clsx } from 'clsx';

const libraries: ("places")[] = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '1rem',
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060,
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#c9d6df' }],
    },
    {
      featureType: 'landscape',
      elementType: 'geometry',
      stylers: [{ color: '#f5f0e8' }],
    },
  ],
};

type SelectedItem = (Cafe & { type: 'visited' }) | (WishlistItem & { type: 'wishlist' });

export default function MapPage() {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [showWishlist, setShowWishlist] = useState(true);
  const [showVisited, setShowVisited] = useState(true);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cafesData, wishlistData] = await Promise.all([
        getCafes(),
        getWishlist(),
      ]);
      setCafes(cafesData);
      setWishlist(wishlistData);

      // Center map on first cafe with coordinates
      const cafeWithCoords = cafesData.find(c => c.lat && c.lng);
      if (cafeWithCoords && cafeWithCoords.lat && cafeWithCoords.lng) {
        setMapCenter({ lat: Number(cafeWithCoords.lat), lng: Number(cafeWithCoords.lng) });
      } else {
        const wishlistWithCoords = wishlistData.find(w => w.lat && w.lng);
        if (wishlistWithCoords && wishlistWithCoords.lat && wishlistWithCoords.lng) {
          setMapCenter({ lat: Number(wishlistWithCoords.lat), lng: Number(wishlistWithCoords.lng) });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onMapClick = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const cafesWithLocation = cafes.filter(c => c.lat && c.lng);
  const wishlistWithLocation = wishlist.filter(w => w.lat && w.lng);

  if (loadError) {
    return (
      <div className="text-center py-32">
        <p className="text-latte">Error loading maps</p>
      </div>
    );
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex justify-center py-32">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-taupe border-t-coffee rounded-full"
        />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <h1 className="font-serif text-4xl md:text-5xl text-coffee mb-4">
          Your Coffee Map
        </h1>
        <p className="text-latte tracking-wide mb-4">
          {cafesWithLocation.length} visited · {wishlistWithLocation.length} on wishlist
        </p>
        {/* Toggle Buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setShowVisited(!showVisited)}
            className={clsx(
              "px-4 py-2 rounded-full text-sm transition-all flex items-center gap-2",
              showVisited
                ? "bg-terracotta text-white"
                : "bg-linen text-mocha"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-current" />
            Visited
          </button>
          <button
            onClick={() => setShowWishlist(!showWishlist)}
            className={clsx(
              "px-4 py-2 rounded-full text-sm transition-all flex items-center gap-2",
              showWishlist
                ? "bg-sage text-white"
                : "bg-linen text-mocha"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-current" />
            Wishlist
          </button>
        </div>
      </motion.div>

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-8"
      >
        {cafesWithLocation.length === 0 && wishlistWithLocation.length === 0 ? (
          <Card className="border-(--taupe)/20 p-12 text-center">
            <p className="text-mocha mb-4">No cafes with location data yet</p>
            <p className="text-sm text-latte">
              Add cafes using the search feature to see them on the map
            </p>
            <Button asChild className="mt-6 bg-coffee hover:bg-espresso">
              <Link href="/">Log a Coffee</Link>
            </Button>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-(--taupe)/20 shadow-lg">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={12}
              options={mapOptions}
              onClick={onMapClick}
            >
              {/* Visited cafe markers */}
              {showVisited && cafesWithLocation.map((cafe) => (
                <Marker
                  key={`cafe-${cafe.id}`}
                  position={{ lat: Number(cafe.lat), lng: Number(cafe.lng) }}
                  onClick={() => setSelectedItem({ ...cafe, type: 'visited' })}
                  icon={{
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#C4846C" stroke="#4A3F35" stroke-width="1.5">
                        <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
                        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
                        <line x1="6" y1="1" x2="6" y2="4"/>
                        <line x1="10" y1="1" x2="10" y2="4"/>
                        <line x1="14" y1="1" x2="14" y2="4"/>
                      </svg>
                    `),
                    scaledSize: new google.maps.Size(32, 32),
                  }}
                />
              ))}

              {/* Wishlist markers */}
              {showWishlist && wishlistWithLocation.map((item) => (
                <Marker
                  key={`wishlist-${item.id}`}
                  position={{ lat: Number(item.lat), lng: Number(item.lng) }}
                  onClick={() => setSelectedItem({ ...item, type: 'wishlist' })}
                  icon={{
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#8B9D83" stroke="#4A3F35" stroke-width="1.5">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                      </svg>
                    `),
                    scaledSize: new google.maps.Size(32, 32),
                  }}
                />
              ))}

              {selectedItem && selectedItem.lat && selectedItem.lng && (
                <InfoWindow
                  position={{ lat: Number(selectedItem.lat), lng: Number(selectedItem.lng) }}
                  onCloseClick={() => setSelectedItem(null)}
                >
                  <div className="p-2 min-w-[200px]">
                    {selectedItem.photo_reference && (
                      <img
                        src={selectedItem.photo_reference}
                        alt={selectedItem.name}
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <span className={clsx(
                        "text-xs px-2 py-0.5 rounded-full",
                        selectedItem.type === 'visited' ? "bg-terracotta/20 text-terracotta" : "bg-sage/20 text-sage"
                      )}>
                        {selectedItem.type === 'visited' ? 'Visited' : 'Wishlist'}
                      </span>
                    </div>
                    <h3 className="font-medium text-coffee text-lg">
                      {selectedItem.name}
                    </h3>
                    {selectedItem.address && (
                      <p className="text-sm text-gray-600 mt-1">{selectedItem.address}</p>
                    )}
                    {selectedItem.type === 'visited' && 'drink_count' in selectedItem && selectedItem.drink_count !== undefined && (
                      <p className="text-sm text-terracotta mt-2">
                        {selectedItem.drink_count} {Number(selectedItem.drink_count) === 1 ? 'visit' : 'visits'}
                      </p>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </div>
        )}
      </motion.div>

      {/* Cafe List */}
      {(cafesWithLocation.length > 0 || wishlistWithLocation.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="font-serif text-2xl text-coffee mb-6">
            All Locations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visited cafes */}
            {showVisited && cafesWithLocation.map((cafe) => (
              <button
                key={`cafe-${cafe.id}`}
                onClick={() => {
                  setSelectedItem({ ...cafe, type: 'visited' });
                  if (cafe.lat && cafe.lng) {
                    setMapCenter({ lat: Number(cafe.lat), lng: Number(cafe.lng) });
                  }
                }}
                className="bg-white border border-(--taupe)/20 rounded-xl p-4 text-left hover:border-(--terracotta)/50 hover:shadow-md transition-all"
              >
                <div className="flex gap-4">
                  {cafe.photo_reference && (
                    <img
                      src={cafe.photo_reference}
                      alt={cafe.name}
                      className="w-16 h-16 object-cover rounded-lg shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-coffee truncate">{cafe.name}</h3>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-terracotta/10 text-terracotta shrink-0">
                        Visited
                      </span>
                    </div>
                    {cafe.city && (
                      <p className="text-sm text-latte truncate">{cafe.city}</p>
                    )}
                    {cafe.drink_count !== undefined && (
                      <p className="text-sm text-terracotta mt-1">
                        {cafe.drink_count} {Number(cafe.drink_count) === 1 ? 'visit' : 'visits'}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {/* Wishlist items */}
            {showWishlist && wishlistWithLocation.map((item) => (
              <button
                key={`wishlist-${item.id}`}
                onClick={() => {
                  setSelectedItem({ ...item, type: 'wishlist' });
                  if (item.lat && item.lng) {
                    setMapCenter({ lat: Number(item.lat), lng: Number(item.lng) });
                  }
                }}
                className="bg-white border border-(--taupe)/20 rounded-xl p-4 text-left hover:border-(--sage)/50 hover:shadow-md transition-all"
              >
                <div className="flex gap-4">
                  {item.photo_reference && (
                    <img
                      src={item.photo_reference}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-coffee truncate">{item.name}</h3>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-sage/10 text-sage shrink-0">
                        Wishlist
                      </span>
                    </div>
                    {item.city && (
                      <p className="text-sm text-latte truncate">{item.city}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
