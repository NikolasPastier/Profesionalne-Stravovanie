-- Add kraj column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN kraj TEXT;

-- Add kraj column to orders table
ALTER TABLE orders
ADD COLUMN kraj TEXT;