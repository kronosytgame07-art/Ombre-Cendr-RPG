# Ombre Cendrée

Un action-RPG hack'n'slash vu de dessus, dans la lignée de Diablo, entièrement
jouable dans le navigateur — sans build, sans dépendance, sans serveur autre
qu'un simple serveur de fichiers statiques.

## Lancer le jeu

```bash
npx serve .
# ou
python3 -m http.server 8080
```

Puis ouvrez l'URL affichée (ex: `http://localhost:8080`). Le jeu ne fonctionne
pas en ouvrant `index.html` directement en `file://` (les modules ES ont
besoin d'un vrai serveur HTTP).

## Le monde de Val Cendré

Il y a cent ans, le dieu déchu **Nihilash** a failli traverser dans notre
monde. L'Embrasement qui a suivi a recouvert le continent de Val Cendré
d'une pluie de cendre qui n'a jamais vraiment cessé. Les survivants, les
**Cendrés**, portent dans leurs veines la marque grise de cette nuit-là —
chez certains, une simple cicatrice ; chez d'autres, une source de pouvoir
brut. Depuis **Cendre-Refuge**, dernier bastion bâti sur les ruines de
Val-Aurore, l'Ordre des Braises envoie ses plus braves Cendrés refermer ce
que l'Embrasement a ouvert : la **Faille d'Ombre**, d'où Nihilash, diminué
mais patient, prépare son retour.

## Contenu du jeu

- **5 vocations jouables**, chacune avec sa propre bio, son style de combat
  et son arbre de compétences (Le Fervent, La Pyromancienne, L'Ombrelame,
  Le Nécrophore, La Sentinelle des Cendres).
- **Arbres de compétences** : un tronc commun + 3 branches par classe (5
  nœuds chacune : une compétence active signature, 3 passifs, un capstone),
  soit une quinzaine de compétences actives et près de 80 nœuds au total.
  Les noms et effets des sorts élémentaires (Boule de Feu, Éclair de Givre,
  Tentacules d'Ombre, Bulle de Poison, Chaîne d'Éclairs) reprennent les
  planches de sprites fournies pour le projet.
- **9 zones + 1 ville** générées procéduralement à chaque visite (automate
  cellulaire pour les donjons), du Cimetière des Cendres jusqu'à la Faille
  d'Ombre, en passant par le Marais Livide, les Grottes de Montagne, le
  Désert de Cendres, la Toundra Enneigée, le Temple Maudit, le Volcan Actif
  et les Catacombes Arides.
- **Une vingtaine de types d'ennemis** + **8 boss de zone** (dont le boss
  final, Nihilash), chacun avec sa propre fiche de bestiaire.
- **Butin façon Diablo** : armes, armures et accessoires générés avec 5
  paliers de rareté (Commun/Magique/Rare/Épique/Légendaire), une vingtaine
  d'affixes possibles, et 10 objets légendaires uniques avec effet spécial
  et texte de lore.
- **Inventaire + équipement**, fiche de personnage avec allocation de points
  de caractéristique, sauvegarde multi-emplacements en `localStorage`.
- **Codex** in-game : lore du monde, biographies des classes, bestiaire
  débloqué au fil des rencontres, carte du monde avec zones verrouillées.
- Rendu en **pixel art procédural** (silhouettes dessinées au runtime sur
  canvas), avec les portraits des 5 héros et les VFX de sorts extraits de
  planches générées par IA via l'outil fourni dans `tools/`.

## Contrôles

- **ZQSD / flèches** : déplacement
- **Clic gauche (maintenu)** : attaque de base
- **1-4** : compétences actives (débloquées dans l'arbre de compétences)
- **R / F** : potion de vie / de ressource
- **I** : inventaire — **K** : compétences — **J** : codex — **M** : carte
  du monde — **Échap** : pause

## Structure du projet

```
index.html, css/style.css      Interface (menus, HUD, panneaux)
js/data/                       Classes, arbres de compétences, objets,
                                affixes, ennemis, zones, lore
js/engine/                     Rendu pixel art procédural, génération de
                                donjons, entrées, assets, RNG, config
js/systems/                    Combat, butin, progression, sauvegarde
js/entities.js, js/game.js     Entités de jeu et boucle principale
js/panels.js, js/main.js       Interface et machine à états
tools/extract_spritesheet.py   Outil de découpage de planches de sprites IA
assets/sprites/                Sprites extraits (portraits de héros, VFX)
```

## Outil d'extraction de sprites

`tools/extract_spritesheet.py` découpe automatiquement une planche de
sprites générée par IA (détection des cadres par OpenCV, détourage du fond,
recadrage/centrage, tri en lignes et groupes d'animation). Voir l'en-tête du
script pour la documentation complète des paramètres.

```bash
pip install -r tools/requirements.txt
python3 tools/extract_spritesheet.py --input planche.png --output out/ --debug
```
