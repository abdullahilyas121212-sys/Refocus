-- Lock down the previous helper
REVOKE ALL ON FUNCTION public.award_points(integer, text, text, uuid) FROM PUBLIC, anon, authenticated;

-- Trigger to keep profiles.total_points in sync with the ledger
CREATE OR REPLACE FUNCTION public.apply_point_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET total_points = GREATEST(total_points + NEW.amount, 0),
      updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_point_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_apply_point_event ON public.point_events;
CREATE TRIGGER trg_apply_point_event
AFTER INSERT ON public.point_events
FOR EACH ROW EXECUTE FUNCTION public.apply_point_event();