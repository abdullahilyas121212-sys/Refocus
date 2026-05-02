ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS relapse_penalty integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS abort_penalty integer NOT NULL DEFAULT 10;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_relapse_penalty_range CHECK (relapse_penalty BETWEEN 0 AND 500),
  ADD CONSTRAINT profiles_abort_penalty_range CHECK (abort_penalty BETWEEN 0 AND 500);