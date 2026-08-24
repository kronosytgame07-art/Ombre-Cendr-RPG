// Générateur de pixel-art procédural : chaque silhouette est dessinée une seule fois
// sur un petit canvas (grille de "gros pixels"), puis mise à l'échelle sans lissage
// (image-rendering: pixelated) pour un rendu HD "pixel-art" net et détaillé.

const cache = new Map();

export function newCanvas(w, h){
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return {canvas:c, ctx};
}

function hashStr(s){
  let h = 2166136261;
  for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h>>>0);
}
function seededRand(seed){
  let s = seed >>> 0;
  return ()=>{ s ^= s<<13; s ^= s>>>17; s ^= s<<5; s>>>=0; return (s%1000)/1000; };
}

// petit rectangle "pixel" à coordonnées entières
function px(ctx,x,y,w,h,color){
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function circle(ctx,cx,cy,r,color){
  ctx.fillStyle=color;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
}

export function shade(hex, amt){
  const n = parseInt(hex.slice(1),16);
  let r=(n>>16)+amt, g=((n>>8)&0xff)+amt, b=(n&0xff)+amt;
  r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b));
  return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

// ============ HUMANOÏDE (héros / cultistes / mort-vivants / gardiens) ============
// `pose` permet l'animation procédurale en temps réel (pas de sprite-sheet) :
//   pose.walk   : -1..1, phase de marche (cycle de jambes/bras/tête)
//   pose.action : {kind:'swing'|'cast', phase:0..1} pour une attaque ou un sort en cours
// `shield`/`helmet` reflètent l'équipement réel du joueur (modulable).
function easeOutQuad(t){ return 1-(1-t)*(1-t); }

export function drawHumanoid(opts){
  const {
    w=44, h=56, skin='#d8b48a', cloth='#3a3230', accent='#8a1f1f', trim='#d8b45a',
    weapon='epee', hood=false, cloak=false, armor='leger', undead=false, robed=false,
    outline='#0c0a09', hair='#2b1c14', shield=false, helmet=false, pose=null
  } = opts;
  const walk = pose && pose.walk || 0;
  const action = pose && pose.action || null;
  const {canvas, ctx} = newCanvas(w,h);
  const cx = w/2;
  const skinC = undead ? shade(skin,-60) : skin;
  const clothD = shade(cloth,-30), clothL = shade(cloth,18);

  ctx.save();
  // ombre au sol
  ctx.fillStyle='rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(cx, h-4, w*0.28, h*0.07, 0,0,Math.PI*2); ctx.fill();

  const legY = h*0.62;
  const legSwing = walk*h*0.075;
  // jambes (alternées pendant la marche)
  px(ctx, cx-w*0.16, legY+legSwing, w*0.12, h*0.30, clothD);
  px(ctx, cx+w*0.04, legY-legSwing, w*0.12, h*0.30, clothD);
  px(ctx, cx-w*0.16, h*0.90+legSwing, w*0.12, h*0.08, outline);
  px(ctx, cx+w*0.04, h*0.90-legSwing, w*0.12, h*0.08, outline);

  // cape
  if(cloak){
    ctx.fillStyle = shade(accent,-20);
    ctx.beginPath();
    ctx.moveTo(cx-w*0.02, h*0.28);
    ctx.lineTo(cx-w*0.34, h*0.86);
    ctx.lineTo(cx+w*0.30, h*0.86);
    ctx.lineTo(cx+w*0.10, h*0.28);
    ctx.closePath(); ctx.fill();
  }

  // torse
  const torsoTop = h*0.30;
  px(ctx, cx-w*0.20, torsoTop, w*0.40, h*0.34, robed? shade(accent,-10) : cloth);
  px(ctx, cx-w*0.20, torsoTop+h*0.05, w*0.40, h*0.05, clothL); // bandoulière claire
  if(armor==='lourd'){
    px(ctx, cx-w*0.22, torsoTop-h*0.02, w*0.44, h*0.10, shade(trim,-10));
    px(ctx, cx-w*0.02, torsoTop+h*0.02, w*0.04, h*0.28, trim);
  }
  px(ctx, cx-w*0.20, torsoTop+h*0.24, w*0.40, h*0.06, accent); // ceinture

  const armY = torsoTop+h*0.02;
  const armLen = h*0.24, armW = w*0.12;

  // bras gauche (bouclier ou contrepoids) — pivote au repos/marche, et pendant un sort
  let leftAngle = -0.16 - walk*0.32;
  if(action && action.kind==='cast') leftAngle = lerp(leftAngle, -1.2, easeOutQuad(action.phase));
  drawArm(ctx, cx-w*0.26, armY, armLen, armW, leftAngle, cloth, skinC, shield ? drawShieldAt : null);

  // bras droit (arme) — angle de repos, marche, coup ou sort
  let rightAngle = 0.18 + walk*0.32;
  if(action && action.kind==='swing') rightAngle = lerp(-1.35, 1.55, easeOutQuad(action.phase));
  else if(action && action.kind==='cast') rightAngle = lerp(rightAngle, -1.4, easeOutQuad(action.phase));
  drawArm(ctx, cx+w*0.26, armY, armLen, armW, rightAngle, cloth, skinC, drawWeaponAt);

  // tête (légère oscillation avec la marche)
  const headBob = Math.abs(walk)*h*0.022;
  const headY = h*0.08+headBob, headR = w*0.18;
  circle(ctx, cx, headY+headR, headR, skinC);
  if(helmet){
    const steel = '#8b93a0', steelD = '#565d68';
    ctx.fillStyle = steel;
    ctx.beginPath(); ctx.arc(cx, headY+headR*0.75, headR*0.98, Math.PI, 0); ctx.fill();
    px(ctx, cx-headR*0.98, headY+headR*0.62, headR*1.96, headR*0.32, steelD);
    px(ctx, cx-headR*0.12, headY+headR*1.0, headR*0.24, headR*0.5, steelD);
  } else if(!hood){
    // cheveux / crâne
    ctx.fillStyle = undead ? '#5a5048' : hair;
    ctx.beginPath(); ctx.ellipse(cx, headY+headR*0.7, headR*0.95, headR*0.65, 0, Math.PI, 0); ctx.fill();
  } else {
    ctx.fillStyle = shade(accent,-25);
    ctx.beginPath(); ctx.ellipse(cx, headY+headR*0.5, headR*1.15, headR*1.05, 0, Math.PI*1.05, -0.05*Math.PI); ctx.fill();
    px(ctx, cx-headR*0.9, headY+headR*0.3, headR*1.8, headR*1.5, shade(accent,-25));
    circle(ctx, cx, headY+headR, headR*0.85, '#0b0908');
  }
  // yeux
  if(!helmet){
    ctx.fillStyle = undead ? '#8fe0ff' : '#141010';
    px(ctx, cx-headR*0.5, headY+headR*0.9, headR*0.28, headR*0.16, ctx.fillStyle);
    px(ctx, cx+headR*0.2, headY+headR*0.9, headR*0.28, headR*0.16, ctx.fillStyle);
  } else {
    ctx.fillStyle = '#8fe0ff';
    px(ctx, cx-headR*0.45, headY+headR*0.85, headR*0.9, headR*0.18, ctx.fillStyle);
  }

  ctx.restore();
  return canvas;

  // --- arme/bouclier attachés à la main, dessinés dans le même repère pivoté
  // que le bras : même point d'ancrage et même échelle quel que soit l'objet
  // équipé, pour qu'il se cale toujours pareil dans la main. ---
  function drawArm(c, px0, py0, len, width, angle, sleeveColor, handColor, accessory){
    c.save();
    c.translate(px0, py0);
    c.rotate(angle);
    c.fillStyle = sleeveColor;
    c.fillRect(-width/2, 0, width, len);
    c.fillStyle = handColor;
    c.beginPath(); c.arc(0, len, width*0.55, 0, Math.PI*2); c.fill();
    if(accessory) accessory(c, 0, len, width);
    c.restore();
  }
  function drawShieldAt(c, hx, hy){
    c.fillStyle = trim; c.strokeStyle = outline; c.lineWidth=1;
    const sw = w*0.20, sh = h*0.30;
    c.beginPath();
    c.moveTo(hx-sw*0.5, hy-sh*0.38);
    c.lineTo(hx+sw*0.5, hy-sh*0.38);
    c.lineTo(hx+sw*0.5, hy+sh*0.18);
    c.lineTo(hx, hy+sh*0.5);
    c.lineTo(hx-sw*0.5, hy+sh*0.18);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = shade(trim,-25);
    c.fillRect(hx-1.5, hy-sh*0.28, 3, sh*0.6);
  }
  function drawWeaponAt(c, hx, hy, aw){
    c.strokeStyle = outline; c.lineWidth=1;
    switch(weapon){
      case 'epee':
        px(c, hx-1, hy-h*0.32, 3, h*0.34, '#cfd6dc');
        px(c, hx-4, hy-h*0.04, 9, 3, trim);
        break;
      case 'hache':
        px(c, hx-1, hy-h*0.30, 3, h*0.32, '#7a5230');
        c.fillStyle='#cfd6dc';
        c.beginPath(); c.moveTo(hx+1,hy-h*0.30); c.lineTo(hx+w*0.18,hy-h*0.22); c.lineTo(hx+1,hy-h*0.14); c.closePath(); c.fill();
        break;
      case 'dague':
        px(c, hx-1, hy-h*0.16, 2, h*0.18, '#cfd6dc');
        break;
      case 'arc':
        c.strokeStyle = '#7a5230'; c.lineWidth=2;
        c.beginPath(); c.arc(hx+3, hy-h*0.12, h*0.20, Math.PI*0.6, Math.PI*1.4); c.stroke();
        break;
      case 'baton':
        px(c, hx, hy-h*0.36, 2, h*0.40, '#5a3d22');
        circle(c, hx+1, hy-h*0.36, 4, accent);
        break;
      case 'sceptre':
        px(c, hx, hy-h*0.30, 2, h*0.32, '#8a6d3a');
        circle(c, hx+1, hy-h*0.32, 3.5, trim);
        break;
      default: break;
    }
  }
}
function lerp(a,b,t){ return a+(b-a)*t; }

// ============ CREATURES (bêtes, morts-vivants, monstres) ============
export function drawCreature(opts){
  const {shape='hound', w=48, h=40, main='#5a4a42', accent='#c23b3b', eye='#ffcf5a', outline='#0c0a09'} = opts;
  const {canvas, ctx} = newCanvas(w,h);
  const cx=w/2, cy=h/2;
  ctx.fillStyle='rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(cx, h-4, w*0.30, h*0.08,0,0,Math.PI*2); ctx.fill();

  const mainD = shade(main,-35), mainL = shade(main,20);

  switch(shape){
    case 'hound': {
      px(ctx, cx-w*0.30, cy+h*0.05, w*0.60, h*0.28, main); // corps
      px(ctx, cx-w*0.32, cy+h*0.28, w*0.12, h*0.18, mainD); px(ctx, cx+w*0.20, cy+h*0.28, w*0.12, h*0.18, mainD);
      px(ctx, cx+w*0.22, cy-h*0.05, w*0.20, h*0.18, main); // tête
      ctx.fillStyle=main; ctx.beginPath();
      ctx.moveTo(cx+w*0.30,cy-h*0.05); ctx.lineTo(cx+w*0.36,cy-h*0.20); ctx.lineTo(cx+w*0.40,cy-h*0.02); ctx.fill(); //oreille
      px(ctx, cx-w*0.40, cy+h*0.08, w*0.14, h*0.05, mainD); // queue
      circle(ctx, cx+w*0.40, cy+h*0.0, 2.2, eye);
      break;
    }
    case 'araignee': {
      circle(ctx, cx, cy, w*0.22, main);
      circle(ctx, cx, cy, w*0.13, mainD);
      ctx.strokeStyle=main; ctx.lineWidth=2;
      for(let i=0;i<8;i++){
        const ang = (i/8)*Math.PI*2;
        const x2 = cx+Math.cos(ang)*w*0.42, y2=cy+Math.sin(ang)*h*0.42;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x2,y2); ctx.stroke();
      }
      circle(ctx, cx-4, cy-3, 1.6, eye); circle(ctx, cx+4, cy-3, 1.6, eye);
      break;
    }
    case 'chauvesouris': {
      ctx.fillStyle = main;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx-w*0.45,cy-h*0.25); ctx.lineTo(cx-w*0.20,cy+h*0.05); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+w*0.45,cy-h*0.25); ctx.lineTo(cx+w*0.20,cy+h*0.05); ctx.closePath(); ctx.fill();
      circle(ctx, cx, cy, w*0.14, mainD);
      circle(ctx, cx-3, cy-1, 1.4, eye); circle(ctx, cx+3, cy-1, 1.4, eye);
      break;
    }
    case 'spectre': {
      ctx.globalAlpha=0.85;
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.moveTo(cx-w*0.26, cy-h*0.20);
      ctx.quadraticCurveTo(cx, cy-h*0.42, cx+w*0.26, cy-h*0.20);
      ctx.lineTo(cx+w*0.22, cy+h*0.30);
      for(let i=0;i<5;i++){
        ctx.lineTo(cx+w*0.22-(i+1)*(w*0.44/5), cy+ (i%2===0? h*0.42:h*0.28));
      }
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha=1;
      circle(ctx, cx-5, cy-h*0.10, 2, eye); circle(ctx, cx+5, cy-h*0.10, 2, eye);
      break;
    }
    case 'golem': {
      px(ctx, cx-w*0.28, cy-h*0.10, w*0.56, h*0.42, main);
      px(ctx, cx-w*0.36, cy-h*0.02, w*0.14, h*0.30, mainD);
      px(ctx, cx+w*0.22, cy-h*0.02, w*0.14, h*0.30, mainD);
      px(ctx, cx-w*0.22, cy-h*0.32, w*0.44, h*0.24, mainL);
      circle(ctx, cx-6, cy-h*0.22, 2.4, eye); circle(ctx, cx+6, cy-h*0.22, 2.4, eye);
      px(ctx, cx-w*0.20, cy+h*0.30, w*0.16, h*0.14, mainD); px(ctx, cx+w*0.06, cy+h*0.30, w*0.16, h*0.14, mainD);
      break;
    }
    case 'troll': {
      // silhouette voûtée, longs bras traînants, petite tête — bien distincte du golem cubique
      px(ctx, cx-w*0.20, cy-h*0.02, w*0.40, h*0.40, main);
      ctx.fillStyle = mainD;
      ctx.beginPath(); ctx.moveTo(cx-w*0.22,cy-h*0.10); ctx.lineTo(cx-w*0.38,cy+h*0.34); ctx.lineTo(cx-w*0.26,cy+h*0.40); ctx.lineTo(cx-w*0.14,cy-h*0.02); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx+w*0.22,cy-h*0.10); ctx.lineTo(cx+w*0.38,cy+h*0.34); ctx.lineTo(cx+w*0.26,cy+h*0.40); ctx.lineTo(cx+w*0.14,cy-h*0.02); ctx.closePath(); ctx.fill();
      circle(ctx, cx-w*0.30, cy+h*0.36, w*0.06, mainD); circle(ctx, cx+w*0.30, cy+h*0.36, w*0.06, mainD);
      circle(ctx, cx, cy-h*0.24, w*0.16, mainL);
      circle(ctx, cx-5, cy-h*0.24, 2, eye); circle(ctx, cx+5, cy-h*0.24, 2, eye);
      px(ctx, cx-w*0.16, cy+h*0.30, w*0.12, h*0.14, mainD); px(ctx, cx+w*0.04, cy+h*0.30, w*0.12, h*0.14, mainD);
      break;
    }
    case 'yeti': {
      // masse arrondie et touffue, plus large que le golem, teintes claires givrées
      ctx.fillStyle = main;
      ctx.beginPath(); ctx.ellipse(cx, cy+h*0.06, w*0.34, h*0.30, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = mainL;
      ctx.beginPath(); ctx.ellipse(cx, cy-h*0.10, w*0.24, h*0.16, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = mainD;
      circle(ctx, cx-w*0.30, cy+h*0.10, w*0.10, mainD); circle(ctx, cx+w*0.30, cy+h*0.10, w*0.10, mainD);
      px(ctx, cx-w*0.20, cy+h*0.32, w*0.14, h*0.12, mainD); px(ctx, cx+w*0.06, cy+h*0.32, w*0.14, h*0.12, mainD);
      circle(ctx, cx-6, cy-h*0.14, 2.4, eye); circle(ctx, cx+6, cy-h*0.14, 2.4, eye);
      break;
    }
    case 'larve': {
      ctx.fillStyle=main;
      ctx.beginPath(); ctx.ellipse(cx, cy+h*0.10, w*0.30, h*0.20,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=mainL;
      ctx.beginPath(); ctx.ellipse(cx-4, cy+h*0.04, w*0.10, h*0.06,0,0,Math.PI*2); ctx.fill();
      circle(ctx, cx+w*0.16, cy+h*0.06, 1.6, eye);
      break;
    }
    case 'serpent': {
      ctx.strokeStyle=main; ctx.lineWidth=w*0.16; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(cx-w*0.35,cy+h*0.2); ctx.quadraticCurveTo(cx,cy-h*0.2,cx+w*0.35,cy+h*0.1); ctx.stroke();
      circle(ctx, cx+w*0.35, cy+h*0.1, w*0.10, mainD);
      circle(ctx, cx+w*0.38, cy+h*0.06, 1.4, eye);
      break;
    }
    default: circle(ctx,cx,cy,w*0.3,main);
  }
  return canvas;
}

// ============ BOSS (grande silhouette composite unique) ============
export function drawBoss(id, opts){
  const key='boss_'+id;
  if(cache.has(key)) return cache.get(key);
  const seed = hashStr(id);
  const rnd = seededRand(seed);
  const w=168,h=168;
  const {canvas, ctx} = newCanvas(w,h);
  const cx=w/2, cy=h/2;
  const hue = Math.floor(rnd()*360);
  const main = `hsl(${hue} 40% 32%)`;
  const dark = `hsl(${hue} 45% 16%)`;
  const glow = opts.glow || '#ff6a2b';

  // aura
  const grad = ctx.createRadialGradient(cx,cy,10,cx,cy,w*0.5);
  grad.addColorStop(0, glow+'55'); grad.addColorStop(1,'transparent');
  ctx.fillStyle=grad; ctx.fillRect(0,0,w,h);

  ctx.fillStyle='rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.ellipse(cx,h-8,w*0.34,h*0.08,0,0,Math.PI*2); ctx.fill();

  // corps massif
  px(ctx, cx-w*0.26, cy-h*0.05, w*0.52, h*0.42, main);
  px(ctx, cx-w*0.34, cy+h*0.02, w*0.16, h*0.34, dark);
  px(ctx, cx+w*0.18, cy+h*0.02, w*0.16, h*0.34, dark);
  // tête/casque
  px(ctx, cx-w*0.18, cy-h*0.34, w*0.36, h*0.30, dark);
  ctx.fillStyle = glow;
  circle(ctx, cx-8, cy-h*0.20, 3.2, glow); circle(ctx, cx+8, cy-h*0.20, 3.2, glow);
  // cornes / pics
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.moveTo(cx-w*0.18,cy-h*0.30); ctx.lineTo(cx-w*0.30,cy-h*0.52); ctx.lineTo(cx-w*0.10,cy-h*0.34); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx+w*0.18,cy-h*0.30); ctx.lineTo(cx+w*0.30,cy-h*0.52); ctx.lineTo(cx+w*0.10,cy-h*0.34); ctx.fill();
  // arme géante
  ctx.fillStyle = '#cfd6dc';
  ctx.fillRect(cx+w*0.26, cy-h*0.30, 5, h*0.55);
  ctx.beginPath(); ctx.moveTo(cx+w*0.24,cy-h*0.30); ctx.lineTo(cx+w*0.42,cy-h*0.14); ctx.lineTo(cx+w*0.24,cy+h*0.02); ctx.fill();
  cache.set(key, canvas);
  return canvas;
}

// ============ ICONES D'OBJETS ============
export function drawItemIcon(kind, colorMain='#c9c9c9', rarityColor='#888'){
  const key = 'item_'+kind+'_'+colorMain+'_'+rarityColor;
  if(cache.has(key)) return cache.get(key);
  const w=40,h=40; const {canvas,ctx}=newCanvas(w,h);
  const cx=w/2, cy=h/2;
  ctx.strokeStyle=rarityColor; ctx.lineWidth=2;
  ctx.strokeRect(1,1,w-2,h-2);
  const metal='#cfd6dc', wood='#7a5230', dark=shade(colorMain,-40);
  switch(kind){
    case 'epee':
      px(ctx,cx-1,cy-14,2,20,metal); px(ctx,cx-6,cy+5,12,3,'#8a6d3a'); px(ctx,cx-1.5,cy+8,3,6,wood);
      break;
    case 'hache':
      px(ctx,cx-1,cy-10,2,20,wood);
      ctx.fillStyle=metal; ctx.beginPath(); ctx.moveTo(cx,cy-10); ctx.lineTo(cx+12,cy-4); ctx.lineTo(cx,cy+2); ctx.fill();
      break;
    case 'masse':
      px(ctx,cx-1,cy-4,2,18,wood); circle(ctx,cx,cy-10,7,'#6b6b6b');
      break;
    case 'dague':
      px(ctx,cx-1,cy-10,2,14,metal); px(ctx,cx-4,cy+4,8,3,'#8a6d3a');
      break;
    case 'arc':
      ctx.strokeStyle=wood; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx-2,cy,14,-1.1,1.1); ctx.stroke();
      ctx.strokeStyle='#ddd'; ctx.beginPath(); ctx.moveTo(cx-2,cy-13); ctx.lineTo(cx-2,cy+13); ctx.stroke();
      break;
    case 'baton':
      px(ctx,cx-1,cy-12,2,22,wood); circle(ctx,cx,cy-14,5,colorMain);
      break;
    case 'sceptre':
      px(ctx,cx-1,cy-8,2,18,'#8a6d3a'); circle(ctx,cx,cy-12,4,colorMain);
      break;
    case 'bouclier':
      ctx.fillStyle=colorMain; ctx.beginPath(); ctx.moveTo(cx,cy-13); ctx.lineTo(cx+11,cy-6); ctx.lineTo(cx+8,cy+13); ctx.lineTo(cx,cy+16); ctx.lineTo(cx-8,cy+13); ctx.lineTo(cx-11,cy-6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=dark; ctx.stroke();
      break;
    case 'casque':
      ctx.fillStyle=colorMain; ctx.beginPath(); ctx.arc(cx,cy-2,11,Math.PI,0); ctx.fill();
      px(ctx,cx-11,cy-2,22,7,colorMain); px(ctx,cx-2,cy-14,4,5,'#c23b3b');
      break;
    case 'plastron':
      px(ctx,cx-10,cy-12,20,24,colorMain); px(ctx,cx-2,cy-12,4,24,dark);
      break;
    case 'gants':
      px(ctx,cx-9,cy-4,18,12,colorMain); px(ctx,cx-9,cy-12,6,10,colorMain); px(ctx,cx-1,cy-14,6,12,colorMain); px(ctx,cx+7,cy-12,6,10,colorMain);
      break;
    case 'bottes':
      px(ctx,cx-8,cy-10,7,18,colorMain); px(ctx,cx-8,cy+6,14,4,dark);
      break;
    case 'ceinture':
      px(ctx,cx-13,cy-3,26,6,colorMain); px(ctx,cx-3,cy-5,6,10,'#d8b45a');
      break;
    case 'anneau':
      ctx.strokeStyle=colorMain; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(cx,cy,9,0,Math.PI*2); ctx.stroke();
      circle(ctx,cx,cy-9,2.4,'#8fe0ff');
      break;
    case 'amulette':
      ctx.strokeStyle='#8a6d3a'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy-10,8,0.2,Math.PI-0.2); ctx.stroke();
      circle(ctx,cx,cy+4,8,colorMain);
      break;
    case 'potion_vie':
      px(ctx,cx-6,cy-4,12,14,'#c23b3b'); px(ctx,cx-3,cy-12,6,8,'#7fd97f');
      break;
    case 'potion_mana':
      px(ctx,cx-6,cy-4,12,14,'#2b6fc2'); px(ctx,cx-3,cy-12,6,8,'#7fd97f');
      break;
    case 'parchemin':
      px(ctx,cx-9,cy-11,18,22,'#e8dcc8'); px(ctx,cx-9,cy-11,18,3,'#d8b45a');
      break;
    case 'coffre':
      px(ctx,cx-12,cy-4,24,14,'#7a5230'); px(ctx,cx-12,cy-10,24,7,'#5a3d22'); px(ctx,cx-2,cy-4,4,5,'#d8b45a');
      break;
    default:
      circle(ctx,cx,cy,10,colorMain);
  }
  cache.set(key, canvas);
  return canvas;
}

// ============ TEXTURES DE SOL (tuiles) ============
export function makeTile(kind, variant=0){
  const key = 'tile_'+kind+'_'+variant;
  if(cache.has(key)) return cache.get(key);
  const size=48;
  const {canvas,ctx}=newCanvas(size,size);
  const rnd = seededRand(hashStr(kind+variant));
  const palettes = {
    ash_ground: ['#2a221e','#332924','#241b17'],
    cendre_route: ['#3a322c','#453b33','#302722'],
    herbe_brulee: ['#2f2a1c','#3a3320','#262117'],
    foret_sol: ['#22271c','#2b3122','#1b1f16'],
    pierre: ['#3a3a3d','#454548','#2e2e30'],
    eau: ['#16323f','#1c3d4c','#102530'],
    marais: ['#243424','#2c3e28','#1c2a1b'],
    lave: ['#4a1408','#6b1e0a','#2e0c04'],
    neige: ['#c9d2d8','#dfe6ea','#b3bec5'],
    caverne: ['#231f21','#2b262a','#1a1618'],
    bois: ['#4a3623','#5a422a','#3a2a1a'],
    cobble: ['#413a34','#4c443d','#35302b'],
    tapis: ['#5a1f1f','#6b2a2a','#4a1616'],
    sable: ['#8a6d3a','#9c7d46','#78602f'],
    faille: ['#1c1024','#2a1733','#120a17'],
  };
  const pal = palettes[kind] || palettes.ash_ground;
  ctx.fillStyle = pal[0]; ctx.fillRect(0,0,size,size);

  // grain fin
  for(let i=0;i<150;i++){
    const x=Math.floor(rnd()*size), y=Math.floor(rnd()*size);
    ctx.fillStyle = pal[1+Math.floor(rnd()*(pal.length-1))] || pal[1];
    ctx.fillRect(x,y, 1+Math.floor(rnd()*2), 1+Math.floor(rnd()*2));
  }
  // taches plus larges (mousse, éclats, flaques) pour casser la répétition
  const blotchCount = 4+Math.floor(rnd()*4);
  for(let i=0;i<blotchCount;i++){
    const x=rnd()*size, y=rnd()*size, r=3+rnd()*6;
    ctx.globalAlpha = 0.35+rnd()*0.25;
    ctx.fillStyle = rnd()<0.5 ? shade(pal[1],-10) : shade(pal[2]||pal[1], 10);
    ctx.beginPath(); ctx.ellipse(x,y,r,r*(0.6+rnd()*0.4),rnd()*Math.PI,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // craquelures fines (sol sec/pierre/cendre)
  if(['ash_ground','cendre_route','pierre','caverne','sable','faille'].includes(kind) && rnd()<0.6){
    ctx.strokeStyle = shade(pal[0],-12); ctx.lineWidth=1; ctx.globalAlpha=0.5;
    let x=rnd()*size, y=rnd()*size;
    ctx.beginPath(); ctx.moveTo(x,y);
    const segs = 2+Math.floor(rnd()*3);
    for(let i=0;i<segs;i++){ x+=(rnd()-0.5)*14; y+=(rnd()-0.5)*14; ctx.lineTo(x,y); }
    ctx.stroke(); ctx.globalAlpha=1;
  }
  if(kind==='eau' || kind==='lave' || kind==='marais'){
    ctx.globalAlpha=0.3;
    ctx.fillStyle= kind==='lave' ? '#ffb347' : '#ffffff';
    for(let i=0;i<4;i++){
      const x=Math.floor(rnd()*size), y=Math.floor(rnd()*size);
      ctx.fillRect(x,y,4,1);
    }
    ctx.globalAlpha=1;
  }
  if(kind==='neige' && rnd()<0.7){
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for(let i=0;i<3;i++) ctx.fillRect(rnd()*size, rnd()*size, 2, 2);
  }
  // léger assombrissement des bords pour masquer les coutures de répétition
  const vg = ctx.createRadialGradient(size/2,size/2,size*0.3,size/2,size/2,size*0.72);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.18)');
  ctx.fillStyle = vg; ctx.fillRect(0,0,size,size);

  cache.set(key, canvas);
  return canvas;
}

export function getCachedHumanoid(sig, opts){
  if(cache.has(sig)) return cache.get(sig);
  const c = drawHumanoid(opts);
  cache.set(sig, c);
  return c;
}
export function getCachedCreature(sig, opts){
  if(cache.has(sig)) return cache.get(sig);
  const c = drawCreature(opts);
  cache.set(sig, c);
  return c;
}
