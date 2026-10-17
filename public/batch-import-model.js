/** Brouillons d’import : aucune écriture avant la vérification explicite de la sélection. */
const batchProductRegistry=typeof module!=='undefined'?require('./product-import-model.js'):{PRODUCT_SHOPS,productPublicURL,productTaxEvidence};
const BATCH_CATEGORIES=['Haut','Bas','Robe','Combinaison','Veste','Chaussures','Bijoux','Sac','Accessoire','Autre'];
function batchCategory(name){
 const text=String(name||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
 const groups=[['Chaussures',/\b(mocassins?|loafers?|bottines?|bottes?|boots?|sneakers?|baskets?|sandales?|chaussures?|souliers?|escarpins?)\b/],['Combinaison',/\b(combinaison|jumpsuit|salopette)\b/],['Robe',/\b(robe|dress)\b/],['Veste',/\b(veste|manteau|blouson|blazer|jacket|coat|trench|doudoune)\b/],['Bas',/\b(pantalon|trousers|jeans?|shorts?|jupe|skirt|legging)\b/],['Bijoux',/\b(collier|bracelet|boucles? d.oreilles|bague|necklace|earrings?|jewellery)\b/],['Sac',/\b(sac|bag|handbag|pochette|cabas)\b/],['Accessoire',/\b(ceinture|belt|foulard|echarpe|lunettes|chapeau|cap|bonnet|gants|chaussettes)\b/],['Haut',/\b(t[ -]?shirt|henley|hoodie|sweat|chemise|shirt|blouse|pull|polo|cardigan|gilet|debardeur|top)\b/]];
 return groups.find(([,pattern])=>pattern.test(text))?.[0]||'';
}
function batchURLKey(value){
 try{const u=new URL(value);for(const key of [...u.searchParams.keys()])if(/^utm_|^(gclid|gclsrc|gad_source|gad_campaignid|gbraid|wbraid|s_kwcid|msockid)$/i.test(key))u.searchParams.delete(key);u.searchParams.sort();return u.href;}catch{return '';}
}
function batchMoney(value){
 const clean=String(value??'').replace(/[\s\u00a0\u202f]/g,'');
 if(!clean)return null;
 let normalized=clean;
 if(/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(clean))normalized=clean.replace(/\./g,'').replace(',','.');
 else normalized=clean.replace(',','.');
 return /^\d+(?:\.\d{1,2})?$/.test(normalized)&&Number.isFinite(Number(normalized))?Number(normalized):null;
}
function batchOCRProposal(text, confidence=0, context={}){
 const lines=String(text||'').split(/\n/).map(line=>line.trim().replace(/\s+/g,' ').replace(/^(?:Accueil|Home)\s*[>»][\s\S]*[>»]\s*/i,'')).filter(Boolean);
 const prices=[];
 for(const line of lines){if(/livraison|shipping|échéance|echeance|mensualit|par mois|per month|dès \d+ achats|des \d+ achats/i.test(line))continue;for(const match of line.matchAll(/(?:€|EUR)\s*((?:\d{1,3}(?:[ .\u00a0\u202f]\d{3})+|\d+)(?:[,.]\d{1,2})?)|((?:\d{1,3}(?:[ .\u00a0\u202f]\d{3})+|\d+)(?:[,.]\d{1,2})?)\s*(?:€|EUR)/gi)){const amount=batchMoney((match[1]||match[2]).trim());if(amount!==null&&!prices.includes(amount))prices.push(amount);}}
 const noise=/recherch|search|accueil|nouveaut|toutes les|tous les|guide des|ajouter au panier|add to|livraison|shipping|retour gratuit|collection|http|\.com\/|\.fr\/|^homme$|^femme$|^men$|^women$/i;
 const candidates=lines.map((name,index)=>({name,index,score:batchCategory(name)&&!noise.test(name)&&name.length>=8&&name.length<180&&!/[€%]/.test(name)?name.split(' ').length+(/[-–|]/.test(name)?4:0):0})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
 let name=candidates[0]?.name||'';
 const next=lines[(candidates[0]?.index??-2)+1];if(name&&next&&next.length<50&&!noise.test(next)&&!/[€%\d]/.test(next)&&!batchCategory(next)&&/^(?:blanc|noir|bleu|rouge|vert|marron|beige|chunky|gaufr|brod|cass|en |à |a |avec |manches|longues|courtes)/i.test(next))name+=' '+next;
 const shop=batchProductRegistry.PRODUCT_SHOPS.find(shop=>shop.hosts.some(host=>String(text).toLowerCase().includes(host)));
 let brand=context.brand||(shop?.ownBrand?shop.name:''),supplier=context.supplier||shop?.name||'';
 const prefix=name.match(/^(.{2,35}?)\s+[-–|]\s+(.+)/);if(!brand&&prefix&&(!batchCategory(prefix[1])||/[&.]/.test(prefix[1]))&&batchCategory(prefix[2]))brand=prefix[1];
 return {taxEvidence:batchProductRegistry.productTaxEvidence(text),name,brand,supplier,category:batchCategory(name),price:prices.length===1?prices[0]:null,currency:prices.length?'EUR':'',priceCandidates:prices,description:'',url:context.url||'',images:[],source:'capture',confidence,notice:prices.length>1?'Plusieurs prix lus : choisissez le prix de cette pièce.':'Texte lu dans la capture originale. Vérifiez chaque proposition.'};
}
function batchCombine(link, capture){
 const name=link?.source!=='url'&&link?.name?link.name:capture?.name||link?.name||'';
 const price=link?.currency==='EUR'&&link.price!==null?link.price:capture?.price??null;
 const choose=(key)=>link?.[key]||capture?.[key]||'';
 const evidence=[link?.taxEvidence,capture?.taxEvidence].filter(Boolean),bases=[...new Set(evidence.map(e=>e.basis).filter(b=>b!=='unknown'))],rates=[...new Set(evidence.map(e=>e.rate).filter(r=>r!==null))];
 return {taxEvidence:{basis:bases.length===1?bases[0]:'unknown',rate:rates.length===1?rates[0]:null,confirmed:false,excerpt:evidence.map(e=>e.excerpt).filter(Boolean).join(' · '),conflict:bases.length>1||rates.length>1||evidence.some(e=>e.conflict||e.reverse)},name,brand:choose('brand'),supplier:choose('supplier'),category:batchCategory(name),price,description:choose('description'),url:choose('url'),images:link?.images||[],priceCandidates:capture?.priceCandidates||[],sources:{name:link?.source!=='url'&&link?.name?'Lien':capture?.name?'Capture':'Lien à vérifier',price:link?.price!==null&&link?.currency==='EUR'?'Lien':'Capture à vérifier'},notice:[link?.notice,capture?.notice].filter(Boolean).join(' ')};
}
function batchBuild(database, drafts, options){
 const {projectId,lookId,variantId,uid,resolveNeed,canEdit,canFinance,directory=[]}=options;
 if(!canEdit)throw Error('Vous ne pouvez plus modifier ce projet.');
 const project=database.projects.find(p=>p.id===projectId);
 const look=project?.looks.find(l=>l.id===lookId);
 if(!look||project.status==='Terminé'||project.deletedAt)throw Error('Choisissez un look actif du projet.');
 const selected=drafts.filter(d=>d.include);
 if(!selected.length||selected.length>10)throw Error('Sélectionnez de 1 à 10 pièces.');
 if(variantId&&!look.variants?.some(v=>v.id===variantId))throw Error('La piste choisie ne fait pas partie de ce look.');
 const seen=new Set(database.pieces.filter(p=>p.project===projectId&&p.look===lookId).map(p=>batchURLKey(p.url)).filter(Boolean));
 for(const row of selected){if(!row.reviewed)throw Error('Vérifiez chaque fiche cochée avant l’ajout.');if(!String(row.name||'').trim()||!BATCH_CATEGORIES.includes(row.category))throw Error('Complétez le nom et la catégorie de chaque pièce.');if(row.price!==''&&row.price!==null&&row.price!==undefined&&batchMoney(row.price)===null)throw Error('Vérifiez les montants (ex. 32,99).');if(row.url){if(!batchProductRegistry.productPublicURL(row.url))throw Error('Vérifiez les liens des pièces.');const key=batchURLKey(row.url);if(seen.has(key))throw Error('Une pièce avec ce lien existe déjà dans le look ou dans la sélection.');seen.add(key);}if(row.contact&&!database.contacts.some(c=>c.id===row.contact))throw Error('Choisissez un contact du carnet.');}
 const next={...database,pieces:[...database.pieces],suppliers:[...(database.suppliers||[])],selectionHistory:[...(database.selectionHistory||[])],projects:database.projects.map(p=>p.id===projectId?{...p,looks:p.looks.map(l=>l.id===lookId?{...l,needs:(l.needs||[]).map(n=>({...n}))}:l)}:p)};
 const key=name=>String(name||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
 function structure(name,type){name=String(name||'').trim();if(!name)return null;let found=[...next.suppliers,...directory].find(s=>key(s.name)===key(name));if(!found){found={id:uid(),name,type};next.suppliers.push(found);}return found;}
 for(const row of selected){const brand=structure(row.brand,'Marque'),supplier=structure(row.supplier,'Fournisseur');const photos=[...new Set((row.photos||[]).filter(Boolean))];if(photos.length>8)throw Error('Conservez au maximum 8 photos par pièce.');if(photos.some(photo=>!batchProductRegistry.productPublicURL(photo)&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(photo)))throw Error('Une image n’est pas valide. Décochez-la puis réessayez.');const piece={id:uid(),name:row.name.trim(),brand:brand?.name||'',brandId:brand?.id||'',supplierId:supplier?.id||'',contact:row.contact||'',project:projectId,look:lookId,variantId:variantId||look.activeVariant||'',category:row.category,mode:['Achat','Prêt','Location'].includes(row.mode)?row.mode:'Achat',price:canFinance?(batchMoney(row.price)||0):0,...(canFinance?{purchaseTax:row.purchaseTax||{basis:'unknown',rate:null,recovery:'unknown',confirmed:false}}:{}),caution:0,commit:false,selection:'À comparer',status:'Repéré',url:row.url||'',note:row.description||'',image:photos[0]||'',photos,...(row.originalImage?{originalImage:row.originalImage,crop:row.crop||null}:{}),clientVisible:true};if(canFinance&&batchMoney(row.price)!==null)piece.publicPrice=batchMoney(row.price);piece.needId=resolveNeed(next,piece,uid);next.pieces.push(piece);next.selectionHistory.push({id:uid(),project:projectId,look:lookId,piece:piece.id,action:'Option importée',label:piece.name,reason:'Fiche vérifiée avant ajout',date:new Date().toISOString()});}
 return next;
}
if(typeof module!=='undefined')module.exports={BATCH_CATEGORIES,batchCategory,batchMoney,batchURLKey,batchOCRProposal,batchCombine,batchBuild};
