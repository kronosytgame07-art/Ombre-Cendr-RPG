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
  const sheet=cls.sheet && getImageSync(cls.sheet);
  if(sheet){
    const col=facingColumn(player.facing), row=heroAnimationRow(player,pose);
    const key=player.classId+':'+col+':'+row;
    if(heroFrameCache.has(key)) return heroFrameCache.get(key);
    const canvas=document.createElement('canvas');
    canvas.width=96; canvas.height=96; canvas._hd2d=true;
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(sheet,col*96,row*96,96,96,0,0,96,96);
    heroFrameCache.set(key,canvas);
    return canvas;
  }
  const weaponItem=player.equipment.arme;
  const weaponType=weaponItem ? weaponItem.weaponClass : 'none';
  return drawHumanoid({
    w:68,h:86,skin:cls.palette.skin,cloth:cls.palette.cloth,accent:cls.palette.accent,
    trim:cls.palette.trim,hair:cls.palette.hair,weapon:weaponType,
    hood:cls.hood&&!player.equipment.casque,cloak:cls.cloak,armor:cls.armorStyle,
    shield:!!player.equipment.bouclier,helmet:!!player.equipment.casque,pose,
  });
}

const enemySpriteCache = new Map();
// Les humanoïdes sont redessinés à chaque frame avec leur pose (marche/coup)
// pour une vraie animation ; les créatures restent en cache (silhouette figée,
// un léger mouvement est appliqué au moment du rendu par le jeu).
export function enemySpriteCanvas(def, pose){
  if(def.sprite.kind === 'humanoid'){
    return drawHumanoid({w:68, h:86, ...spriteHumanoidOpts(def.sprite), pose});
  }
  if(enemySpriteCache.has(def.id)) return enemySpriteCache.get(def.id);
  const canvas = drawCreature({w:76, h:64, shape:def.sprite.shape, main:def.sprite.main, eye:def.sprite.eye});
  enemySpriteCache.set(def.id, canvas);
  return canvas;
}
const npcSpriteCache = new Map();
export function npcSpriteCanvas(npc){
  const atlas=getImageSync('assets/sprites/npcs/camp_npcs_8dir.png');
  if(atlas && npc.sheetRow!=null){
    const col=facingColumn(npc.facing);
    const animRow=npc.moving ? ((Math.floor(performance.now()/180)%2)?1:2) : 0;
    const row=npc.sheetRow+animRow;
    const key='npc:'+npc.id+':'+col+':'+row;
    if(npcSpriteCache.has(key)) return npcSpriteCache.get(key);
    const canvas=document.createElement('canvas');
    canvas.width=96; canvas.height=96; canvas._hd2d=true;
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(atlas,col*96,row*96,96,96,0,0,96,96);
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
