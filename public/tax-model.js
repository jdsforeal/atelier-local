/** Calculs d’achats : aucun taux déduit du pays de la marque, aucune conversion silencieuse. */
function purchaseAmounts(amount, tax = {}, envelopeBasis = 'HT') {
 const raw=Math.max(0,Number(amount)||0),round=n=>Math.round((n+Number.EPSILON)*100)/100;
 const basis=['HT','TTC'].includes(tax.basis)?tax.basis:'unknown';
 const rate=tax.rate===null||tax.rate===undefined||String(tax.rate).trim()===''?null:Number(tax.rate);
 const validRate=rate!==null&&Number.isFinite(rate)&&rate>=0&&rate<=100;
 const confirmed=tax.confirmed===true&&basis!=='unknown'&&validRate;
 const net=basis==='HT'?round(raw):basis==='TTC'&&validRate?round(raw/(1+rate/100)):null;
 const gross=basis==='TTC'?round(raw):basis==='HT'&&validRate?round(raw*(1+rate/100)):null;
 const recovery=['full','none'].includes(tax.recovery)?tax.recovery:'unknown';
 // Sans confirmation : montant saisi provisoire, jamais un HT inventé ou un zéro.
 const budget=confirmed?(envelopeBasis==='TTC'||recovery!=='full'?gross:net):round(raw);
 return {raw:round(raw),basis,rate:validRate?rate:null,net,gross,vat:net===null||gross===null?null:round(gross-net),budget,pending:raw>0&&(!confirmed||recovery==='unknown'),confirmed,recovery};
}
function normalizeStudioTax(input={}) {
 const country=['BE','FR','other'].includes(input.country)?input.country:'';
 const recovery=['full','none','partial','unknown'].includes(input.recovery)?input.recovery:'unknown';
 const vatNumber=String(input.vatNumber||'').replace(/[.\s-]/g,'').toUpperCase();
 if(vatNumber&&(!/^[A-Z]{2}[A-Z0-9]{2,14}$/.test(vatNumber)||(country==='BE'&&!/^BE\d{10}$/.test(vatNumber))||(country==='FR'&&!/^FR[A-Z0-9]{2}\d{9}$/.test(vatNumber))))throw Error('Vérifiez le format du numéro de TVA (BE + 10 chiffres ou FR + 2 caractères + 9 chiffres).');
 return {country,recovery,vatNumber};
}
if(typeof module!=='undefined')module.exports={purchaseAmounts,normalizeStudioTax};
