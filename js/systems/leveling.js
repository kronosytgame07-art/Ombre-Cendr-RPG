import { xpToNextLevel, MAX_LEVEL } from '../engine/config.js';
import { getClass } from '../data/classes.js';
import { getSkillTree } from '../data/skillTrees.js';

// Agrège classe + attributs + équipement + compétences passives en stats
// finales utilisables par le système de combat. Appelée après tout
// changement (level up, équipement, allocation de compétence).
export function recomputeStats(player){
  const cls = getClass(player.classId);
  const lvl = player.level;

  const attr = {
    force: cls.baseStats.force + cls.growth.force*(lvl-1) + player.attributes.force,
    dexterite: cls.baseStats.dexterite + cls.growth.dexterite*(lvl-1) + player.attributes.dexterite,
    intelligence: cls.baseStats.intelligence + cls.growth.intelligence*(lvl-1) + player.attributes.intelligence,
    vitalite: cls.baseStats.vitalite + cls.growth.vitalite*(lvl-1) + player.attributes.vitalite,
  };

  const bonus = collectBonuses(player);

  attr.force += bonus.forceFlat + bonus.allFlat;
  attr.dexterite += bonus.dexFlat + bonus.allFlat;
  attr.intelligence += bonus.intFlat + bonus.allFlat;
  attr.vitalite += bonus.vitFlat + bonus.allFlat;

  const maxHp = Math.round((40 + attr.vitalite*8) * (1 + bonus.maxHpPct/100));
  const maxResource = Math.round((30 + (cls.resource==='mana'? attr.intelligence*6 : attr.dexterite*5)) * (1 + bonus.maxResourcePct/100) + bonus.maxResourceFlat);

  const scalingStat = attr[cls.scaleAttr];

  const weaponDmg = getWeaponDamage(player);
  const baseMin = weaponDmg[0] + scalingStat*0.55;
  const baseMax = weaponDmg[1] + scalingStat*0.9;
  const dmgMult = 1 + bonus.dmgPct/100;

  const armor = Math.round(bonus.armorFlat + attr.dexterite*0.3);
  const critChance = Math.min(75, 4 + bonus.critChance + attr.dexterite*0.08);
  const critDmg = 150 + bonus.critDmgPct;
  const atkSpeed = 1 + bonus.atkSpeedPct/100;
  const moveSpeedPct = bonus.moveSpeedPct;
  const cdr = Math.min(50, bonus.cooldownReductionPct);
  const lifeSteal = bonus.lifeStealPct;
  const manaSteal = bonus.manaStealPct;
  const lifeOnHit = bonus.lifeOnHitFlat;
  const resourceRegenPct = bonus.resourceRegenPct;
  const goldFind = bonus.goldFindPct;
  const itemFind = bonus.itemFindPct;
  const resist = {
    feu: clampResist(bonus.resistFeuPct + bonus.resistAllPct),
    glace: clampResist(bonus.resistGlacePct + bonus.resistAllPct),
    foudre: clampResist(bonus.resistFoudrePct + bonus.resistAllPct),
    ombre: clampResist(bonus.resistOmbrePct + bonus.resistAllPct),
  };

  player.stats = {
    attr, maxHp, maxResource, dmgMin: Math.round(baseMin*dmgMult), dmgMax: Math.round(baseMax*dmgMult),
    armor, critChance, critDmg, atkSpeed, moveSpeedPct, cdr, lifeSteal, manaSteal, lifeOnHit,
    resourceRegenPct, goldFind, itemFind, resist, thorns: bonus.thornsFlat,
    summonDmgPct: bonus.summonDmgPct, summonHpPct: bonus.summonHpPct, maxSummons: 1+bonus.maxSummons,
    trapDmgPct: bonus.trapDmgPct, trapCount: 1+bonus.trapCount,
    poisonDmgPct: bonus.poisonDmgPct, fireDmgPct: bonus.fireDmgPct,
    burnChance: bonus.burnChance, bleedChance: bonus.bleedChance,
    dodgePct: Math.min(50, bonus.dodgePct),
  };

  if(player.hp == null) player.hp = maxHp;
  if(player.resource == null) player.resource = maxResource;
  player.hp = Math.min(player.hp, maxHp);
  player.resource = Math.min(player.resource, maxResource);
}

function clampResist(v){ return Math.max(-100, Math.min(80, v)); }

function getWeaponDamage(player){
  const weapon = player.equipment.arme;
  const cls = getClass(player.classId);
  if(weapon && weapon.dmgMin != null) return [weapon.dmgMin, weapon.dmgMax];
  return cls.startWeaponDmg;
}

function collectBonuses(player){
  const b = {
    forceFlat:0, dexFlat:0, intFlat:0, vitFlat:0, allFlat:0,
    maxHpPct:0, maxResourcePct:0, maxResourceFlat:0, dmgPct:0, critChance:0, critDmgPct:0,
    atkSpeedPct:0, moveSpeedPct:0, armorFlat:0, resistFeuPct:0, resistGlacePct:0, resistFoudrePct:0,
    resistOmbrePct:0, resistAllPct:0, lifeOnHitFlat:0, lifeStealPct:0, manaStealPct:0,
    goldFindPct:0, itemFindPct:0, cooldownReductionPct:0, thornsFlat:0, resourceRegenPct:0,
    summonDmgPct:0, summonHpPct:0, maxSummons:0, trapDmgPct:0, trapCount:0,
    poisonDmgPct:0, poisonDurationPct:0, fireDmgPct:0, burnChance:0, bleedChance:0, dodgePct:0,
    curseDurationPct:0, manaOnCurseHit:0, lifeOnHitTaken:0, rageFullHeal:0,
  };
  // équipement
  for(const slot in player.equipment){
    const it = player.equipment[slot];
    if(!it) continue;
    if(it.armor) b.armorFlat += it.armor;
    for(const a of (it.affixes||[])){
      if(a.stat in b) b[a.stat] += a.value;
    }
  }
  // compétences passives
  const tree = getSkillTree(player.classId);
  if(tree){
    for(const node of tree.nodes){
      const rank = player.skills[node.id] || 0;
      if(rank<=0) continue;
      if(node.type==='passive' && node.effect && node.effect.stat && node.effect.stat in b){
        b[node.effect.stat] += node.effect.perRank * rank;
      }
      if(node.effect && node.effect.stat === 'allFlat'){
        b.allFlat += node.effect.perRank * rank;
      }
    }
  }
  return b;
}

export function xpForKill(baseXp, player){
  return Math.round(baseXp);
}

export function grantXp(player, amount){
  const events = [];
  player.xp += amount;
  while(player.level < MAX_LEVEL && player.xp >= player.xpToNext){
    player.xp -= player.xpToNext;
    player.level += 1;
    player.attributePoints += 4;
    player.skillPoints += 1;
    player.xpToNext = xpToNextLevel(player.level);
    events.push({type:'levelup', level:player.level});
  }
  return events;
}

export function canAllocateSkill(player, tree, node){
  const rank = player.skills[node.id] || 0;
  if(rank >= node.maxRank) return false;
  if(player.skillPoints <= 0) return false;
  if(!node.requires) return true;
  return (player.skills[node.requires] || 0) > 0;
}

export function allocateSkill(player, classId, nodeId){
  const tree = getSkillTree(classId);
  const node = tree.nodes.find(n=>n.id===nodeId);
  if(!node || !canAllocateSkill(player, tree, node)) return false;
  player.skills[nodeId] = (player.skills[nodeId]||0) + 1;
  player.skillPoints -= 1;
  recomputeStats(player);
  return true;
}

export function allocateAttribute(player, attrName){
  if(player.attributePoints <= 0) return false;
  if(!(attrName in player.attributes)) return false;
  player.attributes[attrName] += 1;
  player.attributePoints -= 1;
  recomputeStats(player);
  return true;
}
