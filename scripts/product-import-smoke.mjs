/** Contrôle réseau manuel : les prix et protections des boutiques peuvent changer. */
import {readFile,writeFile} from 'node:fs/promises';
import {fetchProduct} from '../product-import/fetch-product.mjs';
const links=JSON.parse(await readFile(new URL('../tests/fixtures/product-import/'+(process.argv.includes('--user-links')?'user-links.json':'live-links.json'),import.meta.url),'utf8'));
const results=await Promise.all(links.map(async([shop,url])=>{
 const responses=[];const started=Date.now();
 const data=await fetchProduct(url,async(target,options)=>{const response=await fetch(target,options);responses.push(response.status);return response;});
 return {shop,url,http:responses,source:data.source,reason:data.reason||'read',name:data.name,brand:data.brand,supplier:data.supplier,price:data.price,currency:data.currency,photos:data.images.length,milliseconds:Date.now()-started};
}));
const report={checkedAt:new Date().toISOString(),environment:'Lecteur HTTP Node local ; résultat cloud non garanti identique',results};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(report,null,2)+'\n');
for(const row of results)console.log(`${row.shop}: ${row.source}, ${row.reason}, HTTP ${row.http.join(' → ')}, ${row.price??'—'} ${row.currency}, ${row.photos} photos`);
