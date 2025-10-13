-- Add explicit DENY policies for user_roles table to prevent privilege escalation
-- Users should NOT be able to modify their own roles

-- Deny all inserts (only system/admin processes can add roles)
CREATE POLICY "Prevent user role insertion"
ON public.user_roles
FOR INSERT
WITH CHECK (false);

-- Deny all updates (only system/admin processes can modify roles)
CREATE POLICY "Prevent user role updates"
ON public.user_roles
FOR UPDATE
USING (false);

-- Deny all deletes (only system/admin processes can remove roles)
CREATE POLICY "Prevent user role deletion"
ON public.user_roles
FOR DELETE
USING (false);