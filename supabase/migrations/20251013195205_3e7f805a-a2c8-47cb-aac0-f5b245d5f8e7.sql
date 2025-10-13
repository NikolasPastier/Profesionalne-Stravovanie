-- Add goal_weight column to user_profiles table for calorie tracking
ALTER TABLE public.user_profiles 
ADD COLUMN goal_weight numeric;