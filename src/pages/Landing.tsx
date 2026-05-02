import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Timer, ShieldOff, Flame } from "lucide-react";

export default function Landing() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 safe-top">
      <header className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">Refocus</span>
        </div>
        <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Sign in
        </Link>
      </header>

      <section className="mt-16 animate-fade-in-up">
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
          Beat distraction.
          <br />
          <span className="text-gradient-primary">Build discipline.</span>
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          A calm coach for your phone. Lock in deep work, break dopamine loops, and stack daily wins — without the shame.
        </p>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-3">
        {[
          { icon: Timer, label: "Focus Mode", desc: "Pomodoro + lock screen" },
          { icon: Flame, label: "Streaks", desc: "Daily wins, visible" },
          { icon: ShieldOff, label: "Dopamine Detox", desc: "Quit the loop" },
          { icon: Sparkles, label: "AI Coach", desc: "Smart check-ins" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="glass rounded-2xl p-4">
            <Icon className="h-5 w-5 text-primary" />
            <div className="mt-2 text-sm font-semibold">{label}</div>
            <div className="text-xs text-muted-foreground">{desc}</div>
          </div>
        ))}
      </section>

      <div className="mt-auto pt-12">
        <Button asChild size="lg" className="h-14 w-full rounded-2xl text-base font-semibold gradient-primary shadow-glow">
          <Link to="/auth">Start free</Link>
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">No ads. No shame. Just progress.</p>
      </div>
    </div>
  );
}
