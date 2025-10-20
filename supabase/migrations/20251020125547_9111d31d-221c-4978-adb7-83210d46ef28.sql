-- Create a table to track rate limiting for edge functions
CREATE TABLE IF NOT EXISTS public.edge_function_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  last_request_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, function_name)
);

-- Enable RLS on rate limits table
ALTER TABLE public.edge_function_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own rate limit data
CREATE POLICY "Users can view their own rate limits"
ON public.edge_function_rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Service role can manage rate limits (for edge functions)
CREATE POLICY "Service role can manage rate limits"
ON public.edge_function_rate_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- Create a security definer function to get current user's role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;