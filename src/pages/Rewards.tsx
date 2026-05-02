import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { usePoints } from "@/hooks/usePoints";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Trophy, Sparkles, TrendingUp, TrendingDown, Zap, Shield, Skull, Flame, Target, Crown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { POINTS } from "@/lib/rewards";
import { toast } from "sonner";

type Event = { id: string; amount: number; reason: string; source_type: string; created_at: string };

const BADGES = [
  { id: "first_focus",  label: "First Light",     icon: Sparkles, req: (s: Stats) => s.focusSessions >= 1,  hint: "Complete 1 focus session" },
  { id: "five_focus",   label: "Momentum",        icon: Zap,      req: (s: Stats) => s.focusSessions >= 5,  hint: "5 focus sessions" },
  { id: "deep_hour",    label: "Deep Hour",       icon: Target,   req: (s: Stats) => s.bestSession >= 50,   hint: "One 50+ min session" },
  { id: "clean_week",   label: "Clean Week",      icon: Shield,   req: (s: Stats) => s.cleanDays >= 7,      hint: "7 clean days logged" },
  { id: "level_5",      label: "Awakening",       icon: Flame,    req: (s: Stats) => s.level >= 5,          hint: "Reach level 5" },
  { id: "level_10",     label: "Inner Fire",      icon: Crown,    req: (s: Stats) => s.level >= 10,         hint: "Reach level 10" },
];

type Stats = { focusSessions: number; bestSession: number; cleanDays: number; level: number };

export default function Rewards() {
  const { user } = useAuth();
  const { points, penaltiesEnabled, level, title, progress, toNext, currentAt, nextAt, refresh } = usePoints();
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats>({ focusSessions: 0, bestSession: 0, cleanDays: 0, level: 1 });
  const [savingPenalty, setSavingPenalty] = useState(false);

  useEffect(() => { setStats((s) => ({ ...s, level })); }, [level]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ev }, { data: sessions }, { data: clean }] = await Promise.all([
        supabase.from("point_events").select("id,amount,reason,source_type,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(40),
        supabase.from("focus_sessions").select("actual_minutes,completed").eq("user_id", user.id).eq("completed", true),
        supabase.from("habit_logs").select("id").eq("user_id", user.id).eq("status", "clean"),
      ]);
      setEvents((ev as Event[]) ?? []);
      const completed = sessions ?? [];
      const best = completed.reduce((m, s) => Math.max(m, s.actual_minutes ?? 0), 0);
      setStats((s) => ({ ...s, focusSessions: completed.length, bestSession: best, cleanDays: clean?.length ?? 0 }));
    })();
  }, [user, points]);

  const togglePenalties = async (val: boolean) => {
    if (!user) return;
    setSavingPenalty(true);
    const { error } = await supabase.from("profiles").update({ penalties_enabled: val }).eq("id", user.id);
    setSavingPenalty(false);
    if (error) { toast.error("Could not update"); return; }
    toast.success(val ? "Penalties on. Stakes are real." : "Penalties off. Earn freely.");
    refresh();
  };

  return (
    <div className="animate-fade-in-up space-y-5 pb-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Rewards</h1>
        <p className="text-sm text-muted-foreground">Earn XP, level up, optionally raise the stakes.</p>
      </header>

      {/* Hero level card */}
      <div className="relative overflow-hidden rounded-3xl p-6 shadow-card glass">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full gradient-primary opacity-30 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl gradient-primary shadow-glow">
            <Crown className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Level {level} · {title}</p>
            <p className="mt-0.5 text-3xl font-bold tabular-nums">{points.toLocaleString()} <span className="text-base font-medium text-muted-foreground">XP</span></p>
          </div>
        </div>
        <div className="relative mt-5">
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full gradient-primary transition-[width] duration-700" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{currentAt} XP</span>
            <span>{toNext} XP to Lv {level + 1}</span>
            <span>{nextAt} XP</span>
          </div>
        </div>
      </div>

      {/* Earn rates */}
      <div className="glass rounded-3xl p-5 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-success" /> How you earn
        </h2>
        <ul className="space-y-2 text-sm">
          <Row label="Per focused minute" value={`+${POINTS.FOCUS_PER_MINUTE}`} />
          <Row label="Completing a focus session" value={`+${POINTS.FOCUS_COMPLETION_BONUS}`} />
          <Row label="Marking a clean day" value={`+${POINTS.CLEAN_DAY}`} />
          <Row label="Completing a task" value={`+${POINTS.TASK_COMPLETED}`} />
          <Row label="Every 5-day focus streak" value={`+${POINTS.STREAK_MILESTONE}`} accent />
          <Row label="Every 7-day clean streak" value={`+${POINTS.CLEAN_STREAK_MILESTONE}`} accent />
        </ul>
      </div>

      {/* Penalties */}
      <div className="glass rounded-3xl p-5 shadow-card">
        <div className="flex items-start gap-4">
          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", penaltiesEnabled ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground")}>
            <Skull className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Hard mode</h2>
              <Switch checked={penaltiesEnabled} onCheckedChange={togglePenalties} disabled={savingPenalty} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Lose XP when you break the rules. The brain learns faster when stakes are real.</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              <Row label="Logging a relapse" value={`${POINTS.RELAPSE_PENALTY}`} negative />
              <Row label="Aborting a focus session" value={`${POINTS.FOCUS_ABORT_PENALTY}`} negative />
            </ul>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="glass rounded-3xl p-5 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Trophy className="h-4 w-4 text-flame" /> Badges
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {BADGES.map((b) => {
            const earned = b.req(stats);
            const Icon = b.icon;
            return (
              <div key={b.id} className={cn("relative flex flex-col items-center rounded-2xl border p-3 text-center transition", earned ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30 opacity-60")}>
                <div className={cn("grid h-10 w-10 place-items-center rounded-xl", earned ? "gradient-primary shadow-glow" : "bg-muted")}>
                  {earned ? <Icon className="h-5 w-5 text-primary-foreground" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                </div>
                <p className="mt-2 text-xs font-semibold leading-tight">{b.label}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{b.hint}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity */}
      <div className="glass rounded-3xl p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent XP</h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet. Start a focus session to earn your first XP.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <div className={cn("grid h-8 w-8 place-items-center rounded-lg", e.amount > 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                  {e.amount > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.reason}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(e.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                </div>
                <span className={cn("tabular-nums text-sm font-semibold", e.amount > 0 ? "text-success" : "text-destructive")}>
                  {e.amount > 0 ? "+" : ""}{e.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, accent, negative }: { label: string; value: string; accent?: boolean; negative?: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        negative ? "bg-destructive/15 text-destructive" : accent ? "bg-flame/15 text-flame" : "bg-success/15 text-success")}>
        {value} XP
      </span>
    </li>
  );
}
