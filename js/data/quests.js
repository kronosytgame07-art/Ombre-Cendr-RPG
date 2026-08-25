// Quêtes secondaires confiées par les PNJ (voir npcs.js). Volontairement
// simples pour l'instant : éliminer un type d'ennemi (ou un boss) en nombre
// donné, contre de l'or et de l'expérience. Suivies dans player.quests par id
// ({progress, done, turnedIn}) et mises à jour dans Game.onEnemyKilled.
export const QUESTS = {
  q_chiens_suie: {
    id:'q_chiens_suie', giver:'emissaire', name:'Nettoyer la Forêt',
    desc:"Les Chiens de Suie prolifèrent dans la Forêt Calcinée et menacent les patrouilles du Refuge. Abattez-en 8.",
    type:'kill', target:'chien_suie', count:8,
    reward:{xp:80, gold:60},
  },
  q_araignees_calcinees: {
    id:'q_araignees_calcinees', giver:'emissaire', name:'Toiles de Cendre',
    desc:"Des Araignées Calcinées tissent leurs toiles à la lisière du Refuge. Réduisez leur nombre : 6 suffiront.",
    type:'kill', target:'araignee_calcinee', count:6,
    reward:{xp:70, gold:50},
  },
  q_cendre_corrompu: {
    id:'q_cendre_corrompu', giver:'emissaire', name:'Les Cendrés Corrompus',
    desc:"Certains Cendrés n'ont pas survécu à l'Embrasement de la bonne manière. Abrégez leurs souffrances : 6 d'entre eux.",
    type:'kill', target:'cendre_corrompu', count:6,
    reward:{xp:75, gold:55},
  },
  q_kravoth: {
    id:'q_kravoth', giver:'emissaire', name:'La Bête de la Forêt',
    desc:"Kravoth règne sur la Forêt Calcinée depuis trop longtemps. Mettez fin à sa traque.",
    type:'kill', target:'kravoth', count:1,
    reward:{xp:220, gold:150},
  },
};
