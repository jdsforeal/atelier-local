-- Atelier pilote : données privées, aucune clé service_role dans le navigateur.
begin;
create schema if not exists atelier_private;
revoke all on schema atelier_private from public;
grant usage on schema atelier_private to authenticated;
create table public.atelier_studios (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 name text not null check(length(trim(name)) between 1 and 100), created_at timestamptz not null default now()
);
create table public.atelier_projects (
 id uuid primary key default gen_random_uuid(), studio_id uuid not null references public.atelier_studios(id),
 external_id text not null check(length(external_id) between 1 and 150), creator_id uuid not null references auth.users(id),
 name text not null, created_at timestamptz not null default now(), unique(studio_id,external_id)
);
create table public.atelier_members (
 project_id uuid not null references public.atelier_projects(id), user_id uuid not null references auth.users(id),
 email text not null, can_edit boolean not null default true, budget_read boolean not null default false,
 budget_edit boolean not null default false, prepare_requests boolean not null default false,
 send_requests boolean not null default false, can_invite boolean not null default false,
 granted_by uuid not null references auth.users(id), primary key(project_id,user_id),
 check(not budget_edit or budget_read), check(not send_requests or prepare_requests)
);
create table public.atelier_documents (
 project_id uuid not null references public.atelier_projects(id), section text not null check(section in ('creative','finance','requests')),
 data jsonb not null default '{}', revision integer not null default 1 check(revision>0),
 updated_by uuid not null references auth.users(id), updated_at timestamptz not null default now(),
 primary key(project_id,section), check(jsonb_typeof(data)='object'), check(pg_column_size(data)<15000000)
);
create table public.atelier_globals (
 studio_id uuid primary key references public.atelier_studios(id), data jsonb not null default '{}',
 revision integer not null default 1, updated_at timestamptz not null default now(), check(jsonb_typeof(data)='object')
);
create table public.atelier_invitations (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.atelier_projects(id),
 project_name text not null, email text not null check(email=lower(trim(email)) and email like '%@%'), permissions jsonb not null,
 invited_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days', accepted_at timestamptz, revoked_at timestamptz
);
create unique index atelier_one_pending_invitation on public.atelier_invitations(project_id,email) where accepted_at is null and revoked_at is null;
create table public.atelier_audit (
 id bigint generated always as identity primary key, studio_id uuid not null references public.atelier_studios(id),
 project_id uuid references public.atelier_projects(id), actor_id uuid not null references auth.users(id),
 action text not null, section text, previous_data jsonb, created_at timestamptz not null default now()
);
create function atelier_private.owner(s uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.atelier_studios where id=s and owner_id=auth.uid())
$$;
create function atelier_private.manager(p uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.atelier_projects x where x.id=p and (x.creator_id=auth.uid() or atelier_private.owner(x.studio_id)))
$$;
create function atelier_private.access(p uuid, capability text default 'read') returns boolean language sql stable security definer set search_path='' as $$
 select atelier_private.manager(p) or exists(select 1 from public.atelier_members m where m.project_id=p and m.user_id=auth.uid() and
 case capability when 'read' then true when 'edit' then m.can_edit when 'budget_read' then m.budget_read when 'budget_edit' then m.budget_edit
 when 'prepare_requests' then m.prepare_requests when 'send_requests' then m.send_requests when 'invite' then m.can_invite else false end)
$$;
create function atelier_private.email() returns text language sql stable security definer set search_path='' as $$
 select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null
$$;
create function atelier_private.assert_grant(p uuid, rights jsonb) returns void language plpgsql security definer set search_path='' as $$
declare k text;
begin
 if not atelier_private.access(p,'invite') then raise exception 'Invitation non autorisée' using errcode='42501'; end if;
 if jsonb_typeof(rights)<>'object' or exists(select 1 from jsonb_object_keys(rights) x where x not in ('can_edit','budget_read','budget_edit','prepare_requests','send_requests','can_invite')) then raise exception 'Droits invalides'; end if;
 foreach k in array array['can_edit','budget_read','budget_edit','prepare_requests','send_requests','can_invite'] loop
  if coalesce((rights->>k)::boolean,false) and not atelier_private.access(p,case k when 'can_edit' then 'edit' when 'can_invite' then 'invite' else k end) then raise exception 'Impossible de déléguer un droit absent' using errcode='42501'; end if;
 end loop;
 if coalesce((rights->>'budget_edit')::boolean,false) and not coalesce((rights->>'budget_read')::boolean,false) then raise exception 'Lecture budget requise'; end if;
 if coalesce((rights->>'send_requests')::boolean,false) and not coalesce((rights->>'prepare_requests')::boolean,false) then raise exception 'Préparation requise'; end if;
end $$;
create function public.atelier_create_studio(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare sid uuid;
begin
 if auth.uid() is null then raise exception 'Connexion requise' using errcode='42501';end if;
 if atelier_private.email() is null then raise exception 'Adresse vérifiée requise' using errcode='42501';end if;
 insert into public.atelier_studios(name,owner_id) values(trim(p_name),auth.uid()) returning id into sid;
 insert into public.atelier_globals(studio_id) values(sid);
 return sid;
end $$;
create function public.atelier_create_project(p_studio uuid,p_external text,p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin
 if not atelier_private.owner(p_studio) then raise exception 'Création réservée au propriétaire du studio' using errcode='42501';end if;
 insert into public.atelier_projects(studio_id,external_id,creator_id,name) values(p_studio,p_external,auth.uid(),p_name) returning id into pid;
 insert into public.atelier_audit(studio_id,project_id,actor_id,action) values(p_studio,pid,auth.uid(),'Projet créé');
 return pid;
end $$;
-- Contrôle optimiste : une révision périmée n'écrase jamais celle d'une autre personne.
create function public.atelier_save_document(p_project uuid,p_section text,p_expected integer,p_data jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare doc public.atelier_documents; next_revision integer; sid uuid;
begin
 if not atelier_private.access(p_project,case p_section when 'creative' then 'edit' when 'finance' then 'budget_edit' when 'requests' then 'prepare_requests' else 'INVALID' end) then raise exception 'Modification non autorisée' using errcode='42501';end if;
 if p_section not in ('creative','finance','requests') or p_expected is null or p_expected<0 or jsonb_typeof(p_data)<>'object' then raise exception 'Document invalide';end if;
 -- Le verrou du projet sérialise aussi la toute première insertion.
 select studio_id into sid from public.atelier_projects where id=p_project for update;
 select * into doc from public.atelier_documents where project_id=p_project and section=p_section;
 if coalesce(doc.revision,0)<>p_expected then raise exception 'ATELIER_CONFLICT: une autre personne a modifié ce document' using errcode='40001';end if;
 if p_section='creative' and nullif(trim(p_data#>>'{project,name}'),'') is not null then update public.atelier_projects set name=p_data#>>'{project,name}' where id=p_project;end if;
 next_revision=p_expected+1;
 insert into public.atelier_documents(project_id,section,data,revision,updated_by) values(p_project,p_section,p_data,next_revision,auth.uid())
 on conflict(project_id,section) do update set data=excluded.data,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now();
 insert into public.atelier_audit(studio_id,project_id,actor_id,action,section,previous_data) values(sid,p_project,auth.uid(),'Document enregistré',p_section,doc.data);
 return next_revision;
end $$;
-- Une modification de projet est atomique entre ses sections autorisées.
create function public.atelier_save_project(p_project uuid,p_documents jsonb,p_expected jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare section text; revisions jsonb='{}'; revision integer;
begin
 if jsonb_typeof(p_documents)<>'object' or jsonb_typeof(p_expected)<>'object' then raise exception 'Lot invalide';end if;
 for section in select jsonb_object_keys(p_documents) loop
  revision=public.atelier_save_document(p_project,section,(p_expected->>section)::integer,p_documents->section);
  revisions=jsonb_set(revisions,array[section],to_jsonb(revision));
 end loop;
 return revisions;
end $$;
create function public.atelier_save_globals(p_studio uuid,p_expected integer,p_data jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare old public.atelier_globals;
begin
 if not atelier_private.owner(p_studio) then raise exception 'Carnet du studio réservé à sa propriétaire' using errcode='42501';end if;
 select * into old from public.atelier_globals where studio_id=p_studio for update;
 if old.revision is distinct from p_expected then raise exception 'ATELIER_CONFLICT' using errcode='40001';end if;
 update public.atelier_globals set data=p_data,revision=revision+1,updated_at=now() where studio_id=p_studio;
 insert into public.atelier_audit(studio_id,actor_id,action,previous_data) values(p_studio,auth.uid(),'Carnet enregistré',old.data);
 return old.revision+1;
end $$;
create function public.atelier_invite(p_project uuid,p_email text,p_permissions jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare invitation uuid; sid uuid;
begin
 perform atelier_private.assert_grant(p_project,p_permissions);
 if lower(trim(p_email))=atelier_private.email() then raise exception 'Vous avez déjà accès à ce projet';end if;
 select studio_id into sid from public.atelier_projects where id=p_project;
 update public.atelier_invitations set revoked_at=now() where project_id=p_project and email=lower(trim(p_email)) and accepted_at is null and revoked_at is null;
 insert into public.atelier_invitations(project_id,project_name,email,permissions,invited_by) values(p_project,(select name from public.atelier_projects where id=p_project),lower(trim(p_email)),p_permissions,auth.uid()) returning id into invitation;
 insert into public.atelier_audit(studio_id,project_id,actor_id,action) values(sid,p_project,auth.uid(),'Invitation créée');
 return invitation;
end $$;
create function public.atelier_accept_invitation(p_invitation uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare inv public.atelier_invitations; r jsonb;
begin
 select * into inv from public.atelier_invitations where id=p_invitation for update;
 if inv.id is null or inv.email is distinct from atelier_private.email() or atelier_private.email() is null or inv.revoked_at is not null or inv.accepted_at is not null or inv.expires_at<=now() then raise exception 'Invitation indisponible pour ce compte' using errcode='42501';end if;
 -- Une délégation retirée rend aussi les invitations encore en attente inopérantes.
 if not exists(select 1 from public.atelier_projects p join public.atelier_studios s on s.id=p.studio_id where p.id=inv.project_id and (p.creator_id=inv.invited_by or s.owner_id=inv.invited_by)) then
  if not exists(select 1 from public.atelier_members m where m.project_id=inv.project_id and m.user_id=inv.invited_by and m.can_invite and
   (not coalesce((inv.permissions->>'can_edit')::boolean,false) or m.can_edit) and
   (not coalesce((inv.permissions->>'budget_read')::boolean,false) or m.budget_read) and
   (not coalesce((inv.permissions->>'budget_edit')::boolean,false) or m.budget_edit) and
   (not coalesce((inv.permissions->>'prepare_requests')::boolean,false) or m.prepare_requests) and
   (not coalesce((inv.permissions->>'send_requests')::boolean,false) or m.send_requests)) then raise exception 'Délégation expirée' using errcode='42501';end if;
 end if;
 r=inv.permissions;
 if not atelier_private.manager(inv.project_id) then
 insert into public.atelier_members(project_id,user_id,email,can_edit,budget_read,budget_edit,prepare_requests,send_requests,can_invite,granted_by)
 values(inv.project_id,auth.uid(),inv.email,coalesce((r->>'can_edit')::boolean,false),coalesce((r->>'budget_read')::boolean,false),coalesce((r->>'budget_edit')::boolean,false),coalesce((r->>'prepare_requests')::boolean,false),coalesce((r->>'send_requests')::boolean,false),coalesce((r->>'can_invite')::boolean,false),inv.invited_by)
 on conflict(project_id,user_id) do nothing;
 end if;
 update public.atelier_invitations set accepted_at=now() where id=p_invitation;
 return inv.project_id;
end $$;
create function public.atelier_set_member(p_project uuid,p_user uuid,p_permissions jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 -- La modification des droits reste réservée au créateur / propriétaire pour le pilote.
 if not atelier_private.manager(p_project) then raise exception 'Gestion des droits réservée au responsable' using errcode='42501';end if;
 perform atelier_private.assert_grant(p_project,p_permissions);
 update public.atelier_members set can_edit=coalesce((p_permissions->>'can_edit')::boolean,false),budget_read=coalesce((p_permissions->>'budget_read')::boolean,false),budget_edit=coalesce((p_permissions->>'budget_edit')::boolean,false),prepare_requests=coalesce((p_permissions->>'prepare_requests')::boolean,false),send_requests=coalesce((p_permissions->>'send_requests')::boolean,false),can_invite=coalesce((p_permissions->>'can_invite')::boolean,false) where project_id=p_project and user_id=p_user;
 update public.atelier_invitations set revoked_at=now() where project_id=p_project and invited_by=p_user and accepted_at is null;
 insert into public.atelier_audit(studio_id,project_id,actor_id,action) select studio_id,p_project,auth.uid(),'Droits modifiés' from public.atelier_projects where id=p_project;
end $$;
create function public.atelier_revoke(p_project uuid,p_user uuid default null,p_invitation uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not atelier_private.manager(p_project) then raise exception 'Retrait réservé au responsable' using errcode='42501';end if;
 if p_user is not null then
  delete from public.atelier_members where project_id=p_project and user_id=p_user;
  update public.atelier_invitations set revoked_at=now() where project_id=p_project and invited_by=p_user and accepted_at is null;
 end if;
 if p_invitation is not null then update public.atelier_invitations set revoked_at=now() where id=p_invitation and project_id=p_project and accepted_at is null;end if;
 insert into public.atelier_audit(studio_id,project_id,actor_id,action) select studio_id,p_project,auth.uid(),'Accès retiré' from public.atelier_projects where id=p_project;
end $$;
-- Lecture des espaces partagés sans divulguer le carnet global ni l'adresse des autres membres.
alter table public.atelier_studios enable row level security;
alter table public.atelier_projects enable row level security;
alter table public.atelier_members enable row level security;
alter table public.atelier_documents enable row level security;
alter table public.atelier_globals enable row level security;
alter table public.atelier_invitations enable row level security;
alter table public.atelier_audit enable row level security;
create policy studios_read on public.atelier_studios for select to authenticated using(owner_id=auth.uid() or exists(select 1 from public.atelier_projects p where p.studio_id=atelier_studios.id and atelier_private.access(p.id)));
create policy projects_read on public.atelier_projects for select to authenticated using(atelier_private.access(id));
create policy members_read on public.atelier_members for select to authenticated using(atelier_private.access(project_id));
create policy documents_read on public.atelier_documents for select to authenticated using(atelier_private.access(project_id,case section when 'creative' then 'read' when 'finance' then 'budget_read' else 'prepare_requests' end));
create policy globals_read on public.atelier_globals for select to authenticated using(atelier_private.owner(studio_id));
create policy invitations_read on public.atelier_invitations for select to authenticated using(atelier_private.access(project_id,'invite') or email=atelier_private.email());
create policy audit_read on public.atelier_audit for select to authenticated using((project_id is null and atelier_private.owner(studio_id)) or atelier_private.manager(project_id));
revoke all on public.atelier_studios,public.atelier_projects,public.atelier_members,public.atelier_documents,public.atelier_globals,public.atelier_invitations,public.atelier_audit from anon,authenticated;
grant select on public.atelier_studios,public.atelier_projects,public.atelier_members,public.atelier_documents,public.atelier_globals,public.atelier_invitations,public.atelier_audit to authenticated;
revoke all on all functions in schema atelier_private from public,anon;
grant execute on all functions in schema atelier_private to authenticated;
-- Ne jamais exposer les helpers de mutation : assert_grant ne modifie pas de données.
revoke all on function public.atelier_create_studio(text),public.atelier_create_project(uuid,text,text),public.atelier_save_document(uuid,text,integer,jsonb),public.atelier_save_globals(uuid,integer,jsonb),public.atelier_save_project(uuid,jsonb,jsonb),public.atelier_invite(uuid,text,jsonb),public.atelier_accept_invitation(uuid),public.atelier_set_member(uuid,uuid,jsonb),public.atelier_revoke(uuid,uuid,uuid) from public,anon;
grant execute on function public.atelier_create_studio(text),public.atelier_create_project(uuid,text,text),public.atelier_save_document(uuid,text,integer,jsonb),public.atelier_save_globals(uuid,integer,jsonb),public.atelier_save_project(uuid,jsonb,jsonb),public.atelier_invite(uuid,text,jsonb),public.atelier_accept_invitation(uuid),public.atelier_set_member(uuid,uuid,jsonb),public.atelier_revoke(uuid,uuid,uuid) to authenticated;
commit;
