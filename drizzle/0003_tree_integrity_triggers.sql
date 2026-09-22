-- Tree rules the database enforces for every write path (spec: workspace-data).
-- Violations raise check_violation (23514) with a constraint name the app maps
-- to a message: items_parent_is_container, items_no_cycles, items_active_parent.
-- Functions run with the caller's rights, so RLS limits them to the user's rows.

-- Only projects and folders contain items; a container with children keeps a container kind.
CREATE OR REPLACE FUNCTION public.items_container_check()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  parent_kind public.item_kind;
BEGIN
  IF NEW.parent_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN
    SELECT kind INTO parent_kind FROM public.items WHERE id = NEW.parent_id;
    -- A missing parent is left to the foreign key.
    IF parent_kind IS NOT NULL AND parent_kind NOT IN ('project', 'folder') THEN
      RAISE EXCEPTION 'Only projects and folders can contain items'
        USING ERRCODE = 'check_violation', CONSTRAINT = 'items_parent_is_container';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.kind IS DISTINCT FROM OLD.kind
     AND NEW.kind NOT IN ('project', 'folder')
     AND EXISTS (SELECT 1 FROM public.items WHERE parent_id = NEW.id) THEN
    RAISE EXCEPTION 'An item that contains items must stay a project or folder'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'items_parent_is_container';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER items_container_check
  BEFORE INSERT OR UPDATE OF parent_id, kind ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.items_container_check();--> statement-breakpoint

-- No item may become its own ancestor. An INSERT cannot create a cycle.
CREATE OR REPLACE FUNCTION public.items_cycle_check()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
    IF NEW.parent_id = NEW.id OR EXISTS (
      -- UNION (not UNION ALL) stops the walk even if a cycle already existed.
      WITH RECURSIVE ancestors(id, parent_id) AS (
        SELECT i.id, i.parent_id FROM public.items i WHERE i.id = NEW.parent_id
        UNION
        SELECT i.id, i.parent_id FROM public.items i JOIN ancestors a ON i.id = a.parent_id
      )
      SELECT 1 FROM ancestors WHERE id = NEW.id
    ) THEN
      RAISE EXCEPTION 'An item cannot be moved inside itself'
        USING ERRCODE = 'check_violation', CONSTRAINT = 'items_no_cycles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER items_cycle_check
  BEFORE UPDATE OF parent_id ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.items_cycle_check();--> statement-breakpoint

-- Active items live under active parents, and an item cannot stop being active
-- while it still has active children. Deferred to commit so a restore or
-- archive that changes a whole subtree in one statement is checked on the
-- final state. Reads the current row, since NEW may be stale by commit time.
CREATE OR REPLACE FUNCTION public.items_active_parent_check()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  cur_status public.item_status;
  cur_parent uuid;
BEGIN
  SELECT status, parent_id INTO cur_status, cur_parent FROM public.items WHERE id = NEW.id;
  IF NOT FOUND THEN
    RETURN NULL; -- deleted later in the same transaction
  END IF;

  IF cur_status = 'active' AND cur_parent IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.items WHERE id = cur_parent AND status <> 'active'
  ) THEN
    RAISE EXCEPTION 'Items can only be placed in active projects and folders'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'items_active_parent';
  END IF;

  IF cur_status <> 'active' AND EXISTS (
    SELECT 1 FROM public.items WHERE parent_id = NEW.id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'An item with active contents must stay active'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'items_active_parent';
  END IF;

  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER items_active_parent_check
  AFTER INSERT OR UPDATE OF parent_id, status ON public.items
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.items_active_parent_check();
