-- Profile additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS penalties_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_points integer NOT NULL DEFAULT 0;

-- Point events ledger
CREATE TABLE IF NOT EXISTS public.point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "point_events_all_own"
  ON public.point_events
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_point_events_user_created
  ON public.point_events(user_id, created_at DESC);

-- Award helper
CREATE OR REPLACE FUNCTION public.award_points(
  _amount integer,
  _reason text,
  _source_type text,
  _source_id uuid DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_total integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.point_events (user_id, amount, reason, source_type, source_id)
  VALUES (_uid, _amount, _reason, _source_type, _source_id);

  UPDATE public.profiles
  SET total_points = GREATEST(total_points + _amount, 0),
      updated_at = now()
  WHERE id = _uid
  RETURNING total_points INTO _new_total;

  RETURN _new_total;
END;
$$;