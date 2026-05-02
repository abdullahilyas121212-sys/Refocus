
# Refocus — Lean MVP Plan

A mobile-first, dark-mode web app that helps 15–35 year-olds beat distraction and build discipline. Built as a responsive PWA-ready React app today, wrappable with Capacitor later for App Store / Play Store.

## Name shortlist
Refocus, Momentum, Deepen, Reclaim, Anchor, Loop, Stoik, Flowstate, Reset, Lockin. Working name: **Refocus** (swap any time).

## v1 scope (4 features)
1. **Smart Goals & Tasks** — create goals, AI breaks them into right-sized daily tasks
2. **Focus Mode** — Pomodoro + custom timers, in-app focus lock with friction to exit, streaks
3. **Dopamine Detox Tracker** — track bad-habit-free streaks, shame-free relapse logging
4. **AI Coach** — morning intent check-in, evening reflection, pattern-based nudges

Deferred to v2: accountability/friends, deep analytics, micro-habit builder, blocker rules.

## User journey
1. Land → value prop + "Start" CTA
2. Sign up (email or Google)
3. 60-second onboarding: pick struggle areas, pick 1 goal, pick bad habits to quit
4. Land on **Dashboard** (today's intent, streak flames, next focus session, AI nudge)
5. Tap **Focus** → choose duration → enter lock screen (timer, breathing dot, "exit" requires 10s hold + reason)
6. Complete session → reward animation, streak +1, log to history
7. Tap **Detox** → mark each habit clean today, or log relapse with optional note (no judgment copy)
8. Evening → AI coach prompts reflection, summarizes day, sets tomorrow's intent

## Screens (mobile-first, dark default)
- **Auth**: sign in / sign up, Google button
- **Onboarding** (3 steps): struggles → primary goal → habits to quit
- **Dashboard (Home)**: greeting, today's intent card, streak ring, "Start Focus" big CTA, today's tasks, AI nudge card
- **Goals**: list of goals → detail with AI-generated daily tasks, progress bar
- **Focus setup**: duration picker (25/50/custom), intention input, start
- **Focus Lock screen**: full-screen timer, ambient pulse, "give up" requires hold-to-exit + reason
- **Detox**: row per tracked habit with streak flame, tap = clean day, long-press = log relapse
- **Coach**: chat-style thread with daily check-in + reflection prompts
- **Profile/Settings**: account, theme, notifications, sign out

## Database (Lovable Cloud)
- `profiles` (id, display_name, avatar_url, timezone, created_at)
- `user_roles` (id, user_id, role) — separate table per security best practice
- `goals` (id, user_id, title, description, category, target_date, status)
- `tasks` (id, goal_id, user_id, title, est_minutes, due_date, completed_at)
- `focus_sessions` (id, user_id, planned_minutes, actual_minutes, intention, completed, ended_reason, started_at, ended_at)
- `habits` (id, user_id, name, type) — habits to quit
- `habit_logs` (id, habit_id, user_id, date, status: clean|relapse, note)
- `streaks` (id, user_id, kind: focus|habit, ref_id, current, best, last_date)
- `coach_messages` (id, user_id, role: user|assistant, content, kind: checkin|reflection|chat, created_at)

RLS on every table: users only access their own rows.

## Tech architecture
- **Frontend**: React + Vite + TypeScript, Tailwind, shadcn/ui, React Router, TanStack Query
- **Backend**: Lovable Cloud (Postgres + Auth + Edge Functions + Storage)
- **Auth**: Email/password + Google
- **AI**: Lovable AI Gateway via edge function `coach-chat` (streaming) and `suggest-tasks` (structured output) — default model `google/gemini-3-flash-preview`
- **State**: TanStack Query for server state, local state for timer
- **PWA-ready**: meta tags + manifest now so Capacitor wrap is trivial later
- **Offline-friendly**: timer + last-known dashboard data cached; writes queued

## Design language
- Dark default, near-black background, single warm accent (amber for streak flame, soft violet for focus)
- Generous spacing, large touch targets, rounded-2xl cards
- Subtle motion: pulse on focus lock, confetti-lite on streak gain
- Copy tone: calm, direct, no guilt — "Today's a fresh page" not "You failed yesterday"

## Build phases (so we ship in clean increments)
1. Auth + onboarding + dashboard shell + design system
2. Goals + tasks + AI task suggester
3. Focus mode (timer, lock, streaks, history)
4. Detox tracker (habits, daily mark, relapse log, streaks)
5. AI Coach (check-in, reflection, chat thread)
6. Polish: PWA manifest, install prompt, empty states, animations

## Out of scope for v1 (explicit)
- OS-level app blocking (impossible in web/PWA)
- Friends/accountability/social
- Payments/premium tier
- Push notifications (web push can be added in polish if desired)
- Capacitor packaging (plan covered separately once v1 is approved)

After approval, I'll start with phase 1 (auth + dashboard shell + design system) and check in before moving to phase 2.
