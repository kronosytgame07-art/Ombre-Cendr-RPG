// Pool d'affixes pour les objets magiques/rares/épiques.
// value(itemLevel) = min/max interpolé, mis à l'échelle par le niveau d'objet.

export const AFFIXES = [
  {id:'force', stat:'forceFlat', label:v=>`+${v} Force`, base:[1,3], perLvl:0.35, tags:['any']},
  {id:'dex', stat:'dexFlat', label:v=>`+${v} Dextérité`, base:[1,3], perLvl:0.35, tags:['any']},
  {id:'intel', stat:'intFlat', label:v=>`+${v} Intelligence`, base:[1,3], perLvl:0.35, tags:['any']},
  {id:'vit', stat:'vitFlat', label:v=>`+${v} Vitalité`, base:[1,3], perLvl:0.35, tags:['any']},
  {id:'vie_max', stat:'maxHpPct', label:v=>`+${v}% Points de vie maximum`, base:[3,6], perLvl:0.4, tags:['armor','accessory']},
  {id:'ress_max', stat:'maxResourcePct', label:v=>`+${v}% Ressource maximum`, base:[3,6], perLvl:0.4, tags:['armor','accessory']},
  {id:'dmg_pct', stat:'dmgPct', label:v=>`+${v}% Dégâts`, base:[3,7], perLvl:0.5, tags:['weapon','accessory']},
  {id:'crit_chance', stat:'critChance', label:v=>`+${v}% Chance de coup critique`, base:[2,4], perLvl:0.25, tags:['weapon','accessory']},
  {id:'crit_dmg', stat:'critDmgPct', label:v=>`+${v}% Dégâts critiques`, base:[6,12], perLvl:0.8, tags:['weapon','accessory']},
  {id:'atk_speed', stat:'atkSpeedPct', label:v=>`+${v}% Vitesse d'attaque`, base:[3,6], perLvl:0.35, tags:['weapon']},
  {id:'move_speed', stat:'moveSpeedPct', label:v=>`+${v}% Vitesse de déplacement`, base:[3,5], perLvl:0.2, tags:['armor','accessory']},
  {id:'armor', stat:'armorFlat', label:v=>`+${v} Armure`, base:[3,8], perLvl:0.9, tags:['armor']},
  {id:'resist_feu', stat:'resistFeuPct', label:v=>`+${v}% Résistance au Feu`, base:[4,8], perLvl:0.5, tags:['armor','accessory']},
  {id:'resist_glace', stat:'resistGlacePct', label:v=>`+${v}% Résistance au Gel`, base:[4,8], perLvl:0.5, tags:['armor','accessory']},
  {id:'resist_foudre', stat:'resistFoudrePct', label:v=>`+${v}% Résistance à la Foudre`, base:[4,8], perLvl:0.5, tags:['armor','accessory']},
  {id:'resist_ombre', stat:'resistOmbrePct', label:v=>`+${v}% Résistance à l'Ombre`, base:[4,8], perLvl:0.5, tags:['armor','accessory']},
  {id:'resist_tout', stat:'resistAllPct', label:v=>`+${v}% Résistance à tous les éléments`, base:[2,4], perLvl:0.3, tags:['armor','accessory']},
  {id:'life_on_hit', stat:'lifeOnHitFlat', label:v=>`+${v} Vie récupérée par coup porté`, base:[2,5], perLvl:0.6, tags:['weapon','accessory']},
  {id:'life_steal', stat:'lifeStealPct', label:v=>`+${v}% Vol de vie`, base:[1,2], perLvl:0.15, tags:['weapon','accessory']},
  {id:'mana_steal', stat:'manaStealPct', label:v=>`+${v}% Vol de ressource`, base:[1,2], perLvl:0.12, tags:['weapon','accessory']},
  {id:'gold_find', stat:'goldFindPct', label:v=>`+${v}% Or trouvé`, base:[5,12], perLvl:0.6, tags:['armor','accessory']},
  {id:'item_find', stat:'itemFindPct', label:v=>`+${v}% Rareté des objets trouvés`, base:[3,7], perLvl:0.4, tags:['armor','accessory']},
  {id:'cdr', stat:'cooldownReductionPct', label:v=>`+${v}% Réduction des temps de recharge`, base:[2,4], perLvl:0.25, tags:['accessory']},
  {id:'thorns', stat:'thornsFlat', label:v=>`Renvoie ${v} dégâts aux attaquants`, base:[2,5], perLvl:0.5, tags:['armor']},
  {id:'resource_regen', stat:'resourceRegenPct', label:v=>`+${v}% Régénération de ressource`, base:[4,8], perLvl:0.4, tags:['accessory']},
];

export function affixesFor(tag){
  return AFFIXES.filter(a=>a.tags.includes('any') || a.tags.includes(tag));
}

export function rollAffixValue(affix, itemLevel, rng){
  const [mn,mx] = affix.base;
  const scale = 1 + itemLevel*affix.perLvl*0.12;
  const v = (mn + rng.next()*(mx-mn)) * scale;
  return Math.max(1, Math.round(v));
}

export function rollAffix(tag, itemLevel, rng, excludeIds=[]){
  const pool = affixesFor(tag).filter(a=>!excludeIds.includes(a.id));
  if(!pool.length) return null;
  const affix = rng.pick(pool);
  const value = rollAffixValue(affix, itemLevel, rng);
  return {id:affix.id, stat:affix.stat, value, text:affix.label(value)};
}
