import { getClass } from './data/classes.js';
import { getSkillTree } from './data/skillTrees.js';
import { allocateSkill, allocateAttribute, canAllocateSkill } from './systems/leveling.js';
import { ENEMY_TYPES, BOSSES } from './data/enemies.js';
import { WORLD_LORE, BESTIARY_INTRO } from './data/lore.js';
import { CLASSES } from './data/classes.js';
import { ZONES, getZone } from './data/zones.js';
import { drawItemIcon } from './engine/sprites.js';
import { generateItem } from './data/items.js';
import { Rng } from './engine/rng.js';
import { QUESTS } from './data/quests.js';
import { acceptQuest, turnInQuest } from './systems/quests.js';

const EQUIP_SLOTS = [
  {key:'casque', label:'Casque'}, {key:'amulette', label:'Amulette'},
  {key:'plastron', label:'Plastron'}, {key:'arme', label:'Arme'},
  {key:'gants', label:'Gants'}, {key:'bouclier', label:'Bouclier'},
  {key:'ceinture', label:'Ceinture'}, {key:'anneau1', label:'Anneau'},
  {key:'bottes', label:'Bottes'}, {key:'anneau2', label:'Anneau'},
];

function iconCanvas(item, size=48){
  const c = drawItemIcon(item.icon, item.rarity==='commun'?'#c9c9c9':(item.rarityColor||'#c9c9c9'), item.rarityColor||'#888');
  return c;
}

function itemTooltipHtml(item){
  let html = `<div class="it-name rarity-${rarityCls(item.rarity)}">${item.name}</div>`;
  html += `<div class="it-type">${slotLabel(item.slot)}${item.itemLevel?(' — Niv. objet '+item.itemLevel):''}</div>`;
  if(item.dmgMin) html += `<div class="it-stat">Dégâts : ${item.dmgMin}-${item.dmgMax}</div>`;
  if(item.armor) html += `<div class="it-stat">Armure : ${item.armor}</div>`;
  for(const a of (item.affixes||[])) html += `<div class="it-stat">${a.text}</div>`;
  if(item.specialText) html += `<div class="it-stat">${item.specialText}</div>`;
  if(item.lore) html += `<div class="it-lore">"${item.lore}"</div>`;
  return html;
}
function rarityCls(r){ return {commun:'common',magique:'magic',rare:'rare',epique:'epic',legendaire:'legend'}[r]||'common'; }
function slotLabel(slot){
  return {arme:'Arme', bouclier:'Bouclier', casque:'Casque', plastron:'Plastron', gants:'Gants',
    bottes:'Bottes', ceinture:'Ceinture', anneau:'Anneau', amulette:'Amulette'}[slot] || slot;
}

export function initTooltip(){
  return document.getElementById('item-tooltip');
}
export function showTooltip(tooltipEl, item, x, y){
  tooltipEl.innerHTML = itemTooltipHtml(item);
  tooltipEl.style.display = 'block';
  tooltipEl.style.left = Math.min(x+14, window.innerWidth-270)+'px';
  tooltipEl.style.top = Math.min(y+14, window.innerHeight-200)+'px';
}
export function hideTooltip(tooltipEl){ tooltipEl.style.display='none'; }

// ---------------------------------------------------------------------
// INVENTAIRE + FICHE PERSONNAGE
// ---------------------------------------------------------------------
export function renderInventory(player, onChange){
  const doll = document.getElementById('equip-doll');
  const grid = document.getElementById('inv-grid');
  const sheet = document.getElementById('char-sheet');
  const tooltip = initTooltip();
  doll.innerHTML=''; grid.innerHTML=''; sheet.innerHTML='';

  for(const slotDef of EQUIP_SLOTS){
    const el = document.createElement('div');
    el.className = 'equip-slot' + (player.equipment[slotDef.key] ? ' filled' : '');
    const item = player.equipment[slotDef.key];
    if(item){
      const cv = iconCanvas(item);
      cv.style.width='100%'; cv.style.height='100%';
      el.appendChild(cv);
      el.addEventListener('mousemove', e=>showTooltip(tooltip, item, e.clientX, e.clientY));
      el.addEventListener('mouseleave', ()=>hideTooltip(tooltip));
      el.addEventListener('click', ()=>{
        const freeIdx = player.inventory.findIndex(x=>x===null);
        if(freeIdx===-1) return;
        player.inventory[freeIdx] = item;
        player.equipment[slotDef.key] = null;
        onChange();
      });
    } else {
      el.textContent = slotDef.label;
    }
    doll.appendChild(el);
  }

  for(let i=0;i<player.inventory.length;i++){
    const item = player.inventory[i];
    const cell = document.createElement('div');
    cell.className = 'inv-cell' + (item ? ' q'+rarityCls(item.rarity) : '');
    if(item){
      const cv = iconCanvas(item);
      cell.appendChild(cv);
      cell.addEventListener('mousemove', e=>showTooltip(tooltip, item, e.clientX, e.clientY));
      cell.addEventListener('mouseleave', ()=>hideTooltip(tooltip));
      cell.addEventListener('click', ()=>{
        const slotKey = item.slot==='anneau' ? (player.equipment.anneau1?(player.equipment.anneau2?'anneau1':'anneau2'):'anneau1') : item.slot;
        const prev = player.equipment[slotKey];
        player.equipment[slotKey] = item;
        player.inventory[i] = prev;
        onChange();
      });
    }
    grid.appendChild(cell);
  }

  renderCharSheet(sheet, player, onChange);
}

function renderCharSheet(sheet, player, onChange){
  const cls = getClass(player.classId);
  const s = player.stats;
  const rows = [
    ['Niveau', player.level], ['Classe', cls.name],
    ['PV', `${Math.round(player.hp)} / ${s.maxHp}`],
    [cls.resource==='mana'?'Mana':(cls.resource==='rage'?'Rage':'Énergie'), `${Math.round(player.resource)} / ${s.maxResource}`],
    ['Dégâts', `${s.dmgMin}-${s.dmgMax}`], ['Armure', s.armor],
    ['Critique', `${s.critChance.toFixed(1)}%`], ['Dégâts critiques', `${s.critDmg.toFixed(0)}%`],
    ['Vitesse d\'attaque', `${(s.atkSpeed*100).toFixed(0)}%`],
    ['Or', player.gold],
  ];
  let html = '<h4>Personnage</h4>';
  for(const [k,v] of rows) html += `<div class="row"><span>${k}</span><b>${v}</b></div>`;

  html += `<h4>Attributs${player.attributePoints>0?` (+${player.attributePoints})`:''}</h4>`;
  sheet.innerHTML = html;

  const attrNames = {force:'Force', dexterite:'Dextérité', intelligence:'Intelligence', vitalite:'Vitalité'};
  for(const key in attrNames){
    const row = document.createElement('div');
    row.className = 'attr-row row';
    row.innerHTML = `<span>${attrNames[key]}</span><b>${Math.round(player.stats.attr[key])}</b>`;
    if(player.attributePoints>0){
      const btn = document.createElement('button');
      btn.className='attr-plus'; btn.textContent='+';
      btn.addEventListener('click', ()=>{ allocateAttribute(player, key); onChange(); });
      row.appendChild(btn);
    }
    sheet.appendChild(row);
  }

  const potRow = document.createElement('div');
  potRow.innerHTML = `<h4>Potions</h4><div class="row"><span>Vie (R)</span><b>${player.potions.vie}</b></div><div class="row"><span>Ressource (F)</span><b>${player.potions.mana}</b></div>`;
  sheet.appendChild(potRow);
}

// ---------------------------------------------------------------------
// ARBRE DE COMPETENCES
// ---------------------------------------------------------------------
export function renderSkillTree(player, onChange){
  const wrap = document.getElementById('skilltree-nodes');
  const canvas = document.getElementById('skilltree-canvas');
  const detail = document.getElementById('skill-detail');
  const pointsLabel = document.getElementById('skill-points-label');
  pointsLabel.textContent = `${player.skillPoints} point(s) disponible(s)`;

  const tree = getSkillTree(player.classId);
  const cx = 420, cy = 320;
  const tierGap = 95;
  const branchAngles = {};
  const branches = [...new Set(tree.nodes.filter(n=>n.branch!=='core').map(n=>n.branch))];
  branches.forEach((b,i)=>{ branchAngles[b] = -Math.PI/2 + i*(2*Math.PI/branches.length); });

  const positions = {};
  for(const node of tree.nodes){
    if(node.branch==='core'){ positions[node.id] = {x:cx, y:cy}; continue; }
    const ang = branchAngles[node.branch];
    const r = node.tier*tierGap;
    const jitter = (node.tier%2===0)?0.12:-0.12;
    positions[node.id] = {x: cx+Math.cos(ang+jitter)*r, y: cy+Math.sin(ang+jitter)*r};
  }

  const maxX = Math.max(...Object.values(positions).map(p=>p.x))+60;
  const maxY = Math.max(...Object.values(positions).map(p=>p.y))+60;
  canvas.width = maxX; canvas.height = maxY;
  wrap.style.width = maxX+'px'; wrap.style.height = maxY+'px';
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = '#4a3d35'; ctx.lineWidth = 3;
  for(const node of tree.nodes){
    if(!node.requires) continue;
    const a = positions[node.id], b = positions[node.requires];
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
  }

  wrap.innerHTML = '';
  for(const node of tree.nodes){
    const rank = player.skills[node.id]||0;
    const unlockable = canAllocateSkill(player, tree, node);
    const div = document.createElement('div');
    div.className = 'skill-node ' + (rank>0?'owned':(unlockable?'unlockable':'locked'));
    const pos = positions[node.id];
    div.style.left = (pos.x-26)+'px'; div.style.top = (pos.y-26)+'px';
    div.textContent = nodeIcon(node);
    if(node.maxRank>1){
      const rankEl = document.createElement('div'); rankEl.className='rank'; rankEl.textContent = `${rank}/${node.maxRank}`;
      div.appendChild(rankEl);
    }
    div.addEventListener('mouseenter', ()=> showSkillDetail(detail, node, rank));
    div.addEventListener('click', ()=>{
      if(allocateSkill(player, player.classId, node.id)){ onChange(); }
    });
    wrap.appendChild(div);
  }
  if(tree.nodes[0]) showSkillDetail(detail, tree.nodes[0], player.skills[tree.nodes[0].id]||0);
}

function nodeIcon(node){
  if(node.branch==='core') return '✦';
  if(node.type==='active') return '⚔';
  if(node.type==='capstone') return '★';
  return '●';
}
function showSkillDetail(detail, node, rank){
  detail.innerHTML = `<h4>${node.name} ${node.maxRank>1?`(${rank}/${node.maxRank})`:''}</h4><p>${node.desc}</p>`;
}

// ---------------------------------------------------------------------
// CODEX
// ---------------------------------------------------------------------
export function renderCodex(listEl, contentEl, player){
  listEl.innerHTML = '';
  const setContent = (title, html)=>{ contentEl.innerHTML = `<h3>${title}</h3>${html}`; };

  addCategory(listEl, 'Le Monde', WORLD_LORE.map(l=>({id:l.id, title:l.title, locked:false,
    onClick:()=>setContent(l.title, `<p>${l.text.replace(/\n/g,' ')}</p>`)})));

  addCategory(listEl, 'Vocations', CLASSES.map(c=>({id:c.id, title:c.name, locked:false,
    onClick:()=>setContent(c.name, `<p><i>${c.tagline}</i></p><p>${c.bio.replace(/\n/g,' ')}</p>`)})));

  const bestiaryItems = [];
  for(const id in ENEMY_TYPES){
    const def = ENEMY_TYPES[id];
    const unlocked = player.codex.bestiary.includes(id);
    bestiaryItems.push({id, title: unlocked?def.name:'???', locked:!unlocked,
      onClick:()=> unlocked && setContent(def.name, `<p>${def.bestiary}</p>`)});
  }
  for(const id in BOSSES){
    const def = BOSSES[id];
    const unlocked = player.defeatedBosses.includes(id) || player.codex.bestiary.includes(id);
    bestiaryItems.push({id, title: unlocked?def.name:'??? (Boss)', locked:!unlocked,
      onClick:()=> unlocked && setContent(def.name, `<p>${def.bestiary}</p>`)});
  }
  addCategory(listEl, 'Bestiaire', bestiaryItems, BESTIARY_INTRO);

  addCategory(listEl, 'Zones', ZONES.filter(z=>z.kind!=='town').map(z=>({id:z.id, title: player.unlockedZones.includes(z.id)?z.name:'???',
    locked: !player.unlockedZones.includes(z.id),
    onClick:()=> setContent(z.name, `<p>${z.blurb}</p>`)})));

  if(listEl.children.length===0) return;
  setContent('Bienvenue', '<p>Sélectionnez une entrée à gauche.</p>');
}

function addCategory(listEl, label, items, intro){
  const cat = document.createElement('div');
  cat.className = 'codex-cat';
  cat.textContent = label;
  listEl.appendChild(cat);
  for(const it of items){
    const el = document.createElement('div');
    el.className = 'codex-item' + (it.locked?' locked':'');
    el.textContent = it.title;
    if(!it.locked) el.addEventListener('click', ()=>{
      listEl.querySelectorAll('.codex-item').forEach(x=>x.classList.remove('active'));
      el.classList.add('active');
      it.onClick();
    });
    listEl.appendChild(el);
  }
}

// ---------------------------------------------------------------------
// CARTE DU MONDE
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// PNJ — BOUTIQUE (marchande / forgeron)
// ---------------------------------------------------------------------
const SELL_RARITY_MULT = {commun:1, magique:2, rare:4, epique:8, legendaire:16};
function priceForItem(item){ return Math.max(8, Math.round((item.itemLevel||1) * 9 * (SELL_RARITY_MULT[item.rarity]||1))); }
function sellValueForItem(item){ return Math.max(4, Math.round(priceForItem(item)*0.4)); }

function generateShopStock(npc, playerLevel){
  const rng = new Rng((Date.now() ^ (npc.id.length*7919)) >>> 0);
  const lvl = Math.max(1, playerLevel);
  const pool = npc.role==='forgeron'
    ? ['epee','hache','dague','arc','baton','sceptre','casque','plastron','gants','bottes','ceinture','bouclier']
    : ['casque','gants','bottes','ceinture','anneau','amulette'];
  const n = npc.role==='forgeron' ? 6 : 4;
  const items = [];
  for(let i=0;i<n;i++){
    const baseType = rng.pick(pool);
    const roll = rng.next();
    const rarity = roll<0.1 ? 'rare' : (roll<0.4 ? 'magique' : 'commun');
    items.push(generateItem({baseType, itemLevel: Math.max(1, lvl+rng.int(-1,2)), rarity, rng}));
  }
  return items;
}

function shopCard(item, price, tooltip, onClick){
  const card = document.createElement('div');
  card.className = 'shop-card q'+rarityCls(item.rarity);
  card.appendChild(iconCanvas(item));
  const name = document.createElement('div'); name.className='sc-name'; name.textContent = item.name;
  card.appendChild(name);
  const priceEl = document.createElement('div'); priceEl.className='sc-price'; priceEl.textContent = `${price} or`;
  card.appendChild(priceEl);
  card.addEventListener('mousemove', e=>showTooltip(tooltip, item, e.clientX, e.clientY));
  card.addEventListener('mouseleave', ()=>hideTooltip(tooltip));
  card.addEventListener('click', onClick);
  return card;
}

function potionCard(kind, price, label, player, onChange){
  const card = document.createElement('div'); card.className='shop-card qcommon';
  card.appendChild(drawItemIcon(kind==='vie'?'potion_vie':'potion_mana', '#7fd97f', '#7fd97f'));
  const name = document.createElement('div'); name.className='sc-name'; name.textContent = label;
  card.appendChild(name);
  const priceEl = document.createElement('div'); priceEl.className='sc-price'; priceEl.textContent = `${price} or`;
  card.appendChild(priceEl);
  card.addEventListener('click', ()=>{
    if(player.gold < price) return;
    player.gold -= price;
    player.potions[kind] = (player.potions[kind]||0)+1;
    onChange();
  });
  return card;
}

export function renderShop(npc, player, onChange){
  const body = document.getElementById('npc-body');
  body.innerHTML = '';
  const tooltip = initTooltip();

  if(npc.role==='marchand'){
    const potSection = document.createElement('div'); potSection.className='shop-section';
    potSection.innerHTML = '<h4>Potions</h4>';
    body.appendChild(potSection);
    const potGrid = document.createElement('div'); potGrid.className='shop-grid';
    potGrid.appendChild(potionCard('vie', 30, 'Fiole de Vie', player, onChange));
    potGrid.appendChild(potionCard('mana', 28, 'Fiole de Ressource', player, onChange));
    body.appendChild(potGrid);
  }

  if(!npc.stock) npc.stock = generateShopStock(npc, player.level);
  const stockSection = document.createElement('div'); stockSection.className='shop-section';
  stockSection.innerHTML = `<h4>${npc.role==='forgeron'?'Étal du forgeron':'Marchandises'}</h4>`;
  body.appendChild(stockSection);
  const grid = document.createElement('div'); grid.className='shop-grid';
  for(const item of npc.stock){
    const price = priceForItem(item);
    grid.appendChild(shopCard(item, price, tooltip, ()=>{
      if(player.gold < price) return;
      const freeIdx = player.inventory.findIndex(x=>x===null);
      if(freeIdx===-1) return;
      player.gold -= price;
      player.inventory[freeIdx] = item;
      npc.stock = npc.stock.filter(x=>x!==item);
      onChange();
    }));
  }
  body.appendChild(grid);

  const sellSection = document.createElement('div'); sellSection.className='shop-section'; sellSection.innerHTML='<h4>Vendre depuis votre sac</h4>';
  body.appendChild(sellSection);
  const sellGrid = document.createElement('div'); sellGrid.className='shop-grid';
  let hasSellable = false;
  player.inventory.forEach((item, i)=>{
    if(!item) return;
    hasSellable = true;
    const value = sellValueForItem(item);
    sellGrid.appendChild(shopCard(item, value, tooltip, ()=>{
      player.gold += value;
      player.inventory[i] = null;
      onChange();
    }));
  });
  if(!hasSellable){ const empty=document.createElement('div'); empty.className='shop-empty'; empty.textContent="Rien à vendre pour l'instant."; sellGrid.appendChild(empty); }
  body.appendChild(sellGrid);
}

// ---------------------------------------------------------------------
// PNJ — DONNEUR DE QUÊTES
// ---------------------------------------------------------------------
export function renderQuestGiver(npc, player, onChange, onRewardXp){
  const body = document.getElementById('npc-body');
  body.innerHTML = '';
  const list = document.createElement('div'); list.className = 'quest-list';
  for(const qid of npc.questIds||[]){
    const def = QUESTS[qid];
    if(!def) continue;
    const state = player.quests[qid];
    const row = document.createElement('div'); row.className = 'quest-row';
    let statusHtml;
    if(!state){
      statusHtml = `<div class="q-desc">${def.desc}</div><div class="q-reward">Récompense : ${def.reward.gold} or, ${def.reward.xp} XP</div>`;
    } else if(state.turnedIn){
      statusHtml = `<div class="q-desc">${def.desc}</div><div class="q-done">Terminée.</div>`;
    } else if(state.done){
      statusHtml = `<div class="q-desc">${def.desc}</div><div class="q-ready">Prête à être rendue !</div>`;
    } else {
      statusHtml = `<div class="q-desc">${def.desc}</div><div class="q-progress">Progression : ${state.progress}/${def.count}</div>`;
    }
    row.innerHTML = `<h4>${def.name}</h4>${statusHtml}`;
    if(!state){
      const btn = document.createElement('button'); btn.className='menu-btn small'; btn.textContent='Accepter';
      btn.addEventListener('click', ()=>{ acceptQuest(player, qid); onChange(); });
      row.appendChild(btn);
    } else if(state.done && !state.turnedIn){
      const btn = document.createElement('button'); btn.className='menu-btn small'; btn.textContent='Rendre la quête';
      btn.addEventListener('click', ()=>{
        const xp = turnInQuest(player, qid);
        if(xp!=null) onRewardXp(xp);
        onChange();
      });
      row.appendChild(btn);
    }
    list.appendChild(row);
  }
  body.appendChild(list);
}

export function renderWorldMap(player, onTravel){
  const list = document.getElementById('worldmap-list');
  list.innerHTML = '';
  for(const zone of ZONES){
    const unlocked = player.unlockedZones.includes(zone.id);
    const el = document.createElement('div');
    el.className = 'wm-entry' + (player.currentZone===zone.id ? ' current' : '');
    el.innerHTML = `<span>${unlocked?zone.name:'??? (verrouillé)'}</span><span class="wm-lvl">${zone.kind==='town'?'Ville':'Niv. '+zone.levelRange[0]+'-'+zone.levelRange[1]}</span>`;
    if(unlocked) el.addEventListener('click', ()=> onTravel(zone.id));
    else el.style.opacity = 0.4;
    list.appendChild(el);
  }
}
