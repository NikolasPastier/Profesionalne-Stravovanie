-- Add DELETE policy for admins on orders table
CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::text));