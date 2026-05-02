import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Target, Sparkles, Loader2, Check, Circle } from "lucide-react";
import { toast } from "sonner";
import { awardPoints, POINTS } from "@/lib/rewards";

type Goal = { id: string; title: string; description: string | null };
type Task = { id: string; title: string; completed_at: string | null; goal_id: string | null; est_minutes: number | null };

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [suggestingFor, setSuggestingFor] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: g }, { data: t }] = await Promise.all([
      supabase.from("goals").select("id,title,description").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("tasks").select("id,title,completed_at,goal_id,est_minutes").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    ]);
    setGoals(g ?? []);
    setTasks(t ?? []);
  };

  useEffect(() => {
    load();
  }, [user]);

  const createGoal = async () => {
    if (!user || !title.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase.from("goals").insert({ user_id: user.id, title: title.trim(), description: desc.trim() || null });
      if (error) throw error;
      setTitle("");
      setDesc("");
      setOpen(false);
      load();
      toast.success("Goal added");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not add goal");
    } finally {
      setCreating(false);
    }
  };

  const suggest = async (goal: Goal) => {
    if (!user) return;
    setSuggestingFor(goal.id);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-tasks", {
        body: { goalTitle: goal.title, goalDescription: goal.description },
      });
      if (error) throw error;
      const suggestions: { title: string; est_minutes: number }[] = data?.tasks ?? [];
      if (!suggestions.length) {
        toast.info("No suggestions returned");
        return;
      }
      const { error: insErr } = await supabase
        .from("tasks")
        .insert(suggestions.map((s) => ({ user_id: user.id, goal_id: goal.id, title: s.title, est_minutes: s.est_minutes })));
      if (insErr) throw insErr;
      toast.success(`Added ${suggestions.length} tasks`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Suggestion failed");
    } finally {
      setSuggestingFor(null);
    }
  };

  const toggleTask = async (task: Task) => {
    const wasDone = !!task.completed_at;
    const completed_at = wasDone ? null : new Date().toISOString();
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed_at } : t)));
    await supabase.from("tasks").update({ completed_at }).eq("id", task.id);
    if (!wasDone) {
      await awardPoints({
        amount: POINTS.TASK_COMPLETED,
        reason: `Task done · ${task.title}`,
        sourceType: "task",
        sourceId: task.id,
      });
    }
  };

  return (
    <div className="animate-fade-in-up space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your goals</h1>
          <p className="text-sm text-muted-foreground">Big things, broken small.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl gradient-primary">
              <Plus className="mr-1 h-4 w-4" /> New
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add a goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to achieve?" className="h-12 rounded-xl" />
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Why does it matter? (optional)" className="h-12 rounded-xl" />
              <Button onClick={createGoal} disabled={creating || !title.trim()} className="h-12 w-full rounded-xl gradient-primary">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add goal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {goals.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <Target className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No goals yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add one and let the coach break it into daily tasks.</p>
        </div>
      ) : (
        goals.map((g) => {
          const goalTasks = tasks.filter((t) => t.goal_id === g.id);
          const done = goalTasks.filter((t) => t.completed_at).length;
          return (
            <div key={g.id} className="glass rounded-3xl p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{g.title}</h2>
                  {g.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.description}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {done}/{goalTasks.length} tasks done
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => suggest(g)} disabled={suggestingFor === g.id} className="shrink-0 rounded-xl">
                  {suggestingFor === g.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="mr-1 h-3.5 w-3.5" /> AI tasks</>}
                </Button>
              </div>

              {goalTasks.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {goalTasks.map((t) => (
                    <li key={t.id}>
                      <button onClick={() => toggleTask(t)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted/40">
                        {t.completed_at ? <Check className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                        <span className={t.completed_at ? "line-through text-muted-foreground" : ""}>{t.title}</span>
                        {t.est_minutes && <span className="ml-auto text-xs text-muted-foreground">{t.est_minutes}m</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
