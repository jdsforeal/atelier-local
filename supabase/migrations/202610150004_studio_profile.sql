-- Identité du studio : photo miniature privée, modification par propriétaire uniquement.
begin;
alter table public.atelier_studios add column if not exists avatar text not null default '';
alter table public.atelier_studios add constraint atelier_studio_avatar_size check(length(avatar)<=400000 and (avatar='' or avatar ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'));
create or replace function public.atelier_update_studio_profile(p_studio uuid,p_name text,p_avatar text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not atelier_private.owner(p_studio) then raise exception 'Modification réservée à la propriétaire du studio' using errcode='42501'; end if;
 if length(trim(p_name)) not between 1 and 100 then raise exception 'Le nom doit contenir entre 1 et 100 caractères'; end if;
 if p_avatar is null or length(p_avatar)>400000 or (p_avatar<>'' and p_avatar !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$') then raise exception 'Image invalide'; end if;
 update public.atelier_studios set name=trim(p_name),avatar=p_avatar where id=p_studio;
 insert into public.atelier_audit(studio_id,actor_id,action) values(p_studio,auth.uid(),'Identité du studio modifiée');
end $$;
revoke all on function public.atelier_update_studio_profile(uuid,text,text) from public,anon;
grant execute on function public.atelier_update_studio_profile(uuid,text,text) to authenticated;
commit;
