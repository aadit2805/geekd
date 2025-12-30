'use client';

import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { useLoadScript } from '@react-google-maps/api';

const libraries: ("places")[] = ['places'];

export interface PlaceResult {
  place_id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  photo_reference?: string;
}

interface PlacesAutocompleteProps {
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
  initialValue?: string;
}

export interface PlacesAutocompleteRef {
  searchPlace: (query: string) => Promise<PlaceResult | null>;
}

// Utility function to search for a place by text query
export async function searchPlaceByText(query: string): Promise<PlaceResult | null> {
  return new Promise((resolve) => {
    if (!window.google?.maps?.places) {
      resolve(null);
      return;
    }

    const service = new google.maps.places.PlacesService(
      document.createElement('div')
    );

    service.textSearch(
      {
        query,
        type: 'cafe',
      },
      (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.[0]) {
          resolve(null);
          return;
        }

        const place = results[0];
        if (!place.place_id || !place.geometry?.location) {
          resolve(null);
          return;
        }

        // Get more details including photos
        service.getDetails(
          {
            placeId: place.place_id,
            fields: ['place_id', 'name', 'formatted_address', 'address_components', 'geometry', 'photos'],
          },
          (details, detailStatus) => {
            if (detailStatus !== google.maps.places.PlacesServiceStatus.OK || !details) {
              // Fall back to basic info
              let city = '';
              const addressParts = place.formatted_address?.split(',') || [];
              if (addressParts.length >= 2) {
                city = addressParts[addressParts.length - 2]?.trim() || '';
              }

              resolve({
                place_id: place.place_id!,
                name: place.name || '',
                address: place.formatted_address || '',
                city,
                lat: place.geometry!.location!.lat(),
                lng: place.geometry!.location!.lng(),
              });
              return;
            }

            // Extract city from address components
            let city = '';
            details.address_components?.forEach(component => {
              if (component.types.includes('locality')) {
                city = component.long_name;
              } else if (component.types.includes('sublocality_level_1') && !city) {
                city = component.long_name;
              }
            });

            const photoReference = details.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 300 });

            resolve({
              place_id: details.place_id!,
              name: details.name || '',
              address: details.formatted_address || '',
              city,
              lat: details.geometry!.location!.lat(),
              lng: details.geometry!.location!.lng(),
              photo_reference: photoReference,
            });
          }
        );
      }
    );
  });
}

export function PlacesAutocomplete({ onPlaceSelect, placeholder = "Search for a cafe...", initialValue }: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const hasAutoSearched = useRef(false);

  // Keep callback ref updated
  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    // Initialize autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment'],
      fields: ['place_id', 'name', 'formatted_address', 'address_components', 'geometry', 'photos'],
    });

    // Listen for place selection
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place || !place.place_id || !place.geometry?.location) return;

      // Extract city from address components
      let city = '';
      place.address_components?.forEach(component => {
        if (component.types.includes('locality')) {
          city = component.long_name;
        } else if (component.types.includes('sublocality_level_1') && !city) {
          city = component.long_name;
        }
      });

      // Get photo reference if available
      const photoReference = place.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 300 });

      const result: PlaceResult = {
        place_id: place.place_id,
        name: place.name || '',
        address: place.formatted_address || '',
        city,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        photo_reference: photoReference,
      };

      onPlaceSelectRef.current(result);
    });

    // If we have an initialValue, set it and trigger autocomplete
    if (initialValue && inputRef.current && !hasAutoSearched.current) {
      hasAutoSearched.current = true;
      inputRef.current.value = initialValue;
      inputRef.current.focus();
      // Trigger input event to show autocomplete dropdown
      const event = new Event('input', { bubbles: true });
      inputRef.current.dispatchEvent(event);
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded, initialValue]);

  if (loadError) {
    return (
      <input
        type="text"
        placeholder="Enter cafe name manually"
        className="w-full px-4 py-3 bg-white border border-[var(--taupe)]/30 rounded-xl text-[var(--espresso)] placeholder:text-[var(--taupe)] focus:outline-none focus:border-[var(--terracotta)] focus:ring-1 focus:ring-[var(--terracotta)]/30 transition-all duration-300"
      />
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full px-4 py-3 bg-[var(--linen)] border border-[var(--taupe)]/30 rounded-xl text-[var(--taupe)] animate-pulse">
        Loading...
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-white border border-[var(--taupe)]/30 rounded-xl text-[var(--espresso)] placeholder:text-[var(--taupe)] focus:outline-none focus:border-[var(--terracotta)] focus:ring-1 focus:ring-[var(--terracotta)]/30 transition-all duration-300"
    />
  );
}
