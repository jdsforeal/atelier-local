const assert=require('node:assert/strict');
const {adjustCropBox}=require('../public/crop-editor.js');
const start={x:0.2,y:0.2,w:0.5,h:0.6};
const moved=adjustCropBox(start,'move',2,-2);assert.equal(moved.x,0.5);assert.equal(moved.y,0);
for(const handle of ['nw','n','ne','e','se','s','sw','w'])for(const dx of [-3,0,3])for(const dy of [-3,0,3]){
 const b=adjustCropBox(start,handle,dx,dy);
 assert(b.x>=0&&b.y>=0&&b.x+b.w<=1.000001&&b.y+b.h<=1.000001);
 assert(b.w>=0.039999&&b.h>=0.039999,'Une poignée ne peut inverser le cadre');
}
assert.deepEqual(start,{x:0.2,y:0.2,w:0.5,h:0.6},'Le geste garde une origine stable');
const resized=adjustCropBox(start,'se',0.1,0.1);assert(Math.abs(resized.w-0.6)<1e-9&&Math.abs(resized.h-0.7)<1e-9);
console.log('Rognage : déplacements bornés, huit poignées, taille minimale et origine stable vérifiés.');
