const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const context = {};
vm.createContext(context);
vm.runInContext(
  ["catalog", "demo", "look-model"]
    .map((name) => fs.readFileSync(`public/${name}.js`, "utf8"))
    .join("\n") +
    "\ndatabase=atelierDemo();prepareLookChoices(database,atelierCatalog);",
  context,
);
const database = context.database;
assert.equal(
  database.projects.filter((p) => p.status === "Terminé").length,
  50,
);
const look = database.projects[0].looks[0];
const need = look.needs[0];
const options = database.pieces.filter(
  (piece) => piece.look === look.id && piece.needId === need.id,
);
assert(options.length >= 2);
assert.equal(look.variants.length, 2);
const beforeCost = options.reduce(
  (sum, piece) => sum + (piece.commit ? piece.price : 0),
  0,
);
context.retainLookPiece(
  database,
  options[0].id,
  "Première direction",
  "2026-10-14T10:00:00Z",
);
context.retainLookPiece(
  database,
  options[1].id,
  "Meilleure coupe",
  "2026-10-14T10:01:00Z",
);
assert.equal(
  options.filter((piece) => piece.selection === "Retenue").length,
  1,
);
assert.equal(
  options.reduce((sum, piece) => sum + (piece.commit ? piece.price : 0), 0),
  beforeCost,
);
assert(
  database.selectionHistory.some(
    (entry) => entry.action === "Remplacée" && entry.piece === options[0].id,
  ),
);
need.multiple = true;
context.retainLookPiece(
  database,
  options[0].id,
  "Superposition",
  "2026-10-14T10:02:00Z",
);
assert.equal(
  options.filter((piece) => piece.selection === "Retenue").length,
  2,
);
const archived = database.projects.find((p) => p.status === "Terminé");
const archivedPiece = database.pieces.find(
  (piece) => piece.project === archived.id && piece.needId,
);
assert.throws(() =>
  context.retainLookPiece(database, archivedPiece.id, "Modification"),
);
const compact = context.serializeWorkspace(database, context.database.catalog);
const restored = context.hydrateWorkspace(
  JSON.parse(compact),
  context.database.catalog,
);
assert.equal(restored.pieces.length, database.pieces.length);
assert.equal(restored.pieces[0].name, database.pieces[0].name);
const bytes = compact.length * 2;
console.log({
  projects: database.projects.length,
  looks: 180,
  options: database.pieces.length,
  history: database.selectionHistory.length,
  estimatedStorageBytes: bytes,
});
assert(
  bytes < 4500000,
  "Le jeu de démonstration doit tenir dans le stockage local.",
);
console.log(
  "Choix exclusif, superposition, historique, budget séparé et archive protégée : OK.",
);

// Un haut ajouté depuis le + Bas doit rejoindre les hauts, y compris à la modification.
const placement = {projects:[{id:'project',looks:[{id:'look',needs:[{id:'bas',name:'Bas',category:'Bas'},{id:'haut',name:'Hauts',category:'Haut'},{id:'haut-b',name:'Deuxième haut',category:'Haut',multiple:true}]}]}]};
const values={project:'project',look:'look',category:'Haut',needId:'bas'};
assert.equal(context.resolvePieceNeed(placement,values,()=> 'new'),'haut');
assert.equal(context.resolvePieceNeed(placement,{...values,needId:'haut-b'},()=> 'new'),'haut-b','Conserver un besoin personnalisé de même catégorie');
assert.equal(context.resolvePieceNeed(placement,{...values,category:'Accessoire'},()=> 'accessoire'),'accessoire');
assert.equal(context.resolvePieceNeed(placement,{...values,category:'Accessoire'},()=> 'duplicate'),'accessoire','Réutiliser le besoin créé');
assert.equal(context.resolvePieceNeed(placement,{...values,look:''},()=> 'bad'),'','Une pièce sans look ne conserve pas un besoin étranger');
assert.equal(placement.projects[0].looks[0].needs.length,4);
console.log('Classement des pièces : catégorie prioritaire, besoin personnalisé conservé, création sans doublon et look isolé OK.');
// Exécuter les vrais callbacks de création depuis + Bas et de modification.
let callback, listener, serial=0;
const placementContext={db:{...placement,pieces:[],contacts:[],selectionHistory:[]},pid:'project',view:'home',tab:'',action:()=>{},canEditProject:()=>true,toast:()=>{},render:()=>{},pieceForm:()=>'',field:()=>'',modal:(_title,_fields,fn)=>callback=fn,project:()=>placement.projects[0],uid:()=> 'test-'+(++serial),safeUrl:()=>true,contactLabel:c=>c.name,document:{addEventListener:(type,fn)=>{if(type==='click')listener=fn;}}};
vm.createContext(placementContext);
vm.runInContext(fs.readFileSync('public/look-model.js','utf8')+'\n'+fs.readFileSync('public/look-choices.js','utf8'),placementContext);
placement.projects[0].looks[0].activeVariant='variant';
listener({target:{closest:()=>({dataset:{addOption:'look:bas'}})}});
callback({name:'Hoodie',category:'Haut',needId:'bas',price:'39.99',caution:'0'});
const added=placementContext.db.pieces[0];assert.equal(added.needId,'haut');assert.equal(added.look,'look');assert.equal(added.category,'Haut');
const workspaceSource=fs.readFileSync('public/workspace.js','utf8');
vm.runInContext(workspaceSource.slice(workspaceSource.indexOf('function editPiece(id)'),workspaceSource.indexOf('function editExpense(id)')),placementContext);
added.needId='bas';placementContext.editPiece(added.id);
callback({...added,project:'project',look:'look',category:'Haut',price:'39.99',caution:'0'});
assert.equal(added.needId,'haut','Modifier une fiche déjà mal classée corrige son besoin');
console.log('Parcours réels : + Bas avec catégorie Haut et correction d’une fiche existante OK.');

// Créer un look indépendant ne crée pas une variante dans le look courant.
const countBefore=placement.projects[0].looks.length;
placementContext.action('look');callback({name:'Look 2',person:'Artiste',needs:'Haut, Bas, Haut'});
const independent=placement.projects[0].looks.at(-1);
assert.equal(placement.projects[0].looks.length,countBefore+1);
assert.equal(independent.name,'Look 2');assert.equal(independent.variants.length,1);
assert.equal(independent.needs.length,2);assert.equal(vm.runInContext('choiceLookId',placementContext),independent.id);
assert.equal(placementContext.tab,'looks');assert.equal(added.look,'look');
console.log('Nouveau look : indépendant, sélection immédiate, une variante initiale et pièces existantes conservées.');
