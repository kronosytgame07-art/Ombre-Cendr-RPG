const SAVE_PREFIX = 'ombrecendree_save_';
const OPTIONS_KEY = 'ombrecendree_options';
const MAX_SLOTS = 6;

export function listSaveSlots(){
  const slots = [];
  for(let i=0;i<MAX_SLOTS;i++){
    const raw = localStorage.getItem(SAVE_PREFIX+i);
    if(raw){
      try{
        const data = JSON.parse(raw);
        slots.push({slot:i, name:data.player.name, level:data.player.level, classId:data.player.classId,
          zone:data.player.currentZone, savedAt:data.savedAt});
      }catch(e){ slots.push({slot:i, corrupted:true}); }
    } else {
      slots.push({slot:i, empty:true});
    }
  }
  return slots;
}

export function saveGame(slot, gameState){
  const payload = {
    version:1, savedAt: Date.now(),
    player: gameState.player,
  };
  localStorage.setItem(SAVE_PREFIX+slot, JSON.stringify(payload));
}

export function loadGame(slot){
  const raw = localStorage.getItem(SAVE_PREFIX+slot);
  if(!raw) return null;
  try{ return JSON.parse(raw); }catch(e){ return null; }
}

export function deleteSave(slot){
  localStorage.removeItem(SAVE_PREFIX+slot);
}

export function findFirstEmptySlot(){
  for(let i=0;i<MAX_SLOTS;i++){
    if(!localStorage.getItem(SAVE_PREFIX+i)) return i;
  }
  return 0;
}

export function saveOptions(opts){
  localStorage.setItem(OPTIONS_KEY, JSON.stringify(opts));
}
export function loadOptions(){
  const raw = localStorage.getItem(OPTIONS_KEY);
  if(!raw) return null;
  try{ return JSON.parse(raw); }catch(e){ return null; }
}
