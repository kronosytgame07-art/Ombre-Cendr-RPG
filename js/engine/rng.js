// Petit générateur pseudo-aléatoire déterministe (mulberry32) + helpers.
export function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng{
  constructor(seed){ this.seed = seed >>> 0; this.fn = mulberry32(this.seed); }
  next(){ return this.fn(); }
  int(min,max){ return Math.floor(this.next()*(max-min+1))+min; }
  float(min,max){ return this.next()*(max-min)+min; }
  pick(arr){ return arr[Math.floor(this.next()*arr.length)]; }
  chance(p){ return this.next() < p; }
  reseed(seed){ this.seed = seed>>>0; this.fn = mulberry32(this.seed); }
}

export const grng = new Rng(Date.now() & 0xffffffff);
