# Configurable Hard Mode penalties

Today the relapse penalty (-25 XP) and aborted-session penalty (-10 XP) are hardcoded in `src/lib/rewards.ts`. We'll let you tune them yourself with two sliders on the Rewards page, persisted per-user.

## What you'll see

On the Rewards page, the existing "Hard mode" card gets richer:

- The on/off toggle stays at the top.
- When **on**, two sliders appear:
  - **Relapse penalty**: 5 to 200 XP (default 25)
  - **Aborted session penalty**: 0 to 100 XP (default 10) — 0 means "no penalty for quitting early"
- Each slider shows the current value as a big bold number with a short flavor label:
  - 0 = "Soft landing"
  - low = "Gentle nudge"
  - mid = "Real stakes"
  - high = "Brutal"
- Values save automatically with a brief debounce (no save button needed).
- When **off**, sliders are hidden and no penalties apply (current behavior).

The Focus session and Detox screens automatically use your chosen amounts — nothing visible changes there until you trip a penalty.

## Technical details

**Database** — add two columns to `profiles`:
- `relapse_penalty integer NOT NULL DEFAULT 25` (constrained 0–500)
- `abort_penalty integer NOT NULL DEFAULT 10` (constrained 0–500)

**Rewards lib (`src/lib/rewards.ts`)**:
- Keep `POINTS.RELAPSE_PENALTY` / `FOCUS_ABORT_PENALTY` as defaults/fallbacks.
- Update `awardPoints` so when `amount < 0`, it reads `penalties_enabled` and (if a new optional `penaltyKind: "relapse" | "abort"` is passed) overrides the magnitude with the user's configured value. Returns 0 when penalties are off.

**Hook (`src/hooks/usePoints.tsx`)**:
- Also select `relapse_penalty` and `abort_penalty` and expose them. This way the Dashboard / Rewards page can preview live values without an extra query.

**Rewards page (`src/pages/Rewards.tsx`)**:
- Replace the static `Row` rows under Hard Mode with two `Slider` components (shadcn `@/components/ui/slider`) bound to local state, debounced (~500 ms) write to `profiles`.
- Show flavor label + numeric value next to each slider.
- Hide sliders when `penalties_enabled` is false.

**Call sites**:
- `FocusSession.tsx` abort path: pass `penaltyKind: "abort"` to `awardPoints` (drop the explicit amount, let the lib resolve it).
- `Detox.tsx` relapse path: pass `penaltyKind: "relapse"`.

## Out of scope

- Per-habit penalty overrides (one global value per type for now).
- Penalty caps per day / cooldowns.
- Customizing positive earn rates — only penalties are configurable in this pass.