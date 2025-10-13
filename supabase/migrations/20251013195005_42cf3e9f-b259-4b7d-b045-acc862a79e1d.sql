-- Add gender column to user_profiles table for accurate BMR calculations
ALTER TABLE public.user_profiles 
ADD COLUMN gender text CHECK (gender IN ('male', 'female'));