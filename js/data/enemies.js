// Bestiaire d'Ombre Cendrée. Les stats de base sont mises à l'échelle par le
// niveau de zone au moment du spawn (voir systems/combat.js: scaleEnemyStats).

export const ENEMY_TYPES = {
  cendre_corrompu: {
    id:'cendre_corrompu', name:'Cendré Corrompu', family:'mort-vivant',
    sprite:{kind:'humanoid', weapon:'dague', undead:true, cloth:'#3a3830', accent:'#5a2e2e'},
    sheet:'assets/sprites/enemies/cendre_corrompu_8dir.png',
    behavior:'melee', speed:0.9, aggroRange:220, atkRange:34, atkCooldown:1.2,
    base:{hp:26, dmg:[4,7], armor:2, xp:8},
    resist:{}, zones:['foret','cimetiere'],
    bestiary:"Autrefois habitant de Val-Aurore, il erre désormais sans but, guidé par une rage qui n'est plus tout à fait la sienne. Lent mais nombreux."
  },
  chien_suie: {
    id:'chien_suie', name:'Chien de Suie', family:'bête',
    sprite:{kind:'creature', shape:'hound', main:'#2b2521', eye:'#ff6a2b'},
    behavior:'melee', speed:1.6, aggroRange:260, atkRange:30, atkCooldown:0.9,
    base:{hp:18, dmg:[3,6], armor:0, xp:6},
    resist:{}, zones:['foret','cimetiere'],
    bestiary:"Meute rapide qui chasse en groupe parmi les tombes. Individuellement faible, il devient dangereux lorsqu'il encercle sa proie."
  },
  araignee_calcinee: {
    id:'araignee_calcinee', name:'Araignée Calcinée', family:'bête',
    sprite:{kind:'creature', shape:'araignee', main:'#3a2418', eye:'#ffcf5a'},
    behavior:'melee', speed:1.1, aggroRange:200, atkRange:28, atkCooldown:1.1,
    base:{hp:20, dmg:[3,7], armor:1, xp:7, poisonOnHit:0.25},
    resist:{ombre:15}, zones:['foret','desert'],
    bestiary:"Elle tisse ses toiles entre les rochers brûlants du désert. Sa morsure laisse une brûlure noire qui continue de ronger la chair."
  },
  chauvesouris_braise: {
    id:'chauvesouris_braise', name:'Chauve-souris de Braise', family:'bête',
    sprite:{kind:'creature', shape:'chauvesouris', main:'#5a1f14', eye:'#ffb347'},
    behavior:'melee', speed:2.0, aggroRange:240, atkRange:26, atkCooldown:0.8,
    base:{hp:14, dmg:[2,5], armor:0, xp:5},
    resist:{feu:40}, zones:['volcan'],
    bestiary:"Vole en essaims erratiques près des cheminées de lave. Sa peau irradie une chaleur constante."
  },
  larve_ombre: {
    id:'larve_ombre', name:"Larve d'Ombre", family:'aberration',
    sprite:{kind:'creature', shape:'larve', main:'#241830', eye:'#b34dff'},
    behavior:'melee', speed:0.6, aggroRange:160, atkRange:24, atkCooldown:1.4,
    base:{hp:22, dmg:[3,8], armor:0, xp:7},
    resist:{ombre:30}, zones:['marais','faille'],
    bestiary:"Fragment vivant de la Faille. Se déplace lentement mais son contact ronge la volonté autant que la chair."
  },
  serpent_marais: {
    id:'serpent_marais', name:'Serpent du Marais', family:'bête',
    sprite:{kind:'creature', shape:'serpent', main:'#2f3a24', eye:'#e8d842'},
    behavior:'melee', speed:1.4, aggroRange:200, atkRange:30, atkCooldown:1.0,
    base:{hp:24, dmg:[4,8], armor:1, xp:8, poisonOnHit:0.35},
    resist:{}, zones:['marais'],
    bestiary:"Son venin ralentit le sang avant même que la plaie ne saigne."
  },
  serpent_desert: {
    id:'serpent_desert', name:'Serpent du Désert', family:'bête',
    sprite:{kind:'creature', shape:'serpent', main:'#c9a860', eye:'#ff6a2b'},
    behavior:'melee', speed:1.7, aggroRange:220, atkRange:30, atkCooldown:0.9,
    base:{hp:28, dmg:[5,9], armor:1, xp:10, poisonOnHit:0.3},
    resist:{feu:20}, zones:['desert'],
    bestiary:"Se déplace en glissant sous la cendre chaude du Désert de Cendres, invisible jusqu'à la morsure."
  },
  maraudeur_corrompu: {
    id:'maraudeur_corrompu', name:'Maraudeur Corrompu', family:'mort-vivant',
    sprite:{kind:'humanoid', weapon:'hache', undead:true, cloth:'#2c3a2a', accent:'#4a1f1f', armor:'lourd'},
    behavior:'melee', speed:1.0, aggroRange:220, atkRange:36, atkCooldown:1.3,
    base:{hp:42, dmg:[7,13], armor:5, xp:14},
    resist:{}, zones:['marais'],
    bestiary:"Ancien pillard surpris par l'Embrasement en plein forfait. Sa hache n'a jamais quitté sa main, morte ou vive."
  },
  voile_ombre: {
    id:'voile_ombre', name:"Voile-d'Ombre", family:'esprit',
    sprite:{kind:'creature', shape:'spectre', main:'#241a30', eye:'#8fe0ff'},
    behavior:'ranged', speed:1.0, aggroRange:280, atkRange:220, atkCooldown:1.8, projectileSpeed:5,
    base:{hp:20, dmg:[5,10], armor:0, xp:12},
    resist:{ombre:50, physique:20}, zones:['marais','temple','faille'],
    bestiary:"Émanation directe de la Faille. Flotte au-dessus du sol et lance des éclats d'ombre pure."
  },
  squelette_guerrier: {
    id:'squelette_guerrier', name:'Squelette Guerrier', family:'mort-vivant',
    sprite:{kind:'humanoid', weapon:'epee', undead:true, cloth:'#6b6b64', accent:'#8a8a80', armor:'lourd'},
    behavior:'melee', speed:1.0, aggroRange:220, atkRange:34, atkCooldown:1.1,
    base:{hp:30, dmg:[5,9], armor:6, xp:11},
    resist:{ombre:20}, zones:['cimetiere'],
    bestiary:"Levé par un rite oublié, il garde les tombes du Cimetière des Cendres avec une discipline qu'il n'avait pas de son vivant."
  },
  revenant: {
    id:'revenant', name:'Revenant', family:'esprit',
    sprite:{kind:'creature', shape:'spectre', main:'#1c2430', eye:'#ff6a2b'},
    behavior:'ranged', speed:0.8, aggroRange:260, atkRange:200, atkCooldown:2.0, projectileSpeed:4.5,
    base:{hp:34, dmg:[8,14], armor:2, xp:16},
    resist:{ombre:35}, zones:['temple','faille'],
    bestiary:"Ceux qui l'ont vu de près jurent qu'il porte encore le visage qu'il avait avant l'Embrasement — pour une seconde à peine."
  },
  gardien_pierre: {
    id:'gardien_pierre', name:'Gardien de Pierre', family:'construct',
    sprite:{kind:'creature', shape:'golem', main:'#4a4a4d', eye:'#8fe0ff'},
    behavior:'melee', speed:0.7, aggroRange:180, atkRange:40, atkCooldown:1.6,
    base:{hp:70, dmg:[10,18], armor:12, xp:22},
    resist:{physique:25}, zones:['grottes','volcan'],
    bestiary:"Statue animée par les archivistes de Val-Aurore pour protéger leurs mines. Lent, mais capable d'écraser un homme d'un seul coup."
  },
  troll_roc: {
    id:'troll_roc', name:'Troll de Roc', family:'bête',
    sprite:{kind:'creature', shape:'troll', main:'#7a6248', eye:'#ffcf5a'},
    behavior:'melee', speed:0.9, aggroRange:200, atkRange:44, atkCooldown:1.4, regen:2,
    base:{hp:80, dmg:[11,19], armor:6, xp:24},
    resist:{physique:15}, zones:['grottes'],
    bestiary:"Les Grottes de Montagne résonnent de son grognement sourd. Sa chair de pierre se referme lentement sur ses propres blessures."
  },
  geant_givre: {
    id:'geant_givre', name:'Géant de Givre', family:'bête',
    sprite:{kind:'creature', shape:'yeti', main:'#a9c9d8', eye:'#eaffff'},
    behavior:'melee', speed:0.8, aggroRange:210, atkRange:46, atkCooldown:1.5, slowOnHit:0.3,
    base:{hp:110, dmg:[14,22], armor:8, xp:32},
    resist:{glace:60, feu:-20}, zones:['toundra'],
    bestiary:"Né des glaces de la Toundra Enneigée, chaque coup de sa hache gelée engourdit un peu plus ses adversaires."
  },
  cultiste_nihilash: {
    id:'cultiste_nihilash', name:"Cultiste de l'Ombre", family:'humain',
    sprite:{kind:'humanoid', weapon:'sceptre', hood:true, cloak:true, cloth:'#241f2a', accent:'#5a2e6b'},
    behavior:'ranged', speed:1.0, aggroRange:260, atkRange:220, atkCooldown:1.7, projectileSpeed:5,
    base:{hp:26, dmg:[6,11], armor:1, xp:14},
    resist:{ombre:20}, zones:['temple','volcan','faille'],
    bestiary:"Ancien citoyen de Val-Aurore ayant choisi d'adorer ce qui a détruit sa ville. Officie dans le Temple Maudit et manie des éclats d'ombre improvisés."
  },
  golem_cendre: {
    id:'golem_cendre', name:'Golem de Cendre', family:'construct',
    sprite:{kind:'creature', shape:'golem', main:'#5a2e1a', eye:'#ff8c2b'},
    behavior:'melee', speed:0.8, aggroRange:200, atkRange:42, atkCooldown:1.5,
    base:{hp:90, dmg:[12,20], armor:10, xp:28},
    resist:{feu:60, physique:10}, zones:['volcan'],
    bestiary:"Un noyau de braise éternelle bat au centre de son corps de cendre compactée. Le détruire libère une chaleur intense."
  },
  minotaure_lave: {
    id:'minotaure_lave', name:'Minotaure de Lave', family:'construct',
    sprite:{kind:'humanoid', weapon:'hache', armor:'lourd', cloth:'#4a1408', accent:'#ff6a2b'},
    behavior:'melee', speed:1.0, aggroRange:220, atkRange:44, atkCooldown:1.3, burnOnHit:0.3,
    base:{hp:100, dmg:[16,24], armor:9, xp:34},
    resist:{feu:70, glace:-20}, zones:['volcan'],
    bestiary:"Gardien du Volcan Actif, sa peau de magma durcie n'attend qu'un coup mal placé pour se remettre à couler."
  },
  chauvesouris_infernale: {
    id:'chauvesouris_infernale', name:'Chauve-souris Infernale', family:'bête',
    sprite:{kind:'creature', shape:'chauvesouris', main:'#8a1f14', eye:'#ffec8c'},
    behavior:'melee', speed:2.2, aggroRange:260, atkRange:28, atkCooldown:0.7,
    base:{hp:24, dmg:[6,11], armor:1, xp:13},
    resist:{feu:60}, zones:['volcan'],
    bestiary:"Version endurcie de ses cousines des cimetières, elle niche directement au bord des coulées de lave."
  },
  vecteur_cendre: {
    id:'vecteur_cendre', name:'Vecteur de Cendre', family:'démon', elite:true,
    sprite:{kind:'creature', shape:'chauvesouris', main:'#7a1f1f', eye:'#ffb347'},
    behavior:'ranged', speed:1.5, aggroRange:280, atkRange:200, atkCooldown:1.4, projectileSpeed:6,
    base:{hp:150, dmg:[16,26], armor:8, xp:60},
    resist:{feu:40, ombre:10}, zones:['catacombes_arides'],
    bestiary:"Créature d'élite crachant des braises depuis les hauteurs des Catacombes Arides. Rare, mais redoutable en escadrille."
  },
  chevalier_dechu: {
    id:'chevalier_dechu', name:'Chevalier Déchu', family:'mort-vivant',
    sprite:{kind:'humanoid', weapon:'epee', undead:true, cloth:'#2a2a30', accent:'#b34dff', armor:'lourd'},
    behavior:'melee', speed:1.1, aggroRange:240, atkRange:38, atkCooldown:1.0,
    base:{hp:60, dmg:[12,20], armor:14, xp:30},
    resist:{ombre:25, physique:15}, zones:['faille'],
    bestiary:"Dernier défenseur de Val-Aurore, il continue de se battre pour une cité qui n'existe plus, contre un ennemi qu'il ne reconnaît plus."
  },
  spectre_faille: {
    id:'spectre_faille', name:'Spectre de la Faille', family:'esprit',
    sprite:{kind:'creature', shape:'spectre', main:'#150a1e', eye:'#ff2b6a'},
    behavior:'ranged', speed:1.2, aggroRange:300, atkRange:240, atkCooldown:1.5, projectileSpeed:6,
    base:{hp:40, dmg:[10,18], armor:3, xp:24},
    resist:{ombre:60}, zones:['faille'],
    bestiary:"Une esquille de Nihilash lui-même, échappée de la Faille. Regarder trop longtemps dans ses yeux donne le vertige."
  },
};

export const BOSSES = {
  kravoth: {
    id:'kravoth', name:'Kravoth, le Chien-Bûcher', zone:'foret', glow:'#ff6a2b',
    base:{hp:380, dmg:[13,20], armor:5, xp:180, speed:1.3, atkRange:50, atkCooldown:1.2},
    resist:{feu:30},
    intro:"Un grondement secoue la Forêt Calcinée. Kravoth n'a pas dormi depuis l'Embrasement — et il ne compte pas commencer avec vous entre les crocs.",
    bestiary:"Le plus vieux des Chiens de Suie, grandi jusqu'à la taille d'un ours en dévorant tout ce qui s'aventurait dans son territoire.",
    lootTier:1
  },
  gardien_cimetiere: {
    id:'gardien_cimetiere', name:'Ossemage, Gardien du Cimetière', zone:'cimetiere', glow:'#8a8a80',
    base:{hp:460, dmg:[15,23], armor:9, xp:240, speed:1.0, atkRange:45, atkCooldown:1.2},
    resist:{ombre:25, physique:10},
    intro:"La terre du Cimetière des Cendres se soulève. Ossemage, assemblage de tous les ossements qu'il a jamais gardés, se redresse pour la première fois.",
    bestiary:"Fossoyeur de Val-Aurore avant l'Embrasement, il continue son office bien après que ses mains ont cessé d'être de chair.",
    lootTier:2
  },
  malessia: {
    id:'malessia', name:'Malessia la Noyée', zone:'marais', glow:'#4d8fff',
    base:{hp:520, dmg:[16,26], armor:4, xp:280, speed:1.0, atkRange:220, atkCooldown:1.6, ranged:true, projectileSpeed:5.5},
    resist:{ombre:35},
    intro:"Les eaux du Marais Livide se figent. Malessia émerge, portant encore la robe de mariée qu'elle portait la nuit de l'Embrasement.",
    bestiary:"Noyée en tentant de fuir Val-Aurore en flammes, elle hante désormais les marais, attirant les vivants vers les profondeurs.",
    lootTier:2
  },
  grondos: {
    id:'grondos', name:'Grondos, Roi des Grottes', zone:'grottes', glow:'#c9a060',
    base:{hp:760, dmg:[20,30], armor:10, xp:340, speed:0.9, atkRange:50, atkCooldown:1.3},
    resist:{physique:20},
    intro:"La roche tremble au fond des Grottes de Montagne. Grondos, le plus vieux des Trolls de Roc, se dresse de toute sa hauteur.",
    bestiary:"Personne n'a survécu assez longtemps pour compter le nombre de mineurs qu'il a ensevelis vivants sous les éboulis.",
    lootTier:3
  },
  sabrak: {
    id:'sabrak', name:'Sabrak, Écaille de Cendre', zone:'desert', glow:'#c9a860',
    base:{hp:820, dmg:[22,32], armor:8, xp:380, speed:1.2, atkRange:45, atkCooldown:1.1},
    resist:{feu:20},
    intro:"Le sable du Désert de Cendres se soulève en tourbillon. Sabrak en émerge, plus long qu'un homme n'est grand.",
    bestiary:"Le plus vieux Serpent du Désert, dont le venin est devenu si concentré qu'il calcine la chair au contact.",
    lootTier:3
  },
  ossian: {
    id:'ossian', name:'Ossian le Sans-Visage', zone:'temple', glow:'#b34dff',
    base:{hp:900, dmg:[24,34], armor:12, xp:440, speed:1.1, atkRange:40, atkCooldown:1.0},
    resist:{ombre:30, physique:15},
    intro:"Une silhouette encapuchonnée se redresse au centre du Temple Maudit. Là où devrait être un visage, il n'y a que du vide.",
    bestiary:"Bourreau du Temple avant même l'Embrasement, il a perdu jusqu'à son propre visage en servant trop de maîtres différents.",
    lootTier:4
  },
  frostina: {
    id:'frostina', name:'Frostina, Cœur de Glace', zone:'toundra', glow:'#8fe0ff',
    base:{hp:1000, dmg:[26,38], armor:10, xp:500, speed:0.9, atkRange:220, atkCooldown:1.5, ranged:true, projectileSpeed:5.5},
    resist:{glace:60},
    intro:"Le vent se tait dans la Toundra Enneigée. Frostina, matriarche des Géants de Givre, ouvre les yeux pour la première fois en un siècle.",
    bestiary:"On raconte qu'elle fut une Cendrée ordinaire avant de se perdre dans le blizzard éternel qui a suivi l'Embrasement au nord.",
    lootTier:4
  },
  pyrraxis: {
    id:'pyrraxis', name:'Pyrraxis, Cœur de Braise', zone:'volcan', glow:'#ff8c2b',
    base:{hp:1150, dmg:[28,40], armor:14, xp:600, speed:0.9, atkRange:55, atkCooldown:1.3},
    resist:{feu:70, physique:10},
    intro:"Le sol du Volcan Actif se fend. Pyrraxis en jaillit, noyau de lave vivante enveloppé de pierre noircie.",
    bestiary:"Né des profondeurs quand la lave du volcan a absorbé assez de cendre pour prendre conscience de lui-même.",
    lootTier:4
  },
  matriarche_cendre: {
    id:'matriarche_cendre', name:'La Matriarche de Cendre', zone:'catacombes_arides', glow:'#ff6a2b',
    base:{hp:1300, dmg:[30,44], armor:12, xp:700, speed:1.3, atkRange:220, atkCooldown:1.3, ranged:true, projectileSpeed:6},
    resist:{feu:40, ombre:15},
    intro:"Un cri strident déchire l'air sec des Catacombes Arides. La Matriarche de Cendre déploie des ailes plus larges qu'un homme n'est grand.",
    bestiary:"Première née des Vecteurs de Cendre, elle commande son essaim depuis les hauteurs invisibles des catacombes à ciel ouvert.",
    lootTier:4
  },
  nihilash: {
    id:'nihilash', name:"Nihilash, l'Ombre Dévorante", zone:'faille', glow:'#8a1fff',
    base:{hp:1900, dmg:[32,50], armor:14, xp:1400, speed:1.0, atkRange:240, atkCooldown:1.4, ranged:true, projectileSpeed:6.5},
    resist:{ombre:50},
    intro:"La Faille s'ouvre en grand. Ce qui en émerge n'a pas de forme fixe — seulement une faim que le monde entier ne suffirait pas à combler.",
    bestiary:"Dieu déchu, scellé puis libéré par accident lors d'un rituel oublié. Sa défaite ne signifie peut-être qu'un sursis pour Val Cendré.",
    lootTier:5, isFinal:true
  },
};

export function scaledEnemyStats(def, zoneLevel){
  const lvl = Math.max(1, zoneLevel);
  const hp = Math.round(def.base.hp * (1 + lvl*0.32));
  const dmg = def.base.dmg.map(d=> Math.round(d * (1 + lvl*0.24)));
  const armor = Math.round(def.base.armor * (1 + lvl*0.18));
  const xp = Math.round(def.base.xp * (1 + lvl*0.35));
  return {hp, maxHp:hp, dmg, armor, xp};
}
