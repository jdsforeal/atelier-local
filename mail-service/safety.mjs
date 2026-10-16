/** Le pilote ne peut envoyer qu’aux adresses explicitement autorisées côté serveur. */
export function mailRecipientGuard(mode='sandbox',addresses=''){
 if(!['sandbox','live'].includes(mode))throw Error('Mode Gmail inconnu.');
 const allowed=new Set(addresses.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean));
 return recipient=>{
  if(typeof recipient!=='string'||/[\r\n,;]/.test(recipient))throw Error('Destinataire non autorisé.');
  if(mode==='sandbox'&&!allowed.has(recipient.toLowerCase()))throw Error('Mode test Gmail : destinataire absent de la liste autorisée. Aucun envoi.');
 };
}
export function guardMailTransport(api,assertRecipient){
 return {...api,send:async body=>{
  const mime=Buffer.from(body.raw,'base64url').toString('utf8');
  const headers=mime.split('\r\n\r\n')[0];
  const recipients=headers.split('\r\n').filter(x=>/^To:/i.test(x));
  if(recipients.length!==1||/^(Cc|Bcc):/mi.test(headers))throw Error('En-têtes destinataire refusés.');
  assertRecipient(recipients[0].slice(3).trim());
  return api.send(body);
 }};
}
