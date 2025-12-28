const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Token getter function - will be set by the AuthProvider
let getAuthToken: (() => Promise<string | null>) | null = null;

export const setAuthTokenGetter = (getter: () => Promise<string | null>) => {
  getAuthToken = getter;
};

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken ? await getAuthToken() : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

export interface Cafe {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  place_id?: string | null;
  photo_reference?: string | null;
  lat?: number | null;
  lng?: number | null;
  drink_count?: number;
  last_visit?: string | null;
}

export interface Drink {
  id: number;
  cafe_id: number;
  drink_type: string;
  rating: number;
  notes: string | null;
  logged_at: string;
  cafe_name?: string;
  cafe_address?: string | null;
  cafe_city?: string | null;
  price?: number | null;
  flavor_tags?: string[] | null;
  photo_url?: string | null;
}

export interface WishlistItem {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  place_id: string | null;
  photo_reference: string | null;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  created_at: string;
}

export interface RatingTrend {
  week: string;
  avg_rating: string;
  drink_count: string;
}

export interface DayStats {
  day: string;
  avg_rating: string;
  drink_count: string;
}

export interface TimeStats {
  time_of_day: string;
  avg_rating: string;
  drink_count: string;
}

export interface Stats {
  total_drinks: number;
  average_rating: number;
  cafes_visited: number;
  drink_types_tried: number;
  current_streak: number;
  longest_streak: number;
  drinks_this_week: number;
  drinks_this_month: number;
  milestones: { type: string; value: number; label: string }[];
  top_cafes: { cafe_name: string; visit_count: number }[];
  drink_type_breakdown: { drink_type: string; count: number }[];
  rating_trends: RatingTrend[];
  best_day: {
    day: string;
    avg_rating: string;
    drink_count: string;
    all_days: DayStats[];
  } | null;
  best_time: {
    time: string;
    avg_rating: string;
    all_times: TimeStats[];
  } | null;
  cafe_streak: {
    cafe_name: string;
    count: number;
  } | null;
  longest_cafe_streak: {
    cafe_name: string;
    count: number;
  } | null;
  // Price stats
  total_spent: number;
  avg_price: number;
  spent_this_month: number;
  drinks_with_price: number;
  price_by_cafe: { cafe_name: string; avg_price: string; count: number }[];
  // Flavor tags
  top_flavor_tags: { tag: string; count: number }[];
}

// Cafes
export const getCafes = async (): Promise<Cafe[]> => {
  const res = await fetchWithAuth(`${API_URL}/api/cafes`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('getCafes error:', res.status, errorData);
    throw new Error(errorData.error || 'Failed to fetch cafes');
  }
  return res.json();
};

export const createCafe = async (data: {
  name: string;
  address?: string;
  city?: string;
  place_id?: string;
  photo_reference?: string;
  lat?: number;
  lng?: number;
}): Promise<Cafe> => {
  const res = await fetchWithAuth(`${API_URL}/api/cafes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('createCafe error:', res.status, errorData);
    throw new Error(errorData.error || 'Failed to create cafe');
  }
  return res.json();
};

// Drinks
export const getDrinks = async (params?: {
  cafe_id?: number;
  sort?: string;
  order?: string;
}): Promise<Drink[]> => {
  const queryParams = new URLSearchParams();
  if (params?.cafe_id) queryParams.append('cafe_id', params.cafe_id.toString());
  if (params?.sort) queryParams.append('sort', params.sort);
  if (params?.order) queryParams.append('order', params.order);

  const res = await fetchWithAuth(`${API_URL}/api/drinks?${queryParams}`);
  if (!res.ok) throw new Error('Failed to fetch drinks');
  return res.json();
};

export const getDrinkTypes = async (): Promise<string[]> => {
  const res = await fetchWithAuth(`${API_URL}/api/drinks/types`);
  if (!res.ok) throw new Error('Failed to fetch drink types');
  return res.json();
};

export const getLastDrink = async (): Promise<Drink | null> => {
  const res = await fetchWithAuth(`${API_URL}/api/drinks/last`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch last drink');
  return res.json();
};

export const createDrink = async (data: {
  cafe_id: number;
  drink_type: string;
  rating: number;
  notes?: string;
  logged_at?: string;
  price?: number;
  flavor_tags?: string[];
  photo_url?: string;
}): Promise<Drink> => {
  const res = await fetchWithAuth(`${API_URL}/api/drinks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create drink');
  return res.json();
};

export const deleteDrink = async (id: number): Promise<void> => {
  const res = await fetchWithAuth(`${API_URL}/api/drinks/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete drink');
};

// Stats
export const getStats = async (): Promise<Stats> => {
  const res = await fetchWithAuth(`${API_URL}/api/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
};

// User
export const deleteAllUserData = async (): Promise<void> => {
  const res = await fetchWithAuth(`${API_URL}/api/user/data`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete user data');
};

// Wishlist
export const getWishlist = async (): Promise<WishlistItem[]> => {
  const res = await fetchWithAuth(`${API_URL}/api/wishlist`);
  if (!res.ok) throw new Error('Failed to fetch wishlist');
  return res.json();
};

export const addToWishlist = async (data: {
  name: string;
  address?: string;
  city?: string;
  place_id?: string;
  photo_reference?: string;
  lat?: number;
  lng?: number;
  notes?: string;
}): Promise<WishlistItem> => {
  const res = await fetchWithAuth(`${API_URL}/api/wishlist`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to add to wishlist');
  }
  return res.json();
};

export const removeFromWishlist = async (id: number): Promise<void> => {
  const res = await fetchWithAuth(`${API_URL}/api/wishlist/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove from wishlist');
};

export const convertWishlistToCafe = async (id: number): Promise<Cafe> => {
  const res = await fetchWithAuth(`${API_URL}/api/wishlist/${id}/visit`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to convert wishlist item');
  return res.json();
};
