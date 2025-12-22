'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCafes, type Cafe } from '@/lib/api';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { motion } from 'framer-motion';
import Link from 'next/link';

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

export default function MapPage() {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    loadCafes();
  }, []);

  const loadCafes = async () => {
    try {
      const data = await getCafes();
      setCafes(data);

      // Center map on first cafe with coordinates
      const cafeWithCoords = data.find(c => c.lat && c.lng);
      if (cafeWithCoords && cafeWithCoords.lat && cafeWithCoords.lng) {
        setMapCenter({ lat: Number(cafeWithCoords.lat), lng: Number(cafeWithCoords.lng) });
      }
    } catch (error) {
      console.error('Error loading cafes:', error);
    } finally {
      setLoading(false);
    }
  };

  const onMapClick = useCallback(() => {
    setSelectedCafe(null);
  }, []);

  const cafesWithLocation = cafes.filter(c => c.lat && c.lng);

  if (loadError) {
    return (
      <div className="text-center py-32">
        <p className="text-[var(--latte)]">Error loading maps</p>
      </div>
    );
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex justify-center py-32">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-[var(--taupe)] border-t-[var(--coffee)] rounded-full"
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
        className="text-center mb-12"
      >
        <h1 className="font-[family-name:var(--font-serif)] text-4xl md:text-5xl text-[var(--coffee)] mb-4">
          Your Coffee Map
        </h1>
        <p className="text-[var(--latte)] tracking-wide">
          {cafesWithLocation.length} {cafesWithLocation.length === 1 ? 'spot' : 'spots'} on your journey
        </p>
      </motion.div>

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-8"
      >
        {cafesWithLocation.length === 0 ? (
          <div className="bg-white border border-[var(--taupe)]/20 rounded-2xl p-12 text-center">
            <p className="text-[var(--mocha)] mb-4">No cafes with location data yet</p>
            <p className="text-sm text-[var(--latte)]">
              Add cafes using the search feature to see them on the map
            </p>
            <Link
              href="/"
              className="inline-block mt-6 px-6 py-3 bg-[var(--coffee)] text-white rounded-lg hover:bg-[var(--espresso)] transition-colors"
            >
              Log a Coffee
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--taupe)]/20 shadow-lg">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={12}
              options={mapOptions}
              onClick={onMapClick}
            >
              {cafesWithLocation.map((cafe) => (
                <Marker
                  key={cafe.id}
                  position={{ lat: Number(cafe.lat), lng: Number(cafe.lng) }}
                  onClick={() => setSelectedCafe(cafe)}
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

              {selectedCafe && selectedCafe.lat && selectedCafe.lng && (
                <InfoWindow
                  position={{ lat: Number(selectedCafe.lat), lng: Number(selectedCafe.lng) }}
                  onCloseClick={() => setSelectedCafe(null)}
                >
                  <div className="p-2 min-w-[200px]">
                    {selectedCafe.photo_reference && (
                      <img
                        src={selectedCafe.photo_reference}
                        alt={selectedCafe.name}
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                    )}
                    <h3 className="font-medium text-[var(--coffee)] text-lg">
                      {selectedCafe.name}
                    </h3>
                    {selectedCafe.address && (
                      <p className="text-sm text-gray-600 mt-1">{selectedCafe.address}</p>
                    )}
                    {selectedCafe.drink_count !== undefined && (
                      <p className="text-sm text-[var(--terracotta)] mt-2">
                        {selectedCafe.drink_count} {Number(selectedCafe.drink_count) === 1 ? 'visit' : 'visits'}
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
      {cafesWithLocation.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="font-[family-name:var(--font-serif)] text-2xl text-[var(--coffee)] mb-6">
            All Locations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cafesWithLocation.map((cafe) => (
              <button
                key={cafe.id}
                onClick={() => {
                  setSelectedCafe(cafe);
                  if (cafe.lat && cafe.lng) {
                    setMapCenter({ lat: Number(cafe.lat), lng: Number(cafe.lng) });
                  }
                }}
                className="bg-white border border-[var(--taupe)]/20 rounded-xl p-4 text-left hover:border-[var(--terracotta)]/50 hover:shadow-md transition-all"
              >
                <div className="flex gap-4">
                  {cafe.photo_reference && (
                    <img
                      src={cafe.photo_reference}
                      alt={cafe.name}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[var(--coffee)] truncate">{cafe.name}</h3>
                    {cafe.city && (
                      <p className="text-sm text-[var(--latte)] truncate">{cafe.city}</p>
                    )}
                    {cafe.drink_count !== undefined && (
                      <p className="text-sm text-[var(--terracotta)] mt-1">
                        {cafe.drink_count} {Number(cafe.drink_count) === 1 ? 'visit' : 'visits'}
                      </p>
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
