const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {productFromURL}=require('../public/product-import-model.js');
let calls=0;
const context=vm.createContext({productFromURL,structuredClone,URL,AbortSignal,location:{hostname:'localhost'},document:{addEventListener(){}},fetch:async()=>{calls++;return {ok:true,json:async()=>({name:'',images:[],price:null,source:'url',reason:'blocked',notice:'Lecture refusée'})};}});
vm.runInContext(fs.readFileSync(require.resolve('../public/product-import.js'),'utf8'),context);
(async()=>{
 const first='https://www.sezane.com/fr-fr/product/ceinture-test/noir';
 await context.requestProductImport(first);assert.equal(calls,1);
 await context.requestProductImport(first);assert.equal(calls,1,'Une même URL est mise en cache');
 const paused=await context.requestProductImport('https://www.sezane.com/fr-fr/product/autre-test/noir');assert.equal(calls,1,'Un refus suspend les lectures du même hôte');assert.equal(paused.reason,'blocked');assert.match(paused.notice,/30 minutes/);
 await context.requestProductImport('https://www.cos.com/fr-fr/product/chemise-test');assert.equal(calls,2,'Une boutique distincte reste disponible');
 console.log('Lecteur : cache par URL et suspension après refus, aucun appel réseau réel.');
})().catch(error=>{console.error(error);process.exitCode=1});
