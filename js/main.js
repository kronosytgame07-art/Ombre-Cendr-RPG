import { CLASSES, getClass } from './data/classes.js';
import { getSkillTree } from './data/skillTrees.js';
import { ZONES, getZone } from './data/zones.js';
import { drawHumanoid } from './engine/sprites.js';
import { preload, getImageSync } from './engine/assets.js';
import { createPlayer, playerSpriteCanvas } from './entities.js';
import { recomputeStats, grantXp } from './systems/leveling.js';
import { Game } from './game.js';
import { listSaveSlots, saveGame, loadGame, deleteSave, findFirstEmptySlot, saveOptions, loadOptions } from './systems/save.js';
import { renderInventory, renderSkillTree, renderCodex, renderWorldMap, renderShop, renderQuestGiver, renderQuestLog } from './panels.js';
import { setDifficulty } from './engine/difficulty.js';
import { setVolumes, unlockAudio, startMusic, playSfx } from './engine/audio.js';

const HERO_IMAGE_PATHS = [...CLASSES.flatMap(c=>[c.sprite, c.sheet].filter(Boolean)), 'assets/sprites/items/equipment_atlas.png', 'assets/tiles/terrain_atlas.png'];

let game = null;
let currentSlot = null;
let selectedClassId = CLASSES[0].id;
let options = loadOptions() || {music:40, sfx:60, difficulty:'cendre', uiScale:100, shake:true};
setDifficulty(options.difficulty);
setVolumes(options.sfx/100, options.music/100);
document.addEventListener('pointerdown', unlockAudio, {once:true});
document.addEventListener('keydown', unlockAudio, {once:true});

function $(id){ return document.getElementById(id); }
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(id).classList.add('active');
}
function applyOptionsToDom(){
  document.documentElement.style.setProperty('--ui-scale', (options.uiScale/100).toString());
  $('opt-music').value = options.music; $('opt-sfx').value = options.sfx;
  $('opt-difficulty').value = options.difficulty; $('opt-uiscale').value = options.uiScale;
  $('opt-shake').checked = options.shake;
}

// ============================= BOOT =============================
async function boot(){
  const fill = $('boot-fill');
  fill.style.width='10%';
  spawnEmbers();
  try{
    await preload(HERO_IMAGE_PATHS);
  }catch(e){ /* tant pis, fallback procédural */ }
  fill.style.width='100%';
  setTimeout(()=>{ applyOptionsToDom(); showScreen('screen-menu'); }, 250);
}
function spawnEmbers(){
  const layer = $('embers-layer');
  for(let i=0;i<28;i++){
    const e = document.createElement('div');
    e.className = 'ember-particle';
    e.style.left = Math.random()*100+'%';
    e.style.animationDuration = (6+Math.random()*8)+'s';
    e.style.animationDelay = (Math.random()*8)+'s';
    layer.appendChild(e);
  }
}

// ============================= MENU PRINCIPAL =============================
document.addEventListener('DOMContentLoaded', boot);

$('main-menu-list').addEventListener('click', (e)=>{
  const btn = e.target.closest('.menu-btn'); if(!btn) return;
  const action = btn.dataset.action;
  if(action==='continue'){
    const slots = listSaveSlots().filter(s=>!s.empty && !s.corrupted);
    if(slots.length){ slots.sort((a,b)=>b.savedAt-a.savedAt); loadSlot(slots[0].slot); }
    else showScreen('screen-charselect');
  }
  else if(action==='new'){ openCharSelect(); }
  else if(action==='load'){ renderLoadScreen(); showScreen('screen-load'); }
  else if(action==='options'){ showScreen('screen-options'); }
  else if(action==='codex'){ renderCodex($('codex-list-outer'), $('codex-content-outer'), fakePlayerForCodex()); showScreen('screen-codex'); }
  else if(action==='credits'){ showScreen('screen-credits'); }
});
function fakePlayerForCodex(){ return {codex:{bestiary:[]}, defeatedBosses:[], unlockedZones:[]}; }

$('btn-back-load').addEventListener('click', ()=>showScreen('screen-menu'));
$('btn-back-options').addEventListener('click', ()=>{ showScreen(game?'screen-game':'screen-menu'); if(game) $('panel-pause').classList.add('open'); });
$('btn-back-codex').addEventListener('click', ()=>showScreen('screen-menu'));
$('btn-back-credits').addEventListener('click', ()=>showScreen('screen-menu'));

['opt-music','opt-sfx','opt-difficulty','opt-uiscale','opt-shake'].forEach(id=>{
  $(id).addEventListener('input', ()=>{
    options = {
      music:+$('opt-music').value, sfx:+$('opt-sfx').value, difficulty:$('opt-difficulty').value,
      uiScale:+$('opt-uiscale').value, shake:$('opt-shake').checked,
    };
    applyOptionsToDom(); saveOptions(options); setDifficulty(options.difficulty);
    setVolumes(options.sfx/100, options.music/100);
    if(game) game.shakeEnabled = options.shake;
  });
});

// ============================= CHARGER PARTIE =============================
function renderLoadScreen(){
  const container = $('save-slots');
  container.innerHTML = '';
  const slots = listSaveSlots();
  if(slots.every(s=>s.empty)){
    container.innerHTML = '<div class="save-empty">Aucune sauvegarde pour le moment. Commencez une nouvelle partie.</div>';
    return;
  }
  for(const s of slots){
    if(s.empty) continue;
    const el = document.createElement('div');
    el.className = 'save-slot';
    const cls = s.classId ? getClass(s.classId) : null;
    el.innerHTML = `<div><div class="ss-name">${s.corrupted?'Sauvegarde corrompue':s.name}</div>
      <div class="ss-meta">${s.corrupted?'':`Niv. ${s.level} — ${cls?cls.name:''} — ${getZone(s.zone)?getZone(s.zone).name:''}`}</div></div>
      <div class="ss-del">Supprimer</div>`;
    el.addEventListener('click', (e)=>{
      if(e.target.classList.contains('ss-del')){ deleteSave(s.slot); renderLoadScreen(); return; }
      if(!s.corrupted) loadSlot(s.slot);
    });
    container.appendChild(el);
  }
}
function loadSlot(slot){
  const data = loadGame(slot);
  if(!data) return;
  currentSlot = slot;
  const player = data.player;
  if(!player.quests) player.quests = {}; // compat sauvegardes antérieures aux quêtes
  recomputeStats(player);
  startGameWithPlayer(player);
}

// ============================= CHOIX DE PERSONNAGE =============================
function openCharSelect(){
  const grid = $('class-grid');
  grid.innerHTML = '';
  for(const cls of CLASSES){
    const card = document.createElement('div');
    card.className = 'class-card' + (cls.id===selectedClassId?' selected':'');
    const canvasHolder = document.createElement('div');
    appendPortrait(canvasHolder, cls);
    card.appendChild(canvasHolder);
    const name = document.createElement('div'); name.className='cname'; name.textContent = cls.name;
    const role = document.createElement('div'); role.className='crole'; role.textContent = cls.role;
    card.appendChild(name); card.appendChild(role);
    card.addEventListener('click', ()=>{ selectedClassId = cls.id; openCharSelect(); });
    grid.appendChild(card);
  }
  renderClassDetail(getClass(selectedClassId));
  showScreen('screen-charselect');
}
function appendPortrait(holder, cls){
  const img = getImageSync(cls.sprite);
  if(img){
    const im = document.createElement('img');
    im.src = cls.sprite; im.style.width='96px'; im.style.height='96px'; im.style.imageRendering='pixelated';
    holder.appendChild(im);
  } else {
    const c = drawHumanoid({w:96,h:96,skin:cls.palette.skin, cloth:cls.palette.cloth, accent:cls.palette.accent,
      trim:cls.palette.trim, hair:cls.palette.hair, weapon:cls.weapon, hood:cls.hood, cloak:cls.cloak, armor:cls.armorStyle});
    holder.appendChild(c);
  }
}
function renderClassDetail(cls){
  $('class-name').textContent = cls.name;
  $('class-tagline').textContent = cls.tagline;
  $('class-bio').textContent = cls.bio;
  $('class-portrait-canvas').innerHTML=''; appendPortrait($('class-portrait-canvas'), cls);
  $('class-stats').innerHTML = `
    <div>Force ${cls.baseStats.force}</div><div>Dextérité ${cls.baseStats.dexterite}</div>
    <div>Intelligence ${cls.baseStats.intelligence}</div><div>Vitalité ${cls.baseStats.vitalite}</div>
    <div>Ressource : ${cls.resource}</div>`;
  const tree = getSkillTree(cls.id);
  const branchesEl = $('class-branches'); branchesEl.innerHTML='';
  for(const bid of cls.branches){
    const t1 = tree.nodes.find(n=>n.branch===bid && n.tier===1);
    const chip = document.createElement('div');
    chip.className = 'branch-chip';
    chip.innerHTML = `<b>${tree.branchNames[bid]}</b><br>${t1.name} — ${t1.desc}`;
    branchesEl.appendChild(chip);
  }
}
$('btn-back-charselect').addEventListener('click', ()=>showScreen('screen-menu'));
$('btn-confirm-class').addEventListener('click', ()=>{
  const name = $('hero-name-input').value.trim();
  const player = createPlayer(selectedClassId, name || null);
  currentSlot = findFirstEmptySlot();
  startGameWithPlayer(player);
});

// ============================= JEU =============================
function startGameWithPlayer(player){
  showScreen('screen-game');
  const canvas = $('game-canvas');
  game = new Game(canvas, player);
  game.shakeEnabled = options.shake;
  game.enterZone(player.currentZone && getZone(player.currentZone) ? player.currentZone : 'refuge');
  buildSkillBarSlots();
  window.__game = game;
  unlockAudio(); startMusic();
  requestAnimationFrame(loop);
}

let lastTs = null;
function loop(ts){
  if(!game){ return; }
  if(lastTs==null) lastTs = ts;
  const dt = Math.min(0.05, (ts-lastTs)/1000);
  lastTs = ts;
  game.paused = anyPanelOpen();
  game.update(dt);
  game.render();
  processNotices();
  updateHud();
  requestAnimationFrame(loop);
}

function processNotices(){
  while(game.pendingNotices.length){
    const n = game.pendingNotices.shift();
    if(n.type==='banner') showBanner(n.text);
    else if(n.type==='unlock') showBanner(`Zone débloquée : ${n.zoneName}`);
    else if(n.type==='bossintro') showBanner(n.name, n.text);
    else if(n.type==='bossdown') showBanner(`${n.name} est vaincu !`);
    else if(n.type==='victory') openPanel('panel-victory');
    else if(n.type==='death') openPanel('panel-death');
    else if(n.type==='loot') showLootChip(n.item);
    else if(n.type==='inventoryfull') showHint('Inventaire plein !');
    else if(n.type==='npc') openDialogue(n.npc);
  }
  for(const ev of game.pendingLevelEvents.splice(0)){
    showBanner(`Niveau ${ev.level} !`);
    playSfx('levelup');
  }
}
let bannerTimer=null;
function showBanner(text, sub){
  const el = $('zone-banner');
  el.innerHTML = text + (sub?`<div style="font-size:0.5em;color:#a89a86;margin-top:6px;max-width:520px;">${sub}</div>`:'');
  el.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(()=>el.classList.remove('show'), sub?4500:2200);
}
let hintTimer=null;
function showHint(text){
  const el = $('tutorial-hint'); el.textContent = text; el.classList.add('show');
  clearTimeout(hintTimer); hintTimer = setTimeout(()=>el.classList.remove('show'), 1800);
}
function showLootChip(item){
  playSfx('pickup');
  const popup = $('loot-popup');
  const chip = document.createElement('div');
  chip.className = 'loot-chip rarity-'+({commun:'common',magique:'magic',rare:'rare',epique:'epic',legendaire:'legend'}[item.rarity]);
  chip.textContent = item.name;
  popup.appendChild(chip);
  setTimeout(()=>chip.remove(), 3000);
}

function buildSkillBarSlots(){
  const bar = $('skill-bar');
  bar.innerHTML='';
  const keys = ['1','2','3','4','5'];
  for(let i=0;i<5;i++){
    const slot = document.createElement('div');
    slot.className = 'skill-slot';
    slot.dataset.idx = i;
    slot.innerHTML = `<span class="key">${keys[i]}</span>`;
    bar.appendChild(slot);
  }
}

function updateHud(){
  const p = game.player;
  const s = p.stats;
  $('orb-health-fill').style.height = Math.max(0,(p.hp/s.maxHp*100))+'%';
  $('orb-health-text').textContent = `${Math.max(0,Math.round(p.hp))}/${s.maxHp}`;
  $('orb-mana-fill').style.height = Math.max(0,(p.resource/s.maxResource*100))+'%';
  $('orb-mana-text').textContent = `${Math.max(0,Math.round(p.resource))}/${s.maxResource}`;
  $('hud-hero-name').textContent = p.name;
  $('hud-level').textContent = `Niv. ${p.level}`;
  $('xp-fill').style.width = Math.min(100, p.xp/p.xpToNext*100)+'%';
  $('minimap-zone-label').textContent = game.zone ? game.zone.name : '';
  const hint = $('interact-hint');
  if(game.nearbyNpc){ hint.classList.add('show'); $('interact-name').textContent = game.nearbyNpc.name; }
  else hint.classList.remove('show');

  const bar = $('skill-bar');
  bar.querySelectorAll('.skill-slot').forEach((slot, i)=>{
    slot.classList.toggle('basic', i===0 || i===4);
    let label = '';
    let ready = true;
    let empty = false;
    if(i===0){ label='⚔'; }
    else if(i===4){ label = p.potions.vie>0 ? '❤'+p.potions.vie : '❤'; }
    else{
      const skillId = p.hotbar[i];
      const tree = getSkillTree(p.classId);
      const node = tree.nodes.find(n=>n.effect && n.effect.skillId===skillId);
      if(!node || !(p.skills[node.id]>0)){ empty = true; label='?'; }
      else{
        label = node.name.slice(0,2);
        const cd = p.cooldowns[skillId]||0;
        if(cd>0){ ready=false; }
      }
    }
    slot.classList.toggle('empty', empty);
    slot.classList.toggle('ready', ready && !empty);
    slot.innerHTML = `<span class="key">${i+1}</span>${label}`;
    if(!ready){
      const skillId = p.hotbar[i];
      const cd = document.createElement('div'); cd.className='cd'; cd.textContent = Math.ceil(p.cooldowns[skillId]);
      slot.appendChild(cd);
    }
  });

  // textes flottants (rendu DOM simple, resynchronisé chaque frame)
  const ft = $('floating-texts');
  ft.innerHTML='';
  for(const t of game.floatingTexts){
    const pos = game.worldToScreen(t.x, t.y);
    const div = document.createElement('div');
    div.className = 'ftext';
    div.style.left = pos.x+'px'; div.style.top = pos.y+'px';
    div.style.color = t.dmgType==='subi' ? '#ff5555' : t.crit ? '#ffd85a' : t.dmgType==='or' ? '#d8b45a' : t.dmgType==='esquive' ? '#8fe0ff' : '#fff';
    div.textContent = t.text;
    ft.appendChild(div);
  }

  drawMinimap();
}

function drawMinimap(){
  const canvas = $('minimap-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 150; canvas.height = 150;
  ctx.fillStyle = '#100d0b'; ctx.fillRect(0,0,150,150);
  if(!game.map) return;
  const scale = 150/Math.max(game.map.w, game.map.h);
  ctx.fillStyle = '#3c322d';
  for(let y=0;y<game.map.h;y+=2) for(let x=0;x<game.map.w;x+=2){
    if(game.map.grid[y][x]===1) ctx.fillRect(x*scale,y*scale,scale*2,scale*2);
  }
  const px = game.player.pos.x/40*scale, py = game.player.pos.y/40*scale;
  ctx.fillStyle = '#ff8c2b'; ctx.beginPath(); ctx.arc(px,py,3,0,Math.PI*2); ctx.fill();
  for(const e of game.enemies){
    if(e.dead) continue;
    ctx.fillStyle = e.isBoss ? '#ff2b6a' : '#c23b3b';
    ctx.beginPath(); ctx.arc(e.pos.x/40*scale, e.pos.y/40*scale, e.isBoss?3:1.6, 0, Math.PI*2); ctx.fill();
  }
}

function drawBigMap(){
  if(!game.map) return;
  $('bigmap-title').textContent = game.zone ? `Carte — ${game.zone.name}` : 'Carte de la Zone';
  const canvas = $('bigmap-canvas');
  const cell = 6;
  canvas.width = game.map.w*cell; canvas.height = game.map.h*cell;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d0a09'; ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let y=0;y<game.map.h;y++) for(let x=0;x<game.map.w;x++){
    ctx.fillStyle = game.map.grid[y][x]===1 ? '#4a3f37' : '#221c19';
    ctx.fillRect(x*cell,y*cell,cell,cell);
  }
  if(game.map.portal){
    ctx.fillStyle = game.zone.isFinal ? '#8a1fff' : '#ff8c2b';
    ctx.beginPath(); ctx.arc((game.map.portal.x+0.5)*cell,(game.map.portal.y+0.5)*cell, cell*1.4, 0, Math.PI*2); ctx.fill();
  }
  for(const c of game.pickups){
    if(c.kind!=='chest' || c.payload.opened) continue;
    ctx.fillStyle = '#d8b45a';
    ctx.fillRect(c.pos.x/40*cell-cell*0.5, c.pos.y/40*cell-cell*0.5, cell, cell);
  }
  ctx.fillStyle = '#ff8c2b';
  ctx.beginPath(); ctx.arc(game.player.pos.x/40*cell, game.player.pos.y/40*cell, cell*1.1, 0, Math.PI*2); ctx.fill();
}

// ---------------- Panneaux ----------------
function refreshInventory(){ renderInventory(game.player, refreshInventory); }
function refreshSkillTree(){ renderSkillTree(game.player, refreshSkillTree); }

let currentNpc = null;
function openDialogue(npc){
  currentNpc = npc;
  openPanel('panel-npc');
}
function refreshNpcBody(){
  if(!currentNpc) return;
  if(currentNpc.role==='quete') renderQuestGiver(currentNpc, game.player, refreshNpcBody, handleQuestRewardXp);
  else renderShop(currentNpc, game.player, refreshNpcBody);
}
function handleQuestRewardXp(xp){
  playSfx('questcomplete');
  if(xp>0){
    const events = grantXp(game.player, xp);
    game.pendingLevelEvents.push(...events);
  }
}

function openPanel(id){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('open'));
  $(id).classList.add('open');
  if(id==='panel-inventory') refreshInventory();
  else if(id==='panel-skills') refreshSkillTree();
  else if(id==='panel-codex') renderCodex($('codex-list-inner'), $('codex-content-inner'), game.player);
  else if(id==='panel-map'){
    drawBigMap();
    renderWorldMap(game.player, (zoneId)=>{ game.enterZone(zoneId); closePanels(); });
  }
  else if(id==='panel-questlog') renderQuestLog(game.player);
  else if(id==='panel-npc'){
    $('npc-name').textContent = currentNpc.name;
    $('npc-greeting').textContent = currentNpc.greeting;
    refreshNpcBody();
  }
}
function closePanels(){ document.querySelectorAll('.panel').forEach(p=>p.classList.remove('open')); }
function anyPanelOpen(){ return !!document.querySelector('.panel.open'); }
function togglePanel(id){
  if($(id).classList.contains('open')) closePanels();
  else openPanel(id);
}

document.addEventListener('click', (e)=>{
  const closeBtn = e.target.closest('.panel-close');
  if(closeBtn) closePanels();
  const openBtn = e.target.closest('[id^="btn-open-"]');
  if(openBtn){
    const map = {'btn-open-inventory':'panel-inventory','btn-open-skills':'panel-skills','btn-open-quests':'panel-questlog','btn-open-codex':'panel-codex','btn-open-map':'panel-map','btn-open-pause':'panel-pause'};
    const target = map[openBtn.id];
    if(target) togglePanel(target);
  }
  if(e.target.closest('#minimap')) togglePanel('panel-map');
});

window.addEventListener('keydown', (e)=>{
  if(!game) return;
  const k = e.key.toLowerCase();
  if(k==='i') togglePanel('panel-inventory');
  else if(k==='k') togglePanel('panel-skills');
  else if(k==='l') togglePanel('panel-questlog');
  else if(k==='j') togglePanel('panel-codex');
  else if(k==='m') togglePanel('panel-map');
  else if(k==='escape'){ anyPanelOpen() ? closePanels() : togglePanel('panel-pause'); }
});

$('btn-resume').addEventListener('click', closePanels);
$('btn-save-game').addEventListener('click', ()=>{
  if(currentSlot==null) currentSlot = findFirstEmptySlot();
  saveGame(currentSlot, {player: game.player});
  showHint('Partie sauvegardée.');
});
$('btn-pause-options').addEventListener('click', ()=>showScreen('screen-options'));
$('btn-quit-menu').addEventListener('click', ()=>{
  closePanels();
  showScreen('screen-menu');
});
$('btn-respawn').addEventListener('click', ()=>{
  closePanels();
  game.player.hp = game.player.stats.maxHp;
  game.player.resource = game.player.stats.maxResource;
  game.enterZone('refuge');
  $('panel-death').classList.remove('open');
});
$('btn-victory-continue').addEventListener('click', ()=>{ $('panel-victory').classList.remove('open'); });
$('btn-victory-menu').addEventListener('click', ()=>{ $('panel-victory').classList.remove('open'); showScreen('screen-menu'); });
