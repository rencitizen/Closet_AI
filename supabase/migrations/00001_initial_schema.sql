create extension if not exists pgcrypto;

create table public.closets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null default 'My Closet',
  timezone text not null default 'Asia/Tokyo',
  currency text not null default 'JPY',
  created_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  closet_id uuid not null references public.closets(id) on delete cascade,
  name text not null,
  location_type text not null default 'closet',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (closet_id, name)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  closet_id uuid not null references public.closets(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (closet_id, name)
);

create table public.clothing_items (
  id uuid primary key default gen_random_uuid(),
  closet_id uuid not null references public.closets(id) on delete cascade,
  primary_image_url text,
  name text not null,
  category text not null,
  subcategory text,
  brand text,
  color text,
  secondary_colors text[] not null default '{}',
  size_label text,
  fit text,
  material text,
  season_tags text[] not null default '{}',
  occasion_tags text[] not null default '{}',
  purchase_date date,
  purchase_price numeric(12, 2),
  purchase_store text,
  status text not null default 'active',
  condition_score int not null default 3,
  care_type text not null default 'machine_wash',
  laundry_interval_wears int,
  wear_count int not null default 0,
  last_worn_at date,
  last_cared_at date,
  location_id uuid references public.locations(id) on delete set null,
  notes text,
  archived_at timestamptz,
  disposed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clothing_items_status_check
    check (status in ('active', 'in_laundry', 'in_cleaning', 'stored', 'lent', 'archived', 'disposed')),
  constraint clothing_items_condition_score_check
    check (condition_score between 1 and 5),
  constraint clothing_items_laundry_interval_check
    check (laundry_interval_wears is null or laundry_interval_wears between 1 and 99)
);

create table public.clothing_item_images (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.clothing_items(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.clothing_item_tags (
  item_id uuid not null references public.clothing_items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (item_id, tag_id)
);

create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  closet_id uuid not null references public.closets(id) on delete cascade,
  name text not null,
  season_tags text[] not null default '{}',
  occasion_tags text[] not null default '{}',
  rating int,
  is_favorite boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outfits_rating_check
    check (rating is null or rating between 1 and 5)
);

create table public.outfit_items (
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  item_id uuid not null references public.clothing_items(id) on delete cascade,
  role text,
  sort_order int not null default 0,
  primary key (outfit_id, item_id)
);

create table public.wear_logs (
  id uuid primary key default gen_random_uuid(),
  closet_id uuid not null references public.closets(id) on delete cascade,
  worn_on date not null,
  outfit_id uuid references public.outfits(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.wear_log_items (
  wear_log_id uuid not null references public.wear_logs(id) on delete cascade,
  item_id uuid not null references public.clothing_items(id) on delete cascade,
  primary key (wear_log_id, item_id)
);

create table public.care_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.clothing_items(id) on delete cascade,
  care_type text not null,
  status text not null default 'done',
  cared_on date not null,
  cost numeric(12, 2),
  vendor_name text,
  notes text,
  created_at timestamptz not null default now(),
  constraint care_logs_status_check
    check (status in ('queued', 'in_progress', 'done'))
);

create table public.purchase_records (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.clothing_items(id) on delete cascade,
  purchased_on date,
  price numeric(12, 2),
  store_name text,
  channel text,
  order_reference text,
  created_at timestamptz not null default now()
);

create table public.disposal_records (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.clothing_items(id) on delete cascade,
  disposed_on date not null,
  disposal_type text not null,
  recovered_amount numeric(12, 2),
  reason text,
  notes text,
  created_at timestamptz not null default now(),
  constraint disposal_records_type_check
    check (disposal_type in ('sold', 'donated', 'discarded', 'gifted'))
);

create table public.saved_filters (
  id uuid primary key default gen_random_uuid(),
  closet_id uuid not null references public.closets(id) on delete cascade,
  name text not null,
  filter_json jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_clothing_items_closet_status
  on public.clothing_items (closet_id, status);

create index idx_clothing_items_closet_category
  on public.clothing_items (closet_id, category);

create index idx_clothing_items_last_worn_at
  on public.clothing_items (closet_id, last_worn_at desc);

create index idx_wear_logs_closet_worn_on
  on public.wear_logs (closet_id, worn_on desc);

create index idx_care_logs_item_cared_on
  on public.care_logs (item_id, cared_on desc);

alter table public.closets enable row level security;
alter table public.locations enable row level security;
alter table public.tags enable row level security;
alter table public.clothing_items enable row level security;
alter table public.clothing_item_images enable row level security;
alter table public.clothing_item_tags enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;
alter table public.wear_logs enable row level security;
alter table public.wear_log_items enable row level security;
alter table public.care_logs enable row level security;
alter table public.purchase_records enable row level security;
alter table public.disposal_records enable row level security;
alter table public.saved_filters enable row level security;

create policy "closets_select_own"
  on public.closets for select
  using (user_id = auth.uid());

create policy "closets_insert_own"
  on public.closets for insert
  with check (user_id = auth.uid());

create policy "closets_update_own"
  on public.closets for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "closets_delete_own"
  on public.closets for delete
  using (user_id = auth.uid());
