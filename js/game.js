import { TILE_SIZE } from './engine/config.js';
import { Input } from './engine/input.js';
import { makeTile } from './engine/sprites.js';
import { generateZoneMap, isWalkable } from './engine/mapgen.js';
import { getZone, nextZone, zoneLevel } from './data/zones.js';
import { ENEMY_TYPES, BOSSES } from './data/enemies.js';
import { createEnemy, createBoss, enemySpriteCanvas, bossSpriteCanvas, playerSpriteCanvas, npcSpriteCanvas, createPickup } from './entities.js';
import { updateEnemyAI, applyEnemyHitOnPlayer, castSkill, basicAttackSkillId, resolveSkillImpl, applyPlayerHitOnEnemy } from './systems/combat.js';
import { spawnLootPickups, rollLootForEnemy } from './systems/loot.js';
import { generateItem } from './data/items.js';
import { Rng } from './engine/rng.js';
import { getDifficultyMult } from './engine/difficulty.js';
import { npcsForZone } from './data/npcs.js';
import { registerKillForQuests } from './systems/quests.js';
import { getImageSync } from './engine/assets.js';

const PLAYER_RADIUS = 16;
const PORTAL_TRIGGER_DIST = 70;

// Hash entier déterministe par case : donne à chaque tuile un variant de
// texture stable (pas de scintillement d'une frame à l'autre) et permet de
// semer des petits détails de décor (cailloux, touffes...) sans les stocker.
function cellHash(x,y){
  let h = (x*374761393 + y*668265263) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h>>>13), 1274126177);
  return (h ^ (h>>>16)) >>> 0;
}
function tileVariantIndex(x,y){ return cellHash(x,y) % 4; }
// Densité et styles de décor par biome — la forêt est nettement plus fournie
// (arbres) que le désert ou la faille, pour que chaque zone se sente distincte.
const BIOME_DECOR_DENSITY = {
  foret_sol: 38, marais: 20, neige: 16, sable: 12, caverne: 14,
  lave: 10, ash_ground: 18, tapis: 10, cobble: 8, faille: 8,
};
function decorAt(x,y,biome){
  const h = cellHash(x*7+3, y*13+5);
  const density = BIOME_DECOR_DENSITY[biome] ?? 15;
  if(h % 100 >= density) return null;
  return h % 3;
}
// Arbres imposants (nettement plus hauts/larges que le héros, comme dans un
// vrai Diablo) : la canopée déborde volontairement sur les cases voisines,
// dessinée avant elles car le rendu se fait ligne par ligne du haut vers le bas.
function drawTree(ctx, style){
  const scale = 1.9 + (style%3)*0.35;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(1,4,10,4,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#1c140e';
  ctx.fillRect(-3,-6,6,14);
  const canopy = style===1 ? '#243a1e' : (style===2 ? '#2e2015' : '#1e2e1a');
  ctx.fillStyle = canopy;
  ctx.beginPath(); ctx.moveTo(0,-36); ctx.lineTo(-14,-12); ctx.lineTo(14,-12); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0,-26); ctx.lineTo(-11,-4); ctx.lineTo(11,-4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = style===2 ? '#5a2e18' : '#3a2a14';
  ctx.beginPath(); ctx.arc(-4,-20,1.6,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(5,-14,1.4,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawFloorDecor(ctx, px, py, style, biome){
  ctx.save();
  ctx.translate(px+TILE_SIZE*0.5, py+TILE_SIZE*0.7);

  if(biome==='foret_sol'){
    drawTree(ctx, style);
    ctx.restore();
    return;
  }
  // Rochers/plantes agrandis : proportionnés au héros plutôt que perdus au sol.
  ctx.scale(2.1, 2.1);
  if(biome==='neige'){
    ctx.globalAlpha=0.7;
    if(style===0){ ctx.fillStyle='#6b7580'; ctx.beginPath(); ctx.ellipse(0,0,6,4,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-1,-2,4,2,0,0,Math.PI*2); ctx.fill(); }
    else { ctx.strokeStyle='#4a3a2e'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,6); ctx.lineTo(0,-6); ctx.moveTo(-3,-3); ctx.lineTo(3,-5); ctx.moveTo(3,-3); ctx.lineTo(-3,-5); ctx.stroke(); }
  } else if(biome==='sable'){
    ctx.globalAlpha=0.65;
    if(style===0){ ctx.fillStyle='#3a5a2a'; for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(0,4); ctx.lineTo((i-1.5)*2,-6-i); ctx.lineTo((i-1.5)*2+1,4); ctx.fill(); } }
    else { ctx.fillStyle='#8a7a5a'; ctx.beginPath(); ctx.ellipse(0,2,4,2,0,0,Math.PI*2); ctx.fill(); ctx.fillRect(-1,-4,2,6); }
  } else if(biome==='marais'){
    ctx.globalAlpha=0.6; ctx.strokeStyle='#3a4a2a'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(-2,5); ctx.quadraticCurveTo(-1,-4,1,-6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2,5); ctx.quadraticCurveTo(3,-3,1,-7); ctx.stroke();
  } else if(biome==='lave' || biome==='ash_ground'){
    ctx.globalAlpha=0.6;
    if(style===0){ ctx.fillStyle='#1c1512'; ctx.fillRect(-1,-7,2,9); ctx.fillStyle='#3a2a20'; ctx.beginPath(); ctx.ellipse(0,-7,3,2,0,0,Math.PI*2); ctx.fill(); }
    else { ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0,0,5,3,0,0,Math.PI*2); ctx.fill(); }
  } else if(biome==='caverne'){
    ctx.globalAlpha=0.6; ctx.fillStyle='#3a3a3d';
    ctx.beginPath(); ctx.moveTo(-4,3); ctx.lineTo(0,-7); ctx.lineTo(4,3); ctx.closePath(); ctx.fill();
  } else if(style===0){
    ctx.globalAlpha=0.5;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0,0,5,3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.ellipse(-1,-1,2,1.2,0,0,Math.PI*2); ctx.fill();
  } else if(style===1){
    ctx.globalAlpha=0.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(-5,3); ctx.lineTo(-1,-3); ctx.lineTo(4,2); ctx.stroke();
  } else {
    ctx.globalAlpha=0.5;
    ctx.fillStyle = 'rgba(120,140,90,0.35)';
    ctx.beginPath(); ctx.moveTo(0,4); ctx.lineTo(-2,-3); ctx.lineTo(0,-1); ctx.lineTo(2,-3); ctx.lineTo(0,4); ctx.fill();
  }
  ctx.restore();
}

// Toit à pignon dessiné au-dessus de chaque bâtiment de ville (issu de
// mapgen.generateTownLayout) : sans ça, les maisons ne sont que des murs de
// donjon repeints. Peint dans une passe séparée après toute la grille de sol
// pour toujours recouvrir correctement les tuiles du dessus.
function drawBuildingRoof(ctx, b){
  const bx = b.x*TILE_SIZE, by = b.y*TILE_SIZE, bw = b.w*TILE_SIZE, bh = b.h*TILE_SIZE;
  const roofH = bh*0.6;
  const apexY = by - roofH*0.35;
  const midX = bx + bw/2;
  ctx.save();
  ctx.fillStyle = '#4a2016';
  ctx.beginPath();
  ctx.moveTo(bx-3, by+roofH);
  ctx.lineTo(bx-3, by+roofH*0.35);
  ctx.lineTo(midX, apexY);
  ctx.lineTo(bx+bw+3, by+roofH*0.35);
  ctx.lineTo(bx+bw+3, by+roofH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#652c1e';
  ctx.beginPath();
  ctx.moveTo(midX, apexY);
  ctx.lineTo(bx+bw+3, by+roofH*0.35);
  ctx.lineTo(bx+bw+3, by+roofH);
  ctx.lineTo(midX, by+roofH*0.7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2e140d'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(midX, apexY); ctx.lineTo(midX, by+roofH*0.7); ctx.stroke();
  ctx.fillStyle = '#241009';
  ctx.fillRect(bx+bw*0.68, apexY+roofH*0.15, bw*0.09, roofH*0.4);
  ctx.restore();
}

export class Game{
  constructor(canvas, player){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.player = player;
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.allies = [];
    this.npcs = [];
    this.nearbyNpc = null;
    this.traps = [];
    this.fx = [];
    this.floatingTexts = [];
    this.pendingLevelEvents = [];
    this.pendingNotices = [];
    this.camera = {x:0, y:0, zoom:2.7, shakeMag:0};
    this.shakeEnabled = true;
    this.map = null;
    this.zone = null;
    this.bossActive = null;
    this.bossSpawnedThisVisit = false;
    this.paused = false;
    this.time = 0;
    this.deathHandled = false;
    this.victoryHandled = false;
    Input.bindCanvas(canvas, this.camera);
    this.resize();
    window.addEventListener('resize', ()=>this.resize());
  }

  resize(){
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width);
    this.canvas.height = Math.floor(rect.height);
    this.ctx.imageSmoothingEnabled = false;
  }

  enterZone(zoneId){
    const zone = getZone(zoneId);
    this.zone = zone;
    this.player.currentZone = zoneId;
    // Les villes gardent une disposition stable d'une visite à l'autre (seed fixe) :
    // un vrai lieu qu'on retrouve, avec ses PNJ toujours au même endroit. Les
    // donjons restent régénérés à chaque entrée pour la rejouabilité.
    let hash = 0; for(let i=0;i<zoneId.length;i++) hash = (hash*31 + zoneId.charCodeAt(i))>>>0;
    const seed = zone.kind==='town' ? hash : (Date.now() ^ (zoneId.length*7919)) >>> 0;
    this.map = generateZoneMap(zone, seed);
    this.enemies = []; this.projectiles = []; this.pickups = []; this.allies = [];
    this.traps = []; this.fx = []; this.floatingTexts = [];
    this.bossActive = null;
    this.bossSpawnedThisVisit = false;
    this.deathHandled = false;
    this.nearbyNpc = null;
    this.npcs = npcsForZone(zoneId).map(n => this.placeNpc(n));

    this.player.pos.x = (this.map.spawn.x+0.5)*TILE_SIZE;
    this.player.pos.y = (this.map.spawn.y+0.5)*TILE_SIZE;

    const lvl = zone.kind==='town' ? 1 : zoneLevel(zone);
    const diffMult = getDifficultyMult();
    for(const spawn of this.map.enemySpawns){
      const e = createEnemy(spawn.typeId, lvl, (spawn.x+0.5)*TILE_SIZE, (spawn.y+0.5)*TILE_SIZE);
      e.hp = e.maxHp = Math.round(e.hp*diffMult);
      e.dmg = e.dmg.map(d=>Math.round(d*diffMult));
      this.enemies.push(e);
    }
    for(const c of this.map.chests){
      this.pickups.push(createPickup('chest', (c.x+0.5)*TILE_SIZE, (c.y+0.5)*TILE_SIZE, {opened:false, zoneLevel:lvl}));
    }
    this.tileCache = {
      floor: [0,1,2,3].map(i=>makeTile(zone.floorTile, i)),
      wall: [0,1,2].map(i=>makeTile(zone.wallTile, 10+i)),
      accent: makeTile(zone.accentTile, 20),
    };
    this.notify(zone.name);
  }

  notify(bannerText){
    this.pendingNotices.push({type:'banner', text:bannerText});
  }

  triggerShake(mag){
    if(!this.shakeEnabled) return;
    this.camera.shakeMag = Math.min(14, Math.max(this.camera.shakeMag, mag));
  }

  // Place un PNJ près du point d'apparition de la zone (décalage défini dans
  // npcs.js), en se rabattant sur la case praticable la plus proche si le
  // décalage tombe sur un mur.
  placeNpc(n){
    let tx = Math.round(this.map.spawn.x + n.offset.x);
    let ty = Math.round(this.map.spawn.y + n.offset.y);
    tx = Math.max(1, Math.min(this.map.w-2, tx));
    ty = Math.max(1, Math.min(this.map.h-2, ty));
    if(!isWalkable(this.map, tx, ty)){
      let best=null, bestD=Infinity;
      for(const [x,y] of this.map.floorTiles){
        const d = (x-tx)*(x-tx) + (y-ty)*(y-ty);
        if(d<bestD){ bestD=d; best=[x,y]; }
      }
      if(best){ tx=best[0]; ty=best[1]; }
    }
    const pos={x:(tx+0.5)*TILE_SIZE,y:(ty+0.5)*TILE_SIZE};
    return {...n,pos,facing:{x:0,y:1},stock:null,homePos:{...pos},wanderTarget:null,wanderTimer:1+Math.random()*2,moving:false};
  }

  updateNpcs(dt){
    for(const n of this.npcs){
      const toPlayerX=this.player.pos.x-n.pos.x, toPlayerY=this.player.pos.y-n.pos.y;
      const playerDist=Math.hypot(toPlayerX,toPlayerY);
      if(playerDist<76){
        n.moving=false; n.wanderTarget=null; n.wanderTimer=Math.max(n.wanderTimer,1);
        if(playerDist>1){ n.facing={x:toPlayerX/playerDist,y:toPlayerY/playerDist}; }
        continue;
      }
      if(n.wanderTarget){
        const dx=n.wanderTarget.x-n.pos.x, dy=n.wanderTarget.y-n.pos.y;
        const dist=Math.hypot(dx,dy);
        if(dist<3){
          n.pos.x=n.wanderTarget.x; n.pos.y=n.wanderTarget.y;
          n.wanderTarget=null; n.wanderTimer=1.2+Math.random()*3.2; n.moving=false;
        }else{
          const nx=dx/dist, ny=dy/dist, step=Math.min(dist,38*dt);
          const nextX=n.pos.x+nx*step, nextY=n.pos.y+ny*step;
          if(isWalkable(this.map,Math.floor(nextX/TILE_SIZE),Math.floor(nextY/TILE_SIZE))){
            n.pos.x=nextX; n.pos.y=nextY; n.facing={x:nx,y:ny}; n.moving=true;
          }else{
            n.wanderTarget=null; n.wanderTimer=0.6+Math.random()*1.2; n.moving=false;
          }
        }
      }else{
        n.moving=false; n.wanderTimer-=dt;
        if(n.wanderTimer<=0){
          for(let attempt=0;attempt<8;attempt++){
            const angle=Math.random()*Math.PI*2;
            const radius=(1.2+Math.random()*2.8)*TILE_SIZE;
            const tx=n.homePos.x+Math.cos(angle)*radius;
            const ty=n.homePos.y+Math.sin(angle)*radius;
            if(isWalkable(this.map,Math.floor(tx/TILE_SIZE),Math.floor(ty/TILE_SIZE))){
              n.wanderTarget={x:tx,y:ty}; break;
            }
          }
          if(!n.wanderTarget) n.wanderTimer=1+Math.random()*2;
        }
      }
    }
  }

  updateNpcProximity(){
    let best=null, bestD=70;
    for(const n of this.npcs){
      const d = Math.hypot(n.pos.x-this.player.pos.x, n.pos.y-this.player.pos.y);
      if(d<bestD){ bestD=d; best=n; }
    }
    this.nearbyNpc = best;
  }

  onEnemyKilled(enemy){
    spawnLootPickups(this, enemy);
    registerKillForQuests(this.player, enemy.defId);
    if(!this.player.codex.bestiary.includes(enemy.defId) && ENEMY_TYPES[enemy.defId]){
      this.player.codex.bestiary.push(enemy.defId);
    }
    if(enemy.isBoss){
      this.bossActive = null;
      if(!this.player.defeatedBosses.includes(enemy.defId)){
        this.player.defeatedBosses.push(enemy.defId);
        const nz = nextZone(this.zone.id);
        if(nz && !this.player.unlockedZones.includes(nz.id)){
          this.player.unlockedZones.push(nz.id);
          this.pendingNotices.push({type:'unlock', zoneName:nz.name});
        }
      }
      if(enemy.isFinal){
        this.pendingNotices.push({type:'victory'});
      } else {
        this.pendingNotices.push({type:'bossdown', name: enemy.name});
      }
    }
  }

  update(dt){
    if(this.paused) return;
    this.time += dt;
    const player = this.player;
    if(this.camera.shakeMag>0){ this.camera.shakeMag *= Math.max(0, 1-dt*8); if(this.camera.shakeMag<0.05) this.camera.shakeMag=0; }

    for(const k in player.cooldowns){ if(player.cooldowns[k]>0) player.cooldowns[k] = Math.max(0, player.cooldowns[k]-dt); }
    if(player.action){ player.action.t += dt; if(player.action.t >= player.action.duration) player.action = null; }
    for(const e of this.enemies){ if(e.action){ e.action.t += dt; if(e.action.t >= e.action.duration) e.action = null; } }
    for(let i=player.buffs.length-1;i>=0;i--){ player.buffs[i].remaining -= dt; if(player.buffs[i].remaining<=0) player.buffs.splice(i,1); }
    if(player.resource < player.stats.maxResource){
      player.resource = Math.min(player.stats.maxResource, player.resource + player.stats.maxResource*0.05*(1+player.stats.resourceRegenPct/100)*dt);
    }

    this.handleMovement(dt);
    this.updateNpcs(dt);
    this.updateNpcProximity();
    this.handleInputActions();

    for(const e of this.enemies) updateEnemyAI(this, e, dt);
    this.updateAllies(dt);
    this.updateProjectiles(dt);
    this.updateTraps(dt);
    this.updatePickupsAndPortal();
    this.updateFx(dt);
    this.updateFloatingTexts(dt);
    this.cleanupDead();

    if(player.hp <= 0 && !this.deathHandled){
      this.deathHandled = true;
      this.pendingNotices.push({type:'death'});
    }

    Input.endFrame();
  }

  handleMovement(dt){
    const player = this.player;
    if(player.hp<=0) return;
    let dx=0, dy=0;
    if(Input.isDown('z')||Input.isDown('arrowup')||Input.isDown('w')) dy-=1;
    if(Input.isDown('s')||Input.isDown('arrowdown')) dy+=1;
    if(Input.isDown('q')||Input.isDown('arrowleft')||Input.isDown('a')) dx-=1;
    if(Input.isDown('d')||Input.isDown('arrowright')) dx+=1;
    const len = Math.hypot(dx,dy);
    player.moving = len>0;
    if(len>0){
      dx/=len; dy/=len;
      player.facing = {x:dx, y:dy};
      const speed = 170*(1+player.stats.moveSpeedPct/100);
      const nx = player.pos.x + dx*speed*dt;
      const ny = player.pos.y + dy*speed*dt;
      if(this.walkablePixel(nx, player.pos.y)) player.pos.x = nx;
      if(this.walkablePixel(player.pos.x, ny)) player.pos.y = ny;
    }
  }

  walkablePixel(px, py){
    if(!this.map) return true;
    if(!isWalkable(this.map, Math.floor(px/TILE_SIZE), Math.floor(py/TILE_SIZE))) return false;
    // Les gros accessoires du refuge ont une vraie emprise physique : on ne
    // traverse plus les tentes, troncs, braseros ou piles de caisses.
    for(const p of this.map.campProps||[]){
      const cx=(p.x+0.5)*TILE_SIZE, cy=(p.y+0.72)*TILE_SIZE;
      const radius=p.cell<8?30:(p.cell===10?20:17);
      if(Math.hypot(px-cx,py-cy)<radius+PLAYER_RADIUS*0.55) return false;
    }
    return true;
  }

  handleInputActions(){
    const player = this.player;
    if(player.hp<=0) return;
    const mouseWorld = {x:Input.mouse.worldX, y:Input.mouse.worldY};

    if(Input.mouse.down){
      castSkill(this, basicAttackSkillId(player), mouseWorld.x, mouseWorld.y);
    }
    for(let i=0;i<player.hotbar.length;i++){
      const key = String(i+1);
      if(Input.wasPressed(key) && player.hotbar[i]){
        castSkill(this, player.hotbar[i], mouseWorld.x, mouseWorld.y);
      }
    }
    if(Input.wasPressed('r')) this.usePotion('vie');
    if(Input.wasPressed('f')) this.usePotion('mana');
    if(Input.wasPressed('e') && this.nearbyNpc){
      this.pendingNotices.push({type:'npc', npc:this.nearbyNpc});
    }
  }

  usePotion(kind){
    const player = this.player;
    if((player.potions[kind]||0) <= 0) return;
    player.potions[kind] -= 1;
    if(kind==='vie') player.hp = Math.min(player.stats.maxHp, player.hp + player.stats.maxHp*0.35);
    else player.resource = Math.min(player.stats.maxResource, player.resource + player.stats.maxResource*0.4);
  }

  updateAllies(dt){
    for(const a of this.allies){
      if(a.dead) continue;
      a.remaining -= dt;
      if(a.remaining<=0 || a.hp<=0){ a.dead = true; continue; }
      let target=null, best=280;
      for(const e of this.enemies){ if(e.dead) continue; const d=Math.hypot(e.pos.x-a.pos.x,e.pos.y-a.pos.y); if(d<best){best=d;target=e;} }
      if(target){
        const d = Math.hypot(target.pos.x-a.pos.x, target.pos.y-a.pos.y);
        if(d>40){
          const ang = Math.atan2(target.pos.y-a.pos.y, target.pos.x-a.pos.x);
          a.pos.x += Math.cos(ang)*110*dt; a.pos.y += Math.sin(ang)*110*dt;
        } else {
          a.atkCooldownCur -= dt;
          if(a.atkCooldownCur<=0){
            a.atkCooldownCur = 1.0;
            const dmg = (this.player.stats.dmgMin+this.player.stats.dmgMax)/2 * a.dmgMult;
            target.hp -= dmg; target.hitFlash=0.15;
            this.floatingTexts.push({x:target.pos.x,y:target.pos.y,text:String(Math.round(dmg)),crit:false,dmgType:'physique',life:1,vy:-40});
            if(target.hp<=0 && !target.dead){ target.dead=true; target.deathTimer=0.6; this.onEnemyKilled(target); }
          }
        }
      } else {
        const d = Math.hypot(this.player.pos.x-a.pos.x, this.player.pos.y-a.pos.y);
        if(d>60){ const ang=Math.atan2(this.player.pos.y-a.pos.y,this.player.pos.x-a.pos.x); a.pos.x+=Math.cos(ang)*110*dt; a.pos.y+=Math.sin(ang)*110*dt; }
      }
    }
    this.allies = this.allies.filter(a=>!a.dead);
  }

  updateProjectiles(dt){
    for(const p of this.projectiles){
      p.pos.x += p.vel.x*dt; p.pos.y += p.vel.y*dt;
      p.ttl -= dt;
      if(p.ttl<=0 || !this.walkablePixel(p.pos.x,p.pos.y)) p.dead = true;
      if(p.dead) continue;

      if(p.fromPlayer){
        for(const e of this.enemies){
          if(e.dead || p.hitIds.has(e.uid)) continue;
          if(Math.hypot(e.pos.x-p.pos.x, e.pos.y-p.pos.y) <= p.radius+18){
            p.hitIds.add(e.uid);
            applyPlayerHitOnEnemy(this, e, 1, p.dmgType||'physique', {status:p.statusEffect});
            if(p.explodeRadius){
              for(const e2 of this.enemies){
                if(e2===e||e2.dead) continue;
                if(Math.hypot(e2.pos.x-p.pos.x,e2.pos.y-p.pos.y)<=p.explodeRadius) applyPlayerHitOnEnemy(this, e2, 0.6, p.dmgType||'physique', {});
              }
            }
            if(p.chainBounces>0){
              let target=null,best=p.chainRange;
              for(const e3 of this.enemies){ if(e3.dead||p.hitIds.has(e3.uid)) continue; const d=Math.hypot(e3.pos.x-p.pos.x,e3.pos.y-p.pos.y); if(d<best){best=d;target=e3;} }
              if(target){
                p.chainBounces -= 1;
                const ang = Math.atan2(target.pos.y-p.pos.y, target.pos.x-p.pos.x);
                const speed = Math.hypot(p.vel.x,p.vel.y);
                p.vel.x = Math.cos(ang)*speed; p.vel.y = Math.sin(ang)*speed;
                p.ttl = 1.5;
              } else { if(p.pierce<=0) p.dead = true; }
            } else if(p.pierce>0){ p.pierce -= 1; }
            else p.dead = true;
          }
        }
      } else {
        const pl = this.player;
        if(Math.hypot(pl.pos.x-p.pos.x, pl.pos.y-p.pos.y) <= p.radius+PLAYER_RADIUS){
          if(Math.random()*100 < (pl.stats.dodgePct||0)){
            this.floatingTexts.push({x:pl.pos.x,y:pl.pos.y,text:'Esquive !',crit:false,dmgType:'esquive',life:1,vy:-40});
          } else {
            const mitig = Math.max(1, (p.dmgMin) * (100/(100+pl.stats.armor)));
            pl.hp -= mitig;
            this.floatingTexts.push({x:pl.pos.x,y:pl.pos.y-10,text:String(Math.round(mitig)),crit:false,dmgType:'subi',life:1,vy:-40});
          }
          p.dead = true;
        }
      }
    }
    this.projectiles = this.projectiles.filter(p=>!p.dead);
  }

  updateTraps(dt){
    for(const t of this.traps){
      if(t.triggered) continue;
      if(t.armTime>0){ t.armTime -= dt; continue; }
      t.life -= dt;
      if(t.life<=0){ t.triggered=true; continue; }
      for(const e of this.enemies){
        if(e.dead) continue;
        if(Math.hypot(e.pos.x-t.pos.x, e.pos.y-t.pos.y) <= t.radius){
          t.triggered = true;
          for(const e2 of this.enemies){
            if(e2.dead) continue;
            if(Math.hypot(e2.pos.x-t.pos.x, e2.pos.y-t.pos.y) <= t.radius) applyPlayerHitOnEnemy(this, e2, t.dmgMult, t.dmgType, {});
          }
          this.fx.push({type:'pulse', x:t.pos.x, y:t.pos.y, radius:t.radius, life:0.3, age:0, color:t.color});
          break;
        }
      }
    }
    this.traps = this.traps.filter(t=>!t.triggered);
  }

  updatePickupsAndPortal(){
    const player = this.player;
    for(const p of this.pickups){
      if(p.dead) continue;
      const d = Math.hypot(p.pos.x-player.pos.x, p.pos.y-player.pos.y);
      if(p.kind==='chest'){
        if(d < 40 && !p.payload.opened){
          p.payload.opened = true;
          const rng = new Rng((Math.random()*1e9)|0);
          const item = generateItem({baseType: rng.pick(['epee','hache','dague','arc','baton','sceptre','casque','plastron','gants','bottes','ceinture','anneau','amulette']), itemLevel:p.payload.zoneLevel, rng, forClass:player.classId});
          this.grantItem(item);
          this.grantGold(10+Math.round(Math.random()*20));
          p.dead = true;
        }
        continue;
      }
      if(d < 30){
        if(p.kind==='gold'){ this.grantGold(p.payload.amount); p.dead=true; }
        else if(p.kind==='item'){ this.grantItem(p.payload.item); p.dead=true; }
        else if(p.kind==='potion'){ player.potions[p.payload.potionKind] = (player.potions[p.payload.potionKind]||0)+1; p.dead=true; }
      }
    }
    this.pickups = this.pickups.filter(p=>!p.dead);

    if(this.map && this.map.portal && this.zone.bossId && this.player.hp > 0){
      const d = Math.hypot(player.pos.x-(this.map.portal.x+0.5)*TILE_SIZE, player.pos.y-(this.map.portal.y+0.5)*TILE_SIZE);
      if(d < PORTAL_TRIGGER_DIST && !this.bossSpawnedThisVisit){
        this.bossSpawnedThisVisit = true;
        const boss = createBoss(this.zone.bossId, (this.map.portal.x+0.5)*TILE_SIZE, (this.map.portal.y+0.5)*TILE_SIZE);
        const dm = getDifficultyMult();
        boss.hp = boss.maxHp = Math.round(boss.hp*dm);
        boss.dmg = boss.dmg.map(d=>Math.round(d*dm));
        this.bossActive = boss;
        this.enemies.push(boss);
        this.pendingNotices.push({type:'bossintro', name:boss.name, text:BOSSES[this.zone.bossId].intro});
      }
    }
  }

  grantGold(amount){
    this.player.gold += Math.round(amount*(1+(this.player.stats.goldFind||0)/100));
    this.floatingTexts.push({x:this.player.pos.x, y:this.player.pos.y-20, text:`+${Math.round(amount)} or`, crit:false, dmgType:'or', life:1.1, vy:-30});
  }
  grantItem(item){
    const slot = this.player.inventory.findIndex(x=>x===null);
    if(slot===-1){ this.pendingNotices.push({type:'inventoryfull'}); return; }
    this.player.inventory[slot] = item;
    this.pendingNotices.push({type:'loot', item});
  }

  updateFx(dt){
    for(const f of this.fx) f.age += dt;
    this.fx = this.fx.filter(f=>f.age < f.life);
  }
  updateFloatingTexts(dt){
    for(const t of this.floatingTexts){ t.life -= dt; t.y += t.vy*dt; }
    this.floatingTexts = this.floatingTexts.filter(t=>t.life>0);
  }

  cleanupDead(){
    for(const e of this.enemies){ if(e.dead) e.deathTimer -= 1/60; }
    this.enemies = this.enemies.filter(e=>!e.dead || e.deathTimer > -1);
  }

  // ------------------------------------------------------------------
  render(){
    const ctx = this.ctx;
    const cvw = this.canvas.width, cvh = this.canvas.height;
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,cvw,cvh);
    if(!this.map) return;

    this.camera.x = this.player.pos.x - cvw/(2*this.camera.zoom);
    this.camera.y = this.player.pos.y - cvh/(2*this.camera.zoom);
    const maxX = this.map.w*TILE_SIZE - cvw/this.camera.zoom;
    const maxY = this.map.h*TILE_SIZE - cvh/this.camera.zoom;
    this.camera.x = Math.max(0, Math.min(Math.max(0,maxX), this.camera.x));
    this.camera.y = Math.max(0, Math.min(Math.max(0,maxY), this.camera.y));

    ctx.save();
    ctx.scale(this.camera.zoom, this.camera.zoom);
    const shakeMag = this.camera.shakeMag||0;
    const shakeX = shakeMag>0 ? (Math.random()*2-1)*shakeMag : 0;
    const shakeY = shakeMag>0 ? (Math.random()*2-1)*shakeMag : 0;
    ctx.translate(-this.camera.x+shakeX, -this.camera.y+shakeY);

    const x0 = Math.max(0, Math.floor(this.camera.x/TILE_SIZE)-1);
    const y0 = Math.max(0, Math.floor(this.camera.y/TILE_SIZE)-1);
    const x1 = Math.min(this.map.w, Math.ceil((this.camera.x+cvw/this.camera.zoom)/TILE_SIZE)+1);
    const y1 = Math.min(this.map.h, Math.ceil((this.camera.y+cvh/this.camera.zoom)/TILE_SIZE)+1);
    for(let y=y0;y<y1;y++){
      for(let x=x0;x<x1;x++){
        const walkable = isWalkable(this.map, x, y);
        const variants = walkable ? this.tileCache.floor : this.tileCache.wall;
        const idx = tileVariantIndex(x,y) % variants.length;
        ctx.drawImage(variants[idx], x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
        if(walkable){
          const decor = decorAt(x,y,this.zone.floorTile);
          if(decor!=null) drawFloorDecor(ctx, x*TILE_SIZE, y*TILE_SIZE, decor, this.zone.floorTile);
        }
      }
    }

    if(this.map.buildings && this.map.buildings.length){
      for(const b of this.map.buildings) drawBuildingRoof(ctx, b);
    }

    if(this.map.portal){
      const px=(this.map.portal.x+0.5)*TILE_SIZE, py=(this.map.portal.y+0.5)*TILE_SIZE;
      const props=getImageSync('assets/sprites/world/world_props_atlas.png');
      if(props){
        const frame=this.bossSpawnedThisVisit ? 0 : Math.floor(this.time*6)%4;
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(props,frame*128,128,128,128,px-52,py-88,104,104);
      }else{
        const pulse=10+Math.sin(this.time*3)*4;
        ctx.strokeStyle=this.bossSpawnedThisVisit?'#555':(this.zone.isFinal?'#8a1fff':'#ff8c2b');
        ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(px,py,20+pulse,0,Math.PI*2); ctx.stroke();
      }
    }

    for(const t of this.traps){
      if(t.armTime>0) continue;
      ctx.fillStyle='rgba(255,140,43,0.5)';
      ctx.beginPath(); ctx.arc(t.pos.x,t.pos.y,8,0,Math.PI*2); ctx.fill();
    }
    for(const p of this.pickups){
      const props=getImageSync('assets/sprites/world/world_props_atlas.png');
      if(p.kind==='chest' && props){
        const elapsed=Math.max(0,(performance.now()-p.bornAt)/1000);
        const frame=Math.min(3,Math.floor(elapsed/0.18));
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(props,frame*128,0,128,128,p.pos.x-34,p.pos.y-48,68,68);
      }else{
        ctx.fillStyle=p.kind==='gold'?'#d8b45a':p.kind==='potion'?'#7fd97f':'#e8dcc8';
        ctx.beginPath(); ctx.arc(p.pos.x,p.pos.y,6,0,Math.PI*2); ctx.fill();
      }
    }

    const campDrawables = (this.map.campProps||[]).map(p=>({
      ...p, isCampProp:true, pos:{x:(p.x+0.5)*TILE_SIZE,y:(p.y+0.82)*TILE_SIZE}
    }));
    const drawList = [...campDrawables, ...this.enemies, ...this.allies, ...this.npcs.map(n=>({...n, isNpc:true})), {isPlayer:true, pos:this.player.pos, facing:this.player.facing}];
    drawList.sort((a,b)=>a.pos.y-b.pos.y);
    for(const ent of drawList){
      if(ent.isPlayer) this.drawPlayer(ctx);
      else if(ent.isCampProp) this.drawCampProp(ctx, ent);
      else if(ent.isNpc) this.drawNpc(ctx, ent);
      else if(ent.kind==='squelette' || ent.kind==='loup') this.drawAlly(ctx, ent);
      else this.drawEnemy(ctx, ent);
    }

    for(const p of this.projectiles) this.drawProjectile(ctx, p);

    for(const f of this.fx) this.drawFx(ctx, f);

    ctx.restore();
  }

  drawCampProp(ctx, prop){
    const atlas=getImageSync('assets/sprites/world/camp_environment_atlas.png');
    if(!atlas) return;
    const col=prop.cell%4, row=Math.floor(prop.cell/4);
    const large=prop.cell<8;
    const isTent=prop.cell>=0&&prop.cell<=3;
    const isTree=prop.cell>=4&&prop.cell<=7;
    const isFire=prop.cell===10;
    const base=large?128:88;
    const size=Math.round(base*(prop.scale||1));
    const seed=prop.x*0.71+prop.y*1.37;
    // Animation volontairement quantifiée : mouvement vivant sans aucun flou sub-pixel.
    const sway=isTree ? Math.round(Math.sin(this.time*1.25+seed)*2)*0.006 : 0;
    const clothStep=isTent ? Math.round(Math.sin(this.time*1.7+seed)*2) : 0;
    const fireStep=isFire ? Math.floor(this.time*10)%4 : 0;
    const firePulse=isFire ? [0.96,1.03,0.99,1.06][fireStep] : 1;
    ctx.save();
    ctx.imageSmoothingEnabled=false;
    ctx.globalAlpha=large?0.34:0.25; ctx.fillStyle='#000';
    ctx.beginPath(); ctx.ellipse(prop.pos.x,prop.pos.y,size*0.28,Math.max(4,size*0.07),0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
    ctx.translate(Math.round(prop.pos.x),Math.round(prop.pos.y));
    if(isTree) ctx.rotate(sway);
    if(isTent) ctx.transform(1,0,clothStep*0.002,1,0,0);
    if(isFire) ctx.scale(firePulse,1/firePulse);
    ctx.drawImage(atlas,col*128,row*128,128,128,Math.round(-size/2),Math.round(-size+8),size,size);
    ctx.restore();

    if(isFire){
      ctx.save();
      ctx.imageSmoothingEnabled=false;
      const pulse=0.12+(fireStep*0.025);
      const glow=ctx.createRadialGradient(prop.pos.x,prop.pos.y-22,2,prop.pos.x,prop.pos.y-16,58);
      glow.addColorStop(0,`rgba(255,174,58,${pulse+0.14})`);
      glow.addColorStop(1,'rgba(255,72,18,0)');
      ctx.fillStyle=glow; ctx.fillRect(prop.pos.x-60,prop.pos.y-78,120,82);
      // Braises carrées : trajectoires répétables, sans interpolation lissée.
      for(let i=0;i<7;i++){
        const cycle=(this.time*(0.65+i*0.07)+i*0.19)%1;
        const bx=Math.round(prop.pos.x+Math.sin(seed+i*2.1)*13*(1-cycle));
        const by=Math.round(prop.pos.y-42-cycle*42);
        const s=cycle<0.55?3:2;
        ctx.globalAlpha=1-cycle;
        ctx.fillStyle=i%2?'#ffb52e':'#ff5a1f';
        ctx.fillRect(bx,by,s,s);
      }
      ctx.restore();
    }
  }

  drawNpc(ctx, npc){
    const img=npcSpriteCanvas(npc);
    const w=img._hd2d?96:68, h=img._hd2d?96:86;
    ctx.save();
    ctx.globalAlpha=0.34; ctx.fillStyle='#000';
    ctx.beginPath(); ctx.ellipse(npc.pos.x,npc.pos.y+2,18,6,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(npc.pos.x,npc.pos.y);
    if(!img._hd2d && npc.facing.x<-.1) ctx.scale(-1,1);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(img,-w/2,-h+14,w,h);
    ctx.restore();

    // Marqueur d'interaction façon RPG : $ boutique, ! quête dispo, ? à rendre.
    let marker=null, color='#ffd85a';
    if(npc.role==='quete'){
      const ids = npc.questIds||[];
      const hasTurnIn = ids.some(qid=>{ const q=this.player.quests[qid]; return q && q.done && !q.turnedIn; });
      const hasAvailable = ids.some(qid=> !this.player.quests[qid]);
      if(hasTurnIn){ marker='?'; color='#8fe0ff'; }
      else if(hasAvailable){ marker='!'; color='#ffd85a'; }
    } else {
      marker='$'; color='#7fd97f';
    }
    if(marker){
      ctx.save();
      ctx.translate(npc.pos.x, npc.pos.y-h+4);
      ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      const bob = Math.sin(this.time*3)*3;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(marker, 1, bob+1);
      ctx.fillStyle = color; ctx.fillText(marker, 0, bob);
      ctx.restore();
    }
  }

  drawPlayer(ctx){
    const p = this.player;
    const w=68,h=86;
    const walk = p.moving ? Math.sin(this.time*9) : 0;
    const action = p.action ? {kind:p.action.kind, phase:Math.min(1,p.action.t/p.action.duration)} : null;
    const img = playerSpriteCanvas(p, {walk, action});
    ctx.save();
    ctx.globalAlpha=0.42;
    ctx.fillStyle='#000';
    ctx.beginPath(); ctx.ellipse(p.pos.x,p.pos.y+2,22,8,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
    const renderW = img._hd2d ? 96 : w;
    const renderH = img._hd2d ? 96 : h;
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    if(!img._hd2d && p.facing.x < -0.1) ctx.scale(-1,1);
    let alpha = 1;
    for(const b of p.buffs) if(b.effect && b.effect.invisible) alpha = 0.35;
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, -renderW/2, -renderH+14, renderW, renderH);
    ctx.restore();
    ctx.globalAlpha = 1;
    if(p.hp <= 0){ /* mort gérée par overlay UI */ }
  }

  drawEnemy(ctx, e){
    const def = e.isBoss ? null : e.def;
    const isHumanoid=!e.isBoss&&def.sprite.kind==='humanoid';
    const isAnimated=!e.isBoss&&!!def.sheet;
    let img, w, h, bob=0;
    if(e.isBoss){
      img = bossSpriteCanvas(e.defId); w=168; h=168;
      bob = Math.sin(this.time*3 + e.uid)*4;
    } else if(isHumanoid||isAnimated){
      const walk = e.moving ? Math.sin(this.time*8+e.uid) : 0;
      const action = e.action ? {kind:e.action.kind, phase:Math.min(1,e.action.t/e.action.duration)} : null;
      img=enemySpriteCanvas(def,{walk,action},e);
      w=img._hd2d?96:68; h=img._hd2d?96:86;
    } else {
      img = enemySpriteCanvas(def); w=76; h=64;
      bob = Math.sin(this.time*6 + e.uid) * (e.moving?4:1.8);
    }
    ctx.save();
    ctx.translate(e.pos.x, e.pos.y+bob);
    if(!img._hd2d && e.facing.x < -0.1) ctx.scale(-1,1);
    let alpha = e.dead ? Math.max(0, e.deathTimer/0.6) : 1;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, -w/2, -h+12, w, h);
    if(e.hitFlash>0){
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha = e.hitFlash*2;
      ctx.drawImage(img, -w/2, -h+12, w, h);
      ctx.globalCompositeOperation='source-over';
      e.hitFlash -= 1/60;
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    if(!e.dead){
      const barW = e.isBoss?70:32;
      ctx.fillStyle='#000'; ctx.fillRect(e.pos.x-barW/2, e.pos.y-h+2, barW, 5);
      ctx.fillStyle= e.isBoss ? '#c23b3b' : '#7fd97f';
      ctx.fillRect(e.pos.x-barW/2, e.pos.y-h+2, barW*Math.max(0,e.hp/e.maxHp), 5);
      if(e.isBoss){
        ctx.fillStyle='#ffe9c9'; ctx.font='10px Georgia'; ctx.textAlign='center';
        ctx.fillText(e.name, e.pos.x, e.pos.y-h-4);
      }
    }
  }

  drawAlly(ctx, a){
    ctx.save();
    ctx.translate(a.pos.x, a.pos.y);
    ctx.fillStyle = a.kind==='loup' ? '#8fa0a8' : '#c9c2b0';
    ctx.beginPath(); ctx.ellipse(0,-10,14,18,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  drawProjectile(ctx, p){
    const ang = Math.atan2(p.vel.y, p.vel.x);
    const r = p.radius;
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    ctx.rotate(ang);
    const type = p.fromPlayer ? (p.dmgType||'physique') : 'enemi';
    switch(type){
      case 'physique':
        ctx.fillStyle = '#7a5230';
        ctx.fillRect(-r*2.4, -1, r*1.9, 2);
        ctx.beginPath();
        ctx.moveTo(-r*2.4, 0); ctx.lineTo(-r*3.1, r*0.7); ctx.lineTo(-r*2.6, 0); ctx.lineTo(-r*3.1, -r*0.7);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(r*1.9, 0); ctx.lineTo(-r*0.5, r*0.9); ctx.lineTo(-r*0.5, -r*0.9);
        ctx.closePath(); ctx.fill();
        break;
      case 'feu':
        ctx.globalAlpha=0.35; ctx.fillStyle='#ff6a2b';
        ctx.beginPath(); ctx.arc(0,0,r*2,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
        for(let i=3;i>=1;i--){ ctx.globalAlpha=0.35/i; ctx.fillStyle='#ff8c2b'; ctx.beginPath(); ctx.arc(-r*1.3*i,0,Math.max(1,r*(1-i*0.22)),0,Math.PI*2); ctx.fill(); }
        ctx.globalAlpha=1;
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffec8c'; ctx.beginPath(); ctx.arc(0,0,r*0.5,0,Math.PI*2); ctx.fill();
        break;
      case 'glace':
        ctx.fillStyle = p.color; ctx.strokeStyle='#eaffff'; ctx.lineWidth=1;
        ctx.beginPath();
        ctx.moveTo(r*1.8,0); ctx.lineTo(r*0.1,r*0.9); ctx.lineTo(-r*1.4,0); ctx.lineTo(r*0.1,-r*0.9);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      case 'poison':
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(-r*0.3,-r*0.3,r*0.35,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(20,60,20,0.5)'; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
        break;
      case 'foudre':
        ctx.strokeStyle = p.color; ctx.lineWidth=2.4; ctx.lineJoin='round';
        ctx.beginPath();
        ctx.moveTo(r*2.2,0); ctx.lineTo(r*0.6,r*0.7); ctx.lineTo(r*1.0,0.4); ctx.lineTo(-r*0.8,r*0.8);
        ctx.lineTo(-r*0.3,-0.2); ctx.lineTo(-r*1.8,-r*0.7);
        ctx.stroke();
        break;
      case 'ombre':
        ctx.globalAlpha=0.3; ctx.fillStyle='#b34dff'; ctx.beginPath(); ctx.arc(0,0,r*1.9,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
        break;
      default:
        ctx.globalAlpha=0.3; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0,0,r*1.7,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(-r*0.25,-r*0.25,r*0.3,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  drawFx(ctx, f){
    if(f.type==='slash'){
      ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(f.x,f.y,f.radius*0.7, f.ang-0.9, f.ang+0.9); ctx.stroke();
    } else if(f.type==='pulse'){
      const t = f.age/f.life;
      ctx.strokeStyle = f.color || 'rgba(179,77,255,0.6)'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(f.x,f.y,f.radius*t,0,Math.PI*2); ctx.stroke();
    }
  }

  worldToScreen(wx, wy){
    return {
      x:(wx-this.camera.x)*this.camera.zoom,
      y:(wy-this.camera.y)*this.camera.zoom,
    };
  }
}
