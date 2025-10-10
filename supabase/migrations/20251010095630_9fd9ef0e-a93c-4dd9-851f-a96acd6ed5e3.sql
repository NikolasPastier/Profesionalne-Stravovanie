-- Fix RLS policies on admin_notifications table
-- Drop the problematic policy that allows all authenticated users to view
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON admin_notifications;

-- Create a proper INSERT policy to allow order creators to trigger notifications
CREATE POLICY "Allow order notification creation" 
ON admin_notifications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = admin_notifications.order_id 
    AND orders.user_id = auth.uid()
  )
);