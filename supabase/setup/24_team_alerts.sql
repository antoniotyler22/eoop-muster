-- Team alerts: every phone connected to the team gets "Team update" when something changes.
-- Limits it to one alert every 90 seconds per team. Safe to re-run.
alter table public.feeds add column if not exists team_push_at timestamptz;
