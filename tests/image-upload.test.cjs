const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
class Node {
 constructor(){this.listeners={};this.classList={add(){},remove(){}};this.children=[];this.files=[];this.isConnected=true;this.multiple=false;}
 setAttribute(){} before(node){this.zone=node} after(){} append(...nodes){this.children.push(...nodes)} replaceChildren(){this.children=[]} contains(){return false}
 addEventListener(type,fn){this.listeners[type]=fn} dispatchEvent(event){this.listeners[event.type]?.(event)}
}
const input=new Node();input.type='file';
const context=vm.createContext({document:{body:{},querySelectorAll(){return [input]},createElement(){return new Node()}},MutationObserver:class{observe(){}},URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},DataTransfer:class{constructor(){this.files=[];this.items={add:f=>this.files.push(f)}}},Event:class{constructor(type){this.type=type}}});
vm.runInContext(fs.readFileSync('public/image-upload.js','utf8'),context);
const image={name:'robe.jpg',type:'image/jpeg',size:100};
function drop(files){input.zone.listeners.drop({preventDefault(){},stopPropagation(){},dataTransfer:{files}})}
drop([image]);assert.equal(input.files[0],image);
assert.equal(vm.runInContext('imageUploadStates.get(document.querySelectorAll()[0]).title.textContent',context),'1 image prête');
drop([image,image]);assert.equal(input.files.length,1);assert.match(vm.runInContext('imageUploadStates.get(document.querySelectorAll()[0]).error.textContent',context),/seule/);
input.multiple=true;drop([image,image]);assert.equal(input.files.length,2);
drop([{name:'document.pdf',type:'application/pdf',size:100}]);assert.equal(input.files.length,2);assert.match(vm.runInContext('imageUploadStates.get(document.querySelectorAll()[0]).error.textContent',context),/uniquement/);
drop([{...image,size:10000001}]);assert.equal(input.files.length,2);assert.match(vm.runInContext('imageUploadStates.get(document.querySelectorAll()[0]).error.textContent',context),/10 Mo/);
console.log('Import images : dépôt simple et multiple, aperçu, formats et taille refusés sans perdre la sélection valide.');
