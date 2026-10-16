const assert=require('node:assert/strict');
const {suggestProductCrop}=require('../public/studio-model.js');
function image(w,h){return new Uint8ClampedArray(w*h*4).fill(255);}
function rect(p,w,x,y,r,b,v){for(let cy=y;cy<b;cy++)for(let cx=x;cx<r;cx++){let i=(cy*w+cx)*4;p[i]=p[i+1]=p[i+2]=v;}}
const w=400,h=300,p=image(w,h);
rect(p,w,0,25,400,65,15); // navigation pleine largeur
rect(p,w,100,90,250,285,239); // photo principale
rect(p,w,120,210,230,255,30); // produit principal décentré
rect(p,w,80,90,92,110,50);rect(p,w,80,120,92,140,50); // miniatures
for(let y=95;y<180;y+=12)for(let x=270;x<340;x+=8)rect(p,w,x,y,x+4,y+3,20); // texte
const crop=suggestProductCrop(p,w,h);
assert.equal(crop.method,'photo-subject');
assert(crop.x>0.26&&crop.x<0.30&&crop.y>0.66&&crop.y<0.71);
assert(crop.x+crop.w>0.575&&crop.x+crop.w<0.62);
assert(crop.y+crop.h>0.85&&crop.y+crop.h<0.90);
const blank=suggestProductCrop(image(w,h),w,h);assert.equal(blank.w,1);assert(blank.reason);
const cut=image(w,h);rect(cut,w,0,30,200,270,20);assert.equal(suggestProductCrop(cut,w,h).w,1,'Un produit déjà coupé ne doit pas être serré davantage');
const nav=image(w,h);rect(nav,w,0,20,400,80,0);assert.equal(suggestProductCrop(nav,w,h).w,1,'Ne pas rogner sur une barre de navigation seule');
console.log('Cadrage produit : photo décentrée, menu, miniatures, texte, image vide et objet coupé vérifiés.');
