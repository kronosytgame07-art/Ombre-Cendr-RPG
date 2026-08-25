import { QUESTS } from '../data/quests.js';

export function acceptQuest(player, questId){
  if(player.quests[questId]) return false;
  player.quests[questId] = {progress:0, done:false, turnedIn:false};
  return true;
}

export function registerKillForQuests(player, defId){
  for(const qid in player.quests){
    const q = player.quests[qid];
    if(q.done || q.turnedIn) continue;
    const def = QUESTS[qid];
    if(!def || def.type!=='kill' || def.target!==defId) continue;
    q.progress = Math.min(def.count, q.progress+1);
    if(q.progress>=def.count) q.done = true;
  }
}

// Valide la remise de quête et paie l'or immédiatement ; renvoie le gain
// d'XP à traiter par l'appelant (qui a accès à grantXp/pendingLevelEvents),
// ou null si la quête n'est pas prête à être rendue.
export function turnInQuest(player, questId){
  const q = player.quests[questId];
  const def = QUESTS[questId];
  if(!q || !def || !q.done || q.turnedIn) return null;
  q.turnedIn = true;
  player.gold += def.reward.gold||0;
  return def.reward.xp||0;
}
