// Chargement (asynchrone, avec cache) des sprites réels extraits des planches IA.
const cache = new Map();

export function loadImage(path){
  if(cache.has(path)) return cache.get(path);
  const p = new Promise((resolve)=>{
    const img = new Image();
    img.onload = ()=> resolve(img);
    img.onerror = ()=> resolve(null);
    img.src = path;
  });
  cache.set(path, p);
  return p;
}

export function getImageSync(path){
  const entry = cache.get(path);
  if(!entry) return null;
  return entry._resolved || null;
}

export async function preload(paths){
  const results = await Promise.all(paths.map(async p=>{
    const img = await loadImage(p);
    const entry = cache.get(p);
    if(entry) entry._resolved = img;
    return img;
  }));
  return results;
}
