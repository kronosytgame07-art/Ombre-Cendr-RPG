export const DIFFICULTY_MULT = {novice:0.72, cendre:1.0, brasier:1.35, nihilash:1.8};
let current = 'cendre';
export function setDifficulty(id){ if(DIFFICULTY_MULT[id]) current = id; }
export function getDifficultyMult(){ return DIFFICULTY_MULT[current] || 1.0; }
