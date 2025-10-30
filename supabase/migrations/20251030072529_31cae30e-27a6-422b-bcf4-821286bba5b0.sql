-- Delete all data associated with andrejkukura4@gmail.com user
DO $$
DECLARE
  target_user_id uuid := 'c1369e02-0022-4856-9ea4-f1ccb6fba06c';
BEGIN
  -- Delete from achievements
  DELETE FROM public.achievements WHERE user_id = target_user_id;
  
  -- Delete from progress
  DELETE FROM public.progress WHERE user_id = target_user_id;
  
  -- Delete from admin_notifications for this user's orders
  DELETE FROM public.admin_notifications 
  WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = target_user_id);
  
  -- Delete from orders
  DELETE FROM public.orders WHERE user_id = target_user_id;
  
  -- Delete from user_roles
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  
  -- Delete from user_profiles
  DELETE FROM public.user_profiles WHERE user_id = target_user_id;
  
  -- Delete from auth.users (this will cascade to other auth-related tables)
  DELETE FROM auth.users WHERE id = target_user_id;
END $$;