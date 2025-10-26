-- Function to update menu item information in all weekly menus
CREATE OR REPLACE FUNCTION public.sync_menu_items_in_weekly_menus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  menu_record RECORD;
  updated_items jsonb;
BEGIN
  -- Only proceed if the name changed
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    -- Loop through all weekly menus
    FOR menu_record IN 
      SELECT id, items 
      FROM public.weekly_menus 
      WHERE items::text LIKE '%' || OLD.id::text || '%'
    LOOP
      -- Update the JSONB structure
      updated_items := (
        SELECT jsonb_agg(
          jsonb_set(
            day_obj,
            '{meals}',
            (
              SELECT jsonb_agg(
                CASE 
                  WHEN meal->>'id' = NEW.id::text 
                  THEN jsonb_set(meal, '{name}', to_jsonb(NEW.name))
                  ELSE meal
                END
              )
              FROM jsonb_array_elements(day_obj->'meals') AS meal
            )
          )
        )
        FROM jsonb_array_elements(menu_record.items) AS day_obj
      );
      
      -- Update the weekly menu
      UPDATE public.weekly_menus
      SET items = updated_items
      WHERE id = menu_record.id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on menu_items table
DROP TRIGGER IF EXISTS sync_menu_items_trigger ON public.menu_items;
CREATE TRIGGER sync_menu_items_trigger
  AFTER UPDATE ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_menu_items_in_weekly_menus();