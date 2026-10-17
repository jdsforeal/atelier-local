/** Les nouveautés sont essayables sans Gemini, Gmail ni lecture de boutiques. */
function simulationBoardImage(title,colour='#b4bea7'){
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=840;const c=canvas.getContext('2d');
 c.fillStyle='#f5f2e9';c.fillRect(0,0,1200,840);c.fillStyle='#3e5036';c.font='32px Georgia';c.fillText(title,50,65);c.font='17px Arial';c.fillText('SIMULATION · composition de démonstration',50,100);
 ['#d9cbbd',colour,'#e6dfcf'].forEach((fill,i)=>{const x=50+i*370;c.fillStyle=fill;c.fillRect(x,140,345,600);c.fillStyle='#f9f6ed';c.beginPath();c.moveTo(x+95,235);c.lineTo(x+145,205);c.lineTo(x+200,205);c.lineTo(x+250,235);c.lineTo(x+300,370);c.lineTo(x+235,390);c.lineTo(x+225,650);c.lineTo(x+120,650);c.lineTo(x+110,390);c.lineTo(x+45,370);c.closePath();c.fill();});return canvas.toDataURL('image/png');
}
function upgradeAtelierSimulation(database){
 if(database.simulationExperienceVersion===7)return false;
 const p=database.projects.find(p=>p.status!=='Terminé'&&!p.deletedAt);if(!p)return false;
 const style=simulationBoardImage('Silhouettes & matières'),direction=simulationBoardImage('Direction artistique · lumière & ambiance','#909d90');
 p.boards??=[];p.moodDocuments??=[];
 if(!p.boards.some(b=>b.kind==='da'))p.boards.push({kind:'da',image:direction,originalImage:direction,caption:'Direction artistique · exemple',url:''});
 for(const [kind,name,data] of [['stylisme','Planche stylisme déjà composée',style],['da','Planche DA reçue — exemple',direction]])if(!p.moodDocuments.some(d=>d.id==='demo-finished-'+kind))p.moodDocuments.push({id:'demo-finished-'+kind,kind,name,author:'Équipe de démonstration',type:'image/png',data});
 database.studioTaxProfile??={country:'BE',recovery:'full',vatNumber:''};
 database.mailSettings??={};database.mailSettings.signature||='Camille · Styliste\nAtelier de démonstration';
 database.simulationExperienceVersion=7;return true;
}
const simulationProductImport=requestProductImport;
requestProductImport=async function(raw){
 if(!demoMode)return simulationProductImport(raw);
 const value=productFromURL(raw);return {...value,source:'simulation',currency:'EUR',price:85,images:[simulationBoardImage('Vue de démonstration'),simulationBoardImage('Deuxième vue','#9ea999')],notice:'SIMULATION : données et images d’exemple, aucune boutique contactée. Vérifiez les champs avant l’ajout.'};
};
const simulationMailAPI=mailAPI;
mailAPI=async function(route,body){
 if(!demoMode)return simulationMailAPI(route,body);
 if(route==='ai-status')return {enabled:true,simulation:true};
 if(route==='ai-draft'){
  const x=body.context,lines=x.pieces.map(p=>'• '+p.name+(p.size?' — taille '+p.size:'')+(p.url?'\n'+p.url:'')).join('\n');
  return {simulation:true,proposal:{subject:'[SIMULATION] Demande pour '+(x.project.client||x.project.name),body:'Bonjour'+(x.contactName?' '+x.contactName:'')+',\n\nJe prépare le stylisme de '+(x.project.client||x.project.name)+(x.project.date?', prévu le '+x.project.date:'')+'. J’aimerais proposer les pièces suivantes :\n\n'+lines+'\n\nPourriez-vous m’indiquer leurs disponibilités et les conditions pour ce projet ?\n\nMerci beaucoup et belle journée,\n'+(x.signature||'[Votre signature à compléter]'),reminderBody:'Bonjour,\n\nAvez-vous pu regarder ma demande pour '+(x.project.client||x.project.name)+' ?\n\nMerci beaucoup,\n'+(x.signature||'[Votre signature à compléter]')}};
 }
 throw Error('Simulation : aucun appel Gmail ni envoi réel. Utilisez « Essayer sans envoyer ».');
};
const simulationLatestRender=render;
render=function(){if(demoMode&&upgradeAtelierSimulation(db))save();simulationLatestRender();};
render();
