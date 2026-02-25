/** Resolve a photo reference to a URL. Handles both direct URLs and Google Places photo references. */
export const getPhotoUrl = (photoRef: string | null | undefined): string | null => {
  if (!photoRef) return null;
  if (photoRef.startsWith('http')) return photoRef;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
};
