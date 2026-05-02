import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS = [25, 50, 90];

export default function Focus() {
  const navigate = useNavigate();
  const [duration, setDuration] = useState(25);
  const [custom, setCustom] = useState("");
  const [intention, setIntention] = useState("");

  const start = () => {
    const mins = custom ? Math.max(1, Math.min(180, parseInt(custom, 10) || duration)) : duration;
    const params = new URLSearchParams({ minutes: String(mins) });
    if (intention.trim()) params.set("intention", intention.trim());
    navigate(`/focus/session?${params.toString()}`);
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Focus session</h1>
        <p className="text-sm text-muted-foreground">Pick a duration. Set an intention. Lock in.</p>
      </header>

      <div className="glass rounded-3xl p-5 shadow-card">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Duration</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => { setDuration(m); setCustom(""); }}
              className={cn(
                "rounded-2xl border py-4 text-center font-semibold transition-all",
                duration === m && !custom ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground"
              )}
            >
              <div className="text-2xl">{m}</div>
              <div className="text-[10px] uppercase tracking-wider">min</div>
            </button>
          ))}
        </div>
        <Input
          type="number"
          min={1}
          max={180}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Custom minutes"
          className="mt-3 h-12 rounded-xl"
        />
      </div>

      <div className="glass rounded-3xl p-5 shadow-card">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Intention (optional)</p>
        <Input
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          placeholder="What will you accomplish?"
          className="mt-3 h-12 rounded-xl"
        />
      </div>

      <Button onClick={start} size="lg" className="h-14 w-full rounded-2xl gradient-primary text-base font-semibold shadow-glow">
        <Timer className="mr-2 h-5 w-5" />
        Start
      </Button>
    </div>
  );
}
