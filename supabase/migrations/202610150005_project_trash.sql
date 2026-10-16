-- Corbeille : conserver 30 jours, masquer immédiatement aux collaborateurs.
begin;
alter table public.atelier_projects add column deleted_at timestamptz;
alter table public.atelier_projects add column purged_at timestamptz;
create or replace function atelier_private.access(p uuid, capability text default 'read') returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.atelier_projects x where x.id=p and x.purged_at is null and
 ((x.deleted_at is null and (atelier_private.manager(p) or exists(select 1 from public.atelier_members m where m.project_id=p and m.user_id=auth.uid() and
 case capability when 'read' then true when 'edit' then m.can_edit when 'budget_read' then m.budget_read when 'budget_edit' then m.budget_edit
 when 'prepare_requests' then m.prepare_requests when 'send_requests' then m.send_requests when 'invite' then m.can_invite else false end)))
 or (x.deleted_at > now()-interval '30 days' and capability='read' and atelier_private.manager(p))))
$$;
create function public.atelier_trash_project(p_project uuid,p_restore boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare p public.atelier_projects;
begin
 select * into p from public.atelier_projects where id=p_project for update;
 if not found or not atelier_private.manager(p_project) or p.purged_at is not null then raise exception 'Action non autorisée' using errcode='42501'; end if;
 if p_restore and (p.deleted_at is null or p.deleted_at<=now()-interval '30 days') then raise exception 'Ce projet ne peut plus être restauré'; end if;
 if not p_restore and p.deleted_at is not null then return; end if;
 update public.atelier_projects set deleted_at=case when p_restore then null else now() end where id=p_project;
 if not p_restore then update public.atelier_invitations set revoked_at=now() where project_id=p_project and accepted_at is null and revoked_at is null; end if;
 insert into public.atelier_audit(studio_id,project_id,actor_id,action) values(p.studio_id,p_project,auth.uid(),case when p_restore then 'Projet restauré' else 'Projet placé dans la corbeille' end);
end $$;
-- Un identifiant minimal est conservé pour empêcher un ancien appareil de recréer le projet effacé.
create function atelier_private.purge_project(p_project uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.atelier_documents where project_id=p_project;
 delete from public.atelier_members where project_id=p_project;
 delete from public.atelier_invitations where project_id=p_project;
 delete from public.atelier_audit where project_id=p_project;
 update public.atelier_projects set purged_at=now(),name='Projet supprimé' where id=p_project;
end $$;
create function public.atelier_empty_trash(p_studio uuid) returns void language plpgsql security definer set search_path='' as $$
declare p record;
begin
 if not atelier_private.owner(p_studio) then raise exception 'Action réservée au propriétaire du studio' using errcode='42501'; end if;
 for p in select id from public.atelier_projects where studio_id=p_studio and deleted_at is not null and purged_at is null for update loop
 perform atelier_private.purge_project(p.id);end loop;
end $$;
create function atelier_private.purge_expired_projects() returns void language plpgsql security definer set search_path='' as $$
declare p record;
begin
 for p in select id from public.atelier_projects where deleted_at<=now()-interval '30 days' and purged_at is null for update loop
 perform atelier_private.purge_project(p.id);end loop;
end $$;
revoke all on function atelier_private.purge_project(uuid),atelier_private.purge_expired_projects() from public,anon,authenticated;
revoke all on function public.atelier_trash_project(uuid,boolean),public.atelier_empty_trash(uuid) from public,anon;
grant execute on function public.atelier_trash_project(uuid,boolean),public.atelier_empty_trash(uuid) to authenticated;
create or replace function public.atelier_save_document(p_project uuid,p_section text,p_expected integer,p_data jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare doc public.atelier_documents; next_revision integer; sid uuid;
begin
 if not atelier_private.access(p_project,case p_section when 'creative' then 'edit' when 'finance' then 'budget_edit' when 'requests' then 'prepare_requests' else 'INVALID' end) then raise exception 'Modification non autorisée' using errcode='42501';end if;
 if p_section not in ('creative','finance','requests') or p_expected is null or p_expected<0 or jsonb_typeof(p_data)<>'object' then raise exception 'Document invalide';end if;
 -- Le verrou du projet sérialise aussi la toute première insertion.
 select studio_id into sid from public.atelier_projects where id=p_project for update;
 if not atelier_private.access(p_project,case p_section when 'creative' then 'edit' when 'finance' then 'budget_edit' when 'requests' then 'prepare_requests' else 'INVALID' end) then raise exception 'Projet retiré ou accès modifié' using errcode='42501';end if;
 select * into doc from public.atelier_documents where project_id=p_project and section=p_section;
 if coalesce(doc.revision,0)<>p_expected then raise exception 'ATELIER_CONFLICT: une autre personne a modifié ce document' using errcode='40001';end if;
 if p_section='creative' and nullif(trim(p_data#>>'{project,name}'),'') is not null then update public.atelier_projects set name=p_data#>>'{project,name}' where id=p_project;end if;
 next_revision=p_expected+1;
 insert into public.atelier_documents(project_id,section,data,revision,updated_by) values(p_project,p_section,p_data,next_revision,auth.uid())
 on conflict(project_id,section) do update set data=excluded.data,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now();
 insert into public.atelier_audit(studio_id,project_id,actor_id,action,section,previous_data) values(sid,p_project,auth.uid(),'Document enregistré',p_section,doc.data);
 return next_revision;
end $$;
commit;
