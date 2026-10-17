const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('public/simulation-updates.js','utf8');const end=source.indexOf('const simulationLatestRender');
const c={demoMode:true,requestProductImport:()=>{throw Error('appel réel interdit')},mailAPI:()=>{throw Error('appel réel interdit')},productFromURL:url=>({url,name:'Chemise'}),document:{createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}}),toDataURL:()=> 'data:image/png;base64,example'})}};
vm.createContext(c);vm.runInContext(source.slice(0,end),c);
(async()=>{const db={projects:[{id:'p',status:'Préparation',boards:[],moodDocuments:[]}],pieces:[]};assert(c.upgradeAtelierSimulation(db));assert.equal(db.projects[0].moodDocuments.length,2);assert.equal(db.projects[0].boards[0].kind,'da');assert.equal(c.upgradeAtelierSimulation(db),false);assert.equal(db.projects[0].moodDocuments.length,2);
const imported=await c.requestProductImport('https://marque.fr/article');assert.equal(imported.images.length,2);assert.match(imported.notice,/SIMULATION/);
const drafted=await c.mailAPI('ai-draft',{context:{project:{name:'Test'},pieces:[{name:'Chemise',size:'M'}]}});assert(drafted.simulation);assert.match(drafted.proposal.subject,/SIMULATION/);await assert.rejects(c.mailAPI('send',{}),/aucun appel Gmail/);
console.log('Simulation : mise à jour non destructive et idempotente, imports et rédaction sans réseau, envois réels interdits.');})().catch(e=>{console.error(e);process.exitCode=1});
