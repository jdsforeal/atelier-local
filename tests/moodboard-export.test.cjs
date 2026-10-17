const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('public/connected-workflow.js','utf8');const draw=source.slice(source.indexOf('async function drawMoodboardPages'),source.indexOf('async function exportMoodboard'));
const written=[],drawn=[];const context={fillRect(){},fillText(s){written.push(s)},measureText:s=>({width:s.length*8}),beginPath(){},moveTo(){},lineTo(){},stroke(){},drawImage(image){drawn.push(image.src)}};
class FakeImage{width=400;height=600;set src(value){this._src=value;queueMicrotask(()=>value==='blocked'?this.onerror():this.onload())}get src(){return this._src}}
const ctx={Image:FakeImage,setTimeout,clearTimeout,Promise,Date,document:{createElement:()=>({getContext:()=>context,toDataURL:()=> 'data:image/jpeg;base64,test'})}};vm.createContext(ctx);vm.runInContext(draw,ctx);
(async()=>{
 const project={name:'Test',boards:[{image:'ok',caption:'Disponible'},{image:'blocked',caption:'Boutique inaccessible'}]};
 const pages=await ctx.drawMoodboardPages(project);assert.equal(pages.length,1);assert.equal(pages.warnings.length,1);assert.match(pages.warnings[0],/Visuel 2/);assert.equal(drawn.length,1);assert(written.some(s=>s.includes('Visuel indisponible')));assert.equal(project.boards[1].image,'blocked');
 ctx.cloudAssetSources=new Map([['expired','atelier-asset:studio/project/image.jpg']]);ctx.cloudState={active:true,client:{storage:{from:()=>({createSignedUrl:async(path)=>{assert.equal(path,'studio/project/image.jpg');return {data:{signedUrl:'renewed'}}}})}}};
 const renewed=await ctx.drawMoodboardPages({name:'Privé',boards:[{image:'expired'}]});assert.equal(renewed.warnings.length,0);assert(drawn.includes('renewed'));
 console.log('Export moodboard : image refusée isolée, emplacement et alerte explicites, sources conservées, lien privé renouvelé.');
})().catch(e=>{console.error(e);process.exitCode=1});
