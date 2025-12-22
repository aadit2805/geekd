-- Add Google Places data to cafes table
ALTER TABLE cafes ADD COLUMN place_id VARCHAR(255);
ALTER TABLE cafes ADD COLUMN photo_reference TEXT;
ALTER TABLE cafes ADD COLUMN lat DECIMAL(10, 8);
ALTER TABLE cafes ADD COLUMN lng DECIMAL(11, 8);
ALTER TABLE cafes ADD COLUMN hours TEXT;

-- Index for place_id lookups
CREATE INDEX idx_cafes_place_id ON cafes(place_id);
