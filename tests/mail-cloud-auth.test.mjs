import assert from 'node:assert/strict';
import {createCloudMailAuth} from '../mail-service/cloud-auth.mjs';
import {addJobs,processAccount} from '../mail-service/core.mjs';
const studio='00000000-0000-0000-0000-000000000001';let owner='owner',active=true,status='Préparation',connected=true;
const auth=createCloudMailAuth('https://cloud.invalid','public',async(url,options)=>{
 assert.equal(options.headers.Authorization,'Bearer user-token');
 let data=url.includes('/auth/v1/')?{id:'owner'}:url.includes('/atelier_studios?')?[{id:studio,owner_id:owner}]:url.includes('/atelier_projects?')?(active?[{id:'project-id'}]:[]):[{data:{project:{status}}}];
 return {ok:connected,json:async()=>data};
});
const context=await auth.owner('user-token',studio);await auth.project(context,{project:'p'});
owner='assistant';await assert.rejects(auth.owner('user-token',studio));owner='owner';active=false;await assert.rejects(auth.project(context,{project:'p'}));active=true;status='Annulé';await assert.rejects(auth.project(context,{project:'p'}));status='Préparation';connected=false;await assert.rejects(auth.project(context,{project:'p'}));
let sends=0;const account={email:'styliste@studio.fr',jobs:[]};addJobs(account,[{id:'a',project:'p',recipient:'testeur@gmail.com',subject:'Test',body:'Bonjour',reminderEnabled:true,reminderBody:'Relance'}]);
await processAccount(account,{authorize:()=>{throw Error('Accès retiré')},send:async()=>{sends++}},()=>{});
assert.equal(sends,0);assert.equal(account.jobs[0].state,'En attente d’envoi');
console.log('Gmail/studio : propriétaire, projet actif, retrait/corbeille, session expirée et refus avant transport vérifiés.');
