// Le monde de Val Cendré : un hub sûr (Cendre-Refuge) puis 9 zones de plus
// en plus dangereuses, jusqu'à la Faille d'Ombre finale.

export const ZONES = [
  {
    id:'refuge', name:'Cendre-Refuge', kind:'town', order:0, levelRange:[1,1],
    floorTile:'cobble', wallTile:'maison', accentTile:'bois', size:{w:40,h:40},
    ambient:'#3a3228', enemyPool:[], bossId:null, unlockRequires:null,
    blurb:"Le dernier bastion des Cendrés, bâti sur les ruines de Val-Aurore. Ici, pas de monstres — seulement des marchands, un forgeron, et l'Ordre des Braises qui vous enverra affronter ce qui rampe hors de la Faille."
  },
  {
    id:'foret', name:'Forêt Calcinée', kind:'dungeon', order:1, levelRange:[1,6],
    floorTile:'foret_sol', wallTile:'pierre', accentTile:'ash_ground', size:{w:75,h:75},
    ambient:'#1a1f14', enemyPool:['chien_suie','araignee_calcinee','cendre_corrompu'],
    bossId:'kravoth', unlockRequires:'refuge',
    blurb:"Des troncs noircis à perte de vue, seuls vestiges de la forêt qui couvrait jadis les abords de Val-Aurore. Les Chiens de Suie y chassent en meute parmi les cendres tombées des cimes."
  },
  {
    id:'cimetiere', name:'Cimetière des Cendres', kind:'dungeon', order:2, levelRange:[4,10],
    floorTile:'ash_ground', wallTile:'pierre', accentTile:'cendre_route', size:{w:70,h:70},
    ambient:'#241f1c', enemyPool:['cendre_corrompu','chien_suie','squelette_guerrier'],
    bossId:'gardien_cimetiere', unlockRequires:'foret',
    blurb:"Les tombes de Val-Aurore n'ont jamais fini de brûler. Les premiers Cendrés à sombrer dans la folie y reposent — ou plutôt, n'y reposent pas vraiment."
  },
  {
    id:'marais', name:'Marais Livide', kind:'dungeon', order:3, levelRange:[10,16],
    floorTile:'marais', wallTile:'foret_sol', accentTile:'eau', size:{w:80,h:80},
    ambient:'#1c2418', enemyPool:['serpent_marais','maraudeur_corrompu','voile_ombre','larve_ombre'],
    bossId:'malessia', unlockRequires:'cimetiere',
    blurb:"Des eaux stagnantes qui n'ont plus reflété le ciel depuis un siècle. On dit que ceux qui s'y noient continuent d'y marcher, la nuit venue."
  },
  {
    id:'grottes', name:'Grottes de Montagne', kind:'dungeon', order:4, levelRange:[12,18],
    floorTile:'caverne', wallTile:'pierre', accentTile:'pierre', size:{w:75,h:75},
    ambient:'#201c1e', enemyPool:['troll_roc','gardien_pierre','chien_suie'],
    bossId:'grondos', unlockRequires:'marais',
    blurb:"Un dédale de galeries minières abandonnées à l'Embrasement. Les Trolls de Roc en ont fait leur territoire, et n'apprécient guère les visiteurs."
  },
  {
    id:'desert', name:'Désert de Cendres', kind:'dungeon', order:5, levelRange:[18,24],
    floorTile:'sable', wallTile:'pierre', accentTile:'ash_ground', size:{w:85,h:85},
    ambient:'#2e2416', enemyPool:['serpent_desert','araignee_calcinee','cendre_corrompu'],
    bossId:'sabrak', unlockRequires:'grottes',
    blurb:"Une mer de cendre grise à perte de vue, où le vent découvre parfois les ossements de caravanes entières, mortes de soif à quelques pas de Cendre-Refuge."
  },
  {
    id:'toundra', name:'Toundra Enneigée', kind:'dungeon', order:6, levelRange:[24,30],
    floorTile:'neige', wallTile:'pierre', accentTile:'caverne', size:{w:80,h:80},
    ambient:'#232a30', enemyPool:['geant_givre','gardien_pierre','voile_ombre'],
    bossId:'frostina', unlockRequires:'desert',
    blurb:"Au nord de Val Cendré, l'Embrasement a paradoxalement figé la terre dans un hiver sans fin. Les Géants de Givre y sont nés du blizzard lui-même."
  },
  {
    id:'temple', name:'Temple Maudit', kind:'dungeon', order:7, levelRange:[30,36],
    floorTile:'tapis', wallTile:'cobble', accentTile:'pierre', size:{w:75,h:75},
    ambient:'#241a2a', enemyPool:['cultiste_nihilash','revenant','voile_ombre','squelette_guerrier'],
    bossId:'ossian', unlockRequires:'toundra',
    blurb:"Un sanctuaire consacré à Nihilash bien avant l'Embrasement, comme si son retour avait toujours été prévu par quelqu'un. Ossian en est le geôlier silencieux."
  },
  {
    id:'volcan', name:'Volcan Actif', kind:'dungeon', order:8, levelRange:[36,42],
    floorTile:'lave', wallTile:'ash_ground', accentTile:'pierre', size:{w:80,h:80},
    ambient:'#3a1a0e', enemyPool:['golem_cendre','minotaure_lave','chauvesouris_infernale','chauvesouris_braise'],
    bossId:'pyrraxis', unlockRequires:'temple',
    blurb:"Le cœur brûlant de Val Cendré, resté actif depuis l'Embrasement. Pyrraxis y règne sur des créatures de pierre et de magma."
  },
  {
    id:'catacombes_arides', name:'Catacombes Arides', kind:'dungeon', order:9, levelRange:[42,48],
    floorTile:'sable', wallTile:'caverne', accentTile:'ash_ground', size:{w:85,h:85},
    ambient:'#2a2018', enemyPool:['vecteur_cendre','cultiste_nihilash','gardien_pierre'],
    bossId:'matriarche_cendre', unlockRequires:'volcan',
    blurb:"D'anciennes catacombes effondrées, ouvertes au ciel de cendre par l'Embrasement. Les Vecteurs de Cendre y nichent en escadrilles, invisibles jusqu'à l'attaque."
  },
  {
    id:'faille', name:"la Faille d'Ombre", kind:'dungeon', order:10, levelRange:[48,55],
    floorTile:'faille', wallTile:'faille', accentTile:'ash_ground', size:{w:90,h:90},
    ambient:'#150a1c', enemyPool:['chevalier_dechu','spectre_faille','larve_ombre','voile_ombre'],
    bossId:'nihilash', unlockRequires:'catacombes_arides', isFinal:true,
    blurb:"La déchirure elle-même. Ici, la réalité s'effiloche à chaque pas, et Nihilash attend, diminué mais patient, la fin de son long emprisonnement."
  },
];

export function getZone(id){ return ZONES.find(z=>z.id===id); }
export function nextZone(id){
  const z = getZone(id);
  if(!z) return null;
  return ZONES.find(o=>o.order===z.order+1) || null;
}
export function zoneLevel(zone){
  return Math.round((zone.levelRange[0]+zone.levelRange[1])/2);
}
