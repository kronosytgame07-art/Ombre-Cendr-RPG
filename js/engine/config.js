export const TILE_SIZE = 40;
// Taille d'affichage dans le monde, indépendante de la résolution des images.
// Une frame peut rester en 96x96 dans le cache sans rendre le héros géant ni
// allouer une nouvelle texture redimensionnée à chaque frame.
export const ACTOR_RENDER_SIZE = Object.freeze({
  humanoid: Object.freeze({width:64, height:80}),
  creature: Object.freeze({width:68, height:60}),
  boss: Object.freeze({width:136, height:136}),
});
export const PLAYER_BASE_SPEED = 170; // px/s
export const INVENTORY_SIZE = 32;

export function xpToNextLevel(level){
  return Math.round(60 * Math.pow(level, 1.55) + 40*level);
}

export const MAX_LEVEL = 55;

export const ATTACK_RANGE_MELEE_PLAYER = 46;
