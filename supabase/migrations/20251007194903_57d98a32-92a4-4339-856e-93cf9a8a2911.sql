-- Create security definer function with correct type
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::TEXT = _role
  )
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can insert menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can update menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can delete menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can insert weekly menus" ON public.weekly_menus;
DROP POLICY IF EXISTS "Admins can update weekly menus" ON public.weekly_menus;
DROP POLICY IF EXISTS "Admins can delete weekly menus" ON public.weekly_menus;
DROP POLICY IF EXISTS "Admins can view notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON public.admin_notifications;

-- Admin policies for orders
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies for menu_items
CREATE POLICY "Admins can insert menu items"
  ON public.menu_items FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update menu items"
  ON public.menu_items FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete menu items"
  ON public.menu_items FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies for weekly_menus
CREATE POLICY "Admins can insert weekly menus"
  ON public.weekly_menus FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update weekly menus"
  ON public.weekly_menus FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete weekly menus"
  ON public.weekly_menus FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies for admin_notifications
CREATE POLICY "Admins can view notifications"
  ON public.admin_notifications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notifications"
  ON public.admin_notifications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for order notifications
DROP TRIGGER IF EXISTS on_order_created ON public.orders;

CREATE OR REPLACE FUNCTION public.create_order_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_notifications (order_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_order_notification();