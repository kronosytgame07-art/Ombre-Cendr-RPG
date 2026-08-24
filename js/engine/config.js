export const TILE_SIZE = 40;
export const PLAYER_BASE_SPEED = 170; // px/s
export const INVENTORY_SIZE = 32;

export function xpToNextLevel(level){
  return Math.round(60 * Math.pow(level, 1.55) + 40*level);
}

export const MAX_LEVEL = 55;

export const ATTACK_RANGE_MELEE_PLAYER = 46;
