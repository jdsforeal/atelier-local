begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('atelier-private','atelier-private',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create function atelier_private.asset_access(path text, editing boolean default false) returns boolean language plpgsql stable security definer set search_path='' as $$
declare parts text[]; sid uuid; pid uuid;
begin
 parts=string_to_array(path,'/');
 if array_length(parts,1)<>3 or parts[1]!~'^[0-9a-f-]{36}$' then return false;end if;
 sid=parts[1]::uuid;
 if parts[2]='global' then return atelier_private.owner(sid);end if;
 if parts[2]!~'^[0-9a-f-]{36}$' then return false;end if;
 pid=parts[2]::uuid;
 return exists(select 1 from public.atelier_projects where id=pid and studio_id=sid) and atelier_private.access(pid,case when editing then 'edit' else 'read' end);
exception when invalid_text_representation then return false;
end $$;
revoke all on function atelier_private.asset_access(text,boolean) from public,anon;
grant execute on function atelier_private.asset_access(text,boolean) to authenticated;
create policy atelier_images_read on storage.objects for select to authenticated using(bucket_id='atelier-private' and atelier_private.asset_access(name,false));
create policy atelier_images_insert on storage.objects for insert to authenticated with check(bucket_id='atelier-private' and atelier_private.asset_access(name,true));
-- Pas de mise à jour/suppression : les images sont immuables et référencées par leur empreinte.
commit;
