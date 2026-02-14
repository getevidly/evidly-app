-- Referral System Tables (Task #59)
-- Creative, workflow-embedded referral mechanics

-- ── Referral codes & tracking ──────────────────────────
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  referrer_user_id uuid references auth.users(id),
  referral_code text unique not null,
  referred_email text,
  referred_org_id uuid references public.organizations(id),
  mechanic text not null check (mechanic in ('champion_badge', 'network_leaderboard', 'inspection_hero', 'k2c_amplifier', 'vendor_ripple')),
  status text not null default 'pending' check (status in ('pending', 'clicked', 'signed_up', 'converted', 'expired')),
  reward_type text check (reward_type in ('month_free', 'feature_unlock', 'k2c_donation', 'badge_upgrade', 'vendor_credit')),
  reward_amount numeric(10,2),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  converted_at timestamptz,
  expires_at timestamptz default (now() + interval '90 days')
);

-- ── Compliance Champion badges ─────────────────────────
create table if not exists public.compliance_badges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  location_id uuid,
  badge_type text not null check (badge_type in ('compliance_champion', 'perfect_streak', 'zero_incidents', 'rapid_response', 'vendor_excellence')),
  badge_level text not null default 'bronze' check (badge_level in ('bronze', 'silver', 'gold', 'platinum')),
  earned_at timestamptz default now(),
  score_at_earning integer,
  shareable_url text,
  referral_code text references public.referrals(referral_code),
  share_count integer default 0,
  click_count integer default 0,
  conversion_count integer default 0,
  metadata jsonb default '{}'
);

-- ── Network scores (cross-org leaderboard) ─────────────
create table if not exists public.network_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  display_name text not null,
  compliance_score integer not null default 0,
  referral_points integer not null default 0,
  badges_earned integer not null default 0,
  k2c_donations numeric(10,2) default 0,
  network_rank integer,
  total_referrals integer default 0,
  successful_referrals integer default 0,
  updated_at timestamptz default now()
);

-- ── K2C (Kitchen to Community) donations ───────────────
create table if not exists public.k2c_donations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  referral_id uuid references public.referrals(id),
  charity_name text not null,
  amount numeric(10,2) not null,
  donated_at timestamptz default now(),
  receipt_url text,
  public_message text
);

-- ── Vendor Ripple tracking ─────────────────────────────
create table if not exists public.vendor_ripples (
  id uuid primary key default gen_random_uuid(),
  source_org_id uuid references public.organizations(id),
  vendor_id uuid,
  vendor_name text not null,
  referred_org_id uuid references public.organizations(id),
  status text not null default 'pending' check (status in ('pending', 'connected', 'onboarded')),
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_referrals_code on public.referrals(referral_code);
create index if not exists idx_referrals_org on public.referrals(organization_id);
create index if not exists idx_badges_org on public.compliance_badges(organization_id);
create index if not exists idx_network_scores_rank on public.network_scores(network_rank);
create index if not exists idx_k2c_org on public.k2c_donations(organization_id);

-- RLS policies
alter table public.referrals enable row level security;
alter table public.compliance_badges enable row level security;
alter table public.network_scores enable row level security;
alter table public.k2c_donations enable row level security;
alter table public.vendor_ripples enable row level security;

create policy "Users can view own org referrals" on public.referrals
  for select using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Users can insert own org referrals" on public.referrals
  for insert with check (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Users can view own org badges" on public.compliance_badges
  for select using (organization_id = (select organization_id from public.profiles where id = auth.uid()));

create policy "Anyone can view network scores" on public.network_scores
  for select using (true);

create policy "Users can view own org k2c" on public.k2c_donations
  for select using (organization_id = (select organization_id from public.profiles where id = auth.uid()));
