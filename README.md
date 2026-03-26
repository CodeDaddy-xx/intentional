# Intentional

> Stay focused. Live deliberately.

A personal focus + habit app built as a PWA. Sarcastic push notifications, breathing exercises, and deliberate alternatives — for the moments you catch yourself doom scrolling.

---

## Features

- **Morning setup** — set today's tasks and downtime menu (5 intentional options with first steps)
- **Focus mode** — optional pulse notifications during the day (configurable interval)
- **Evening mode** — "Wasting time?" pulse every 30 min after 5pm (configurable)
- **Breathing exercise** — 4s inhale / 6s exhale, 5 rounds, before showing alternatives
- **Alternatives screen** — 5 pre-set options with the smallest first step shown
- **Personality-driven notifications** — sarcastic / motivational / blunt / gentle, gets sassier with repeated drift
- **Personal quote bank** — your words, rotating through notifications
- **Habit tracker** — 4 metric types: Yes/No, Time, Units, or Combo (Yes + Time)
- **Progress views** — Daily, Weekly (habit grid + drift bars), Monthly (completion rates)
- **iPhone Shortcuts integration** — real-time interrupt when opening YouTube/Reddit

---

## Stack

- React 18 + Vite
- Supabase (database + persistence)
- Zustand (global state)
- vite-plugin-pwa + Web Push API (notifications)
- Deployed on Vercel

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd intentional
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL editor
3. Copy your project URL and anon key

### 3. VAPID keys (for push notifications)

```bash
npx web-push generate-vapid-keys
```

Keep the private key safe — you'll need it if you ever build a server-side push scheduler.

### 4. Environment variables

```bash
cp .env.example .env
# Fill in your Supabase URL, anon key, and VAPID public key
```

### 5. Run locally

```bash
npm run dev
```

### 6. Deploy to Vercel

```bash
npm install -g vercel
vercel
# Add your env vars in the Vercel dashboard under Project → Settings → Environment Variables
```

---

## iPhone Setup (critical for notifications)

PWA push notifications on iOS require the app to be added to the home screen:

1. Open the app in Safari
2. Tap the Share button → **Add to Home Screen**
3. Open the app from the home screen
4. Go to **Settings** → tap **Enable push notifications**
5. Allow when prompted

### iPhone Shortcuts (app-open interrupt)

Set this up once to catch yourself opening YouTube/Reddit in real time:

1. Open the **Shortcuts** app on iPhone
2. Tap **Automation** → **New Automation**
3. Choose **App** → select **YouTube**
4. Set trigger: **Opens**
5. Add action: **Show notification** → write: *"Is this intentional? Open Intentional."*
6. Turn off **Ask Before Running**
7. Repeat for Reddit, Safari (optional), or any other time-sinks

---

## Project Structure

```
src/
  components/
    Dashboard.jsx         — Today view: tasks, habits summary, drift count
    MorningSetup.jsx      — Set tasks + downtime menu for the day
    BreathingExercise.jsx — 4s/6s breathing, 5 rounds, full screen
    AlternativesScreen.jsx — 5 options + first step + quote
    HabitTracker.jsx      — Log habits (boolean/time/units/combo) + manage
    ProgressViews.jsx     — Day / Week / Month views
    Settings.jsx          — All config: tone, schedule, quotes, habits
    Nav.jsx               — Bottom nav
  hooks/
    useStore.js           — Zustand store (config, plan, habits, drift)
    usePushNotifications.js — Service worker + client-side scheduler
  lib/
    supabase.js           — Supabase client
    notifications.js      — Copy engine + scheduling logic + VAPID utils
  main.jsx
  App.jsx
  styles.css
supabase/
  schema.sql              — All tables + indexes
public/
  sw.js                   — Service worker (push + notification click)
```

---

## Customisation

### Add your own quotes

Go to **Settings → Personal quote bank** and add lines from whatever actually moves you — Dostoevsky, Chhayavaad poetry, Heidegger, something you wrote. Generic Pinterest quotes are not the vibe.

### Change notification tone

Settings → Notification personality. Sarcastic gets progressively worse the more times you drift in a day (by design).

### Habit metric types

| Type | What it tracks | Example |
|------|---------------|---------|
| Yes/No | Did you do it | Meditation |
| Time | Duration | Flute practice (minutes) |
| Units | Count/amount | Reading (pages), Walking (km) |
| Combo | Yes + Time | Exercise (done + how long) |

---

## Notes

- **No auth required** — this is a personal app, user ID is hardcoded to `'manik'` in `src/lib/supabase.js`. Change it to your name or add Supabase Auth later.
- **Client-side scheduler** — notifications are fired from a `setInterval` in the browser. This means the app tab needs to be open (or the PWA running). For truly reliable background push, you'd add a server-side cron that hits Supabase and sends pushes via the Web Push API using your VAPID private key.
- **iOS limitation** — web apps cannot detect what other apps you're using. The iPhone Shortcuts workaround handles this without any code.
