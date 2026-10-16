/** Vérifie uniquement la présence des paramètres ; n’affiche jamais les valeurs. */
import {readFileSync} from 'node:fs';
const file=process.argv[2];if(!file)throw Error('Indiquez le fichier privé de configuration.');
const env=Object.fromEntries(readFileSync(file,'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)]}));
const missing=['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','MAIL_ENCRYPTION_KEY','MAIL_TEST_ACCOUNTS','MAIL_TEST_RECIPIENTS'].filter(k=>!env[k]?.trim());
console.log(missing.length?'À compléter : '+missing.join(', '):'Configuration complète. Prête pour le pilote local.');
if(env.MAIL_MODE!=='sandbox'||env.MAIL_PUBLIC_URL!=='http://127.0.0.1:8787'||env.MAIL_BIND_HOST!=='127.0.0.1')throw Error('Le pilote doit rester local et en mode sandbox.');
