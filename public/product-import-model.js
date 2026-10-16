/** Lecture sans exécution de code : métadonnées produit et repli explicite sur l’URL. */
function productPublicURL(value) {
  try {const url=new URL(String(value).trim());if(url.protocol!=='https:'||url.username||url.password||url.port||!url.hostname.includes('.')||/^[\d.]+$/.test(url.hostname)||/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[)/i.test(url.hostname))return '';return url.href;}catch{return '';}
}
function productText(value) {
  return String(value??'').replace(/<[^>]*>/g,' ').replace(/&#x([\da-f]+);/gi,(_,n)=>{const cp=parseInt(n,16);return cp<=0x10ffff?String.fromCodePoint(cp):'';}).replace(/&#(\d+);/g,(_,n)=>Number(n)<=0x10ffff?String.fromCodePoint(Number(n)):'').replace(/&(amp|quot|apos|lt|gt|nbsp);/g,(_,n)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '})[n]).replace(/\s+/g,' ').trim().slice(0,2000);
}
function productFromURL(value) {
  const valid=productPublicURL(value);if(!valid)throw Error('Collez un lien https vers une fiche produit.');
  const url=new URL(valid),host=url.hostname.replace(/^www\./,'');let name='',brand='',supplier='';
  const segments=url.pathname.split('/').filter(Boolean).map(s=>{try{return decodeURIComponent(s);}catch{return s;}});
  if(host==='asos.com'){
    supplier='ASOS';const index=segments.indexOf('prd');
    if(index>=2){brand=segments[index-2].replace(/-/g,' ');const slug=segments[index-1];const prefix=segments[index-2]+'-';name=(slug.startsWith(prefix)?slug.slice(prefix.length):slug).replace(/-/g,' ');}
  }else{
    const shops={'zara.com':'Zara','hm.com':'H&M','mango.com':'Mango','arket.com':'Arket','cos.com':'COS','uniqlo.com':'Uniqlo','sezane.com':'Sézane'};supplier=shops[host]||'';
    const slug=segments.at(-1)?.replace(/\.(html?|aspx)$/i,'')||'';
    if(slug.includes('-')&&!/^\d+$/.test(slug))name=slug.replace(/-/g,' ');
  }
  name=name?name[0].toLocaleUpperCase('fr')+name.slice(1):'';
  if(brand&&!/^\d+$/.test(brand))brand=brand.split(' ').map(w=>w[0]?.toUpperCase()+w.slice(1)).join(' ');
  return {url:valid,name,brand,supplier,description:'',price:null,currency:'',images:[],source:'url',notice:'Propositions déduites du lien : nom et marque à vérifier. Aucun prix ni photo récupéré.'};
}
function parseProductHTML(html,url) {
  const result=productFromURL(url),meta={};
  for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const attrs={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[m[1].toLowerCase()]=m[2]??m[3]??m[4];const key=attrs.property||attrs.name;if(key&&attrs.content)meta[key.toLowerCase()]=productText(attrs.content);}
  const products=[];
  function collect(node,depth=0){if(!node||depth>12)return;if(Array.isArray(node)){node.forEach(x=>collect(x,depth+1));return;}if(typeof node!=='object')return;const type=[node['@type']].flat();if(type.includes('Product'))products.push(node);if(node['@graph'])collect(node['@graph'],depth+1);if(node.mainEntity)collect(node.mainEntity,depth+1);}
  for(const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi))if(/type\s*=\s*["']application\/ld\+json["']/i.test(script[1])){try{collect(JSON.parse(script[2]));}catch{}}
  const product=products[0],offer=Array.isArray(product?.offers)?product.offers[0]:product?.offers;
  // ASOS publie un tableau de prix incluant des recommandations : retenir seulement l’id de la fiche.
  if(new URL(result.url).hostname.replace(/^www\./,'')==='asos.com'){
    const id=Number(new URL(result.url).pathname.match(/\/prd\/(\d+)/)?.[1]);
    const stock=html.match(/stockPriceResponse\s*=\s*'([^']+)'/);
    if(stock){try{const row=JSON.parse(stock[1]).find(x=>x.productId===id);const amount=row?.productPrice?.current?.value;if(typeof amount==='number'&&amount>=0&&Number.isFinite(amount)){result.price=amount;result.currency=String(row.productPrice.currency||'');}}catch{}}
  }
  const cleanName=productText(product?.name||meta['og:title']||'').replace(/\s*[|–]\s*ASOS\s*$/i,'');
  if(cleanName)result.name=cleanName;
  const brand=productText(typeof product?.brand==='string'?product.brand:product?.brand?.name);if(brand)result.brand=brand;
  result.description=productText(product?.description||meta['og:description']||meta.description||'');
  const price=String(offer?.price??meta['product:price:amount']??'').replace(',','.');
  if(/^\d+(\.\d{1,2})?$/.test(price)&&Number.isFinite(Number(price))){result.price=Number(price);result.currency=String(offer?.priceCurrency||meta['product:price:currency']||'').toUpperCase();}
  const rawImages=[...([product?.image].flat().filter(Boolean)),meta['og:image']].flat();
  for(const item of rawImages){let image=typeof item==='string'?item:item?.url||item?.contentUrl;if(!image)continue;try{image=new URL(image,result.url).href;}catch{continue;}image=productPublicURL(image);if(image&&!result.images.includes(image))result.images.push(image);if(result.images.length>=8)break;}
  if(product||cleanName||result.images.length){result.source=product?'product-data':'page';result.notice='Informations publiées par la boutique. Vérifiez la variante, le prix et le fournisseur avant enregistrement.';}
  return result;
}
if(typeof module!=='undefined')module.exports={productPublicURL,productText,productFromURL,parseProductHTML};
