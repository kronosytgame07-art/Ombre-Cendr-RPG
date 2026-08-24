import { getClass } from '../data/classes.js';
import { getSkillTree } from '../data/skillTrees.js';
import { createProjectile } from '../entities.js';
import { isWalkable } from '../engine/mapgen.js';
import { TILE_SIZE } from '../engine/config.js';
import { grantXp } from './leveling.js';

// ---------------------------------------------------------------------
// Description des effets de chaque compétence active (skillId -> impl).
// ---------------------------------------------------------------------
export const SKILL_IMPL = {
  attaque_base_melee: {type:'melee_cone', dmgMult:1.0, dmgType:'physique', radius:58, angle:110, cost:0, cd:0.55},
  attaque_base_distance: {type:'projectile', dmgMult:0.9, dmgType:'physique', speed:9, radius:6, pierce:0, color:'#e8dcc8', cost:0, cd:0.6},

  boule_de_feu: {type:'projectile', dmgMult:1.35, dmgType:'feu', speed:9, radius:9, pierce:0, color:'#ff6a2b', status:{type:'burn', chanceStat:'burnChance', baseChance:20, dmgPctPerTick:6, ticks:3, interval:0.6}},
  tentacules_ombre: {type:'aoe_self', dmgMult:0.95, dmgType:'ombre', radius:120, status:{type:'slow', pct:0.35, duration:1.6}},
  eclair_de_givre: {type:'projectile', dmgMult:1.15, dmgType:'glace', speed:10, radius:7, pierce:2, color:'#8fe0ff', status:{type:'slow', pct:0.45, duration:2.2}},

  frappe_ardente: {type:'melee_cone', dmgMult:1.55, dmgType:'physique', radius:60, angle:110, resourceGainOnHit:12},
  bouclier_cendre: {type:'buff_self', duration:3.2, effect:{damageTakenPct:-50}},
  cri_guerre: {type:'buff_self', duration:6, effect:{atkSpeedPct:30, moveSpeedPct:22}},

  frappe_fantome: {type:'dash_melee', dashDist:120, dmgMult:1.45, dmgType:'physique', guaranteedCrit:true},
  pas_ombre: {type:'teleport_behind', range:220, guaranteedCritNext:true},
  bulle_de_poison: {type:'projectile', dmgMult:1.05, dmgType:'poison', speed:7, radius:9, color:'#7fd97f', status:{type:'poison', chanceStat:null, baseChance:100, dmgPctPerTick:8, ticks:4, interval:0.7}},

  invoquer_squelette: {type:'summon', duration:22, hpMult:0.5, dmgMult:0.6},
  chaine_eclairs: {type:'projectile_chain', dmgMult:1.25, dmgType:'foudre', bounces:3, range:200, color:'#8fe0ff', status:{type:'curse', duration:5, dmgTakenPct:20}},
  faucheur_ames: {type:'melee_cone', dmgMult:1.3, dmgType:'ombre', radius:62, angle:100, lifeStealBonusPct:25},

  fleche_percante: {type:'projectile', dmgMult:1.3, dmgType:'physique', speed:12, radius:6, pierce:5, color:'#e8dcc8'},
  piege_explosif: {type:'trap', dmgMult:1.7, dmgType:'feu', radius:75, armDelay:0.35, life:9, color:'#ff8c2b'},
  bond_predateur: {type:'dash_melee', dashDist:150, dmgMult:1.35, dmgType:'physique'},
};

// Type d'animation jouée par le joueur selon la nature de la compétence :
// un coup d'arme au corps-à-corps balance le bras, un sort/tir lève les
// mains en position d'incantation/visée.
const ACTION_ANIM_KIND = {
  melee_cone: 'swing', dash_melee: 'swing',
  projectile: 'cast', projectile_chain: 'cast', aoe_self: 'cast',
  buff_self: 'cast', trap: 'cast', summon: 'cast', teleport_behind: 'swing',
};

const CAPSTONE_UPGRADES = {
  rage_braises_t5: {target:'frappe_ardente', patch:{aoeOnHit:70}},
  rempart_cendre_t5: {target:'bouclier_cendre', patch:{reflectPct:30}},
  cri_guerre_t5: {target:'cri_guerre', patch:{effect:{atkSpeedPct:30, moveSpeedPct:22, damageTakenPct:-20}}},
  voie_flammes_t5: {target:'boule_de_feu', patch:{pierce:6, explodeRadius:70}},
  voie_neant_t5: {target:'tentacules_ombre', patch:{pullIn:true}},
  voie_givre_t5: {target:'eclair_de_givre', patch:{cone:true, pierce:99}},
  lames_jumelles_t5: {target:'frappe_fantome', patch:{multiTarget:3}},
  voile_ombre_t5: {target:'pas_ombre', patch:{invisibleDuration:1.5}},
  poison_noir_t5: {target:'bulle_de_poison', patch:{spreadOnDeath:true}},
  legion_cendree_t5: {target:'invoquer_squelette', patch:{explodeOnDeath:true}},
  maledictions_t5: {target:'chaine_eclairs', patch:{bounces:5}},
  moisson_ames_t5: {target:'faucheur_ames', patch:{pullIn:true}},
  tir_precision_t5: {target:'fleche_percante', patch:{volley:5}},
  pieges_cendre_t5: {target:'piege_explosif', patch:{multiTrap:3}},
  instinct_sauvage_t5: {target:'bond_predateur', patch:{summonWolf:12}},
};

export function resolveSkillImpl(player, skillId){
  const base = SKILL_IMPL[skillId];
  if(!base) return null;
  let impl = {...base};
  for(const capId in CAPSTONE_UPGRADES){
    const up = CAPSTONE_UPGRADES[capId];
    if(up.target===skillId && (player.skills[capId]||0)>0){
      impl = {...impl, ...up.patch};
    }
  }
  return impl;
}

export function basicAttackSkillId(player){
  const cls = getClass(player.classId);
  return ['arc','baton','sceptre'].includes(cls.weapon) ? 'attaque_base_distance' : 'attaque_base_melee';
}

// ---------------------------------------------------------------------
// Dégâts et mitigation
// ---------------------------------------------------------------------
export function rollDamage(min, max){ return min + Math.random()*(max-min); }

export function mitigate(rawDmg, dmgType, targetArmor, targetResist){
  if(dmgType === 'physique'){
    return rawDmg * (100/(100+Math.max(0,targetArmor)));
  }
  const resistPct = (targetResist && targetResist[dmgType]) || 0;
  return rawDmg * (1 - Math.max(-100,Math.min(90,resistPct))/100);
}

export function playerDealsDamage(player, dmgMult, dmgType, forceCrit=false){
  const s = player.stats;
  let raw = rollDamage(s.dmgMin, s.dmgMax) * dmgMult;
  let crit = forceCrit || Math.random()*100 < s.critChance;
  if(crit) raw *= s.critDmg/100;
  if(dmgType==='feu') raw *= 1+ (s.fireDmgPct||0)/100;
  if(dmgType==='poison') raw *= 1+ (s.poisonDmgPct||0)/100;
  return {raw, crit};
}

function angleTo(from, to){ return Math.atan2(to.y-from.y, to.x-from.x); }
function angleDiff(a,b){ let d=a-b; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; return Math.abs(d); }
function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

// ---------------------------------------------------------------------
// Exécution d'une compétence du joueur
// ---------------------------------------------------------------------
export function castSkill(game, skillId, aimX, aimY){
  const { player } = game;
  const impl = resolveSkillImpl(player, skillId);
  if(!impl) return false;

  const cdKey = skillId;
  if((player.cooldowns[cdKey]||0) > 0) return false;
  const node = findSkillNode(player, skillId);
  if(node && !(player.skills[node.id] > 0)) return false;
  const treeCost = node ? node.effect.resourceCost : 0;
  if(treeCost > 0 && player.resource < treeCost) return false;

  const ang = angleTo(player.pos, {x:aimX, y:aimY});
  player.facing = {x:Math.cos(ang), y:Math.sin(ang)};
  player.action = {kind: ACTION_ANIM_KIND[impl.type] || 'swing', t:0, duration: ACTION_ANIM_KIND[impl.type]==='cast' ? 0.34 : 0.24};

  switch(impl.type){
    case 'melee_cone': {
      let hitAny = false;
      for(const e of game.enemies){
        if(e.dead) continue;
        if(dist(player.pos, e.pos) > impl.radius) continue;
        const a2 = angleTo(player.pos, e.pos);
        if(angleDiff(ang, a2) > (impl.angle/2)*(Math.PI/180)) continue;
        hitAny = true;
        applyPlayerHitOnEnemy(game, e, impl.dmgMult, impl.dmgType, impl);
      }
      if(hitAny && impl.resourceGainOnHit) player.resource = Math.min(player.stats.maxResource, player.resource + impl.resourceGainOnHit);
      spawnSlashFx(game, player.pos, ang, impl.radius);
      break;
    }
    case 'projectile': {
      spawnPlayerProjectile(game, player, ang, impl);
      break;
    }
    case 'projectile_chain': {
      spawnPlayerProjectile(game, player, ang, {...impl, chainBounces:impl.bounces});
      break;
    }
    case 'aoe_self': {
      for(const e of game.enemies){
        if(e.dead) continue;
        if(dist(player.pos, e.pos) > impl.radius) continue;
        applyPlayerHitOnEnemy(game, e, impl.dmgMult, impl.dmgType, impl);
      }
      spawnPulseFx(game, player.pos, impl.radius);
      break;
    }
    case 'buff_self': {
      player.buffs.push({id:skillId, remaining:impl.duration, effect:impl.effect, reflectPct:impl.reflectPct||0});
      break;
    }
    case 'dash_melee': {
      const dashTo = clampDashTarget(game, player.pos, ang, impl.dashDist);
      player.pos.x = dashTo.x; player.pos.y = dashTo.y;
      for(const e of game.enemies){
        if(e.dead) continue;
        if(dist(player.pos, e.pos) <= 60){
          applyPlayerHitOnEnemy(game, e, impl.dmgMult, impl.dmgType, {...impl, forceCrit:impl.guaranteedCrit});
          if(!impl.multiTarget) break;
        }
      }
      if(impl.summonWolf) spawnWolfCompanion(game, impl.summonWolf);
      break;
    }
    case 'teleport_behind': {
      let target = null, bestD = impl.range;
      for(const e of game.enemies){
        if(e.dead) continue;
        const d = dist(player.pos, e.pos);
        if(d < bestD){ bestD = d; target = e; }
      }
      if(target){
        const behindAng = angleTo(game.player.pos, target.pos);
        player.pos.x = target.pos.x - Math.cos(behindAng)*40;
        player.pos.y = target.pos.y - Math.sin(behindAng)*40;
        player.nextAttackGuaranteedCrit = true;
      }
      if(impl.invisibleDuration) player.buffs.push({id:'invisible', remaining:impl.invisibleDuration, effect:{invisible:true}});
      break;
    }
    case 'summon': {
      spawnSkeletonAlly(game, impl);
      break;
    }
    case 'trap': {
      game.traps.push({
        pos:{x:aimX, y:aimY}, armTime: impl.armDelay, life: impl.life,
        radius: impl.radius, dmgMult: impl.dmgMult, dmgType: impl.dmgType,
        count: impl.multiTrap||1, triggered:false,
      });
      break;
    }
  }

  if(treeCost>0) player.resource -= treeCost;
  player.cooldowns[cdKey] = getSkillCooldown(player, skillId, impl);
  return true;
}

function findSkillNode(player, skillId){
  const tree = getSkillTree(player.classId);
  if(!tree) return null;
  return tree.nodes.find(n=>n.id.endsWith('_t1') && n.effect && n.effect.skillId===skillId) || null;
}
function getSkillCooldown(player, skillId, impl){
  const node = findSkillNode(player, skillId);
  const base = node ? node.effect.cooldown : (impl.cd||1);
  return Math.max(0.15, base * (1 - (player.stats.cdr||0)/100));
}

function clampDashTarget(game, from, ang, dist_){
  let x = from.x, y = from.y;
  const steps = 10;
  for(let i=1;i<=steps;i++){
    const nx = from.x + Math.cos(ang)*dist_*(i/steps);
    const ny = from.y + Math.sin(ang)*dist_*(i/steps);
    if(!tileWalkableAtPixel(game, nx, ny)) break;
    x=nx; y=ny;
  }
  return {x,y};
}
function tileWalkableAtPixel(game, px, py){
  if(!game.map) return true;
  return isWalkable(game.map, Math.floor(px/TILE_SIZE), Math.floor(py/TILE_SIZE));
}

function spawnPlayerProjectile(game, player, ang, impl){
  const {raw, crit} = playerDealsDamage(player, impl.dmgMult, impl.dmgType);
  const speed = impl.speed*60;
  const proj = createProjectile({
    x:player.pos.x, y:player.pos.y, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed,
    dmgMin:raw, dmgMax:raw, radius:impl.radius, fromPlayer:true, pierce:impl.pierce||0,
    color:impl.color, statusEffect:impl.status||null,
  });
  proj.dmgType = impl.dmgType;
  proj.wasCrit = crit;
  proj.explodeRadius = impl.explodeRadius||0;
  proj.chainBounces = impl.chainBounces||0;
  proj.chainRange = impl.range||180;
  game.projectiles.push(proj);
}

export function applyPlayerHitOnEnemy(game, enemy, dmgMult, dmgType, opts={}){
  const { player } = game;
  const forceCrit = !!(opts.forceCrit || player.nextAttackGuaranteedCrit);
  if(player.nextAttackGuaranteedCrit) player.nextAttackGuaranteedCrit = false;
  let {raw, crit} = playerDealsDamage(player, dmgMult, dmgType, forceCrit);
  const mitigated = mitigate(raw, dmgType, enemy.armor, enemy.resist) * enemyDamageTakenMult(enemy);
  enemy.hp -= mitigated;
  enemy.hitFlash = 0.15;
  spawnFloatingDamage(game, enemy.pos, Math.round(mitigated), crit, dmgType);

  if(player.stats.lifeSteal) healPlayer(player, mitigated*player.stats.lifeSteal/100);
  if(player.stats.lifeOnHit) healPlayer(player, player.stats.lifeOnHit);
  if(player.stats.manaSteal) player.resource = Math.min(player.stats.maxResource, player.resource + mitigated*player.stats.manaSteal/100);
  if(opts.lifeStealBonusPct) healPlayer(player, mitigated*opts.lifeStealBonusPct/100);

  if(opts.status) applyStatusToEnemy(enemy, opts.status, player);
  if(opts.aoeOnHit){
    for(const e2 of game.enemies){
      if(e2===enemy || e2.dead) continue;
      if(dist(enemy.pos, e2.pos) <= opts.aoeOnHit){
        const m2 = mitigate(raw*0.6, dmgType, e2.armor, e2.resist);
        e2.hp -= m2; e2.hitFlash=0.15;
        spawnFloatingDamage(game, e2.pos, Math.round(m2), false, dmgType);
      }
    }
  }
  if(opts.pullIn){
    const a = angleTo(enemy.pos, player.pos);
    enemy.pos.x += Math.cos(a)*40; enemy.pos.y += Math.sin(a)*40;
  }
  if(enemy.hp <= 0 && !enemy.dead) killEnemy(game, enemy);
}

function healPlayer(player, amount){
  player.hp = Math.min(player.stats.maxHp, player.hp + amount);
}

export function killEnemy(game, enemy){
  enemy.dead = true;
  enemy.deathTimer = 0.6;
  const events = grantXp(game.player, enemy.xpReward);
  game.pendingLevelEvents.push(...events);
  game.onEnemyKilled(enemy);
}

function applyStatusToEnemy(enemy, status, player){
  if(status.chanceStat){
    const chance = (status.baseChance||0) + (player.stats[status.chanceStat]||0);
    if(Math.random()*100 > chance) return;
  } else if(status.baseChance!=null && status.baseChance<100){
    if(Math.random()*100 > status.baseChance) return;
  }
  if(status.type==='burn' || status.type==='poison'){
    enemy.statusEffects.push({type:status.type, ticksLeft:status.ticks, interval:status.interval, timer:status.interval,
      dmgPct:status.dmgPctPerTick, sourcePlayer:true});
  } else if(status.type==='slow'){
    enemy.statusEffects.push({type:'slow', remaining:status.duration, pct:status.pct});
  } else if(status.type==='curse'){
    enemy.statusEffects.push({type:'curse', remaining:status.duration, dmgTakenPct:status.dmgTakenPct});
  }
}

// ---------------------------------------------------------------------
// Effets visuels légers (données consommées par le renderer)
// ---------------------------------------------------------------------
function spawnFloatingDamage(game, pos, amount, crit, dmgType){
  game.floatingTexts.push({x:pos.x, y:pos.y, text:String(amount), crit, dmgType, life:1.0, vy:-40});
}
function spawnSlashFx(game, pos, ang, radius){
  game.fx.push({type:'slash', x:pos.x, y:pos.y, ang, radius, life:0.18, age:0});
}
function spawnPulseFx(game, pos, radius){
  game.fx.push({type:'pulse', x:pos.x, y:pos.y, radius, life:0.3, age:0});
}

function spawnSkeletonAlly(game, impl){
  const p = game.player;
  const maxAllies = Math.floor(p.stats.maxSummons||1);
  game.allies = game.allies.filter(a=>!a.dead);
  if(game.allies.length >= maxAllies) game.allies.shift();
  game.allies.push({
    uid:Date.now()+Math.random(), pos:{x:p.pos.x+30, y:p.pos.y+10}, hp:60*impl.hpMult*(1+(p.stats.summonHpPct||0)/100),
    maxHp:60*impl.hpMult*(1+(p.stats.summonHpPct||0)/100), dmgMult:impl.dmgMult, remaining:impl.duration,
    dead:false, atkCooldownCur:0, explodeOnDeath:!!impl.explodeOnDeath, kind:'squelette',
  });
}
function spawnWolfCompanion(game, duration){
  const p = game.player;
  game.allies.push({
    uid:Date.now()+Math.random(), pos:{x:p.pos.x-30, y:p.pos.y+10}, hp:50, maxHp:50, dmgMult:0.8,
    remaining:duration, dead:false, atkCooldownCur:0, kind:'loup',
  });
}

// ---------------------------------------------------------------------
// IA des ennemis
// ---------------------------------------------------------------------
export function updateEnemyAI(game, enemy, dt){
  if(enemy.dead) return;
  const player = game.player;
  const d = dist(enemy.pos, player.pos);

  tickStatusEffects(game, enemy, dt);
  let speedMult = 1;
  for(const s of enemy.statusEffects) if(s.type==='slow') speedMult *= (1-s.pct);

  if(enemy.state==='idle' && d < enemy.aggroRange) enemy.state='chase';

  if(enemy.state==='idle'){
    enemy.moving = wanderTick(game, enemy, dt);
  } else if(enemy.state==='chase'){
    enemy.moving = true;
    if(d <= enemy.atkRange){ enemy.state='attack'; enemy.moving=false; }
    else{
      const a = angleTo(enemy.pos, player.pos);
      enemy.facing = {x:Math.cos(a), y:Math.sin(a)};
      const nx = enemy.pos.x + Math.cos(a)*enemy.speed*speedMult*dt;
      const ny = enemy.pos.y + Math.sin(a)*enemy.speed*speedMult*dt;
      if(tileWalkableAtPixel(game, nx, enemy.pos.y)) enemy.pos.x = nx;
      if(tileWalkableAtPixel(game, enemy.pos.x, ny)) enemy.pos.y = ny;
      if(d > enemy.aggroRange*1.6) enemy.state='idle';
    }
  } else if(enemy.state==='attack'){
    enemy.moving = false;
    if(d > enemy.atkRange*1.3){ enemy.state='chase'; }
    else{
      const a = angleTo(enemy.pos, player.pos);
      enemy.facing = {x:Math.cos(a), y:Math.sin(a)};
      enemy.atkCooldownCur -= dt;
      if(enemy.atkCooldownCur <= 0){
        enemy.atkCooldownCur = enemy.atkCooldownMax;
        performEnemyAttack(game, enemy);
      }
    }
  }
}

// Déambulation aléatoire autour du point d'apparition tant qu'aucun joueur
// n'est détecté, pour que le monde ne semble pas figé. Retourne true si
// l'ennemi est en train de se déplacer (pour l'animation de marche).
const WANDER_RADIUS = 130;
function wanderTick(game, enemy, dt){
  enemy.wanderTimer -= dt;
  if(!enemy.wanderTarget || enemy.wanderTimer <= 0 || dist(enemy.pos, enemy.wanderTarget) < 10){
    if(Math.random() < 0.35){
      const a = Math.random()*Math.PI*2;
      const r = Math.random()*WANDER_RADIUS;
      enemy.wanderTarget = {x: enemy.spawnPos.x+Math.cos(a)*r, y: enemy.spawnPos.y+Math.sin(a)*r};
      enemy.wanderTimer = 2.5 + Math.random()*3;
    } else {
      enemy.wanderTarget = null;
      enemy.wanderTimer = 1.5 + Math.random()*2.5;
      return false;
    }
  }
  if(!enemy.wanderTarget) return false;
  const a = angleTo(enemy.pos, enemy.wanderTarget);
  enemy.facing = {x:Math.cos(a), y:Math.sin(a)};
  const wanderSpeed = enemy.speed*0.42;
  const nx = enemy.pos.x + Math.cos(a)*wanderSpeed*dt;
  const ny = enemy.pos.y + Math.sin(a)*wanderSpeed*dt;
  let moved = false;
  if(tileWalkableAtPixel(game, nx, enemy.pos.y)){ enemy.pos.x = nx; moved = true; }
  if(tileWalkableAtPixel(game, enemy.pos.x, ny)){ enemy.pos.y = ny; moved = true; }
  return moved;
}

function performEnemyAttack(game, enemy){
  const player = game.player;
  if(enemy.behavior === 'ranged'){
    const a = angleTo(enemy.pos, player.pos);
    const speed = enemy.projectileSpeed*60;
    const dmg = rollDamage(enemy.dmg[0], enemy.dmg[1]);
    game.projectiles.push(createProjectile({
      x:enemy.pos.x, y:enemy.pos.y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed,
      dmgMin:dmg, dmgMax:dmg, radius:8, fromPlayer:false, color: enemy.isBoss?'#ff2b6a':'#b34dff',
    }));
    enemy.action = {kind:'cast', t:0, duration:0.3};
  } else {
    applyEnemyHitOnPlayer(game, enemy);
    enemy.action = {kind:'swing', t:0, duration:0.24};
  }
}

export function applyEnemyHitOnPlayer(game, enemy){
  const player = game.player;
  if(Math.random()*100 < (player.stats.dodgePct||0)){
    game.floatingTexts.push({x:player.pos.x, y:player.pos.y, text:'Esquive !', crit:false, dmgType:'esquive', life:1.0, vy:-40});
    return;
  }
  let raw = rollDamage(enemy.dmg[0], enemy.dmg[1]);
  let dmgReductionPct = 0;
  for(const b of player.buffs) if(b.effect.damageTakenPct) dmgReductionPct += b.effect.damageTakenPct;
  raw *= (1 + dmgReductionPct/100);
  const mitigated = Math.max(1, mitigate(raw, 'physique', player.stats.armor, player.stats.resist));
  player.hp -= mitigated;
  game.floatingTexts.push({x:player.pos.x, y:player.pos.y-10, text:String(Math.round(mitigated)), crit:false, dmgType:'subi', life:1.0, vy:-40});

  for(const b of player.buffs){
    if(b.reflectPct && enemy.hp>0){
      const refl = mitigated*b.reflectPct/100;
      enemy.hp -= refl; enemy.hitFlash=0.15;
      if(enemy.hp<=0) killEnemy(game, enemy);
    }
  }
  if(player.stats.thorns){ enemy.hp -= player.stats.thorns; if(enemy.hp<=0) killEnemy(game, enemy); }
}

function tickStatusEffects(game, enemy, dt){
  for(let i=enemy.statusEffects.length-1;i>=0;i--){
    const s = enemy.statusEffects[i];
    if(s.type==='burn' || s.type==='poison'){
      s.timer -= dt;
      if(s.timer<=0){
        s.timer = s.interval; s.ticksLeft -= 1;
        const dmg = enemy.maxHp * s.dmgPct/100;
        enemy.hp -= dmg;
        spawnFloatingDamage(game, enemy.pos, Math.round(dmg), false, s.type);
        if(enemy.hp<=0 && !enemy.dead) killEnemy(game, enemy);
      }
      if(s.ticksLeft<=0) enemy.statusEffects.splice(i,1);
    } else if(s.type==='slow'){
      s.remaining -= dt; if(s.remaining<=0) enemy.statusEffects.splice(i,1);
    } else if(s.type==='curse'){
      s.remaining -= dt; if(s.remaining<=0) enemy.statusEffects.splice(i,1);
    }
  }
}

export function enemyDamageTakenMult(enemy){
  let m = 1;
  for(const s of enemy.statusEffects) if(s.type==='curse') m *= (1+s.dmgTakenPct/100);
  return m;
}
