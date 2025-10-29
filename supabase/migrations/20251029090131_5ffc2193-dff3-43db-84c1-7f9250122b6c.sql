-- Delete the admin@admin.com user account and all associated data
-- First delete from tables that don't have cascade (in correct order)
DELETE FROM public.achievements WHERE user_id = 'fb6768fa-ad3c-4d72-b6e2-18d7789bfd2f';
DELETE FROM public.progress WHERE user_id = 'fb6768fa-ad3c-4d72-b6e2-18d7789bfd2f';
DELETE FROM public.admin_notifications WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = 'fb6768fa-ad3c-4d72-b6e2-18d7789bfd2f');
DELETE FROM public.orders WHERE user_id = 'fb6768fa-ad3c-4d72-b6e2-18d7789bfd2f';
DELETE FROM public.user_roles WHERE user_id = 'fb6768fa-ad3c-4d72-b6e2-18d7789bfd2f';
DELETE FROM public.user_profiles WHERE user_id = 'fb6768fa-ad3c-4d72-b6e2-18d7789bfd2f';

-- Delete the user from auth.users (this will cascade to any remaining references)
DELETE FROM auth.users WHERE id = 'fb6768fa-ad3c-4d72-b6e2-18d7789bfd2f';