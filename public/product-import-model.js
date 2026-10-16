/** Lecture sans exécution de code : métadonnées produit et repli explicite sur l’URL. */
function productPublicURL(value) {
  try {const url=new URL(String(value).trim());if(url.protocol!=='https:'||url.username||url.password||url.port||!url.hostname.includes('.')||/^[\d.]+$/.test(url.hostname)||/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[)/i.test(url.hostname))return '';return url.href;}catch{return '';}
}
function productText(value) {
  return String(value??'').replace(/<[^>]*>/g,' ').replace(/&#x([\da-f]+);/gi,(_,n)=>{const cp=parseInt(n,16);return cp<=0x10ffff?String.fromCodePoint(cp):'';}).replace(/&#(\d+);/g,(_,n)=>Number(n)<=0x10ffff?String.fromCodePoint(Number(n)):'').replace(/&(amp|quot|apos|lt|gt|nbsp);/g,(_,n)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '})[n]).replace(/\s+/g,' ').trim().slice(0,2000);
}
const PRODUCT_SHOPS = [
  {hosts:['asos.com','www.asos.com'], name:'ASOS', ownBrand:false},
  {hosts:['zalando.fr','www.zalando.fr','zalando.be','www.zalando.be','fr.zalando.be','nl.zalando.be','zalando.de','www.zalando.de','zalando.nl','www.zalando.nl'], name:'Zalando', ownBrand:false},
  {hosts:['chanel.com','www.chanel.com'], name:'Chanel', ownBrand:true},
  {hosts:['mango.com','www.mango.com','shop.mango.com'], name:'Mango', ownBrand:true},
  {hosts:['hm.com','www.hm.com','www2.hm.com'], name:'H&M', ownBrand:true},
  {hosts:['zara.com','www.zara.com'], name:'Zara', ownBrand:true},
  {hosts:['uniqlo.com','www.uniqlo.com'], name:'Uniqlo', ownBrand:true},
  {hosts:['sezane.com','www.sezane.com'], name:'Sézane', ownBrand:true},
  {hosts:['massimodutti.com','www.massimodutti.com'], name:'Massimo Dutti', ownBrand:true},
  {hosts:['maje.com','www.maje.com','fr.maje.com','be.maje.com'], name:'Maje', ownBrand:true},
  {hosts:['cos.com','www.cos.com'], name:'COS', ownBrand:true},
  {hosts:['arket.com','www.arket.com'], name:'Arket', ownBrand:true},
];
function productShop(value){try{return PRODUCT_SHOPS.find(shop=>shop.hosts.includes(new URL(value).hostname));}catch{return undefined;}}
function productFromURL(value) {
  const valid=productPublicURL(value);if(!valid)throw Error('Collez un lien https vers une fiche produit.');
  const url=new URL(valid),host=url.hostname.replace(/^www\./,'');const shop=productShop(valid);let name='',brand=shop?.ownBrand?shop.name:'',supplier=shop?.name||'';
  const segments=url.pathname.split('/').filter(Boolean).map(s=>{try{return decodeURIComponent(s);}catch{return s;}});
  if(host==='asos.com'){
    const index=segments.indexOf('prd');
    if(index>=2){brand=segments[index-2].replace(/-/g,' ');const slug=segments[index-1];const prefix=segments[index-2]+'-';name=(slug.startsWith(prefix)?slug.slice(prefix.length):slug).replace(/-/g,' ');}
  }else{
    const productIndex=segments.indexOf('product');
    let slug=productIndex>=0?segments[productIndex+1]||'':segments.at(-1)||'';
    if(shop?.name==='Mango')slug=[...segments].reverse().find(s=>s.includes('-'))||'';
    slug=slug.replace(/\.(html?|aspx)$/i,'').replace(/-(?:p\d{6,}|l\d{6,}|[a-z0-9]{8,}-[a-z0-9]{3})$/i,'');
    if(slug.includes('-')&&!/^\d+$/.test(slug)&&!/^(?:productpage\.|[a-z]+\d)/i.test(slug))name=slug.replace(/-/g,' ');
  }
  name=name?name[0].toLocaleUpperCase('fr')+name.slice(1):'';
  if(brand&&!/^\d+$/.test(brand))brand=brand.split(' ').map(w=>w[0]?.toUpperCase()+w.slice(1)).join(' ');
  return {url:valid,name,brand,supplier,description:'',price:null,currency:'',images:[],source:'url',notice:'Propositions déduites du lien : nom et marque à vérifier. Aucun prix ni photo récupéré.'};
}
function productAssignedJSON(html, marker){
  const start=html.indexOf(marker);if(start<0)return null;
  const eq=html.indexOf('=',start+marker.length);if(eq<0||eq-start>marker.length+10)return null;
  let first=eq+1;while(/\s/.test(html[first]||'')&&first<html.length)first++;
  if(html[first]!=='{')return null;
  let depth=0,quoted=false,escaped=false;
  for(let i=first;i<html.length;i++){
    const c=html[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
    if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){try{return JSON.parse(html.slice(first,i+1));}catch{return null;}}
  }return null;
}
function productSchemaType(node,type){return [node?.['@type']].flat().some(value=>typeof value==='string'&&value.split(/[\/#]/).at(-1)===type);}
function productURLKey(value,base){try{const u=new URL(value,base);return u.origin+u.pathname.replace(/\/$/,'');}catch{return '';}}
function productOffer(offers,url){
  const all=[offers].flat().filter(Boolean).flatMap(o=>productSchemaType(o,'AggregateOffer')?[o.offers].flat().filter(Boolean):[o]);
  const exact=all.find(o=>{try{return o.url&&new URL(o.url,url).href===url;}catch{return false;}});if(exact)return exact;
  const unique=new Set(all.map(o=>String(o.price??o.priceSpecification?.price)+':'+String(o.priceCurrency??o.priceSpecification?.priceCurrency)));
  return unique.size===1?all[0]:undefined;
}
function parseProductHTML(html,url) {
  const result=productFromURL(url),meta={};
  for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const attrs={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[m[1].toLowerCase()]=m[2]??m[3]??m[4];const key=attrs.property||attrs.name;if(key&&attrs.content)meta[key.toLowerCase()]=productText(attrs.content);}
  const products=[];
  function collect(node,depth=0){if(!node||depth>12)return;if(Array.isArray(node)){node.forEach(x=>collect(x,depth+1));return;}if(typeof node!=='object')return;if(productSchemaType(node,'Product')||productSchemaType(node,'ProductGroup'))products.push(node);if(node['@graph'])collect(node['@graph'],depth+1);if(node.mainEntity)collect(node.mainEntity,depth+1);}
  for(const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi))if(/type\s*=\s*["']application\/ld\+json["']/i.test(script[1])){try{collect(JSON.parse(script[2].trim().replace(/^<!\[CDATA\[/,'').replace(/\]\]>$/,'')));}catch{}}
  const key=productURLKey(url,url);
  // A group carries the brand/gallery; price must belong to the requested variant.
  let product=products.find(p=>productURLKey(p.url||p['@id'],url)===key)|| (products.length===1?products[0]:undefined);
  let ambiguousPrice=false;
  if(productSchemaType(product,'ProductGroup')){
    const variants=[product.hasVariant].flat().filter(v=>v&&typeof v==='object'&&productURLKey(v.url||v['@id'],url)===key);
    const requested=new URL(url).searchParams.get('size');
    const variant=requested?variants.find(v=>String(v.size)===requested):variants.find(v=>/\/InStock$/.test(v.offers?.availability||''))||variants[0];
    const prices=new Set(variants.map(v=>JSON.stringify([v.offers?.price,v.offers?.priceCurrency])));
    ambiguousPrice=requested?!variant:prices.size>1;
    product={...product,...variant,brand:variant?.brand||product.brand,image:variant?.image||product.image,offers:requested?variant?.offers:prices.size===1?variant?.offers:product.offers};
  }
  const offer=productOffer(product?.offers,url);
  const title=productText(meta['og:title']||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
  if(/^(access denied|just a moment|robot|security check|vercel security|page not found|404|page introuvable|enable javascript|attention required)/i.test(title))return {...result,reason:'blocked',notice:'La boutique bloque la lecture automatique. Les propositions viennent seulement du lien. Ajoutez une capture pour compléter.'};
  // ASOS publie un tableau de prix incluant des recommandations : retenir seulement l’id de la fiche.
  if(new URL(result.url).hostname.replace(/^www\./,'')==='asos.com'){
    const id=Number(new URL(result.url).pathname.match(/\/prd\/(\d+)/)?.[1]);
    const stock=html.match(/stockPriceResponse\s*=\s*'([^']+)'/);
    if(stock){try{const row=JSON.parse(stock[1]).find(x=>x.productId===id);const amount=row?.productPrice?.current?.value;if(typeof amount==='number'&&amount>=0&&Number.isFinite(amount)){result.price=amount;result.currency=String(row.productPrice.currency||'');}}catch{}}
  }
  if(!product&&/\/(?:c|collection|collections|catalogue-par-produit)\/|-[ln]\d+\.html(?:$|\?)/i.test(url))return {...result,reason:'not-product',name:'',notice:'Ce lien semble ouvrir une collection, pas une fiche produit. Ouvrez un article précis et copiez son lien.'};
  const cleanName=productText(product?.name||meta['og:title']||'').replace(/\s*(?:[|–]\s*(?:ASOS|UNIQLO.*|ZARA.*|Maje.*)|-\s*ZALANDO\.[A-Z]+)\s*$/i,'');
  if(cleanName)result.name=cleanName;
  const brand=productText(typeof product?.brand==='string'?product.brand:product?.brand?.name);if(brand)result.brand=brand;
  result.description=productText(product?.description||meta['og:description']||meta.description||'');
  const price=String(offer?.price??offer?.priceSpecification?.price??(ambiguousPrice?'':meta['product:price:amount']??meta['og:price:amount'])??'').replace(',','.');
  if(/^\d+(\.\d{1,2})?$/.test(price)&&Number.isFinite(Number(price))){result.price=Number(price);result.currency=String(offer?.priceCurrency||offer?.priceSpecification?.priceCurrency||meta['product:price:currency']||meta['og:price:currency']||'').toUpperCase();}
  let gallery=[];
  if(new URL(result.url).hostname.replace(/^www\./,'')==='asos.com'){
    // JSON publié par ASOS pour ce produit : aucune exécution du script de la boutique.
    const match=html.match(/window\.asos\.pdp\.config\.product\s*=\s*(\{"productCode"[^\n]+?\})\s*;/);
    if(match){try{const detail=JSON.parse(match[1]);const id=Number(new URL(result.url).pathname.match(/\/prd\/(\d+)/)?.[1]);const colour=Number(new URL(result.url).hash.match(/colourWayId-(\d+)/)?.[1]);if(detail.id===id)gallery=(detail.images||[]).filter(image=>image.productId===id&&image.isVisible!==false&&(!colour||!image.colourWayId||image.colourWayId===colour)&&/^https:\/\/images\.asos-media\.com\/products\//.test(image.url)).map(image=>image.url);}catch{}}
  }
  if(productShop(url)?.name==='Uniqlo'){
    const state=productAssignedJSON(html,'window.__PRELOADED_STATE__');
    const id=new URL(url).pathname.match(/\/products\/(E\d+-\d+)/)?.[1];
    const detail=Object.values(state?.entity?.pdpEntity||{}).map(x=>x.product).find(p=>p?.productId===id);
    if(detail){
      const requested=new URL(url).searchParams.get('colorDisplayCode');
      const colour=requested||detail.representative?.color?.displayCode;
      const main=detail.images?.main?.[colour];
      gallery=[main?.image,...(main?.model||[]).map(x=>typeof x==='string'?x:x.image||x.imageUrl)].filter(Boolean);
      if(requested&&!main)gallery=[];
      result.name=productText(detail.name)||result.name;result.brand='Uniqlo';
      result.description=productText([detail.shortDescription,detail.longDescription,detail.composition].filter(Boolean).join(' '));
      const current=detail.prices?.promo||detail.prices?.base;
      if(typeof current?.value==='number'&&Number.isFinite(current.value)&&current.value>=0){result.price=current.value;result.currency=String(current.currency?.code||'');}
      // The OG image may show the default colour instead of the one in the link.
      if(gallery.length||requested)delete meta['og:image'];
      product=detail;
    }
  }
  if(productShop(url)?.ownBrand)result.brand=productShop(url).name;
  const rawImages=[...gallery,...([product?.image].flat().filter(Boolean)),meta['og:image']].flat();
  const imageKeys=new Set();
  for(const item of rawImages){let image=typeof item==='string'?item:item?.url||item?.contentUrl;if(!image)continue;try{image=new URL(image,result.url).href;}catch{continue;}image=productPublicURL(image);if(image){const asset=new URL(image);let key=image;if(asset.hostname==='img01.ztat.net'){asset.searchParams.delete('imwidth');key=asset.href;}else if(/\.maje\.com$/.test(asset.hostname))key=asset.pathname.replace(/^.*?\/on\//,'/on/');if(!imageKeys.has(key)){imageKeys.add(key);result.images.push(image);}}if(result.images.length>=8)break;}
  if(product||cleanName||result.images.length){result.source=product?'product-data':'page';result.notice='Informations publiées par la boutique. Vérifiez la variante, le prix et le fournisseur avant enregistrement.';}
  if(result.source==='url')result.reason='no-product-data';
  else if(!result.name||!result.images.length||result.price===null){result.reason='partial';result.notice='Lecture partielle : certaines informations ne sont pas publiées ou accessibles. Complétez les champs manquants et vérifiez la variante.';}
  return result;
}
if(typeof module!=='undefined')module.exports={PRODUCT_SHOPS,productShop,productPublicURL,productText,productFromURL,parseProductHTML};
