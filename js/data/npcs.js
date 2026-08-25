// PNJ du monde : marchands, forgeron, donneurs de quêtes. Pour l'instant tous
// installés à Cendre-Refuge (la seule ville) — la disposition de la ville est
// désormais stable (seed fixe dans Game.enterZone), donc leur position
// relative au point d'apparition reste cohérente d'une visite à l'autre.
export const NPCS = [
  {
    id:'marchande', zone:'refuge', name:'Yvenne la Cendrée', role:'marchand', sheetIdle:0, sheetWalk:[1,2],
    offset:{x:-7, y:-2},
    sprite:{cloth:'#5a2e2e', accent:'#8a6d3a', trim:'#8a8a80', hair:'#3a281c', hood:false, cloak:false, weapon:'dague', armor:'leger'},
    greeting:"Potions, composants, babioles récupérées sur le champ de bataille... Servez-vous, Cendré. Et si vous avez du superflu, je paie bien.",
  },
  {
    id:'forgeron', zone:'refuge', name:'Bram Poing-de-Fer', role:'forgeron', sheetIdle:3, sheetWalk:[4,4],
    offset:{x:7, y:-1},
    sprite:{cloth:'#3a2e28', accent:'#6b6b6b', trim:'#8a8a80', hair:'#241c16', hood:false, cloak:false, weapon:'hache', armor:'lourd'},
    greeting:"Une lame ébréchée, une armure trouée ? J'ai de quoi sur l'étal — et je reprends tout ce que tu ne portes plus.",
  },
  {
    id:'emissaire', zone:'refuge', name:"Sœur Aude de l'Ordre", role:'quete', sheetIdle:5, sheetWalk:[6,7],
    offset:{x:0, y:7},
    sprite:{cloth:'#241f2a', accent:'#8a1fff', trim:'#8a8a80', hair:'#1c1418', hood:true, cloak:true, weapon:'sceptre', armor:'leger'},
    greeting:"L'Ordre des Braises n'oublie pas ceux qui nettoient nos terres. Voici ce qu'il reste à faire, si le cœur t'en dit.",
    questIds:['q_chiens_suie','q_araignees_calcinees','q_cendre_corrompu','q_kravoth'],
  },
];

export function npcsForZone(zoneId){ return NPCS.filter(n=>n.zone===zoneId); }
