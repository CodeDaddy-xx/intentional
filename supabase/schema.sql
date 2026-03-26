-- INTENTIONAL APP — Supabase Schema
-- Run this entire file in your Supabase SQL editor

-- ─── CONFIG (one row per user) ─────────────────────────────────────────────
create table if not exists config (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  notification_tone text not null default 'sarcastic', -- sarcastic | motivational | blunt | gentle
  focus_notifications_enabled boolean not null default false,
  focus_notification_interval_mins int not null default 45,
  evening_mode_start_hour int not null default 17,
  evening_notification_interval_mins int not null default 30,
  quotes jsonb not null default '[]',        -- string[]
  downtime_defaults jsonb not null default '[]', -- {id, label, firstStep}[]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── HABITS ────────────────────────────────────────────────────────────────
-- metric_type: 'boolean' | 'time' | 'units' | 'combo'
-- combo = boolean + time (e.g. "Did I exercise?" + "How long?")
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  label text not null,
  metric_type text not null default 'boolean',
  unit_label text,          -- used for 'units' and 'combo' (e.g. "pages", "km")
  time_label text,          -- used for 'time' and 'combo' (e.g. "minutes", "hours")
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- ─── DAILY PLAN ────────────────────────────────────────────────────────────
create table if not exists daily_plan (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  date date not null,
  tasks jsonb not null default '[]',        -- {id, label, done}[]
  downtime_menu jsonb not null default '[]', -- {id, label, firstStep}[]
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- ─── HABIT LOGS ────────────────────────────────────────────────────────────
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  habit_id uuid references habits(id) on delete cascade,
  date date not null,
  done boolean,         -- boolean / combo
  duration_mins int,    -- time / combo
  units numeric,        -- units
  notes text,
  created_at timestamptz default now(),
  unique(user_id, habit_id, date)
);

-- ─── DRIFT LOG ─────────────────────────────────────────────────────────────
create table if not exists drift_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  date date not null,
  logged_at timestamptz default now(),
  mode text not null default 'evening',     -- focus | evening
  chosen_activity text,
  breathing_completed boolean default false
);

-- ─── PUSH SUBSCRIPTIONS ────────────────────────────────────────────────────
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  subscription jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── INDEXES ───────────────────────────────────────────────────────────────
create index if not exists idx_habit_logs_user_date on habit_logs(user_id, date);
create index if not exists idx_drift_log_user_date on drift_log(user_id, date);
create index if not exists idx_daily_plan_user_date on daily_plan(user_id, date);
