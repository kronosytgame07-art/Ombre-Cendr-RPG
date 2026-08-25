import { getClass } from './data/classes.js';
import { recomputeStats, grantXp } from './systems/leveling.js';
import { xpToNextLevel, INVENTORY_SIZE } from './engine/config.js';
import { ENEMY_TYPES, BOSSES, scaledEnemyStats } from './data/enemies.js';
import { drawHumanoid, drawCreature, drawBoss, shade } from './engine/sprites.js';
import { generateItem } from './data/items.js';
import { ZONES } from './data/zones.js';
import { getImageSync } from './engine/assets.js';

let uidCounter = 1;
function nextUid(){ return uidCounter++; }

export function createPlayer(classId, name){
  const cls = getClass(classId);
  const player = {
    name: name || cls.name,
    classId,
    level: 1, xp: 0, xpToNext: xpToNextLevel(1),
    attributePoints: 0, skillPoints: 0,
    attributes:{force:0, dexterite:0, intelligence:0, vitalite:0},
    skills:{['core_'+classId]:1},
    equipment:{arme:null, bouclier:null, casque:null, plastron:null, gants:null, bottes:null, ceinture:null, anneau1:null, anneau2:null, amulette:null},
    inventory: new Array(INVENTORY_SIZE).fill(null),
    gold: 50,
    potions:{vie:3, mana:3},
    hp:null, resource:null,
    pos:{x:0, y:0}, facing:{x:0, y:1}, moving:false,
    // Toutes les zones sont explorables dès le départ (voyage rapide libre) :
    // le niveau conseillé sert d'avertissement, pas de verrou. Les boss
    // vaincus restent suivis pour le codex et la progression narrative.
    currentZone:'refuge', unlockedZones: ZONES.map(z=>z.id), defeatedBosses:[], clearedOnce:{},
    cooldowns:{}, buffs:[], action:null, quests:{},
    hotbar: [null, cls.branches[0]+'_t1', cls.branches[1]+'_t1', cls.branches[2]+'_t1', null],
    codex:{bestiary:[], lore:['embrasement']},
    playtime:0,
  };
  player.equipment.arme = generateItem({baseType: cls.weapon, itemLevel:1, rarity:'commun'});
  if(cls.armorStyle==='lourd'){
    player.equipment.bouclier = generateItem({baseType:'bouclier', itemLevel:1, rarity:'commun'});
    player.equipment.casque = generateItem({baseType:'casque', itemLevel:1, rarity:'commun'});
  }
  recomputeStats(player);
  player.hp = player.stats.maxHp;
  player.resource = player.stats.maxResource;
  return player;
}

// Sprites HD-2D : grille 8 directions × 8 états, cellules de 96 px.
// Gouttière de sécurité : les 3 pixels de bord de chaque cellule ne sont jamais
// échantillonnés. Cela élimine les fragments de la frame voisine lors des
// attaques et de la marche, même avec un zoom Canvas non entier.
function drawSafeFrame(ctx, image, col, row, cell=96){
  // Six pixels de gouttière : certaines planches contiennent encore des
  // fragments de la cellule voisine jusqu'à 4 px après le découpage IA.
  const inset=6;
  ctx.clearRect(0,0,cell,cell);
  ctx.drawImage(image,col*cell+inset,row*cell+inset,cell-inset*2,cell-inset*2,
    inset,inset,cell-inset*2,cell-inset*2);
  repairSpritePinholes(ctx, cell, cell);
}

// Le détourage IA a parfois transformé des pixels très sombres du manteau en
// transparence. On ne touche jamais au fond extérieur : seuls les trous de 1
// pixel enfermés dans la silhouette sont reconstruits avec la couleur moyenne
// de leurs voisins opaques. Le sprite reste donc net, totalement opaque à
// l'intérieur, et sans halo noir autour de lui.
function repairSpritePinholes(ctx, width, height){
  const image=ctx.getImageData(0,0,width,height), src=image.data;
  const out=new Uint8ClampedArray(src);
  const index=(x,y)=>(y*width+x)*4;
  for(let y=2;y<height-2;y++) for(let x=2;x<width-2;x++){
    const i=index(x,y);
    if(src[i+3]!==0) continue;
    const dirs=[[0,-1],[1,0],[0,1],[-1,0],[-1,-1],[1,-1],[1,1],[-1,1]];
    const neighbours=[];
    for(const [dx,dy] of dirs){
      const ni=index(x+dx,y+dy);
      if(src[ni+3]===255) neighbours.push(ni);
    }
    // Six voisins opaques minimum : impossible de combler un espace normal
    // entre le corps, le bâton ou les pans volontairement déchirés du manteau.
    if(neighbours.length<6) continue;
    out[i]=Math.round(neighbours.reduce((s,n)=>s+src[n],0)/neighbours.length);
    out[i+1]=Math.round(neighbours.reduce((s,n)=>s+src[n+1],0)/neighbours.length);
    out[i+2]=Math.round(neighbours.reduce((s,n)=>s+src[n+2],0)/neighbours.length);
    out[i+3]=255;
  }
  image.data.set(out); ctx.putImageData(image,0,0);
}

const heroFrameCache = new Map();
function facingColumn(facing){
  const x=facing?.x||0, y=facing?.y||1;
  return (Math.round(Math.atan2(-x,y)/(Math.PI/4))+8)%8;
}
function heroAnimationRow(player, pose){
  if(player.hp<=0) return 7;
  if(player.hitFlash>0) return 6;
  if(pose?.action){
    if(pose.action.kind==='dodge') return 5;
    return pose.action.phase<0.5 ? 3 : 4;
  }
  if(player.moving) return (Math.floor(performance.now()/130)%2) ? 1 : 2;
  return 0;
}
export function playerSpriteCanvas(player, pose){
  const cls=getClass(player.classId);
  const weaponItem=player.equipment.arme;
  const weaponType=weaponItem ? weaponItem.weaponClass : 'none';
  const rarityColor={commun:'#9b8d79',magique:'#4d8fff',rare:'#d9c942',epique:'#a84ee0',legendaire:'#e87927'};
  const chest=player.equipment.plastron, helmet=player.equipment.casque;
  const gearAccent=rarityColor[(chest||weaponItem||helmet)?.rarity]||cls.palette.accent;
  let canvas=drawHumanoid({
    w:80,h:96,skin:cls.palette.skin,
    cloth:chest ? shade(cls.palette.cloth,12) : cls.palette.cloth,
    accent:gearAccent,trim:rarityColor[weaponItem?.rarity]||cls.palette.trim,
    hair:cls.palette.hair,weapon:weaponType,
    hood:cls.hood&&!helmet,cloak:cls.cloak,armor:chest?'lourd':cls.armorStyle,
    shield:!!player.equipment.bouclier,helmet:!!helmet,pose,
    gloves:!!player.equipment.gants,boots:!!player.equipment.bottes,belt:!!player.equipment.ceinture,
    amulet:!!player.equipment.amulette,rings:!!(player.equipment.anneau1||player.equipment.anneau2),
  });
  canvas=orientModularHero(canvas,player.facing,cls,gearAccent,!!helmet);
  canvas._modular=true;
  return canvas;
}

function orientModularHero(source,facing,cls,accent,helmet){
  const x=facing?.x||0,y=facing?.y||1;
  const side=Math.abs(x)>.55, back=y<-.55;
  if(!side&&!back) return source;
  const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  if(side){
    // Profil plus étroit, centré sur la même case. La gauche est obtenue par
    // miroir dans drawPlayer ; la droite conserve l'orientation originale.
    const dw=Math.round(source.width*.72),dx=Math.round((source.width-dw)/2);
    ctx.drawImage(source,0,0,source.width,source.height,dx,0,dw,source.height);
    ctx.fillStyle=shade(accent,-28);ctx.fillRect(Math.round(source.width*.38),22,Math.round(source.width*.12),45);
  }else{
    ctx.drawImage(source,0,0);
    // Vue de dos explicite : cape et arrière du casque/capuchon recouvrent le
    // visage frontal, ce qui empêche le héros de continuer à regarder en bas.
    ctx.fillStyle=shade(accent,-30);
    ctx.fillRect(Math.round(source.width*.30),25,Math.round(source.width*.40),43);
    ctx.fillStyle=helmet?shade(accent,-10):shade(cls.palette.cloth,-18);
    ctx.fillRect(Math.round(source.width*.36),10,Math.round(source.width*.28),23);
    ctx.fillStyle=shade(accent,-42);ctx.fillRect(Math.round(source.width*.33),62,Math.round(source.width*.34),17);
  }
  return canvas;
}

const enemySpriteCache = new Map();
// Les humanoïdes sont redessinés à chaque frame avec leur pose (marche/coup)
// pour une vraie animation ; les créatures restent en cache (silhouette figée,
// un léger mouvement est appliqué au moment du rendu par le jeu).
export function enemySpriteCanvas(def, pose, entity=null){
  const sheet=def.sheet && getImageSync(def.sheet);
  if(sheet && entity){
    const col=facingColumn(entity.facing);
    let row=0;
    if(entity.dead) row=5;
    else if(entity.hitFlash>0) row=4;
    else if(entity.action) row=3;
    else if(entity.moving) row=(Math.floor(performance.now()/170)%2)?1:2;
    const key='enemy:'+def.id+':'+col+':'+row;
    if(enemySpriteCache.has(key)) return enemySpriteCache.get(key);
    const canvas=document.createElement('canvas');
    canvas.width=96; canvas.height=96; canvas._hd2d=true;
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    drawSafeFrame(ctx,sheet,col,row);
    enemySpriteCache.set(key,canvas);
    return canvas;
  }
  if(def.sprite.kind==='humanoid'){
    return drawHumanoid({w:68,h:86,...spriteHumanoidOpts(def.sprite),pose});
  }
  if(enemySpriteCache.has(def.id)) return enemySpriteCache.get(def.id);
  const canvas=drawCreature({w:76,h:64,shape:def.sprite.shape,main:def.sprite.main,eye:def.sprite.eye});
  enemySpriteCache.set(def.id,canvas);
  return canvas;
}
const npcSpriteCache = new Map();
export function npcSpriteCanvas(npc){
  const atlas=getImageSync('assets/sprites/npcs/camp_npcs_8dir.png');
  if(atlas && npc.sheetIdle!=null){
    const col=facingColumn(npc.facing);
    const step=Math.floor(performance.now()/180)%2;
    const row=npc.moving ? npc.sheetWalk[step] : npc.sheetIdle;
    const key='npc:'+npc.id+':'+col+':'+row;
    if(npcSpriteCache.has(key)) return npcSpriteCache.get(key);
    const canvas=document.createElement('canvas');
    canvas.width=96; canvas.height=96; canvas._hd2d=true;
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    drawSafeFrame(ctx,atlas,col,row);
    npcSpriteCache.set(key,canvas);
    return canvas;
  }
  const key='npc:fallback:'+npc.id;
  if(npcSpriteCache.has(key)) return npcSpriteCache.get(key);
  const s=npc.sprite;
  const canvas=drawHumanoid({
    w:68,h:86,skin:'#c9a880',cloth:s.cloth,accent:s.accent,trim:s.trim||'#8a8a80',
    hair:s.hair||'#2b1c14',weapon:s.weapon||'none',hood:!!s.hood,cloak:!!s.cloak,armor:s.armor||'leger',
  });
  npcSpriteCache.set(key,canvas);
  return canvas;
}

function spriteHumanoidOpts(s){
  return {
    skin:'#a89684', cloth:s.cloth||'#3a3830', accent:s.accent||'#5a2e2e', trim:'#8a8a80',
    hair:'#2b1c14', weapon:s.weapon||'dague', hood:!!s.hood, cloak:!!s.cloak,
    undead:!!s.undead, armor:s.armor||'leger',
  };
}

export function createEnemy(defId, level, x, y){
  const def = ENEMY_TYPES[defId];
  const stats = scaledEnemyStats(def, level);
  return {
    uid: nextUid(), defId, name: def.name, family: def.family, level,
    hp: stats.hp, maxHp: stats.maxHp, dmg: stats.dmg, armor: stats.armor, resist: def.resist||{},
    xpReward: stats.xp, pos:{x, y}, vel:{x:0,y:0}, speed: def.speed*60,
    behavior: def.behavior, aggroRange: def.aggroRange, atkRange: def.atkRange,
    atkCooldownMax: def.atkCooldown, atkCooldownCur: 0, projectileSpeed: def.projectileSpeed||5,
    state:'idle', facing:{x:0,y:1}, hitFlash:0, dead:false, deathTimer:0,
    statusEffects:[], isBoss:false, isElite:!!def.elite, def,
    spawnPos:{x,y}, wanderTarget:null, wanderTimer:0, moving:false,
  };
}

export function createBoss(bossId, x, y){
  const def = BOSSES[bossId];
  return {
    uid: nextUid(), defId:bossId, name: def.name, family:'boss', level: 1,
    hp: def.base.hp, maxHp: def.base.hp, dmg: def.base.dmg, armor: def.base.armor, resist: def.resist||{},
    xpReward: def.base.xp, pos:{x,y}, vel:{x:0,y:0}, speed: def.base.speed*60,
    behavior: def.base.ranged ? 'ranged' : 'melee', aggroRange: 360,
    atkRange: def.base.atkRange, atkCooldownMax: def.base.atkCooldown, atkCooldownCur: 0,
    projectileSpeed: def.base.projectileSpeed||5.5,
    state:'idle', facing:{x:0,y:1}, hitFlash:0, dead:false, deathTimer:0,
    statusEffects:[], isBoss:true, isElite:true, def, glow: def.glow, lootTier: def.lootTier, isFinal: !!def.isFinal,
    spawnPos:{x,y}, wanderTarget:null, wanderTimer:0, moving:false,
  };
}

export function bossSpriteCanvas(bossId){
  const def = BOSSES[bossId];
  return drawBoss(bossId, {glow: def.glow});
}

export function createProjectile(opts){
  return {
    uid: nextUid(), pos:{x:opts.x, y:opts.y}, vel:{x:opts.vx, y:opts.vy},
    dmgMin: opts.dmgMin, dmgMax: opts.dmgMax, radius: opts.radius||6, ttl: opts.ttl||2.5,
    fromPlayer: !!opts.fromPlayer, pierce: opts.pierce||0, color: opts.color||'#ffb347',
    statusEffect: opts.statusEffect||null, hitIds:new Set(), dead:false,
  };
}

export function createPickup(kind, x, y, payload){
  return { uid: nextUid(), kind, pos:{x,y}, payload, dead:false, bornAt: performance.now() };
}
