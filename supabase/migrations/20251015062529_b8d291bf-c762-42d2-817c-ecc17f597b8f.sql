-- Remove admin access to user_profiles to protect sensitive health data
-- Orders already contain contact info (address, phone) that admins need
-- Health data (weight, height, allergies, health_issues, etc.) should remain private to users only

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;