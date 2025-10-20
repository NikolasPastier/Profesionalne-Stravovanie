-- Add name and email columns to orders table
ALTER TABLE public.orders 
ADD COLUMN name TEXT,
ADD COLUMN email TEXT;