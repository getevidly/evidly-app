-- pl_broker_messages: two-way broker <-> EvidLY thread, party-scoped.
-- Isolated from the org-scoped messages/message_threads spine (that gates by
-- organization_id via user_profiles; brokers gate by party_id via
-- external_party_members). Mirrors the grants RLS pattern.

create table if not exists pl_broker_messages (
  id          uuid primary key default gen_random_uuid(),
  party_id    uuid not null references external_parties(id),
  sender      text not null check (sender in ('broker','evidly')),
  body        text not null check (length(trim(body)) > 0),
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create index if not exists idx_pl_broker_messages_party_created
  on pl_broker_messages (party_id, created_at);

alter table pl_broker_messages enable row level security;

drop policy if exists plbm_broker_select on pl_broker_messages;
create policy plbm_broker_select on pl_broker_messages
  for select using (
    exists (select 1 from external_party_members epm
            where epm.party_id = pl_broker_messages.party_id
              and epm.user_id = auth.uid())
  );

drop policy if exists plbm_broker_insert on pl_broker_messages;
create policy plbm_broker_insert on pl_broker_messages
  for insert with check (
    sender = 'broker'
    and exists (select 1 from external_party_members epm
                where epm.party_id = pl_broker_messages.party_id
                  and epm.user_id = auth.uid())
  );

drop policy if exists plbm_staff_select on pl_broker_messages;
create policy plbm_staff_select on pl_broker_messages
  for select using (
    exists (select 1 from user_profiles up
            where up.id = auth.uid() and up.evidly_staff_role is not null)
  );

drop policy if exists plbm_staff_insert on pl_broker_messages;
create policy plbm_staff_insert on pl_broker_messages
  for insert with check (
    sender = 'evidly'
    and exists (select 1 from user_profiles up
                where up.id = auth.uid() and up.evidly_staff_role is not null)
  );

drop policy if exists plbm_service_role on pl_broker_messages;
create policy plbm_service_role on pl_broker_messages
  for all using (auth.role() = 'service_role');

create or replace function pl_stamp_message_read(p_party_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  is_broker boolean;
  is_staff  boolean;
begin
  select exists (select 1 from external_party_members epm
                 where epm.party_id = p_party_id and epm.user_id = auth.uid())
    into is_broker;
  select exists (select 1 from user_profiles up
                 where up.id = auth.uid() and up.evidly_staff_role is not null)
    into is_staff;

  if not (is_broker or is_staff) then
    return;
  end if;

  update pl_broker_messages m
  set read_at = now()
  where m.party_id = p_party_id
    and m.read_at is null
    and m.sender = case when is_broker then 'evidly' else 'broker' end;
end;
$function$;

insert into supabase_migrations.schema_migrations (version, name)
values ('20260629100000', 'pl_broker_messages')
on conflict do nothing;
