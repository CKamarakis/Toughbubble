-- Keep updated_at current on every write path, not just the ones that remember to set it.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER items_set_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
CREATE TRIGGER item_content_set_updated_at
  BEFORE UPDATE ON public.item_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
