-- Add price tracking to drinks
ALTER TABLE drinks ADD COLUMN IF NOT EXISTS price NUMERIC(6,2);

-- Add flavor tags to drinks (stored as JSON array)
ALTER TABLE drinks ADD COLUMN IF NOT EXISTS flavor_tags TEXT[];

-- Add photo URL to drinks
ALTER TABLE drinks ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create wishlist table for cafes user wants to visit
CREATE TABLE IF NOT EXISTS wishlist (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    place_id VARCHAR(255),
    photo_reference TEXT,
    lat NUMERIC(10,8),
    lng NUMERIC(11,8),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for wishlist lookups
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_place_id ON wishlist(place_id);
