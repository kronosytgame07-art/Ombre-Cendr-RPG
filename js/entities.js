import { getClass } from './data/classes.js';
import { recomputeStats, grantXp } from './systems/leveling.js';
import { xpToNextLevel, INVENTORY_SIZE } from './engine/config.js';
import { ENEMY_TYPES, BOSSES, scaledEnemyStats } from './data/enemies.js';
import { drawHumanoid, drawCreature, drawBoss, shade } from './engine/sprites.js';
import { getImageSync } from './engine/assets.js';

let uidCounter = 1;
function nextUid(){ return uidCounter++; }

export function createPlayer(classId, name){
  const cls = getClass(classId);
  const player = {
    name: name || cls.name,
    classId,
    level: 1, xp: 0, xpToNext: xpToNextLevel(1),
    attributePoints: 0, skillPoints: 1,
    attributes:{force:0, dexterite:0, intelligence:0, vitalite:0},
    skills:{['core_'+classId]:1},
    equipment:{arme:null, bouclier:null, casque:null, plastron:null, gants:null, bottes:null, ceinture:null, anneau1:null, anneau2:null, amulette:null},
    inventory: new Array(INVENTORY_SIZE).fill(null),
    gold: 50,
    potions:{vie:3, mana:3},
    hp:null, resource:null,
    pos:{x:0, y:0}, facing:{x:0, y:1}, moving:false,
    currentZone:'refuge', unlockedZones:['refuge','cimetiere'], defeatedBosses:[], clearedOnce:{},
    cooldowns:{}, buffs:[],
    hotbar: [null, cls.branches[0]+'_t1', cls.branches[1]+'_t1', cls.branches[2]+'_t1', null],
    codex:{bestiary:[], lore:['embrasement']},
    playtime:0,
  };
  recomputeStats(player);
  player.hp = player.stats.maxHp;
  player.resource = player.stats.maxResource;
  return player;
}

export function playerSpriteCanvas(player){
  const img = getImageSync(getClass(player.classId).sprite);
  if(img) return img;
  const cls = getClass(player.classId);
  return drawHumanoid({
    w:44, h:56, skin:cls.palette.skin, cloth:cls.palette.cloth, accent:cls.palette.accent,
    trim:cls.palette.trim, hair:cls.palette.hair, weapon:cls.weapon, hood:cls.hood, cloak:cls.cloak,
    armor:cls.armorStyle,
  });
}

const enemySpriteCache = new Map();
export function enemySpriteCanvas(def){
  if(enemySpriteCache.has(def.id)) return enemySpriteCache.get(def.id);
  let canvas;
  if(def.sprite.kind === 'humanoid'){
    canvas = drawHumanoid({w:44, h:56, ...spriteHumanoidOpts(def.sprite)});
  } else {
    canvas = drawCreature({w:52, h:44, shape:def.sprite.shape, main:def.sprite.main, eye:def.sprite.eye});
  }
  enemySpriteCache.set(def.id, canvas);
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
