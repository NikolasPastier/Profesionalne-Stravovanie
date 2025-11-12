-- Add missing DELETE policies for better security model clarity

-- Allow admins to delete admin notifications
CREATE POLICY "Admins can delete notifications"
ON admin_notifications
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Allow users to delete their own progress entries (and admins too)
CREATE POLICY "Users can delete their own progress"
ON progress
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any progress"
ON progress
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Allow users to delete their own profile (and admins too)
CREATE POLICY "Users can delete their own profile"
ON user_profiles
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any profile"
ON user_profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Explicitly prevent achievement modification to document immutability
CREATE POLICY "Prevent achievement updates"
ON achievements
FOR UPDATE
USING (false);

CREATE POLICY "Prevent achievement deletion"
ON achievements
FOR DELETE
USING (false);