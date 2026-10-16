/** Vérifications avec le jeton utilisateur et les règles Supabase, jamais une clé administrateur. */
export function createCloudMailAuth(url,key,request=fetch){
 async function json(route,token){
  if(!token)throw Error('Connexion Atelier requise.');
  const response=await request(url+route,{headers:{apikey:key,Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Connexion Atelier à renouveler ou accès retiré.');return response.json();
 }
 async function owner(token,studio){
  if(!/^[a-f0-9-]{36}$/i.test(studio||''))throw Error('Studio incorrect.');
  const user=await json('/auth/v1/user',token);
  const rows=await json('/rest/v1/atelier_studios?'+new URLSearchParams({select:'id,owner_id',id:'eq.'+studio}),token);
  if(rows.length!==1||rows[0].owner_id!==user.id)throw Error('Le pilote Gmail est réservé au propriétaire du studio.');
  return {userId:user.id,studioId:studio,token};
 }
 async function project(context,job){
  await owner(context.token,job.studioId||context.studioId);
  const rows=await json('/rest/v1/atelier_projects?'+new URLSearchParams({select:'id',studio_id:'eq.'+(job.studioId||context.studioId),external_id:'eq.'+job.project,deleted_at:'is.null',purged_at:'is.null'}),context.token);
  if(rows.length!==1)throw Error('Projet inaccessible ou dans la corbeille : envoi et relance suspendus.');
  const documents=await json('/rest/v1/atelier_documents?'+new URLSearchParams({select:'data',project_id:'eq.'+rows[0].id,section:'eq.creative'}),context.token);
  if(documents.length!==1||['Terminé','Annulé'].includes(documents[0].data?.project?.status))throw Error('Projet arrêté : envoi et relance suspendus.');
 }
 return {owner,project};
}
