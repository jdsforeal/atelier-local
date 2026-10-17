/** Format partagé entre aperçu et transport : texte utilisateur échappé, liens autorisés seulement. */
var AtelierMailFormat = (()=>{
 const escape=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
 function links(values){
  if(!Array.isArray(values))return [];
  const result=[];
  for(const v of values.slice(0,50)){try{const u=new URL(v.url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)continue;const name=String(v.name||'').trim().slice(0,500);if(name&&!result.some(x=>x.name===name&&x.url===u.href))result.push({name,url:u.href});}catch{}}
  return result;
 }
 function html(body,values){
  const text=String(body||''),refs=links(values),names=new Map();
  refs.forEach(r=>{if(!names.has(r.name))names.set(r.name,r.url);else if(names.get(r.name)!==r.url)names.set(r.name,null);});
  const terms=[...refs.map(r=>r.url),...Array.from(names).filter(x=>x[1]).map(x=>x[0])].sort((a,b)=>b.length-a.length);
  const anchor=(name,url)=>`<a href="${escape(url)}" style="color:#1769cc;text-decoration:underline">${escape(name)}</a>`;
  let result='',at=0;
  if(terms.length){const pattern=new RegExp([...new Set(terms)].map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
   for(const match of text.matchAll(pattern)){result+=escape(text.slice(at,match.index));const token=match[0],ref=refs.find(r=>r.url===token);
    if(ref)result+=names.get(ref.name)===ref.url&&text.includes(ref.name)?'':anchor(ref.name,ref.url);
    else result+=anchor(token,names.get(token));at=match.index+token.length;
   }
  }
  result+=escape(text.slice(at));
  return '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;white-space:pre-wrap">'+result+'</div>';
 }
 return {links,html};
})();
if(typeof module!=='undefined')module.exports=AtelierMailFormat;
