-- Add promo code tracking fields to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN promo_code TEXT,
ADD COLUMN promo_discount_used BOOLEAN DEFAULT false;

-- Create index for faster promo code queries
CREATE INDEX idx_user_profiles_promo_code ON public.user_profiles(promo_code) WHERE promo_code IS NOT NULL;