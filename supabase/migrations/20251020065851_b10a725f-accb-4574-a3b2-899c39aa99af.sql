-- Allow admins to view all user profiles
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all progress entries
CREATE POLICY "Admins can view all progress"
ON public.progress FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to access progress photos
CREATE POLICY "Admins can view all progress photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  public.has_role(auth.uid(), 'admin')
);