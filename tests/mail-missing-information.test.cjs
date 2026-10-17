const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let source=fs.readFileSync('public/mail-ai.js','utf8');source=source.slice(source.indexOf('function mailMissingInformation'),source.indexOf('function mailTextSnapshot'));
const ctx={};vm.createContext(ctx);vm.runInContext(source,ctx);
const context={project:{},signature:'',pieces:[{name:'Veste',mode:'Prêt'},{name:'Sac',mode:'Achat',size:'Unique'}]};
const missing=ctx.mailMissingInformation(context);assert.equal(missing.length,6);assert(missing.some(f=>f.key==='returnDue'&&f.piece===0));assert(!missing.some(f=>f.piece===1));assert.equal(context.project.date,undefined);
assert.equal(ctx.mailMissingInformation({project:{client:'Artiste',type:'Clip',date:'2026-12-01'},signature:'Camille',pieces:[]}).length,0);
console.log('Questions préalables : projet, signature, tailles et retours conditionnels, aucune donnée inventée.');
