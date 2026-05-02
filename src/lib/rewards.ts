import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Point values — tuned so a focused 25-min session ≈ 50 XP
export const POINTS = {
  FOCUS_PER_MINUTE: 2,
  FOCUS_COMPLETION_BONUS: 20,
  STREAK_MILESTONE: 50, // every 5 focus days
  CLEAN_DAY: 15,
  CLEAN_STREAK_MILESTONE: 75, // every 7 clean days
  TASK_COMPLETED: 8,
  RELAPSE_PENALTY: -25,
  FOCUS_ABORT_PENALTY: -10,
} as const;

export type SourceType = "focus_session" | "clean_day" | "relapse" | "streak_bonus" | "task" | "manual";

/** Levels: triangular curve. Level n requires 100 * n*(n+1)/2 XP. */
export function levelFromPoints(points: number) {
  let level = 1;
  while (points >= xpForLevel(level + 1)) level += 1;
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    title: titleForLevel(level),
    progress: Math.min(1, (points - current) / (next - current)),
    toNext: Math.max(0, next - points),
    nextAt: next,
    currentAt: current,
  };
}

export function xpForLevel(n: number) {
  if (n <= 1) return 0;
  return 100 * ((n - 1) * n) / 2;
}

export function titleForLevel(n: number) {
  if (n >= 30) return "Mind Architect";
  if (n >= 20) return "Deep Worker";
  if (n >= 12) return "Flow Seeker";
  if (n >= 8) return "Focus Apprentice";
  if (n >= 4) return "Awakening";
  return "Beginner";
}

/**
 * Award (or deduct) points. Penalties are gated by the user's profile.penalties_enabled.
 * Returns the inserted amount (0 if skipped).
 */
export async function awardPoints(opts: {
  amount: number;
  reason: string;
  sourceType: SourceType;
  sourceId?: string | null;
  silent?: boolean;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  let amount = opts.amount;

  if (amount < 0) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("penalties_enabled")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.penalties_enabled) return 0;
  }

  const { error } = await supabase.from("point_events").insert({
    user_id: user.id,
    amount,
    reason: opts.reason,
    source_type: opts.sourceType,
    source_id: opts.sourceId ?? null,
  });
  if (error) {
    console.error("awardPoints failed", error);
    return 0;
  }

  if (!opts.silent) {
    if (amount > 0) toast.success(`+${amount} XP · ${opts.reason}`);
    else toast.error(`${amount} XP · ${opts.reason}`);
  }
  return amount;
}
