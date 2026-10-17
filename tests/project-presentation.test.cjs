const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('public/client-flow.js','utf8').split('/** Atelier')[0];
const context={structuredClone,demoMode:false,cloudRights:()=>({budget_read:false})};vm.createContext(context);vm.runInContext(source,context);
const saved={showPrices:true,looks:[{pieces:[{price:121,name:'Pièce conservée'}]}]};
const safe=context.clientPresentationBoard(saved,'project');
assert.equal(safe.showPrices,false);assert.equal(safe.looks[0].pieces[0].price,undefined);
assert.equal(saved.showPrices,true);assert.equal(saved.looks[0].pieces[0].price,121);
context.cloudRights=()=>({budget_read:true});assert.equal(context.clientPresentationBoard(saved,'project'),saved);
console.log('Sélection : versions et PDF sans prix en absence du droit budget, original conservé.');
