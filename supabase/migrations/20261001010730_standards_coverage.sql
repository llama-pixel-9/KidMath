-- Standards codes and coverage (docs/standards-coverage.md).
--
-- Five tables and four views, all additive:
--   standards            one row per code per framework (Common Core and four
--                        states), with our own one-line summary
--   standard_crosswalk   one row per link from a state code to a Common Core code
--   blueprint_rows       the one-line question plans Sai approves, per skill
--   blueprint_standards  which codes a blueprint row serves (link rows, FK-checked)
--   item_model_standards which codes an item model serves (derived from the
--                        model's spec by trigger, FK-checked)
-- and the computed views standard_blueprint_links, standard_model_links,
-- blueprint_row_progress and standard_coverage. Coverage is never typed by hand.
--
-- The code lists live in the repo (src/standards/*.json) and are copied here by
-- scripts/standards/loadStandards.js; the repo is the source, CI checks codes
-- against it. Nothing here edits an existing row: item_models and item_bank
-- each gain one nullable column, and approved models are never rewritten.

-- ---------------------------------------------------------------------------
-- standards
-- ---------------------------------------------------------------------------
create table if not exists public.standards (
  framework   text not null check (framework in ('ccss', 'tx', 'fl', 'va', 'ga')),
  code        text not null,
  aliases     text[] not null default '{}',
  grade       text not null check (grade in ('K', '1', '2', '3', '4', '5')),
  domain      text not null,
  cluster     text,
  summary     text not null,
  kind        text not null check (kind in ('fluency', 'skill', 'word_problem', 'concept')),
  in_scope    text not null default 'yes' check (in_scope in ('yes', 'partly', 'no')),
  scope_note  text,
  parent_code text,
  edition     text not null,
  source_url  text,
  sort_order  integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (framework, code),
  -- A sub-part (3.NF.A.2a, Virginia's 3.CE.2f) points at its parent. Deferred
  -- so one load can insert parents and children in any order.
  constraint standards_parent_fk foreign key (framework, parent_code)
    references public.standards (framework, code) deferrable initially deferred
);

comment on table public.standards is
  'K-5 math codes per framework. summary is our own wording; the official text stays at source_url. Source of truth: src/standards/*.json.';

create index if not exists standards_framework_grade_idx
  on public.standards (framework, grade, sort_order);

drop trigger if exists standards_touch_updated_at on public.standards;
create trigger standards_touch_updated_at
  before update on public.standards
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- standard_crosswalk: one row per link. A Common Core code has a row for each
-- state code it links to, and a state that splits a skill across grades gets
-- more than one. Only `same` counts a Common Core tag toward the state code;
-- the other matches show as "needs a look".
-- ---------------------------------------------------------------------------
create table if not exists public.standard_crosswalk (
  framework      text not null check (framework <> 'ccss'),
  code           text not null,
  ccss_framework text not null default 'ccss' check (ccss_framework = 'ccss'),
  ccss_code      text not null,
  match          text not null check (match in ('same', 'partly', 'broader', 'narrower')),
  note           text,
  checked_by     text,
  checked_at     timestamptz,
  primary key (framework, code, ccss_code),
  foreign key (framework, code)
    references public.standards (framework, code) on delete cascade,
  foreign key (ccss_framework, ccss_code)
    references public.standards (framework, code) on delete cascade
);

create index if not exists standard_crosswalk_ccss_idx
  on public.standard_crosswalk (ccss_code);

-- ---------------------------------------------------------------------------
-- blueprint_rows: the question lines Sai approves before any model is written
-- ("2.MD.C.8, join change unknown, coin picture, typed, easy"). Fluency rows
-- are one per operation, strategy group and grade. Authored in the repo
-- (src/blueprints/*.json); `status` is decided here and a reload never
-- overwrites a row that is no longer a draft.
-- ---------------------------------------------------------------------------
create table if not exists public.blueprint_rows (
  id            text primary key,
  track         text not null default 'item' check (track in ('item', 'fluency')),
  mode_id       text not null,
  grade         text not null check (grade in ('K', '1', '2', '3', '4', '5')),
  title         text not null,
  problem_type  text,
  picture       text,
  answer_format text,
  difficulty    text,
  example       text,
  spec          jsonb not null default '{}'::jsonb,
  status        text not null default 'draft' check (status in ('draft', 'approved', 'struck')),
  note          text,
  reviewed_by   uuid,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists blueprint_rows_mode_grade_idx
  on public.blueprint_rows (mode_id, grade, status);

drop trigger if exists blueprint_rows_touch_updated_at on public.blueprint_rows;
create trigger blueprint_rows_touch_updated_at
  before update on public.blueprint_rows
  for each row execute function public.touch_updated_at();

create table if not exists public.blueprint_standards (
  blueprint_id text not null references public.blueprint_rows (id) on delete cascade,
  framework    text not null,
  code         text not null,
  primary key (blueprint_id, framework, code),
  foreign key (framework, code) references public.standards (framework, code) on delete cascade
);

create index if not exists blueprint_standards_code_idx
  on public.blueprint_standards (framework, code);

-- An item model points back at the blueprint row it was written for; a
-- generated bank row can point at its row directly (fluency facts have no
-- model). Both nullable, so every existing row is untouched.
alter table public.item_models
  add column if not exists blueprint_id text references public.blueprint_rows (id) on delete set null;

alter table public.item_bank
  add column if not exists blueprint_id text references public.blueprint_rows (id) on delete set null;

create index if not exists item_bank_blueprint_idx
  on public.item_bank (blueprint_id) where blueprint_id is not null;

-- ---------------------------------------------------------------------------
-- item_model_standards: derived from item_models.spec->'standards', which the
-- review screen, harness and CI keep reading. A trigger rewrites a model's
-- link rows whenever its spec is written, so every writer (the loader, the
-- review screen's editor) keeps them current. Codes for a framework not
-- loaded yet are skipped; sync_item_model_standards() re-derives them after
-- a load.
-- ---------------------------------------------------------------------------
create table if not exists public.item_model_standards (
  item_model_id text not null references public.item_models (id) on delete cascade,
  framework     text not null,
  code          text not null,
  primary key (item_model_id, framework, code),
  foreign key (framework, code) references public.standards (framework, code) on delete cascade
);

create index if not exists item_model_standards_code_idx
  on public.item_model_standards (framework, code);

create or replace function public.sync_item_model_standards(p_model_id text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  written integer;
begin
  delete from public.item_model_standards
   where p_model_id is null or item_model_id = p_model_id;

  insert into public.item_model_standards (item_model_id, framework, code)
  select distinct m.id, s.framework, s.code
    from public.item_models m
   cross join lateral jsonb_each(
           case when jsonb_typeof(m.spec -> 'standards') = 'object'
                then m.spec -> 'standards' else '{}'::jsonb end) f(framework, codes)
   cross join lateral jsonb_array_elements_text(
           case jsonb_typeof(f.codes)
             when 'array' then f.codes
             when 'string' then jsonb_build_array(f.codes)
             else '[]'::jsonb end) c(code)
    join public.standards s
      on s.framework = f.framework
     and (s.code = btrim(c.code) or btrim(c.code) = any (s.aliases))
   where p_model_id is null or m.id = p_model_id;

  get diagnostics written = row_count;
  return written;
end;
$$;

create or replace function public.item_models_sync_standards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_item_model_standards(new.id);
  return null;
end;
$$;

drop trigger if exists item_models_sync_standards on public.item_models;
create trigger item_models_sync_standards
  after insert or update of spec on public.item_models
  for each row execute function public.item_models_sync_standards();

-- Only the loader (service role) and the database owner re-derive links.
revoke all on function public.sync_item_model_standards(text) from public, anon, authenticated;
revoke all on function public.item_models_sync_standards() from public, anon, authenticated;
grant execute on function public.sync_item_model_standards(text) to service_role;

-- ---------------------------------------------------------------------------
-- Row-level security: admin-only, like item_models. Kids never read these.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['standards', 'standard_crosswalk', 'blueprint_rows',
                           'blueprint_standards', 'item_model_standards']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_admin(auth.uid()))',
                   t || '_admin_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin(auth.uid()))',
                   t || '_admin_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()))',
                   t || '_admin_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin(auth.uid()))',
                   t || '_admin_delete', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Views. security_invoker so a reader sees only what the table policies allow.
-- ---------------------------------------------------------------------------

-- The codes a blueprint row or a model counts toward: its own tags, plus each
-- state code the crosswalk calls the `same` as one of its Common Core tags.
create or replace view public.standard_blueprint_links
with (security_invoker = true) as
  select bs.framework, bs.code, bs.blueprint_id, 'direct'::text as via
    from public.blueprint_standards bs
  union
  select x.framework, x.code, bs.blueprint_id, 'crosswalk'::text
    from public.standard_crosswalk x
    join public.blueprint_standards bs
      on bs.framework = 'ccss' and bs.code = x.ccss_code
   where x.match = 'same';

create or replace view public.standard_model_links
with (security_invoker = true) as
  select ims.framework, ims.code, ims.item_model_id, 'direct'::text as via
    from public.item_model_standards ims
  union
  select x.framework, x.code, ims.item_model_id, 'crosswalk'::text
    from public.standard_crosswalk x
    join public.item_model_standards ims
      on ims.framework = 'ccss' and ims.code = x.ccss_code
   where x.match = 'same';

-- One row per blueprint row: how far it has got. stage is 0 planned,
-- 1 models written, 2 items ready (approved model + approved v2 items),
-- 3 in preview, 4 live for everyone.
create or replace view public.blueprint_row_progress
with (security_invoker = true) as
  with row_items as (
    select m.blueprint_id, b.item_id
      from public.item_models m
      join public.item_bank b
        on b.item_model_id = m.id and b.review_status = 'approved'
     where m.blueprint_id is not null and m.review_status = 'approved'
    union
    select b.blueprint_id, b.item_id
      from public.item_bank b
     where b.blueprint_id is not null and b.review_status = 'approved'
  ),
  counted as (
    select r.id, r.track, r.mode_id, r.grade, r.title, r.status,
           (select count(*) from public.item_models m
             where m.blueprint_id = r.id and m.review_status <> 'rejected') as models_drafted,
           (select count(*) from public.item_models m
             where m.blueprint_id = r.id and m.review_status = 'approved') as models_approved,
           (select count(*) from row_items ri where ri.blueprint_id = r.id) as items_ready,
           coalesce(sw.live_version, 'v1') as live_version
      from public.blueprint_rows r
      left join public.item_version_switch sw on sw.mode_id = r.mode_id
  )
  select c.*,
         case
           when c.items_ready > 0 then
             case c.live_version when 'v2' then 4 when 'preview' then 3 else 2 end
           when c.models_drafted > 0 then 1
           else 0
         end as stage
    from counted c;

-- One row per code: what is planned, written, approved and live, and one
-- status. "covered" means every approved blueprint row for the code is live
-- for everyone; a stray tagged item never covers a code on its own.
create or replace view public.standard_coverage
with (security_invoker = true) as
  with bp as (
    select l.framework, l.code,
           count(distinct p.id) as planned_rows,
           min(p.stage) as min_stage,
           max(p.stage) as max_stage
      from public.standard_blueprint_links l
      join public.blueprint_row_progress p
        on p.id = l.blueprint_id and p.status = 'approved'
     group by l.framework, l.code
  ),
  ml as (
    select distinct l.framework, l.code, m.id, m.review_status, m.mode_id
      from public.standard_model_links l
      join public.item_models m on m.id = l.item_model_id
  ),
  models as (
    select framework, code,
           count(*) filter (where review_status <> 'rejected') as models_drafted,
           count(*) filter (where review_status = 'approved') as models_approved
      from ml
     group by framework, code
  ),
  code_items as (
    select ml.framework, ml.code, b.item_id, b.mode_id
      from ml
      join public.item_bank b
        on b.item_model_id = ml.id and b.review_status = 'approved'
     where ml.review_status = 'approved'
    union
    select l.framework, l.code, b.item_id, b.mode_id
      from public.standard_blueprint_links l
      join public.blueprint_rows r on r.id = l.blueprint_id and r.status = 'approved'
      join public.item_bank b
        on b.blueprint_id = l.blueprint_id and b.review_status = 'approved'
  ),
  items as (
    select ci.framework, ci.code,
           count(*) as items_ready,
           count(*) filter (where sw.live_version = 'preview') as items_preview,
           count(*) filter (where sw.live_version = 'v2') as items_live
      from code_items ci
      left join public.item_version_switch sw on sw.mode_id = ci.mode_id
     group by ci.framework, ci.code
  ),
  needs_look as (
    -- Models tagged with a Common Core code whose link to this state code is
    -- only partial, and that do not carry the state code themselves.
    select x.framework, x.code, count(distinct ims.item_model_id) as models
      from public.standard_crosswalk x
      join public.item_model_standards ims
        on ims.framework = 'ccss' and ims.code = x.ccss_code
     where x.match <> 'same'
       and not exists (
             select 1 from public.item_model_standards d
              where d.item_model_id = ims.item_model_id
                and d.framework = x.framework and d.code = x.code)
     group by x.framework, x.code
  )
  select s.framework, s.code, s.grade, s.domain, s.summary, s.kind,
         s.in_scope, s.scope_note, s.parent_code, s.sort_order,
         coalesce(bp.planned_rows, 0)    as planned_rows,
         coalesce(models.models_drafted, 0)  as models_drafted,
         coalesce(models.models_approved, 0) as models_approved,
         coalesce(items.items_ready, 0)   as items_ready,
         coalesce(items.items_preview, 0) as items_preview,
         coalesce(items.items_live, 0)    as items_live,
         coalesce(needs_look.models, 0)   as needs_look,
         case
           when s.in_scope = 'no' then 'out_of_scope'
           when bp.planned_rows is null then 'not_planned'
           when bp.min_stage >= 4 then 'covered'
           when bp.min_stage = 3 then 'in_preview'
           when bp.min_stage = 2 then 'ready_to_flip'
           when bp.max_stage >= 1 then 'building'
           else 'planned'
         end as status
    from public.standards s
    left join bp on bp.framework = s.framework and bp.code = s.code
    left join models on models.framework = s.framework and models.code = s.code
    left join items on items.framework = s.framework and items.code = s.code
    left join needs_look on needs_look.framework = s.framework and needs_look.code = s.code;

comment on view public.standard_coverage is
  'Per code: approved blueprint rows (planned), models drafted/approved, approved v2 items ready/preview/live, and a status. Computed; never edit.';
