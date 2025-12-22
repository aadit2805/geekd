-- Add user_id to cafes and drinks tables for multi-user support
-- Clerk user IDs are strings (e.g., "user_2abc123...")

ALTER TABLE cafes ADD COLUMN user_id VARCHAR(255);
ALTER TABLE drinks ADD COLUMN user_id VARCHAR(255);

-- Create indexes for user lookups
CREATE INDEX idx_cafes_user ON cafes(user_id);
CREATE INDEX idx_drinks_user ON drinks(user_id);
