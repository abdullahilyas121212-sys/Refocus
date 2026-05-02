import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function FocusSession() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const planned = Math.max(1, parseInt(params.get("minutes") || "25", 10));
  const intention = params.get("intention") || "";
  const totalSec = planned * 60;

  const [remaining, setRemaining] = useState(totalSec);
  const [done, setDone] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [exitReason, setExitReason] = useState("");
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const holdTimer = useRef<number | null>(null);

  // Create session row on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("focus_sessions")
        .insert({ user_id: user.id, planned_minutes: planned, intention: intention || null })
        .select("id")
        .single();
      sessionIdRef.current = data?.id ?? null;
    })();
  }, [user, planned, intention]);

  // Tick
  useEffect(() => {
    if (done) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id);
          completeSession();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const completeSession = async () => {
    setDone(true);
    const actual = Math.round((Date.now() - startedAtRef.current) / 60000);
    if (sessionIdRef.current) {
      await supabase
        .from("focus_sessions")
        .update({ completed: true, actual_minutes: Math.min(actual, planned), ended_at: new Date().toISOString(), ended_reason: "completed" })
        .eq("id", sessionIdRef.current);
    }
    toast.success("Session complete. Streak +1 🔥");
  };

  const abort = async () => {
    const actual = Math.round((Date.now() - startedAtRef.current) / 60000);
    if (sessionIdRef.current) {
      await supabase
        .from("focus_sessions")
        .update({ completed: false, actual_minutes: actual, ended_at: new Date().toISOString(), ended_reason: exitReason || "exited" })
        .eq("id", sessionIdRef.current);
    }
    navigate("/", { replace: true });
  };

  // Hold-to-exit (1.2s)
  const startHold = () => {
    setHoldProgress(0);
    const start = Date.now();
    holdTimer.current = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / 1200);
      setHoldProgress(p);
      if (p >= 1) {
        if (holdTimer.current) window.clearInterval(holdTimer.current);
        holdTimer.current = null;
        setExitOpen(true);
        setHoldProgress(0);
      }
    }, 30);
  };
  const cancelHold = () => {
    if (holdTimer.current) window.clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHoldProgress(0);
  };

  const pct = 1 - remaining / totalSec;
  const C = 2 * Math.PI * 130;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 safe-top safe-bottom">
      {intention && <p className="absolute top-10 px-6 text-center text-sm text-muted-foreground">{intention}</p>}

      <div className="relative grid place-items-center">
        <svg width="300" height="300" viewBox="0 0 300 300" className="-rotate-90">
          <circle cx="150" cy="150" r="130" stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
          <circle
            cx="150"
            cy="150"
            r="130"
            stroke="url(#g)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
            </linearGradient>
          </defs>
        </svg>
        <div className={cn("absolute h-32 w-32 rounded-full gradient-primary opacity-30 blur-2xl", !done && "animate-breathe")} />
        <div className="absolute text-center">
          <div className="text-6xl font-bold tabular-nums tracking-tight">{fmt(remaining)}</div>
          <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">{done ? "Done" : "In focus"}</div>
        </div>
      </div>

      <div className="mt-12 w-full max-w-xs">
        {done ? (
          <Button onClick={() => navigate("/", { replace: true })} className="h-14 w-full rounded-2xl gradient-primary text-base font-semibold shadow-glow">
            Finish
          </Button>
        ) : (
          <button
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            className="relative h-14 w-full overflow-hidden rounded-2xl border border-border bg-card text-sm font-medium text-muted-foreground"
          >
            <div className="absolute inset-y-0 left-0 bg-destructive/30 transition-[width]" style={{ width: `${holdProgress * 100}%` }} />
            <span className="relative">Hold to give up</span>
          </button>
        )}
      </div>

      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Before you go…</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">No judgment. A quick note helps you spot patterns later.</p>
          <Input value={exitReason} onChange={(e) => setExitReason(e.target.value)} placeholder="What pulled you away?" className="h-12 rounded-xl" />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setExitOpen(false)} className="h-12 flex-1 rounded-xl">
              Keep going
            </Button>
            <Button onClick={abort} variant="destructive" className="h-12 flex-1 rounded-xl">
              End session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
