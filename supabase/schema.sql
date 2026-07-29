-- ============================================================
-- NourishFest 2026 — Postgres schema (Supabase)
-- ============================================================
-- Replaces the Google Apps Script backend (Code.gs). Run this whole
-- file once in the Supabase SQL editor, then do the ONE MANUAL STEP at
-- the bottom (seed yourself into "Committee") or nobody can read anything.
--
-- COLUMN NAMING: columns keep Code.gs's exact PascalCase names so the
-- frontend's types/index.ts and every module screen work unchanged.
-- Postgres folds unquoted identifiers to lowercase, so every identifier
-- here is double-quoted. That is deliberate, not an accident — if you add
-- a column and forget the quotes, PostgREST will return it as lowercase
-- and the frontend will read undefined.
-- ============================================================

-- ---------- REFERENCE / LOOKUP ----------

create table "Roles" (
  "RoleName"              text primary key,
  "DefaultResponsibility" text not null default '',
  "PermissionTier"        text not null default '',  -- informational only; real tier comes from current_permission()
  "Notes"                 text not null default ''
);

create table "Committee" (
  "MemberID"       text primary key default 'MEM-' || substr(gen_random_uuid()::text, 1, 8),
  "Name"           text not null default '',
  "Email"          text not null,
  "Department"     text not null default '',
  -- Deliberately NOT a foreign key to "Roles". The column defaults to ''
  -- and the Committee form accepts free text, so an FK would reject every
  -- row without a role. Code.gs didn't enforce it either; an unknown Role
  -- just yields '' from lookupResponsibility_/fill_responsibility().
  "Role"           text not null default '',
  "Responsibility" text not null default '',  -- auto-filled from Roles by trigger; not set by clients
  "Status"         text not null default 'Active'
);

-- Email is the join key between auth.users and this table, so it must be
-- unique and case-insensitive — Google can hand back a different casing
-- than whoever typed the row.
create unique index "Committee_Email_key" on "Committee" (lower("Email"));

-- ---------- CORE ----------

create table "Events" (
  "EventID"         text primary key default 'EVE-' || substr(gen_random_uuid()::text, 1, 8),
  "EventType"       text not null default 'PreEvent',
  "Month"           text not null default '',
  "EventName"       text not null default '',
  "CategoryOrTheme" text not null default '',
  "Category"        text not null default '',
  "Purpose"         text not null default '',
  "Tagline"         text not null default '',
  "Date"            text not null default '',
  "Location"        text not null default '',
  "Status"          text not null default '',
  "SourceIdeaID"    text not null default '',
  -- Public URLs in the "attachments" bucket. An array rather than the usual
  -- single *ImageLink column: an event carries a set of pictures, and nothing
  -- else about them is worth a table.
  -- On a live project: alter table "Events" add column "PhotoLinks" text[] not null default '{}';
  "PhotoLinks"      text[] not null default '{}'
);

create table "Ideas" (
  "IdeaID"        text primary key default 'IDEA-' || substr(gen_random_uuid()::text, 1, 8),
  "Scope"         text not null,
  "Title"         text not null default '',
  "Description"   text not null default '',
  "Category"      text not null default '',
  "Theme"         text not null default '',
  "Tagline"       text not null default '',
  "SubmittedBy"   text not null default '',  -- server-set to the caller's email
  "Status"        text not null default 'New',
  "DateSubmitted" text not null default '',
  -- Code.gs createIdea_(): one idea per person per Scope, per PRD 6.1.
  -- A constraint instead of a read-then-check, so two simultaneous submits
  -- can't both pass the check the way they could against the Sheet.
  unique ("SubmittedBy", "Scope")
);

-- EventID doubles as the primary key: one row per event, matching
-- Code.gs's SCHEMA comment for this entity.
create table "Participants" (
  "EventID"               text primary key references "Events"("EventID") on delete cascade,
  "EstimationParticipant" numeric not null default 0,
  "ActualParticipant"     numeric not null default 0,
  "AttendanceFormRef"     text not null default ''
);

create table "Checklist" (
  "TaskID"   text primary key default 'TAS-' || substr(gen_random_uuid()::text, 1, 8),
  "EventID"  text not null default '',
  "ToDo"     text not null default '',
  "Assignee" text not null default '',  -- email
  "DueDate"  text not null default '',
  "Status"   text not null default 'To Do',
  "Remark"   text not null default ''
);

create table "BudgetBreakdown" (
  "BudgetID"          text primary key default 'BUD-' || substr(gen_random_uuid()::text, 1, 8),
  "EventID"           text not null default '',
  "ItemName"          text not null default '',
  "CategoryExpense"   text not null default '',
  "EstimationCost"    numeric not null default 0,
  "Description"       text not null default '',
  "VendorName"        text not null default '',
  "VendorPhone"       text not null default '',
  "QuotationFileLink" text not null default '',
  "ApprovalStatus"    text not null default 'Pending',
  "ActualCost"        numeric,
  -- Code.gs computeVariance_(): only populated once approved AND an actual
  -- cost exists. Generated, so it can never drift from its inputs.
  "Variance"          numeric generated always as (
                        case when "ApprovalStatus" = 'Approved' and "ActualCost" is not null
                             then "ActualCost" - "EstimationCost" end
                      ) stored,
  "InvoiceFileLink"   text not null default '',
  "PaymentStatus"     text not null default 'Unpaid',
  "SourceModule"      text not null default '',
  "SourceRecordID"    text not null default ''
);

-- ---------- MAIN EVENT ----------
-- The five tables below share the Quantity/Price -> TotalEstimationCost
-- rule (Code.gs QTY_PRICE_ENTITIES + computeTotalEstimationCost_).

create table "VenueComparison" (
  "VenueID"             text primary key default 'VEN-' || substr(gen_random_uuid()::text, 1, 8),
  "EventID"             text not null default '',
  "VenueName"           text not null default '',
  "Location"            text not null default '',
  "ContactName"         text not null default '',
  "ContactPhone"        text not null default '',
  "Quantity"            numeric not null default 0,
  "Unit"                text not null default '',
  "Price"               numeric not null default 0,
  "TotalEstimationCost" numeric generated always as ("Quantity" * "Price") stored,
  "EstimationCost"      numeric not null default 0,
  "LayoutImageLink"     text not null default '',
  "BenefitsInclude"     text not null default '',
  "BenefitsExclude"     text not null default '',
  "ApprovalStatus"      text not null default 'Pending'
);

create table "DecorationComparison" (
  "DecorID"             text primary key default 'DEC-' || substr(gen_random_uuid()::text, 1, 8),
  "EventID"             text not null default '',
  "DecorationName"      text not null default '',
  "Vendor"              text not null default '',
  "ContactName"         text not null default '',
  "ContactPhone"        text not null default '',
  "Quantity"            numeric not null default 0,
  "Unit"                text not null default '',
  "Price"               numeric not null default 0,
  "TotalEstimationCost" numeric generated always as ("Quantity" * "Price") stored,
  "EstimationCost"      numeric not null default 0,
  "DesignImageLink"     text not null default '',
  "BenefitsInclude"     text not null default '',
  "BenefitsExclude"     text not null default '',
  "ApprovalStatus"      text not null default 'Pending'
);

create table "SouvenirComparison" (
  "SouvenirID"          text primary key default 'SOU-' || substr(gen_random_uuid()::text, 1, 8),
  "EventID"             text not null default '',
  "ItemName"            text not null default '',
  "VendorName"          text not null default '',
  "ContactName"         text not null default '',
  "ContactPhone"        text not null default '',
  "Quantity"            numeric not null default 0,
  "Unit"                text not null default '',
  "Price"               numeric not null default 0,
  "TotalEstimationCost" numeric generated always as ("Quantity" * "Price") stored,
  "EstimationCost"      numeric not null default 0,
  "DesignImageLink"     text not null default '',
  "BenefitsInclude"     text not null default '',
  "BenefitsExclude"     text not null default '',
  "ApprovalStatus"      text not null default 'Pending'
);

create table "Entertainment" (
  "EntertainmentID"     text primary key default 'ENT-' || substr(gen_random_uuid()::text, 1, 8),
  "EventID"             text not null default '',
  "Activity"            text not null default '',
  "Description"         text not null default '',
  "ContactName"         text not null default '',
  "ContactPhone"        text not null default '',
  "Quantity"            numeric not null default 0,
  "Unit"                text not null default '',
  "Price"               numeric not null default 0,
  "TotalEstimationCost" numeric generated always as ("Quantity" * "Price") stored,
  "EstimationCost"      numeric not null default 0,
  "ApprovalStatus"      text not null default 'Pending'
);

create table "DoorPrize" (
  "DoorPrizeID"         text primary key default 'DOO-' || substr(gen_random_uuid()::text, 1, 8),
  "EventID"             text not null default '',
  "Item"                text not null default '',
  "Category"            text not null default '',
  "DetailSpec"          text not null default '',
  "ImageLink"           text not null default '',
  "Quantity"            numeric not null default 0,
  "Unit"                text not null default '',
  "Price"               numeric not null default 0,
  "TotalEstimationCost" numeric generated always as ("Quantity" * "Price") stored,
  "EstimationCost"      numeric not null default 0,
  "ApprovalStatus"      text not null default 'Pending'
);

create table "Awards" (
  "AwardID"        text primary key default 'AWA-' || substr(gen_random_uuid()::text, 1, 8),
  "EventID"        text not null default '',
  "Category"       text not null default '',
  "Description"    text not null default '',
  "Prize"          text not null default 'Cash',
  "Value"          numeric not null default 0,
  "EstimationCost" numeric not null default 0,
  "ApprovalStatus" text not null default 'Pending'
);

create table "NourishGotTalent" (
  "TalentID"       text primary key default 'NOU-' || substr(gen_random_uuid()::text, 1, 8),
  "EventID"        text not null default '',
  "Category"       text not null default '',
  "Prize"          text not null default 'Cash',
  "Value"          numeric not null default 0,
  "ApprovalStatus" text not null default 'Pending'
);

create table "Rundown" (
  "RundownID"         text primary key default 'RUN-' || substr(gen_random_uuid()::text, 1, 8),
  "EventID"           text not null default '',
  "Description"       text not null default '',
  "TimeStart"         text not null default '',
  "TimeFinish"        text not null default '',
  "CommitteeInCharge" text not null default '',
  "Remark"            text not null default ''
);

-- ---------- FINANCE ----------

create table "Finance_Incoming" (
  "IncomingID"       text primary key default 'FIN-' || substr(gen_random_uuid()::text, 1, 8),
  "Type"             text not null default 'Cash',
  "SupplierName"     text not null default '',
  "SupplierCategory" text not null default '',
  "LetterFileLink"   text not null default '',
  "PaymentType"      text not null default 'Bank Transfer',
  "NonCashItemName"  text not null default '',
  "AmountIDR"        numeric not null default 0,
  "DateReceived"     text not null default '',
  "ReceiptFileLink"  text not null default '',
  "Description"      text not null default ''
);

-- ============================================================
-- IDENTITY & PERMISSIONS
-- Replaces Code.gs getCurrentUser_() / checkAccess_(). The difference
-- that matters: this runs inside the database, so it applies to every
-- query regardless of what the client sends.
-- ============================================================

create or replace function public.current_email() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- 'Admin' | 'Advisor' | 'Member' | 'none' — mirrors Code.gs ADMIN_ROLES.
-- security definer so it can read "Committee" while that table's own RLS
-- policies are being evaluated (a plain function would recurse: the policy
-- calls this, this reads the table, the table re-applies the policy).
create or replace function public.current_permission() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when c."Role" in ('Chairperson', 'Vice Chairperson', 'Treasurer', 'Secretary') then 'Admin'
      when c."Role" = 'Advisor' then 'Advisor'
      else 'Member'
    end
    from "Committee" c
    where lower(c."Email") = public.current_email() and c."Status" = 'Active'
    limit 1
  ), 'none');
$$;

-- Sponsorship Coordinator is a 'Member' everywhere except Finance, where it
-- reads and writes like an Admin. One role with one exception isn't worth a
-- fifth tier that every other policy would then have to name.
-- security definer for the same reason as current_permission().
create or replace function public.is_finance_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from "Committee"
    where lower("Email") = public.current_email()
      and "Status" = 'Active'
      and "Role" = 'Sponsorship Coordinator'
  );
$$;

-- Same shape as Code.gs's getCurrentUser_() return value, so the frontend's
-- CurrentUser type and PermissionContext are unchanged. Returns the
-- signed-out/not-a-member shape rather than null so api.me() never has to
-- special-case it.
create or replace function public.me() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  c "Committee"%rowtype;
begin
  select * into c from "Committee"
  where lower("Email") = public.current_email() and "Status" = 'Active'
  limit 1;

  return json_build_object(
    'email',      public.current_email(),
    'name',       coalesce(c."Name", ''),
    'role',       coalesce(c."Role", ''),
    'permission', public.current_permission(),
    'memberId',   c."MemberID"
  );
end;
$$;

-- "Date"/"DueDate"/"DateReceived" are free-text columns (they were sheet
-- cells). One malformed value would make a whole dashboard query throw, so
-- every cast below goes through this instead of ::date.
create or replace function public.safe_date(v text) returns date
language sql immutable as $$
  select case when v ~ '^\d{4}-\d{2}-\d{2}' then substr(v, 1, 10)::date end;
$$;

-- ============================================================
-- BUSINESS RULES (were JavaScript in Code.gs)
-- ============================================================

-- Code.gs lookupResponsibility_(): Responsibility is derived from Roles,
-- never accepted from the client.
create or replace function public.fill_responsibility() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new."Responsibility" := coalesce(
    (select "DefaultResponsibility" from "Roles" where "RoleName" = new."Role"), ''
  );
  return new;
end;
$$;

create trigger "Committee_fill_responsibility"
  before insert or update on "Committee"
  for each row execute function public.fill_responsibility();

-- Code.gs createIdea_(): SubmittedBy/Status/DateSubmitted are server-set.
-- The one-per-scope cap is the unique constraint on the table above.
create or replace function public.stamp_idea() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new."SubmittedBy"   := public.current_email();
  new."Status"        := coalesce(nullif(new."Status", ''), 'New');
  new."DateSubmitted" := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  return new;
end;
$$;

create trigger "Ideas_stamp"
  before insert on "Ideas"
  for each row execute function public.stamp_idea();

-- Code.gs updateOwnChecklistTask_(): a Member may only change Status and
-- Remark. RLS decides WHICH rows they can touch; this decides which
-- COLUMNS, which policies can't express.
create or replace function public.guard_checklist_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.current_permission() = 'Member' then
    if new."TaskID"   is distinct from old."TaskID"
    or new."EventID"  is distinct from old."EventID"
    or new."ToDo"     is distinct from old."ToDo"
    or new."Assignee" is distinct from old."Assignee"
    or new."DueDate"  is distinct from old."DueDate" then
      raise exception 'You can only update Status and Remark on your own tasks';
    end if;
  end if;
  return new;
end;
$$;

create trigger "Checklist_guard_columns"
  before update on "Checklist"
  for each row execute function public.guard_checklist_columns();

-- ============================================================
-- DASHBOARDS (were getDashboard_ / getFinanceDashboard_)
-- Return the exact DashboardData / FinanceDashboardData shapes the
-- frontend already types.
-- ============================================================

-- Subtracting two dates in Postgres already yields whole days, so there's
-- no epoch/86400 division here the way Code.gs's daysBetween_ needed.
-- security definer bypasses RLS, so the membership check Code.gs got for
-- free (it only ran for signed-in users) has to be explicit here.
create or replace function public.dashboard() returns json
language sql stable security definer set search_path = public as $$
  select case when public.current_permission() = 'none' then null else json_build_object(
    'daysToNextPreEvent', (
      select public.safe_date("Date") - current_date
      from "Events"
      where "EventType" = 'PreEvent' and public.safe_date("Date") >= current_date
      order by public.safe_date("Date") limit 1
    ),
    'daysToMainEvent', (
      select public.safe_date("Date") - current_date
      from "Events"
      where "EventType" = 'MainEvent' and public.safe_date("Date") is not null
      order by public.safe_date("Date") limit 1
    ),
    'overdueChecklistCount', (
      select count(*) from "Checklist"
      where "Status" <> 'Done' and public.safe_date("DueDate") < current_date
    )
  ) end;
$$;

create or replace function public.finance_dashboard() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  mtd_in  numeric;
  mtd_out numeric;
begin
  -- Finance_Incoming is 'none' for Member (Code.gs PERMISSIONS) — the
  -- dashboard aggregates it, so it has to enforce the same gate itself.
  if public.current_permission() not in ('Admin', 'Advisor')
     and not public.is_finance_editor() then
    raise exception 'Access denied to Finance_Incoming';
  end if;

  select coalesce(sum("AmountIDR"), 0) into mtd_in
  from "Finance_Incoming"
  where date_trunc('month', public.safe_date("DateReceived"))
      = date_trunc('month', current_date);

  select coalesce(sum("ActualCost"), 0) into mtd_out
  from "BudgetBreakdown" where "PaymentStatus" = 'Paid';

  return json_build_object(
    'mtdIncoming', mtd_in,
    'mtdExpenses', mtd_out,
    'variance',    mtd_in - mtd_out,
    'pctVariance', case when mtd_in = 0 then 0 else ((mtd_in - mtd_out) / mtd_in) * 100 end
  );
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- Mirrors Code.gs PERMISSIONS. The matrix is uniform apart from three
-- entities, so the common case is generated rather than hand-written.
-- ============================================================

do $$
declare
  t text;
  -- Admin write / Advisor read / Member read — the default row of PERMISSIONS.
  uniform text[] := array[
    'Events', 'Committee', 'Roles', 'BudgetBreakdown', 'Participants',
    'VenueComparison', 'DecorationComparison', 'SouvenirComparison',
    'Entertainment', 'Awards', 'DoorPrize', 'Rundown', 'NourishGotTalent'
  ];
  -- The exceptions get their policies written out by hand below.
  special text[] := array['Ideas', 'Checklist', 'Finance_Incoming'];
begin
  foreach t in array uniform || special loop
    execute format('alter table %I enable row level security', t);
  end loop;

  foreach t in array uniform loop
    execute format(
      'create policy %I on %I for select to authenticated
         using (public.current_permission() <> ''none'')',
      t || '_read', t);
    execute format(
      'create policy %I on %I for all to authenticated
         using (public.current_permission() = ''Admin'')
         with check (public.current_permission() = ''Admin'')',
      t || '_admin_write', t);
  end loop;
end;
$$;

-- Ideas — Member is 'special': everyone signed in can read, Admin writes
-- freely, and a Member may insert their own (the unique constraint caps it
-- at one per Scope) but not edit or delete afterwards.
create policy "Ideas_read" on "Ideas" for select to authenticated
  using (public.current_permission() <> 'none');
create policy "Ideas_admin_write" on "Ideas" for all to authenticated
  using (public.current_permission() = 'Admin')
  with check (public.current_permission() = 'Admin');
create policy "Ideas_member_insert" on "Ideas" for insert to authenticated
  with check (public.current_permission() = 'Member');

-- Checklist — Member is 'special': reads everything, updates only rows
-- assigned to them. The column restriction is the trigger above.
create policy "Checklist_read" on "Checklist" for select to authenticated
  using (public.current_permission() <> 'none');
create policy "Checklist_admin_write" on "Checklist" for all to authenticated
  using (public.current_permission() = 'Admin')
  with check (public.current_permission() = 'Admin');
create policy "Checklist_member_update" on "Checklist" for update to authenticated
  using (public.current_permission() = 'Member' and lower("Assignee") = public.current_email())
  with check (public.current_permission() = 'Member' and lower("Assignee") = public.current_email());

-- Finance_Incoming — Member is 'none': no read at all, except the
-- Sponsorship Coordinator, who reads and writes here (is_finance_editor()).
create policy "Finance_Incoming_read" on "Finance_Incoming" for select to authenticated
  using (public.current_permission() in ('Admin', 'Advisor') or public.is_finance_editor());
create policy "Finance_Incoming_admin_write" on "Finance_Incoming" for all to authenticated
  using (public.current_permission() = 'Admin' or public.is_finance_editor())
  with check (public.current_permission() = 'Admin' or public.is_finance_editor());

-- ============================================================
-- STORAGE (replaces the Drive folder)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- storage.objects already has RLS on and is shared by every bucket, so
-- these are dropped first — unlike the tables above, this section may be
-- re-run against a project that already has them.
drop policy if exists "attachments_read" on storage.objects;
drop policy if exists "attachments_write" on storage.objects;

create policy "attachments_read" on storage.objects for select
  using (bucket_id = 'attachments');
create policy "attachments_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and public.current_permission() <> 'none');

-- ============================================================
-- SEED (replaces Code.gs seedRoles_)
-- ============================================================

insert into "Roles" ("RoleName", "DefaultResponsibility", "PermissionTier", "Notes") values
  ('Chairperson',                            'Overall event leadership and final sign-off', 'Admin',   'Derives Admin via current_permission()'),
  ('Vice Chairperson',                       'Deputizes for the Chairperson',               'Admin',   'Derives Admin via current_permission()'),
  ('Treasurer',                              'Owns Budget and Finance',                     'Admin',   'Derives Admin via current_permission()'),
  ('Secretary',                              'Owns Committee records and documentation',    'Admin',   'Derives Admin via current_permission()'),
  ('Advisor',                                'Read-only oversight across all modules',      'Advisor', 'Derives Advisor via current_permission()'),
  ('Program Coordinator',                    'Runs pre-event program planning',             'Member',  ''),
  ('F&B Coordinator',                        'Food & beverage sourcing and vendors',        'Member',  ''),
  ('Logistics/Decoration/Merch Coordinator', 'Venue logistics, decoration, and souvenirs',  'Member',  ''),
  ('Security Coordinator',                   'Security and safety planning',                'Member',  ''),
  ('Documentation Coordinator',              'Photos, video, and event records',            'Member',  ''),
  ('Sponsorship Coordinator',                'Sponsor outreach and fulfillment',            'Member',  'Member tier, plus read/write on Finance via is_finance_editor()')
on conflict ("RoleName") do nothing;

-- ============================================================
-- MANUAL STEP — DO THIS OR THE APP IS LOCKED
-- ============================================================
-- RLS derives everything from "Committee". While it is empty,
-- current_permission() returns 'none' for every user including you, and
-- the app will sign you in to a screen with no data. Replace the email
-- and run (this is what Code.gs seedSelfAsAdmin_ did automatically):
--
--   insert into "Committee" ("Name", "Email", "Department", "Role", "Status")
--   values ('Your Name', 'you@example.com', 'Committee', 'Chairperson', 'Active');
--
-- "Responsibility" is filled in by the trigger — don't pass it.
