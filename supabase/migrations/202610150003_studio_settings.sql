-- Le nom du studio est modifiable uniquement par sa propriétaire.
begin;
create or replace function public.atelier_rename_studio(p_studio uuid, p_name text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not atelier_private.owner(p_studio) then
  raise exception 'Modification réservée à la propriétaire du studio' using errcode='42501';
 end if;
 if length(trim(p_name)) not between 1 and 100 then raise exception 'Le nom doit contenir entre 1 et 100 caractères'; end if;
 update public.atelier_studios set name=trim(p_name) where id=p_studio;
 insert into public.atelier_audit(studio_id,actor_id,action) values(p_studio,auth.uid(),'Studio renommé');
end $$;
revoke all on function public.atelier_rename_studio(uuid,text) from public,anon;
grant execute on function public.atelier_rename_studio(uuid,text) to authenticated;
commit;
