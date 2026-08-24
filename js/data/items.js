import { Rng } from '../engine/rng.js';
import { rollAffix } from './affixes.js';

export const RARITY = {
  commun:   {id:'commun', label:'Commun', color:'#c8c8c8', affixCount:[0,0], cls:'qcommon'},
  magique:  {id:'magique', label:'Magique', color:'#4d8fff', affixCount:[1,2], cls:'qmagic'},
  rare:     {id:'rare', label:'Rare', color:'#e8d842', affixCount:[3,4], cls:'qrare'},
  epique:   {id:'epique', label:'Épique', color:'#b34dff', affixCount:[4,5], cls:'qepic'},
  legendaire:{id:'legendaire', label:'Légendaire', color:'#ff8c2b', affixCount:[2,3], cls:'qlegend'},
};

// gabarits de base par type d'objet
export const BASE_ITEMS = {
  // ARMES (slot 'arme')
  epee:    {slot:'arme', icon:'epee',    weaponClass:'epee',    dmgScale:1.0, scalesWith:'force', names:['Épée','Lame','Estoc']},
  hache:   {slot:'arme', icon:'hache',   weaponClass:'hache',   dmgScale:1.15,scalesWith:'force', names:['Hache','Cognée','Fendoir']},
  dague:   {slot:'arme', icon:'dague',   weaponClass:'dague',   dmgScale:0.7, scalesWith:'dexterite', names:['Dague','Poignard','Stylet']},
  arc:     {slot:'arme', icon:'arc',     weaponClass:'arc',     dmgScale:0.95,scalesWith:'dexterite', names:['Arc','Arc long','Arc composite']},
  baton:   {slot:'arme', icon:'baton',   weaponClass:'baton',   dmgScale:0.85,scalesWith:'intelligence', names:['Bâton','Bourdon','Canne runique']},
  sceptre: {slot:'arme', icon:'sceptre', weaponClass:'sceptre', dmgScale:0.8, scalesWith:'intelligence', names:['Sceptre','Crosse osseuse','Verge noire']},
  // BOUCLIER (slot secondaire, guerrier uniquement en pratique)
  bouclier:{slot:'bouclier', icon:'bouclier', armorScale:1.2, names:['Bouclier','Rondache','Pavois']},
  // ARMURE
  casque:  {slot:'casque', icon:'casque', armorScale:0.8, names:['Casque','Heaume','Capuche renforcée']},
  plastron:{slot:'plastron', icon:'plastron', armorScale:1.4, names:['Plastron','Cuirasse','Tunique matelassée']},
  gants:   {slot:'gants', icon:'gants', armorScale:0.6, names:['Gants','Gantelets','Mitaines']},
  bottes:  {slot:'bottes', icon:'bottes', armorScale:0.7, names:['Bottes','Grèves','Chausses']},
  ceinture:{slot:'ceinture', icon:'ceinture', armorScale:0.5, names:['Ceinture','Baudrier','Sangle']},
  // ACCESSOIRES
  anneau:  {slot:'anneau', icon:'anneau', armorScale:0, names:['Anneau','Bague','Chevalière']},
  amulette:{slot:'amulette', icon:'amulette', armorScale:0, names:['Amulette','Pendentif','Talisman']},
};

export const RARITY_ORDER = ['commun','magique','rare','epique','legendaire'];

const PREFIXES = ['Cendré','Ardent','Sinistre','Vorace','Glacial','Foudroyant','Vénéneux','Spectral','Vaillant','Runique'];
const SUFFIXES = ['de la Faille','des Braises Mortes','du Cendré Oublié','de Nihilash','de la Meute','du Vide','des Cimes Grises','de l\'Aube Éteinte'];

export const LEGENDARY_ITEMS = [
  { id:'tisonnier_nihilash', base:'baton', name:'Tisonnier de Nihilash', forClass:'pyromancienne',
    lore:"On dit qu'il fut forgé dans la première flamme de l'Embrasement, avant même qu'elle n'ait de nom.",
    special:'legendary_tisonnier', specialText:"Projectile de Braise ne coûte plus de mana." },
  { id:'eclat_dernier_soleil', base:'epee', name:'Éclat du Dernier Soleil', forClass:'fervent',
    lore:"La dernière lame trempée sous un ciel bleu, avant que la cendre ne le recouvre à jamais.",
    special:'legendary_eclat', specialText:"Après Cri de Guerre, +25% dégâts pendant 3s." },
  { id:'croc_meute', base:'dague', name:'Croc de la Meute', forClass:'ombrelame',
    lore:"Taillé dans la dent d'un Chien de Suie qui a survécu à cent chasseurs.",
    special:'legendary_croc', specialText:"Pas de l'Ombre peut être utilisé deux fois avant recharge." },
  { id:'sceptre_cendres_muettes', base:'sceptre', name:'Sceptre des Cendres Muettes', forClass:'necrophore',
    lore:"Les morts qu'il réveille ne se souviennent de rien — et c'est peut-être une bénédiction.",
    special:'legendary_sceptre', specialText:"+2 invocations maximum, -30% vie des invocations." },
  { id:'corde_dernier_souffle', base:'arc', name:'Corde du Dernier Souffle', forClass:'sentinelle',
    lore:"Tissée avec les cheveux d'une Sentinelle tombée à la lisière de la Forêt Calcinée.",
    special:'legendary_corde', specialText:"Flèche Perçante gagne des dégâts croissants avec la distance parcourue." },
  { id:'coeur_braise', base:'amulette', name:'Cœur de Braise', forClass:null,
    lore:"Un charbon qui ne s'éteint jamais, palpitant comme un cœur volé au brasier originel.",
    special:'legendary_coeur_braise', specialText:"+15% dégâts de feu, immunité aux brûlures." },
  { id:'anneau_cendre_eternel', base:'anneau', name:'Anneau du Cendré Éternel', forClass:null,
    lore:"Porté par le tout premier Cendré, celui qui refusa de laisser l'Embrasement avoir le dernier mot.",
    special:'legendary_anneau_regen', specialText:"Régénère 2% des PV max par seconde, -10% dégâts infligés." },
  { id:'voile_malessia', base:'plastron', name:'Voile de Malessia', forClass:null,
    lore:"Arraché aux eaux stagnantes du Marais Livide, il garde une odeur de fleurs noyées.",
    special:'legendary_voile', specialText:"+15% vitesse de déplacement dans les zones marécageuses." },
  { id:'poigne_ossian', base:'gants', name:"Poigne d'Ossian", forClass:null,
    lore:"Ossian ne se souvenait plus de son visage. Il se souvenait seulement de frapper.",
    special:'legendary_poigne', specialText:"+30% dégâts critiques ; les coups critiques ne peuvent être esquivés." },
  { id:'cendre_nihilash_dechu', base:'amulette', name:'Cendre du Nihilash Déchu', forClass:null,
    lore:"Tout ce qu'il reste d'un dieu, une fois que le monde a refusé de brûler pour lui.",
    special:'legendary_final', specialText:"+10% à toutes les caractéristiques ; brûle les ennemis proches." },
];

let uid = 1;
function nextUid(){ return 'it_'+(uid++)+'_'+Date.now().toString(36); }

export function randomWeaponType(rng){ return rng.pick(['epee','hache','dague','arc','baton','sceptre']); }
export function randomArmorType(rng){ return rng.pick(['casque','plastron','gants','bottes','ceinture']); }

export function rollRarity(rng, magicFindPct=0){
  const r = rng.next() * 100;
  const mf = Math.min(150, magicFindPct);
  if(r < 0.4 + mf*0.01) return 'legendaire';
  if(r < 4 + mf*0.05) return 'epique';
  if(r < 18 + mf*0.15) return 'rare';
  if(r < 45 + mf*0.2) return 'magique';
  return 'commun';
}

export function generateItem({ baseType, itemLevel=1, rarity=null, rng=null, forClass=null }){
  rng = rng || new Rng((Math.random()*1e9)|0);
  rarity = rarity || rollRarity(rng);
  const base = BASE_ITEMS[baseType];
  if(!base) throw new Error('base item inconnu: '+baseType);

  if(rarity==='legendaire'){
    const candidates = LEGENDARY_ITEMS.filter(l=>l.base===baseType && (!l.forClass || l.forClass===forClass));
    const pool = candidates.length ? candidates : LEGENDARY_ITEMS.filter(l=>l.base===baseType);
    if(pool.length){
      const leg = rng.pick(pool);
      return buildItem(base, baseType, 'legendaire', itemLevel, rng, {
        name:leg.name, lore:leg.lore, special:leg.special, specialText:leg.specialText, forcedAffixCount:2
      });
    }
    rarity = 'epique';
  }

  return buildItem(base, baseType, rarity, itemLevel, rng, {});
}

function buildItem(base, baseType, rarityId, itemLevel, rng, opts){
  const rarity = RARITY[rarityId];
  const tag = base.slot==='arme' ? 'weapon' : (base.slot==='anneau'||base.slot==='amulette' ? 'accessory' : 'armor');

  let affixCount = opts.forcedAffixCount!=null ? opts.forcedAffixCount
    : rng.int(rarity.affixCount[0], rarity.affixCount[1]);
  const affixes = [];
  const used = [];
  for(let i=0;i<affixCount;i++){
    const a = rollAffix(tag, itemLevel, rng, used);
    if(a){ affixes.push(a); used.push(a.id); }
  }

  let dmgMin=0, dmgMax=0, armor=0;
  if(base.slot==='arme'){
    const s = base.dmgScale;
    dmgMin = Math.round((3 + itemLevel*1.5) * s);
    dmgMax = Math.round((6 + itemLevel*2.6) * s);
  }
  if(base.armorScale){
    armor = Math.round((2 + itemLevel*1.3) * base.armorScale);
  }

  let name = opts.name;
  if(!name){
    if(rarityId==='rare'){
      name = `${rng.pick(PREFIXES)} ${rng.pick(base.names)} ${rng.pick(SUFFIXES)}`;
    } else if(rarityId==='magique'){
      name = `${rng.pick(base.names)} ${rng.pick(SUFFIXES)}`;
    } else if(rarityId==='epique'){
      name = `${rng.pick(PREFIXES)} ${rng.pick(base.names)} Épique`;
    } else {
      name = rng.pick(base.names);
    }
  }

  return {
    uid: nextUid(),
    baseType, slot: base.slot, icon: base.icon,
    weaponClass: base.weaponClass || null, scalesWith: base.scalesWith || null,
    name, rarity: rarityId, rarityLabel: rarity.label, rarityColor: rarity.color, rarityCls: rarity.cls,
    itemLevel, dmgMin, dmgMax, armor,
    affixes,
    lore: opts.lore || null,
    special: opts.special || null,
    specialText: opts.specialText || null,
    stackable:false, qty:1,
  };
}

// Objets de consommation (potions, parchemins)
export function makePotion(kind, tier=1){
  const defs = {
    vie: {icon:'potion_vie', name:'Fiole de Vie', desc:v=>`Restaure ${v} points de vie instantanément.`, base:40, per:22},
    mana:{icon:'potion_mana', name:'Fiole de Ressource', desc:v=>`Restaure ${v} points de ressource instantanément.`, base:30, per:16},
  };
  const d = defs[kind];
  const value = d.base + d.per*(tier-1);
  return {
    uid: nextUid(), baseType:'potion_'+kind, slot:'consommable', icon:d.icon,
    name: `${d.name} +${tier}`, rarity:'commun', rarityLabel:'Consommable', rarityColor:'#7fd97f', rarityCls:'qcommon',
    stackable:true, qty:1, potionKind:kind, potionValue:value, description:d.desc(value),
  };
}
