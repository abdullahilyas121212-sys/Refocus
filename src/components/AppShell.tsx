import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Target, Timer, ShieldOff, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/focus", label: "Focus", icon: Timer },
  { to: "/detox", label: "Detox", icon: ShieldOff },
  { to: "/coach", label: "Coach", icon: Sparkles },
];

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  // Hide nav on full-screen focus lock
  const hideNav = location.pathname.startsWith("/focus/session");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <main className={cn("flex-1 px-5 pt-6", !hideNav && "pb-28")}>{children}</main>
      {!hideNav && (
        <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 safe-bottom">
          <div className="mx-3 mb-3 glass rounded-2xl shadow-card">
            <ul className="flex items-center justify-around px-2 py-2">
              {tabs.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium transition-colors",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_8px_hsl(var(--primary))]")} />
                        <span>{label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </div>
  );
}
