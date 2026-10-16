/** Import explicite du fichier OAuth téléchargé par le propriétaire. Aucun secret affiché. */
import {readFileSync,writeFileSync,statSync} from 'node:fs';
const [source,destination]=process.argv.slice(2);if(!source||!destination)throw Error('Indiquez le fichier OAuth téléchargé et le fichier privé Gmail.');
if(statSync(source).size>100000)throw Error('Fichier OAuth trop volumineux.');
const client=JSON.parse(readFileSync(source,'utf8')).web;
if(!client?.client_id||!client.client_secret||!client.redirect_uris?.includes('http://127.0.0.1:8787/oauth/callback'))throw Error('Client Web avec la redirection locale exacte requis.');
for(const value of [client.client_id,client.client_secret])if(/[\r\n]/.test(value))throw Error('Format OAuth invalide.');
let env=readFileSync(destination,'utf8');for(const [key,value] of [['GOOGLE_CLIENT_ID',client.client_id],['GOOGLE_CLIENT_SECRET',client.client_secret]])env=env.replace(new RegExp('^'+key+'=.*$','m'),()=>key+'='+value);
writeFileSync(destination,env,{mode:0o600});console.log('Client OAuth importé dans la configuration privée. Aucune valeur affichée.');
