/** Classification prudente : un prêt n'entre jamais automatiquement dans le stock personnel. */
function studioSection(
  piece,
  project,
  section,
  today = new Date().toISOString().slice(0, 10),
) {
  const temporary = ["Prêt", "Location"].includes(piece.mode);
  const returned = piece.status === "Retourné";
  const held =
    ["Reçu", "Porté", "Retour en cours"].includes(piece.status) ||
    Boolean(piece.received);
  if (section === "Stock du studio")
    return !temporary && (piece.stockOwned || piece.status === "Conservé");
  if (section === "Prêts & locations") return temporary && held && !returned;
  if (section === "À retourner")
    return (
      temporary &&
      held &&
      !returned &&
      (piece.status === "Retour en cours" ||
        project?.status === "Retours" ||
        Boolean(piece.returnDue && piece.returnDue <= today))
    );
  if (section === "Restituées") return temporary && returned;
  return true;
}
function quickPieceAction(
  piece,
  action,
  today = new Date().toISOString().slice(0, 10),
) {
  if (
    ["dispatch", "returned", "reopen"].includes(action) &&
    !["Prêt", "Location"].includes(piece.mode)
  )
    throw Error(
      "Les actions de restitution concernent uniquement les prêts et locations.",
    );
  if (action === "receive") {
    piece.status = "Reçu";
    piece.received ||= today;
  }
  if (action === "prepare") {
    piece.returnStage = "À préparer";
    piece.status = "Reçu";
  }
  if (action === "dispatch") {
    piece.returnStage = "Expédiée / déposée";
    piece.status = "Retour en cours";
    piece.dispatched = today;
  }
  if (action === "returned") {
    piece.status = "Retourné";
    piece.returnStage = "Réception confirmée";
    piece.returned = today;
  }
  if (action === "reopen") {
    piece.status = "Reçu";
    piece.returnStage = "À préparer";
    delete piece.returned;
    delete piece.dispatched;
  }
  if (action === "stock") {
    if (["Prêt", "Location"].includes(piece.mode))
      throw Error(
        "Une pièce prêtée ou louée ne peut pas entrer dans votre stock sans transfert de propriété.",
      );
    piece.stockOwned = true;
    piece.status = "Conservé";
  }
}
/** Proposition locale : retire les larges marges uniformes et cherche l'objet central sur fond clair. */
function suggestProductCrop(pixels, width, height) {
  const full = {x:0,y:0,w:1,h:1,confident:false,reason:'Aucun produit isolé avec suffisamment de certitude.'};
  if(width<8||height<8||pixels.length<width*height*4)return full;
  // Grandes plages neutres : fond de photo, sans hypothèse sur le site ou sa mise en page.
  const count=width*height, visited=new Uint8Array(count), queue=new Int32Array(count);
  const neutral=index=>{const i=index*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];return pixels[i+3]>128&&Math.max(r,g,b)-Math.min(r,g,b)<18&&r>=205&&r<250?Math.floor(r/8):-1;};
  let photo=null;
  for(let seed=0;seed<count;seed++){
    if(visited[seed])continue;visited[seed]=1;const color=neutral(seed);if(color<0)continue;
    let head=0,tail=1,left=width,top=height,right=0,bottom=0;queue[0]=seed;
    while(head<tail){const n=queue[head++],x=n%width,y=Math.floor(n/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      for(const next of [x>0?n-1:-1,x<width-1?n+1:-1,y>0?n-width:-1,y<height-1?n+width:-1])if(next>=0&&!visited[next]&&neutral(next)===color){visited[next]=1;queue[tail++]=next;}
    }
    const w=right-left+1,h=bottom-top+1,area=w*h;
    if(w>=width*.16&&w<width*.85&&h>=height*.18&&w/h>.25&&w/h<3.8&&area>count*.045&&tail/area>.55&&(!photo||tail>photo.size))photo={left,top,right,bottom,size:tail,background:pixels[seed*4]};
  }
  // À l’intérieur de la photo : composantes connexes, pour ignorer le texte et les miniatures.
  const bounds=photo||{left:0,top:0,right:width-1,bottom:height-1,background:255};
  const isSubject=index=>{const x=index%width,y=Math.floor(index/width),i=index*4;if(x<bounds.left||x>bounds.right||y<bounds.top||y>bounds.bottom||pixels[i+3]<128)return false;return Math.min(pixels[i],pixels[i+1],pixels[i+2])<bounds.background-32;};
  visited.fill(0);let best=null;
  for(let y=bounds.top;y<=bounds.bottom;y++)for(let x=bounds.left;x<=bounds.right;x++){
    const seed=y*width+x;if(visited[seed])continue;visited[seed]=1;if(!isSubject(seed))continue;
    let head=0,tail=1,left=width,top=height,right=0,bottom=0;queue[0]=seed;
    while(head<tail){const n=queue[head++],cx=n%width,cy=Math.floor(n/width);left=Math.min(left,cx);right=Math.max(right,cx);top=Math.min(top,cy);bottom=Math.max(bottom,cy);
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const nx=cx+ox,ny=cy+oy;if(nx<bounds.left||nx>bounds.right||ny<bounds.top||ny>bounds.bottom)continue;const next=ny*width+nx;if(!visited[next]&&isSubject(next)){visited[next]=1;queue[tail++]=next;}}
    }
    const w=right-left+1,h=bottom-top+1,fill=tail/(w*h);
    // Les barres de navigation et grands aplats ne sont pas des produits.
    if(w<width*.065||h<height*.04||w>width*.86||h>height*.94||w/h>5||w/h<.12||fill<.12||tail<count*.0025)continue;
    const score=tail*Math.sqrt(fill);
    if(!best||score>best.score)best={left,top,right,bottom,score,fill};
  }
  if(!best)return full;
  // Un objet coupé par les limites ne doit pas être serré davantage.
  if(best.left<=bounds.left+1||best.top<=bounds.top+1||best.right>=bounds.right-1||best.bottom>=bounds.bottom-1)return full;
  const padX=Math.max(2,Math.round((best.right-best.left)*.065)),padY=Math.max(2,Math.round((best.bottom-best.top)*.065));
  const left=Math.max(bounds.left,best.left-padX),top=Math.max(bounds.top,best.top-padY),right=Math.min(bounds.right+1,best.right+padX+1),bottom=Math.min(bounds.bottom+1,best.bottom+padY+1);
  return {x:left/width,y:top/height,w:(right-left)/width,h:(bottom-top)/height,confident:false,method:photo?'photo-subject':'subject',reason:photo?'Photo principale et sujet contrasté repérés. Vérifiez que le produit est entier.':'Sujet contrasté repéré. Vérifiez la proposition.'};
}
if (typeof module !== "undefined")
  module.exports = { studioSection, quickPieceAction, suggestProductCrop };
