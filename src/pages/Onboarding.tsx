import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STRUGGLES = ["Doomscrolling", "Procrastination", "Porn / NSFW", "Short-form video", "Gaming binges", "Phone in bed"];
const HABITS = ["Instagram", "TikTok", "YouTube Shorts", "Reddit", "Twitter/X", "Porn"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [struggles, setStruggles] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [habits, setHabits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const finish = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (goal.trim()) {
        await supabase.from("goals").insert({ user_id: user.id, title: goal.trim(), category: "primary" });
      }
      if (habits.length) {
        await supabase.from("habits").insert(habits.map((name) => ({ user_id: user.id, name })));
      }
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
      toast.success("All set. Let's begin.");
      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setLoading(false);
    }
  };

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 safe-top">
      <div className="flex items-center gap-2 pt-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>

      <div key={step} className="mt-10 animate-fade-in-up">
        {step === 0 && (
          <>
            <h1 className="text-2xl font-bold tracking-tight">What's pulling your attention?</h1>
            <p className="mt-2 text-sm text-muted-foreground">No judgment. Pick all that apply.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {STRUGGLES.map((s) => {
                const on = struggles.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(struggles, setStruggles, s)}
                    className={cn(
                      "rounded-2xl border p-4 text-left text-sm font-medium transition-all",
                      on ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {s}
                    {on && <Check className="float-right h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold tracking-tight">What's the one goal that matters?</h1>
            <p className="mt-2 text-sm text-muted-foreground">Be specific. We'll break it down for you later.</p>
            <Input
              autoFocus
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Ship my side project by July"
              className="mt-6 h-14 rounded-2xl text-base"
            />
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Which loops do you want to break?</h1>
            <p className="mt-2 text-sm text-muted-foreground">We'll track clean days for each one.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {HABITS.map((s) => {
                const on = habits.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(habits, setHabits, s)}
                    className={cn(
                      "rounded-2xl border p-4 text-left text-sm font-medium transition-all",
                      on ? "border-flame bg-flame/10 text-foreground" : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {s}
                    {on && <Check className="float-right h-4 w-4 text-flame" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="mt-auto flex gap-3 pt-10">
        {step > 0 && (
          <Button variant="outline" onClick={back} className="h-14 flex-1 rounded-2xl">
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button onClick={next} className="h-14 flex-1 rounded-2xl gradient-primary text-base font-semibold shadow-glow">
            Continue
          </Button>
        ) : (
          <Button onClick={finish} disabled={loading} className="h-14 flex-1 rounded-2xl gradient-primary text-base font-semibold shadow-glow">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start using Refocus"}
          </Button>
        )}
      </div>
    </div>
  );
}
