const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const { populateSimulationContacts } = require('../public/demo-contacts.js');
const { atelierPublicContacts } = require('../public/public-contacts.js');
const c = {}; vm.createContext(c);
vm.runInContext(fs.readFileSync('public/catalog.js','utf8') + fs.readFileSync('public/demo.js','utf8') + fs.readFileSync('public/supplier-directory.js','utf8') + '\ndatabase=atelierDemo();directory=atelierSuppliers;catalog=atelierCatalog;',c);
const db=c.database;
// Reproduit une ancienne simulation avec réseau fictif déjà migré.
db.contactNetworkVersion=1;
db.contacts.push({id:'simulation-contact-old',name:'Camille Martin',email:'test@example.invalid',simulation:true});
db.contacts.push({id:'manual-real',name:'Mon ajout',email:'test@my-studio.fr',supplierId:'directory-ami-paris'});
assert.equal(populateSimulationContacts(db,c.directory,c.catalog,atelierPublicContacts),true);
const all=[...c.directory,...db.suppliers];
assert.ok(db.contacts.length>150);
assert.ok(db.contacts.some(c=>c.id==='manual-real'));
for(const contact of db.contacts){
 assert.ok(all.some(s=>s.id===contact.supplierId),contact.brand);
 assert.ok(!/\.invalid$/.test(contact.email||''));
 assert.ok(!/^full-c|^simulation-contact/.test(contact.id));
 if(contact.publicDirectory){assert.match(contact.source,/^https?:\/\//);assert.equal(contact.checked,'2026-10-15');}
}
for(const piece of db.pieces){
 if(piece.contact) assert.equal(db.contacts.find(c=>c.id===piece.contact)?.supplierId,piece.supplierId);
}
for(const req of db.requests){
 if(!req.contact)continue;
 const contact=db.contacts.find(c=>c.id===req.contact);assert.ok(contact);
 for(const id of req.pieces||[])assert.equal(db.pieces.find(p=>p.id===id).supplierId,contact.supplierId);
}
const count=db.contacts.length;
assert.equal(populateSimulationContacts(db,c.directory,c.catalog,atelierPublicContacts),false);
assert.equal(db.contacts.length,count);
const missing={contacts:[],suppliers:[{id:'unknown',name:'Marque sans contact'}],pieces:[{supplierId:'unknown',brand:'Marque sans contact',contact:'old'}],supplierDrafts:[{key:'unknown',recipient:'old@example.invalid',state:'Validé'}]};
populateSimulationContacts(missing,[],[],atelierPublicContacts);
assert.equal(missing.contacts.length,0);assert.equal(missing.pieces[0].contact,'');assert.equal(missing.supplierDrafts[0].recipient,'');assert.equal(missing.supplierDrafts[0].state,'À relire');
const source=fs.readFileSync('public/demo-contacts.js','utf8');
assert.match(source,/demoMode && populateSimulationContacts/);
console.log(count+' contacts réels ou ajoutés ; sources, migration, marques sans contact, associations et absence de doublons OK.');
