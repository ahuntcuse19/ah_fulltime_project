-- Boathouse Allocation Engine: SPEC.md Section 4 plus amendments A3, A6, A9.
-- Table and column names are normative. Enums are Postgres enums.

create type org_type as enum ('club', 'college', 'high_school', 'community_program');
create type skill_tier as enum ('novice', 'intermediate', 'competitive');
create type asset_class as enum (
  'shell_1x', 'shell_2x', 'shell_2-', 'shell_4x', 'shell_4+', 'shell_8+',
  'oar_set_sweep', 'oar_set_scull'
);
create type asset_status as enum ('on_water', 'caution', 'off_water', 'retired');
create type entitlement_kind as enum ('standing', 'eligible');
create type slot as enum ('AM1', 'AM2', 'PM1');
create type session_source as enum ('standing', 'form', 'intake');
create type session_status as enum ('requested', 'allocated', 'partially_allocated', 'unfilled', 'cancelled');
create type allocation_basis as enum ('standing', 'priority', 'manual');
create type component as enum ('hull', 'rigger', 'oarlock', 'seat_slide', 'foot_stretcher', 'fin_skeg', 'oar', 'other');
create type severity as enum ('cosmetic', 'caution', 'off_water');
create type damage_status as enum ('open', 'parts_ordered', 'fixed');
create type program_type as enum ('mens', 'womens', 'mixed');

-- 4.1
create table organization (
  id uuid primary key,
  name text not null,
  type org_type not null,
  priority_tier int not null check (priority_tier in (1, 2, 3)),
  default_skill_tier skill_tier not null,
  annual_fee_cents int not null
);

-- 4.2 plus A9 retired_on
create table asset (
  id uuid primary key,
  name text not null,
  asset_class asset_class not null,
  seats int not null,
  quality_tier skill_tier not null,
  owner_org_id uuid null references organization (id),
  shared boolean not null,
  year_built int not null,
  purchase_cost_cents int not null,
  replacement_cost_cents int not null,
  donor_name text null,
  status asset_status not null default 'on_water',
  rack_location text not null,
  retired_on date null,
  constraint house_owned_is_shared check (owner_org_id is not null or shared = true)
);

-- 4.3
create table entitlement (
  id uuid primary key,
  org_id uuid not null references organization (id),
  asset_id uuid not null references asset (id),
  kind entitlement_kind not null,
  slot slot null,
  days int[] null,
  constraint standing_has_slot_and_days check (
    kind <> 'standing' or (slot is not null and days is not null)
  )
);

-- 4.4 plus A6 program
create table session (
  id uuid primary key,
  org_id uuid not null references organization (id),
  date date not null,
  slot slot not null,
  skill_tier skill_tier not null,
  requested_seats int not null,
  source session_source not null,
  raw_request_text text null,
  status session_status not null default 'requested',
  created_at timestamptz not null default now(),
  program program_type null,
  constraint session_one_per_org_slot_day unique (org_id, date, slot)
);

-- 4.5
create table allocation (
  id uuid primary key,
  session_id uuid not null references session (id) on delete cascade,
  asset_id uuid not null references asset (id),
  basis allocation_basis not null,
  approved boolean not null default false,
  overridden_from_asset_id uuid null references asset (id),
  override_reason text null,
  constraint override_needs_reason check (
    overridden_from_asset_id is null or (override_reason is not null and length(trim(override_reason)) > 0)
  )
);
create index allocation_session_idx on allocation (session_id);
create index allocation_asset_idx on allocation (asset_id);

-- 4.6
create table damage_event (
  id uuid primary key,
  asset_id uuid not null references asset (id),
  reported_on date not null,
  reported_by_org_id uuid null references organization (id),
  liable_org_id uuid null references organization (id),
  component component not null,
  description text not null,
  severity severity not null,
  status damage_status not null default 'open',
  resolved_on date null,
  cost_cents int not null default 0,
  constraint fixed_has_resolved_on check (status <> 'fixed' or resolved_on is not null)
);
create index damage_event_asset_idx on damage_event (asset_id);

-- 4.7
create table part (
  id uuid primary key,
  name text not null,
  component component not null,
  qty_in_stock int not null,
  qty_on_order int not null,
  unit_cost_cents int not null,
  reorder_threshold int not null
);

-- 4.8
create table damage_event_part (
  damage_event_id uuid not null references damage_event (id) on delete cascade,
  part_id uuid not null references part (id),
  qty_used int not null,
  primary key (damage_event_id, part_id)
);

-- A3
create table boat_report_note (
  asset_id uuid primary key references asset (id),
  text text not null,
  updated_at timestamptz not null
);

-- Seed support: truncate every table in dependency order (Section 2, npm run seed).
create or replace function truncate_all()
returns void
language sql
security definer
as $$
  truncate table
    boat_report_note,
    damage_event_part,
    allocation,
    damage_event,
    entitlement,
    session,
    part,
    asset,
    organization
  restart identity cascade;
$$;

-- No authentication is in scope (Section 1), so row level security stays off on every table.
