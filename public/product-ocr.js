/** OCR à la demande, entièrement sur l’appareil ; moteur et langues hébergés par Atelier. */
let atelierOCRScript;
function loadAtelierOCR(){
 if(window.Tesseract)return Promise.resolve(window.Tesseract);
 if(!atelierOCRScript)atelierOCRScript=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('vendor/ocr/tesseract.min.js',document.baseURI).href;script.onload=()=>resolve(window.Tesseract);script.onerror=()=>{atelierOCRScript=null;script.remove();reject(Error('Le moteur de lecture ne se charge pas. Vérifiez la connexion au site Atelier.'));};document.head.append(script);});
 return atelierOCRScript;
}
function ocrDeadline(promise,ms){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Lecture trop longue. Essayez une capture plus petite ou complétez la fiche manuellement.')),ms);})]).finally(()=>clearTimeout(timer));}
async function createAtelierOCR(onProgress){
 const engine=await loadAtelierOCR();const root=new URL('vendor/ocr/',document.baseURI).href;
 const pending=engine.createWorker(['fra','eng'],1,{workerPath:root+'worker.min.js',corePath:root,langPath:root+'lang',workerBlobURL:false,legacyCore:false,legacyLang:false,logger:message=>onProgress?.(message)});
 let worker;try{worker=await ocrDeadline(pending,90000);}catch(error){void pending.then(late=>late.terminate()).catch(()=>{});throw error;}
 await worker.setParameters({preserve_interword_spaces:'1'});
 return worker;
}
async function readAtelierCapture(worker,file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choisissez une image PNG, JPEG ou WebP de moins de 10 Mo.');
 const bitmap=await createImageBitmap(file);const ratio=Math.min(1,3200/Math.max(bitmap.width,bitmap.height),Math.sqrt(8000000/(bitmap.width*bitmap.height)));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 try{const result=await ocrDeadline(worker.recognize(canvas,{}, {text:true}),60000);return {text:result.data.text||'',confidence:result.data.confidence||0};}
 finally{canvas.width=1;canvas.height=1;}
}
