// Arbres de compétences — un "tronc" (noyau) + 3 branches de 5 nœuds par classe.
// Chaque branche : T1 = compétence active signature, T2-T4 = passifs, T5 = capstone.
// Les effets passifs sont génériques (stat, perRank) et agrégés par systems/leveling.js.
// Les compétences actives sont interprétées par systems/combat.js via leur `skillId`.

function buildTree(classId, branchIds, branchNames, actives){
  const nodes = [];
  const coreId = 'core_'+classId;
  nodes.push({id:coreId, tier:0, branch:'core', name:'Éveil du Cendré',
    type:'passive', maxRank:1, desc:"Le pouvoir latent du Cendré s'éveille. +2 à toutes les caractéristiques.",
    effect:{stat:'allFlat', perRank:2}, requires:null});

  branchIds.forEach((bid, i)=>{
    const bname = branchNames[i];
    const a = actives[i];
    nodes.push({id:`${bid}_t1`, tier:1, branch:bid, name:a.name, type:'active', maxRank:1,
      desc:a.desc, effect:{type:'active', skillId:a.skillId, resourceCost:a.cost, cooldown:a.cd, ...a.extra},
      requires:coreId});
    if(a.vfx) nodes[nodes.length-1].vfx = a.vfx;
    a.passives.forEach((p,pi)=>{
      nodes.push({id:`${bid}_t${pi+2}`, tier:pi+2, branch:bid, name:p.name, type:'passive',
        maxRank:p.maxRank||3, desc:p.desc, effect:{stat:p.stat, perRank:p.perRank},
        requires: pi===0 ? `${bid}_t1` : `${bid}_t${pi+1}`});
    });
    nodes.push({id:`${bid}_t5`, tier:5, branch:bid, name:a.capstone.name, type:'capstone',
      maxRank:1, desc:a.capstone.desc, effect:{type:'capstone', note:a.capstone.name, upgrades:`${bid}_t1`},
      requires:`${bid}_t4`});
  });
  return {classId, branchNames: Object.fromEntries(branchIds.map((b,i)=>[b,branchNames[i]])), nodes};
}

export const SKILL_TREES = {
  fervent: buildTree('fervent',
    ['rage_braises','rempart_cendre','cri_guerre'],
    ['Rage des Braises','Rempart de Cendre','Cri de Guerre'],
    [
      { name:'Frappe Ardente', skillId:'frappe_ardente', cost:0, cd:0.9,
        desc:"Frappe brutale infligeant 150% des dégâts d'arme et générant de la rage.",
        passives:[
          {name:'Sang Chaud', desc:'+8% dégâts physiques par rang.', stat:'dmgPct', perRank:8},
          {name:'Fureur Sans Fin', desc:'+4% chance de coup critique par rang.', stat:'critChance', perRank:4},
          {name:'Cœur de Forge', desc:'+15 rage maximum par rang.', stat:'maxResourceFlat', perRank:15},
        ],
        capstone:{name:'Éruption', desc:"Frappe Ardente explose désormais en zone autour de la cible."}
      },
      { name:'Bouclier de Cendre', skillId:'bouclier_cendre', cost:10, cd:8,
        desc:"Dresse un rempart : -50% dégâts subis pendant 3s et provoque les ennemis proches.",
        passives:[
          {name:'Peau Durcie', desc:'+6 armure par rang.', stat:'armorFlat', perRank:6},
          {name:'Résilience', desc:'+5% points de vie maximum par rang.', stat:'maxHpPct', perRank:5},
          {name:'Représailles', desc:'+2% de vie récupérée par coup subi bloqué, par rang.', stat:'lifeOnHitTaken', perRank:2},
        ],
        capstone:{name:'Muraille Vivante', desc:"Bouclier de Cendre renvoie 30% des dégâts bloqués à l'attaquant."}
      },
      { name:'Cri de Guerre', skillId:'cri_guerre', cost:15, cd:14,
        desc:"Rugissement qui augmente vitesse d'attaque et de déplacement pendant 6s.",
        passives:[
          {name:'Endurance', desc:'+12 rage maximum par rang.', stat:'maxResourceFlat', perRank:12},
          {name:'Cadence de Combat', desc:'+5% vitesse d\'attaque par rang.', stat:'atkSpeedPct', perRank:5},
          {name:'Second Souffle', desc:'+3% de vie restaurée quand la rage est pleine, par rang.', stat:'rageFullHeal', perRank:3},
        ],
        capstone:{name:'Aura du Cendré', desc:"Cri de Guerre confère aussi -20% dégâts subis pendant sa durée."}
      },
    ]
  ),
  pyromancienne: buildTree('pyromancienne',
    ['voie_flammes','voie_neant','voie_givre'],
    ['Voie des Flammes','Voie du Néant','Voie du Givre'],
    [
      { name:'Boule de Feu', skillId:'boule_de_feu', cost:12, cd:0.6, vfx:'feu',
        desc:"Lance une boule de feu explosive infligeant des dégâts de feu et brûlant la cible.",
        passives:[
          {name:'Combustion', desc:'+8% dégâts de feu par rang.', stat:'fireDmgPct', perRank:8},
          {name:'Étincelle Critique', desc:'+4% chance de coup critique par rang.', stat:'critChance', perRank:4},
          {name:'Braises Vives', desc:'+10% chance d\'embraser la cible par rang.', stat:'burnChance', perRank:10},
        ],
        capstone:{name:'Comète Cendrée', desc:"Le projectile explose à l'impact et transperce les ennemis."}
      },
      { name:'Tentacules d\'Ombre', skillId:'tentacules_ombre', cost:18, cd:6, vfx:'ombre',
        desc:"Fait jaillir des tentacules d'ombre autour de vous, ralentissant et endommageant les ennemis proches.",
        passives:[
          {name:'Esprit Affûté', desc:'+3 intelligence par rang.', stat:'intFlat', perRank:3},
          {name:'Réservoir Arcanique', desc:'+18 mana maximum par rang.', stat:'maxResourceFlat', perRank:18},
          {name:'Flux Continu', desc:'+5% réduction des temps de recharge par rang.', stat:'cooldownReductionPct', perRank:5},
        ],
        capstone:{name:'Étreinte du Vide', desc:"Tentacules d'Ombre attire d'abord les ennemis vers vous avant de détoner."}
      },
      { name:'Éclair de Givre', skillId:'eclair_de_givre', cost:14, cd:5, vfx:'givre',
        desc:"Décoche un éclat de givre qui ralentit fortement la cible et les ennemis transpercés.",
        passives:[
          {name:'Manteau de Givre', desc:'+5 armure par rang.', stat:'armorFlat', perRank:5},
          {name:'Sang Froid', desc:'+6% résistances élémentaires par rang.', stat:'resistAllPct', perRank:6},
          {name:'Souffle Glacial', desc:'+8% régénération de mana par rang.', stat:'resourceRegenPct', perRank:8},
        ],
        capstone:{name:'Blizzard', desc:"Éclair de Givre devient un cône de glace touchant tous les ennemis devant vous."}
      },
    ]
  ),
  ombrelame: buildTree('ombrelame',
    ['lames_jumelles','voile_ombre','poison_noir'],
    ['Lames Jumelles','Voile d\'Ombre','Poison Noir'],
    [
      { name:'Frappe Fantôme', skillId:'frappe_fantome', cost:18, cd:1.1,
        desc:"Bond en avant suivi d'une frappe rapide à deux lames, bonus de critique garanti.",
        passives:[
          {name:'Lames Aiguisées', desc:'+10% dégâts critiques par rang.', stat:'critDmgPct', perRank:10},
          {name:'Célérité', desc:'+5% vitesse d\'attaque par rang.', stat:'atkSpeedPct', perRank:5},
          {name:'Saignée', desc:'+10% chance de saignement par rang.', stat:'bleedChance', perRank:10},
        ],
        capstone:{name:'Danse des Lames', desc:"Frappe Fantôme touche désormais jusqu'à 3 ennemis proches."}
      },
      { name:"Pas de l'Ombre", skillId:'pas_ombre', cost:22, cd:7,
        desc:"Se glisse instantanément derrière la cible ; la prochaine attaque est un coup critique garanti.",
        passives:[
          {name:'Agilité', desc:'+3 dextérité par rang.', stat:'dexFlat', perRank:3},
          {name:'Esquive', desc:'+4% chance d\'esquive par rang.', stat:'dodgePct', perRank:4},
          {name:'Réserves d\'Ombre', desc:'+15 énergie maximum par rang.', stat:'maxResourceFlat', perRank:15},
        ],
        capstone:{name:'Invisibilité', desc:"Pas de l'Ombre rend invisible pendant 1.5s après le déplacement."}
      },
      { name:'Bulle de Poison', skillId:'bulle_de_poison', cost:16, cd:3, vfx:'poison',
        desc:"Projette une bulle toxique qui éclate au contact, infligeant des dégâts sur la durée et ralentissant.",
        passives:[
          {name:'Toxines Concentrées', desc:'+10% dégâts de poison par rang.', stat:'poisonDmgPct', perRank:10},
          {name:'Poison Persistant', desc:'+15% durée des effets de poison par rang.', stat:'poisonDurationPct', perRank:15},
          {name:'Vol de Vie', desc:'+2% de vol de vie par rang.', stat:'lifeStealPct', perRank:2},
        ],
        capstone:{name:'Épidémie', desc:"À la mort d'une cible empoisonnée, le poison se propage aux ennemis proches."}
      },
    ]
  ),
  necrophore: buildTree('necrophore',
    ['legion_cendree','maledictions','moisson_ames'],
    ['Légion Cendrée','Malédictions','Moisson d\'Âmes'],
    [
      { name:'Invoquer Squelette', skillId:'invoquer_squelette', cost:25, cd:2,
        desc:"Élève un squelette guerrier des cendres pour combattre à vos côtés.",
        passives:[
          {name:'Os Renforcés', desc:'+10% dégâts des invocations par rang.', stat:'summonDmgPct', perRank:10},
          {name:'Chair Reconstituée', desc:'+15% points de vie des invocations par rang.', stat:'summonHpPct', perRank:15},
          {name:'Fosse Commune', desc:'+1 invocation maximum par rang.', stat:'maxSummons', perRank:1, maxRank:2},
        ],
        capstone:{name:'Armée des Cendres', desc:"Vos invocations explosent en cendres brûlantes à leur mort, infligeant des dégâts."}
      },
      { name:'Chaîne d\'Éclairs', skillId:'chaine_eclairs', cost:20, cd:5, vfx:'foudre',
        desc:"Frappe un ennemi d'un éclair maudit qui rebondit vers les cibles proches : chaque victime inflige moins de dégâts et en subit davantage.",
        passives:[
          {name:'Emprise Durable', desc:'+15% durée des malédictions par rang.', stat:'curseDurationPct', perRank:15},
          {name:'Esprit Sombre', desc:'+3 intelligence par rang.', stat:'intFlat', perRank:3},
          {name:'Transfert Vital', desc:'+5 mana récupéré par coup sur cible maudite, par rang.', stat:'manaOnCurseHit', perRank:5},
        ],
        capstone:{name:'Fléau', desc:"Chaîne d'Éclairs rebondit désormais sur deux cibles supplémentaires."}
      },
      { name:'Faucheur d\'Âmes', skillId:'faucheur_ames', cost:20, cd:4,
        desc:"Frappe de sa faux spectrale, drainant la vie de l'ennemi touché.",
        passives:[
          {name:'Sangsue', desc:'+3% de vol de vie par rang.', stat:'lifeStealPct', perRank:3},
          {name:'Vitalité Noire', desc:'+6% points de vie maximum par rang.', stat:'maxHpPct', perRank:6},
          {name:'Absorption', desc:'+3% de vol de mana par rang.', stat:'manaStealPct', perRank:3},
        ],
        capstone:{name:'Étreinte du Néant', desc:"Faucheur d'Âmes attire désormais les ennemis proches vers vous avant de frapper."}
      },
    ]
  ),
  sentinelle: buildTree('sentinelle',
    ['tir_precision','pieges_cendre','instinct_sauvage'],
    ['Tir de Précision','Pièges de Cendre','Instinct Sauvage'],
    [
      { name:'Flèche Perçante', skillId:'fleche_percante', cost:14, cd:0.7,
        desc:"Tire une flèche puissante qui transperce tous les ennemis sur sa trajectoire.",
        passives:[
          {name:'Œil de Faucon', desc:'+8% dégâts par rang.', stat:'dmgPct', perRank:8},
          {name:'Tir Mortel', desc:'+4% chance de coup critique par rang.', stat:'critChance', perRank:4},
          {name:'Cadence', desc:'+5% vitesse d\'attaque par rang.', stat:'atkSpeedPct', perRank:5},
        ],
        capstone:{name:'Pluie de Flèches', desc:"Flèche Perçante devient une volée de 5 flèches en éventail."}
      },
      { name:'Piège Explosif', skillId:'piege_explosif', cost:16, cd:5,
        desc:"Pose un piège de cendre qui explose au contact d'un ennemi.",
        passives:[
          {name:'Poudre Noire', desc:'+12% dégâts des pièges par rang.', stat:'trapDmgPct', perRank:12},
          {name:'Artificière', desc:'+1 piège actif simultané par rang.', stat:'trapCount', perRank:1, maxRank:2},
          {name:'Détonateur Rapide', desc:'+6% réduction des temps de recharge par rang.', stat:'cooldownReductionPct', perRank:6},
        ],
        capstone:{name:'Champ de Mines', desc:"Piège Explosif pose désormais 3 pièges en éventail devant vous."}
      },
      { name:'Bond du Prédateur', skillId:'bond_predateur', cost:12, cd:6,
        desc:"Bondit vers l'avant ; la prochaine attaque inflige des dégâts bonus.",
        passives:[
          {name:'Réflexes', desc:'+3 dextérité par rang.', stat:'dexFlat', perRank:3},
          {name:'Foulée Légère', desc:'+5% vitesse de déplacement par rang.', stat:'moveSpeedPct', perRank:5},
          {name:'Instincts', desc:'+4% chance d\'esquive par rang.', stat:'dodgePct', perRank:4},
        ],
        capstone:{name:'Esprit de la Meute', desc:"Bond du Prédateur invoque un loup spectral qui combat à vos côtés 12s."}
      },
    ]
  ),
};

export function getSkillTree(classId){ return SKILL_TREES[classId]; }
