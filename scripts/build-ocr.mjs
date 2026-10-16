import {mkdir,copyFile,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const target=new URL('../public/vendor/ocr/',import.meta.url);await mkdir(target,{recursive:true});await mkdir(new URL('lang/',target),{recursive:true});
const files=[['tesseract.js/dist/tesseract.min.js','tesseract.min.js'],['tesseract.js/dist/worker.min.js','worker.min.js'],['tesseract.js/LICENSE.md','TESSERACT-LICENSE.md'],['tesseract.js-core/LICENSE','CORE-LICENSE.txt'],...['','simd-','relaxedsimd-'].map(prefix=>['tesseract.js-core/tesseract-core-'+prefix+'lstm.wasm.js','tesseract-core-'+prefix+'lstm.wasm.js']),...['fra','eng'].map(lang=>['@tesseract.js-data/'+lang+'/4.0.0_best_int/'+lang+'.traineddata.gz','lang/'+lang+'.traineddata.gz'])];
const manifest={engine:'tesseract.js 7.0.0',core:'tesseract.js-core 7.0.0',languages:'@tesseract.js-data/fra, eng 1.0.0 (package license MIT)',files:[]};
for(const [src,dest]of files){const source=new URL('../node_modules/'+src,import.meta.url);await copyFile(source,new URL(dest,target));manifest.files.push({name:dest,sha256:createHash('sha256').update(await readFile(source)).digest('hex')});}
await writeFile(new URL('manifest.json',target),JSON.stringify(manifest,null,2)+'\n');console.log('OCR : moteur, trois variantes LSTM et modèles français/anglais copiés, sans CDN.');
