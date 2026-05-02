import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Flame, Timer, ArrowRight, Sparkles, Crown, Target, Trophy } from "lucide-react";
import { usePoints } from "@/hooks/usePoints";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const { points, level, title, progress, toNext } = usePoints();
  const [name, setName] = useState("");
  const [focusToday, setFocusToday] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      setName(profile?.display_name ?? "");

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data: sessions } = await supabase
        .from("focus_sessions")
        .select("actual_minutes, completed")
        .eq("user_id", user.id)
        .gte("started_at", start.toISOString());
      const mins = (sessions ?? []).reduce((a, s) => a + (s.actual_minutes ?? 0), 0);
      setFocusToday(mins);

      // Naive streak: count of distinct days in last 30 with a completed session
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data: hist } = await supabase
        .from("focus_sessions")
        .select("started_at")
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("started_at", since.toISOString())
        .order("started_at", { ascending: false });
      const days = new Set((hist ?? []).map((h) => new Date(h.started_at).toDateString()));
      let s = 0;
      const d = new Date();
      while (days.has(d.toDateString())) {
        s += 1;
        d.setDate(d.getDate() - 1);
      }
      setStreak(s);
    })();
  }, [user]);

  return (
    <div className="animate-fade-in-up space-y-5">
      <header>
        <p className="text-sm text-muted-foreground">{greeting()}{name ? `, ${name.split(" ")[0]}` : ""}</p>
        <h1 className="text-3xl font-bold tracking-tight">Today's a fresh page.</h1>
      </header>

      <div className="glass rounded-3xl p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Focus today</p>
            <p className="mt-1 text-3xl font-bold">
              {focusToday}
              <span className="ml-1 text-base font-medium text-muted-foreground">min</span>
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-flame/10 px-3 py-2">
            <Flame className="h-5 w-5 text-flame animate-flame" />
            <div>
              <div className="text-xl font-bold leading-none">{streak}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">day streak</div>
            </div>
          </div>
        </div>
        <Button asChild size="lg" className="mt-5 h-14 w-full rounded-2xl gradient-primary text-base font-semibold shadow-glow">
          <Link to="/focus">
            <Timer className="mr-2 h-5 w-5" />
            Start a focus session
          </Link>
        </Button>
      </div>

      <Link to="/coach" className="block">
        <div className="glass rounded-3xl p-5 shadow-card transition-transform active:scale-[0.99]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl gradient-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Check in with your coach</p>
              <p className="text-sm text-muted-foreground">Set today's intent in 30 seconds.</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/goals" className="glass rounded-2xl p-4 transition-transform active:scale-[0.98]">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Goals</p>
          <p className="mt-2 text-base font-semibold">Plan your day</p>
        </Link>
        <Link to="/detox" className="glass rounded-2xl p-4 transition-transform active:scale-[0.98]">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Detox</p>
          <p className="mt-2 text-base font-semibold">Mark clean day</p>
        </Link>
      </div>
    </div>
  );
}
