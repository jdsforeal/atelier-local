const assert=require('node:assert/strict');
const {relatedContacts,pieceContactGroups,groupSupplierPieces}=require('../public/supplier-model.js');
const brandA={id:'a',name:'Marque A',type:'Marque'},brandB={id:'b',name:'Marque B',type:'Marque'},showroom={id:'show',name:'Showroom Paris',type:'Showroom',representedBrandIds:['a','b']};
const general={id:'general',name:'Accueil presse',supplierId:'show',brandIds:[]},specialist={id:'specialist',name:'Camille',supplierId:'show',brandIds:['a']};
const db={suppliers:[brandA,brandB,showroom],contacts:[general,specialist],pieces:[{id:'pa',project:'p',brand:'Marque A',brandId:'a',supplierId:'show',contact:'general'},{id:'pb',project:'p',brand:'Marque B',brandId:'b',supplierId:'show',contact:'general'}]};
assert(relatedContacts(db,brandA).some(c=>c.id==='specialist'));assert(!relatedContacts(db,brandB).some(c=>c.id==='specialist'));assert(relatedContacts(db,brandB).some(c=>c.id==='general'));
assert(pieceContactGroups(db,[],'Marque B','').flatMap(g=>g.contacts).some(c=>c.id==='general'));
const groups=groupSupplierPieces(db,'p',[]);assert.equal(groups.length,1);assert.equal(groups[0].pieces.length,2);assert.equal(db.pieces[1].brandId,'b');assert.equal(db.contacts.length,2);
console.log('Showrooms : plusieurs marques, contact général ou spécialisé, un regroupement fournisseur sans remplacer les marques.');
