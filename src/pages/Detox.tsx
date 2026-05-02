import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Flame, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { awardPoints, POINTS } from "@/lib/rewards";

type Habit = { id: string; name: string };
type Log = { habit_id: string; log_date: string; status: string };

const today = () => new Date().toISOString().slice(0, 10);

function streakDays(logs: Log[], habitId: string) {
  const map = new Map(logs.filter((l) => l.habit_id === habitId).map((l) => [l.log_date, l.status]));
  let s = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().slice(0, 10);
    const status = map.get(key);
    if (status === "clean") {
      s += 1;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return s;
}

export default function Detox() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [relapseFor, setRelapseFor] = useState<Habit | null>(null);
  const [relapseNote, setRelapseNote] = useState("");

  const load = async () => {
    if (!user) return;
    const { data: h } = await supabase.from("habits").select("id,name").eq("user_id", user.id).order("created_at");
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const { data: l } = await supabase
      .from("habit_logs")
      .select("habit_id,log_date,status")
      .eq("user_id", user.id)
      .gte("log_date", since.toISOString().slice(0, 10));
    setHabits(h ?? []);
    setLogs((l as Log[]) ?? []);
  };

  useEffect(() => {
    load();
  }, [user]);

  const addHabit = async () => {
    if (!user || !name.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("habits").insert({ user_id: user.id, name: name.trim() });
      if (error) throw error;
      setName("");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not add");
    } finally {
      setBusy(false);
    }
  };

  const markClean = async (h: Habit) => {
    if (!user) return;
    const today_ = today();
    const exists = logs.find((l) => l.habit_id === h.id && l.log_date === today_);
    if (exists?.status === "clean") return;
    await supabase.from("habit_logs").upsert(
      { user_id: user.id, habit_id: h.id, log_date: today_, status: "clean" },
      { onConflict: "habit_id,log_date" }
    );
    // Compute new streak after this log
    const newLogs = [...logs.filter((l) => !(l.habit_id === h.id && l.log_date === today_)),
      { habit_id: h.id, log_date: today_, status: "clean" }];
    const s = streakDays(newLogs, h.id);
    let earned = POINTS.CLEAN_DAY;
    let reason = `${h.name} — clean day`;
    if (s > 0 && s % 7 === 0) {
      earned += POINTS.CLEAN_STREAK_MILESTONE;
      reason = `${s}-day clean streak · ${h.name}`;
    }
    await awardPoints({ amount: earned, reason, sourceType: "clean_day", sourceId: h.id, silent: true });
    toast.success(`${h.name} — clean today · +${earned} XP 🔥`);
    load();
  };

  const logRelapse = async () => {
    if (!user || !relapseFor) return;
    await supabase.from("habit_logs").upsert(
      { user_id: user.id, habit_id: relapseFor.id, log_date: today(), status: "relapse", note: relapseNote || null },
      { onConflict: "habit_id,log_date" }
    );
    await awardPoints({
      penaltyKind: "relapse",
      reason: `Relapse logged · ${relapseFor.name}`,
      sourceType: "relapse",
      sourceId: relapseFor.id,
    });
    toast("Logged. Tomorrow's a fresh page.");
    setRelapseFor(null);
    setRelapseNote("");
    load();
  };

  return (
    <div className="animate-fade-in-up space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dopamine detox</h1>
          <p className="text-sm text-muted-foreground">One clean day at a time.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl gradient-primary">
              <Plus className="mr-1 h-4 w-4" /> Habit
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Track a habit to quit</DialogTitle>
            </DialogHeader>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Instagram, late-night scrolling" className="h-12 rounded-xl" />
            <Button onClick={addHabit} disabled={busy || !name.trim()} className="h-12 w-full rounded-xl gradient-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </DialogContent>
        </Dialog>
      </header>

      {habits.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <Flame className="mx-auto h-8 w-8 text-flame" />
          <p className="mt-3 font-semibold">Track your first loop</p>
          <p className="mt-1 text-sm text-muted-foreground">Pick the one that costs you the most time.</p>
        </div>
      ) : (
        habits.map((h) => {
          const todayLog = logs.find((l) => l.habit_id === h.id && l.log_date === today());
          const isClean = todayLog?.status === "clean";
          const isRelapse = todayLog?.status === "relapse";
          const s = streakDays(logs, h.id);
          return (
            <div key={h.id} className="glass rounded-3xl p-5 shadow-card">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold">{h.name}</h3>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Flame className={cn("h-4 w-4", s > 0 ? "text-flame animate-flame" : "text-muted-foreground")} />
                    <span>{s} day{s === 1 ? "" : "s"} clean</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button
                    onClick={() => markClean(h)}
                    disabled={isClean}
                    size="sm"
                    className={cn("h-10 rounded-xl", isClean ? "bg-success text-success-foreground" : "gradient-primary")}
                  >
                    {isClean ? <><Check className="mr-1 h-4 w-4" /> Clean today</> : "Mark clean"}
                  </Button>
                  {!isRelapse && (
                    <button onClick={() => setRelapseFor(h)} className="text-xs text-muted-foreground hover:text-foreground">
                      Log relapse
                    </button>
                  )}
                  {isRelapse && <span className="text-xs text-muted-foreground">Logged today</span>}
                </div>
              </div>
            </div>
          );
        })
      )}

      <Dialog open={!!relapseFor} onOpenChange={(o) => !o && setRelapseFor(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Log a relapse — no shame</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Patterns are gold. A short note now will pay off.</p>
          <Input value={relapseNote} onChange={(e) => setRelapseNote(e.target.value)} placeholder="What was the trigger? (optional)" className="h-12 rounded-xl" />
          <Button onClick={logRelapse} className="h-12 w-full rounded-xl gradient-primary">
            Save & reset
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
