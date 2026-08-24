// Les cinq vocations jouables d'Ombre Cendrée.
export const CLASSES = [
  {
    id:'fervent', name:'Le Fervent', role:'Guerrier', resource:'rage', resourceColor:'#c23b3b',
    weapon:'hache', armorStyle:'lourd', hood:false, cloak:false, sprite:'assets/sprites/heroes/fervent/portrait.png',
    palette:{skin:'#d8b48a', cloth:'#4a3a30', accent:'#8a1f1f', trim:'#d8b45a', hair:'#2b1c14'},
    tagline:"La cendre ne brûle pas deux fois celui qui l'a déjà traversée.",
    bio:`Ancien garde de Val-Aurore, le Fervent a survécu à l'Embrasement en portant sur son dos
trois enfants qu'il ne connaissait pas. Depuis, sa rage ne s'est jamais éteinte — elle couve sous
sa peau comme une braise sous la cendre, prête à exploser au moindre coup porté. Guerrier de
première ligne, il encaisse ce que les autres ne pourraient survivre, et rend chaque coup au
centuple. Sur le champ de bataille, il est le mur derrière lequel les faibles trouvent refuge.`,
    baseStats:{force:12, dexterite:5, intelligence:2, vitalite:11},
    growth:{force:2.4, dexterite:1.0, intelligence:0.4, vitalite:2.6},
    startWeaponDmg:[6,10],
    scaleAttr:'force',
    branches:['rage_braises','rempart_cendre','cri_guerre']
  },
  {
    id:'pyromancienne', name:'La Pyromancienne', role:'Mage', resource:'mana', resourceColor:'#2b6fc2',
    weapon:'baton', armorStyle:'leger', hood:false, cloak:true, sprite:'assets/sprites/heroes/pyromancienne/portrait.png',
    palette:{skin:'#e0c09a', cloth:'#5a1f1f', accent:'#ff6a2b', trim:'#ffb347', hair:'#7a1414'},
    tagline:"Le feu qui a détruit le monde m'obéit désormais.",
    bio:`Recueillie enfant dans les ruines fumantes de la Tour d'Astre, la Pyromancienne a appris à
parler au feu plutôt qu'à le craindre. Elle porte encore les cicatrices claires de cette première
nuit, comme des veines de lumière sur sa peau cendrée. Pour elle, les flammes de l'Embrasement
n'étaient pas une fin, mais un langage — et elle est aujourd'hui l'une des rares âmes capables de
le manier sans se consumer entièrement.`,
    baseStats:{force:2, dexterite:5, intelligence:13, vitalite:6},
    growth:{force:0.4, dexterite:1.0, intelligence:3.0, vitalite:1.6},
    startWeaponDmg:[4,7],
    scaleAttr:'intelligence',
    branches:['voie_flammes','voie_neant','voie_givre']
  },
  {
    id:'ombrelame', name:"L'Ombrelame", role:'Assassin', resource:'energie', resourceColor:'#7fd97f',
    weapon:'dague', armorStyle:'leger', hood:true, cloak:true, sprite:'assets/sprites/heroes/ombrelame/portrait.png',
    palette:{skin:'#c9a074', cloth:'#1f2a24', accent:'#2e5c3f', trim:'#7fd97f', hair:'#101010'},
    tagline:"Je suis l'ombre que même l'ombre ne voit pas venir.",
    bio:`Personne ne sait qui l'Ombrelame était avant l'Embrasement — elle-même prétend l'avoir
oublié. Ce qu'on sait, c'est qu'elle se déplace dans les ruines de Val Cendré sans jamais
déclencher un seul piège, sans jamais faire crisser une pierre. Formée par les survivants de la
Guilde du Silence, elle frappe vite, frappe fort, et disparaît avant que le sang n'ait fini de
couler. Les cultistes de Nihilash la surnomment "la Seconde Ombre".`,
    baseStats:{force:6, dexterite:13, intelligence:4, vitalite:7},
    growth:{force:1.2, dexterite:3.0, intelligence:0.8, vitalite:1.8},
    startWeaponDmg:[5,8],
    scaleAttr:'dexterite',
    branches:['lames_jumelles','voile_ombre','poison_noir']
  },
  {
    id:'necrophore', name:'Le Nécrophore', role:'Invocateur', resource:'mana', resourceColor:'#2b6fc2',
    weapon:'sceptre', armorStyle:'leger', hood:true, cloak:true, sprite:'assets/sprites/heroes/necrophore/portrait.png',
    palette:{skin:'#a89684', cloth:'#241f2a', accent:'#5a2e6b', trim:'#b34dff', hair:'#0c0c0c'},
    tagline:"Les morts de Val Cendré n'ont pas fini de servir.",
    bio:`Prêtre déchu d'un culte funéraire oublié, le Nécrophore a compris avant tout le monde que
la mort, après l'Embrasement, n'était plus une fin — seulement un changement d'état. Il parle aux
cendres des disparus et en tire des serviteurs loyaux, faits d'os calcinés et de volonté pure.
Craint et méprisé en Cendre-Refuge, il n'en reste pas moins l'un des combattants les plus
redoutables contre les hordes qui déferlent de la Faille.`,
    baseStats:{force:4, dexterite:4, intelligence:12, vitalite:7},
    growth:{force:0.8, dexterite:0.8, intelligence:2.6, vitalite:1.8},
    startWeaponDmg:[4,7],
    scaleAttr:'intelligence',
    branches:['legion_cendree','maledictions','moisson_ames']
  },
  {
    id:'sentinelle', name:'La Sentinelle des Cendres', role:'Chasseresse', resource:'energie', resourceColor:'#7fd97f',
    weapon:'arc', armorStyle:'leger', hood:false, cloak:false, sprite:'assets/sprites/heroes/sentinelle/portrait.png',
    palette:{skin:'#c9a074', cloth:'#2c3a2a', accent:'#4a6b3a', trim:'#d8b45a', hair:'#4a3222'},
    tagline:"La cendre garde toujours la trace de ce qui a fui.",
    bio:`Née après l'Embrasement, la Sentinelle n'a jamais connu le ciel bleu dont parlent les
anciens — mais elle connaît chaque sentier, chaque terrier, chaque piste dans les Cendres mieux
que quiconque. Éclaireuse pour l'Ordre des Braises, elle chasse depuis l'enfance les créatures qui
rôdent hors des murs. Son arc, taillé dans le bois d'un arbre mort depuis un siècle, n'a encore
jamais manqué sa cible deux fois.`,
    baseStats:{force:6, dexterite:12, intelligence:3, vitalite:7},
    growth:{force:1.2, dexterite:2.8, intelligence:0.6, vitalite:1.8},
    startWeaponDmg:[5,9],
    scaleAttr:'dexterite',
    branches:['tir_precision','pieges_cendre','instinct_sauvage']
  }
];

export function getClass(id){ return CLASSES.find(c=>c.id===id); }
