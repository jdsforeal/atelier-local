/** Cadre normalisé : mêmes gestes à la souris, au doigt et au clavier. */
function adjustCropBox(start, mode, dx, dy, minimum = 0.04) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  if (mode === 'move') return {...start, x:clamp(start.x+dx,0,1-start.w), y:clamp(start.y+dy,0,1-start.h)};
  let left=start.x, top=start.y, right=start.x+start.w, bottom=start.y+start.h;
  if(mode.includes('w')) left=clamp(left+dx,0,right-minimum);
  if(mode.includes('e')) right=clamp(right+dx,left+minimum,1);
  if(mode.includes('n')) top=clamp(top+dy,0,bottom-minimum);
  if(mode.includes('s')) bottom=clamp(bottom+dy,top+minimum,1);
  return {x:left,y:top,w:right-left,h:bottom-top};
}
function bindCropEditor(stage, record, onChange) {
  const selection=stage.querySelector('.crop-selection');
  let drag=null;
  const redraw=()=>{
    const b=record.useCrop?record.crop:{x:0,y:0,w:1,h:1};
    Object.assign(selection.style,{left:b.x*100+'%',top:b.y*100+'%',width:b.w*100+'%',height:b.h*100+'%'});
    selection.setAttribute('aria-label','Déplacer le cadre. Utilisez les flèches du clavier.');
  };
  const update=(box)=>{record.crop=box;record.useCrop=true;redraw();onChange();};
  stage.addEventListener('pointerdown',event=>{
    if(event.button!==0||drag)return;
    event.preventDefault();
    const bounds=stage.getBoundingClientRect();
    const point={x:Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width)),y:Math.max(0,Math.min(1,(event.clientY-bounds.top)/bounds.height))};
    const target=event.target.closest('[data-crop-handle],.crop-selection');
    const mode=target?.dataset.cropHandle||(target?'move':'draw');
    drag={pointer:event.pointerId,mode,bounds,point,start:{...(record.useCrop?record.crop:{x:0,y:0,w:1,h:1})}};
    stage.setPointerCapture(event.pointerId);
    if(target)target.focus({preventScroll:true});
  });
  stage.addEventListener('pointermove',event=>{
    if(!drag||drag.pointer!==event.pointerId)return;
    const dx=(event.clientX-drag.bounds.left)/drag.bounds.width-drag.point.x;
    const dy=(event.clientY-drag.bounds.top)/drag.bounds.height-drag.point.y;
    if(drag.mode==='draw'){
      const x=Math.max(0,Math.min(1,drag.point.x+dx)),y=Math.max(0,Math.min(1,drag.point.y+dy));
      const left=Math.min(x,drag.point.x),top=Math.min(y,drag.point.y);
      if(Math.abs(x-drag.point.x)>=0.04&&Math.abs(y-drag.point.y)>=0.04)update({x:left,y:top,w:Math.abs(x-drag.point.x),h:Math.abs(y-drag.point.y)});
    }else update(adjustCropBox(drag.start,drag.mode,dx,dy));
  });
  const stop=event=>{if(drag?.pointer===event.pointerId){drag=null;if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);}};
  stage.addEventListener('pointerup',stop);stage.addEventListener('pointercancel',stop);stage.addEventListener('lostpointercapture',()=>{drag=null;});
  stage.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    const target=event.target.closest('[data-crop-handle],.crop-selection');if(!target)return;
    event.preventDefault();const step=event.shiftKey?0.05:0.01;
    update(adjustCropBox(record.useCrop?record.crop:{x:0,y:0,w:1,h:1},target.dataset.cropHandle||'move',event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0));
  });
  redraw();return redraw;
}
if(typeof module!=='undefined')module.exports={adjustCropBox};
