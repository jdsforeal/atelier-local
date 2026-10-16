/** Dix sources publiques pour un essai explicite, jamais injectées au chargement. */
const ATELIER_IMPORT_EXAMPLE=[
  {
    "category": "Haut",
    "url": "https://www.asos.com/fr/bershka/bershka-hoodie-en-maille-gaufree-brodee-noir/prd/211795376",
    "name": "Bershka hoodie en maille gaufrée brodée noir"
  },
  {
    "category": "Haut",
    "url": "https://www.asos.com/fr/4505/4505-rest-day-t-shirt-henley-a-manches-longues-en-maille-gaufree-blanc-casse/prd/211023426#colourWayId-211023430",
    "name": "4505 Rest Day t-shirt henley à manches longues en maille gaufrée, blanc cassé"
  },
  {
    "category": "Bas",
    "url": "https://www.asos.com/fr/asos-design/asos-design-jean-baggy-leger-a-enfiler-bleu-clair-delave/prd/210227055",
    "name": "ASOS DESIGN - Jean baggy léger à enfiler - Bleu clair délavé"
  },
  {
    "category": "Bas",
    "url": "https://www.asos.com/fr/asos-design/asos-design-jean-baggy-noir/prd/204192715",
    "name": "ASOS DESIGN - Jean baggy - Noir"
  },
  {
    "category": "Bas",
    "url": "https://www.asos.com/fr/asos-design/asos-design-deconstructed-jean-large-destructure-a-la-taille-bleu/prd/205217636",
    "name": "ASOS DESIGN - 'DECONSTRUCTED' - Jean large déstructuré à la taille - Bleu"
  },
  {
    "category": "Chaussures",
    "url": "https://www.asos.com/fr/pullbear/pullbear-mocassins-a-semelle-chunky-noir/prd/210652543#colourWayId-210652545",
    "name": "Pull&Bear - Mocassins à semelle chunky - Noir"
  },
  {
    "category": "Chaussures",
    "url": "https://www.ghbass-eu.com/en-eu/products/easy-weejuns-larson-flag-penny-loafers-black-leather",
    "name": "Easy Weejuns Larson Flag Penny Loafers"
  },
  {
    "category": "Accessoire",
    "url": "https://www.asos.com/fr/asos-design/asos-design-ceinture-elegante-en-imitation-cuir-avec-boucle-argentee-noir/prd/203805226",
    "name": "ASOS DESIGN - Ceinture élégante en imitation cuir avec boucle argentée - Noir"
  },
  {
    "category": "Accessoire",
    "url": "https://www.asos.com/fr/asos-design/asos-design-ceinture-en-similicuir-a-triple-passant-en-metal-noir-galet/prd/207985670",
    "name": "ASOS DESIGN - Ceinture en similicuir à triple passant en métal - Noir galet"
  },
  {
    "category": "Sac",
    "url": "https://www.chanel.com/fr/mode/p/AS6222B2436794305/sac-besace-agneau/",
    "name": "Sac besace agneau"
  }
];
function createImportTestLook(){
 const project=db.projects.find(p=>p.id===pid);if(!project||project.deletedAt||project.status==='Terminé'||!canEditProject(pid))return toast('Choisissez un projet actif que vous pouvez modifier.');
 let look=project.looks.find(l=>l.importExample==='ten-public-links-v1');
 if(!look){const id=uid();look={id,name:'Test import · 10 liens',person:'Essai multi-liens',importExample:'ten-public-links-v1',needs:[...new Set(ATELIER_IMPORT_EXAMPLE.map(r=>r.category))].map(category=>({id:uid(),name:category,category,state:'À chercher',multiple:false})),variants:[{id:id+'-a',name:'Essai des 10 liens',status:'À comparer'},{id:id+'-b',name:'Autre piste',status:'À comparer'}],activeVariant:id+'-a'};project.looks.push(look);if(!save()){project.looks=project.looks.filter(l=>l!==look);return toast('Le look n’a pas pu être enregistré.');}}
 choiceLookId=look.id;view='detail';tab='looks';render();openBatchImport(project.id,look.id,ATELIER_IMPORT_EXAMPLE);
}
document.addEventListener('click',event=>{if(event.target.closest('[data-import-example]'))createImportTestLook();});
