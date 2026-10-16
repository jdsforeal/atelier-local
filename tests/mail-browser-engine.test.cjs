const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
(async()=>{
 const scope=vm.createContext({crypto:webcrypto,TextEncoder,btoa,fetch(){throw Error('Aucun réseau autorisé')}});
 vm.runInContext(fs.readFileSync('public/vendor/mail-test-engine.js','utf8'),scope);
 const engine=scope.AtelierMailTestEngine,account={email:'styliste@atelier.localhost',jobs:[]},now=Date.now();let sends=0,reply=false;
 engine.addJobs(account,[{id:'a',project:'p',recipient:'fournisseur@atelier.localhost',subject:'Été · robe',body:'Bonjour, pièce été',reminderEnabled:true,reminderDays:3,reminderBody:'Des nouvelles ?'}],now);
 const api={send:async()=>{sends++;return {id:'sent',threadId:'thread'}},thread:async()=>({messages:[{id:'sent',internalDate:String(now),labelIds:['SENT'],payload:{headers:[{name:'Message-ID',value:'<test@atelier.localhost>'}]}},...(reply?[{id:'reply',internalDate:String(now+60000),labelIds:['INBOX']}]:[])]})};
 await engine.processAccount(account,api,()=>{},now);assert.equal(sends,1);reply=true;await engine.processAccount(account,api,()=>{},now+60000);await engine.processAccount(account,api,()=>{},now+4*86400000);assert.equal(sends,1);assert.equal(account.jobs[0].state,'Réponse reçue');
 console.log('Moteur navigateur sans Buffer ni réseau : message Unicode, réponse et relance arrêtée OK.');
})().catch(e=>{console.error(e.message);process.exit(1)});
