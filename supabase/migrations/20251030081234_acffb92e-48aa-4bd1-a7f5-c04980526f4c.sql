-- Add status field to each day item in orders' items jsonb
-- This updates all existing orders to have a status field for each day
DO $$
DECLARE
  order_record RECORD;
  updated_items jsonb;
BEGIN
  -- Loop through all orders
  FOR order_record IN 
    SELECT id, items 
    FROM public.orders 
    WHERE items IS NOT NULL
  LOOP
    -- Add status field to each day item if it doesn't exist
    updated_items := (
      SELECT jsonb_agg(
        CASE 
          WHEN day_item ? 'status' THEN day_item
          ELSE jsonb_set(day_item, '{status}', '"pending"')
        END
      )
      FROM jsonb_array_elements(order_record.items) AS day_item
    );
    
    -- Update the order with modified items
    UPDATE public.orders
    SET items = updated_items
    WHERE id = order_record.id;
  END LOOP;
END $$;