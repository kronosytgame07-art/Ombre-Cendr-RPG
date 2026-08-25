# Direction artistique HD-2D — Ombre Cendrée

## Standard technique

- Vue : top-down trois-quarts, 8 directions.
- Cellule personnage : 96 × 96 px.
- Ordre des colonnes : S, SW, W, NW, N, NE, E, SE.
- Ordre des lignes : idle, marche A, marche B, attaque préparation, attaque impact, esquive, dégâts, mort.
- Fond : transparence alpha réelle.
- Ancrage : pieds centrés et identiques dans chaque cellule.
- Rendu : pixel art HD-2D sombre, médiéval, cendreux, éclairage braise, silhouettes lisibles à l'échelle du jeu.

## Lots prévus

1. 5 classes jouables et leurs animations.
2. Couches modulaires : corps, casque, plastron, gants, bottes, bouclier, armes.
3. Une vingtaine d'ennemis et 8 boss avec idle, déplacement, attaque, dégâts et mort.
4. Cendre-Refuge, 9 biomes, sols, murs, falaises, végétation, props et transitions.
5. Coffres fermés/ouverture/ouverts, portails, autels, pièges et objets interactifs.
6. HUD, boutons, cadres, inventaire, raretés, icônes d'objets et compétences.
7. VFX : feu, givre, ombre, poison, éclairs, impacts, mort et butin.

## Premier asset

`assets/sprites/heroes/fervent/fervent_8dir_actions.png`

Grille 8 × 8, 768 × 768 px, canal alpha. Cette planche sert de référence de proportions et d'animation pour les autres personnages.
