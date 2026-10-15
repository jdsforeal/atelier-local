import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const pg = new PGlite();
await pg.exec(
  `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
);
await pg.exec(
  `create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`,
);
await pg.exec(
  await readFile("supabase/migrations/202610150001_private_pilot.sql", "utf8"),
);
await pg.exec(
  await readFile("supabase/migrations/202610150002_private_images.sql", "utf8"),
);
const owner = "00000000-0000-0000-0000-000000000001",
  assistant = "00000000-0000-0000-0000-000000000002",
  stranger = "00000000-0000-0000-0000-000000000003",
  third = "00000000-0000-0000-0000-000000000004";
for (const [id, email] of [
  [owner, "owner@atelier.test"],
  [assistant, "assistant@atelier.test"],
  [stranger, "stranger@atelier.test"],
  [third, "third@atelier.test"],
])
  await pg.query("insert into auth.users values($1,$2,now())", [id, email]);
async function as(user, sql, args = []) {
  await pg.exec("reset role");
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    user || "",
  ]);
  await pg.exec("set role authenticated");
  return pg.query(sql, args);
}
const scalar = (r) => Object.values(r.rows[0])[0];
const studio = scalar(
  await as(owner, "select public.atelier_create_studio('Atelier test')"),
);
const project = scalar(
  await as(
    owner,
    "select public.atelier_create_project($1,'p1','Projet privé')",
    [studio],
  ),
);
await as(
  owner,
  'select public.atelier_save_document($1,\'creative\',0,\'{"project":{"name":"Clip"}}\')',
  [project],
);
await as(
  owner,
  "select public.atelier_save_document($1,'finance',0,'{\"budget\":3500}')",
  [project],
);
assert.equal(
  (await as(stranger, "select * from public.atelier_projects")).rows.length,
  0,
);
await assert.rejects(
  as(stranger, "select public.atelier_save_document($1,'creative',1,'{}')", [
    project,
  ]),
  /non autorisée/,
);
const invitation = scalar(
  await as(
    owner,
    "select public.atelier_invite($1,'assistant@atelier.test','{\"can_edit\":true}')",
    [project],
  ),
);
await assert.rejects(
  as(stranger, "select public.atelier_accept_invitation($1)", [invitation]),
  /indisponible/,
);
await as(assistant, "select public.atelier_accept_invitation($1)", [
  invitation,
]);
const asset = studio + "/" + project + "/image.jpg";
await as(owner, "insert into storage.objects(bucket_id,name) values($1,$2)", [
  "atelier-private",
  asset,
]);
assert.equal(
  (await as(assistant, "select * from storage.objects")).rows.length,
  1,
);
assert.equal(
  (await as(stranger, "select * from storage.objects")).rows.length,
  0,
);
await assert.rejects(
  as(stranger, "insert into storage.objects(bucket_id,name) values($1,$2)", [
    "atelier-private",
    asset + "-other",
  ]),
  /row-level security/,
);
const creativeRevision = scalar(
  await as(
    owner,
    "select revision from public.atelier_documents where project_id=$1 and section='creative'",
    [project],
  ),
);
await assert.rejects(
  as(
    assistant,
    'select public.atelier_save_project($1,\'{"creative":{},"finance":{}}\',$2::jsonb)',
    [project, JSON.stringify({ creative: creativeRevision, finance: 1 })],
  ),
  /non autorisée/,
);
assert.equal(
  scalar(
    await as(
      owner,
      "select revision from public.atelier_documents where project_id=$1 and section='creative'",
      [project],
    ),
  ),
  creativeRevision,
);

assert.equal(
  (await as(assistant, "select * from public.atelier_projects")).rows.length,
  1,
);
assert.equal(
  (await as(assistant, "select * from public.atelier_studios")).rows.length,
  1,
);
assert.deepEqual(
  (
    await as(assistant, "select section from public.atelier_documents")
  ).rows.map((x) => x.section),
  ["creative"],
);
assert.equal(
  (await as(assistant, "select * from public.atelier_globals")).rows.length,
  0,
);
await assert.rejects(
  as(assistant, "select public.atelier_save_document($1,'finance',1,'{}')", [
    project,
  ]),
  /non autorisée/,
);
await assert.rejects(
  as(assistant, "select public.atelier_invite($1,'third@atelier.test','{}')", [
    project,
  ]),
  /non autorisée/,
);
await assert.rejects(
  as(assistant, "update public.atelier_members set can_invite=true"),
  /permission denied/,
);
await as(
  assistant,
  'select public.atelier_save_document($1,\'creative\',1,\'{"project":{"name":"Clip modifié"}}\')',
  [project],
);
await assert.rejects(
  as(owner, "select public.atelier_save_document($1,'creative',1,'{}')", [
    project,
  ]),
  /ATELIER_CONFLICT/,
);
await as(
  owner,
  'select public.atelier_set_member($1,$2,\'{"can_edit":true,"can_invite":true}\')',
  [project, assistant],
);
await assert.rejects(
  as(
    assistant,
    "select public.atelier_invite($1,'third@atelier.test','{\"budget_read\":true}')",
    [project],
  ),
  /déléguer/,
);
const delegated = scalar(
  await as(
    assistant,
    "select public.atelier_invite($1,'third@atelier.test','{\"can_edit\":true}')",
    [project],
  ),
);
await as(owner, "select public.atelier_revoke($1,$2)", [project, assistant]);
assert.equal(
  (await as(assistant, "select * from public.atelier_documents")).rows.length,
  0,
);
await assert.rejects(
  as(third, "select public.atelier_accept_invitation($1)", [delegated]),
  /indisponible|expirée/,
);
const expired = scalar(
  await as(
    owner,
    "select public.atelier_invite($1,'stranger@atelier.test','{}')",
    [project],
  ),
);
await pg.exec("reset role");
await pg.query(
  "update public.atelier_invitations set expires_at=now()-interval '1 day' where id=$1",
  [expired],
);
await assert.rejects(
  as(stranger, "select public.atelier_accept_invitation($1)", [expired]),
  /indisponible/,
);
console.log(
  "PostgreSQL : projets privés, budget isolé, invitations liées à une adresse vérifiée, délégation bornée, révocation et conflits OK.",
);
await pg.close();
