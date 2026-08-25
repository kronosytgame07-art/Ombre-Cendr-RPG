// Audio 100% procédurale (Web Audio API) : aucun fichier son, tout est
// synthétisé à la volée. Permet aux curseurs Musique/Effets des Options
// d'avoir un effet réel sans télécharger le moindre asset.
let ctx = null;
let sfxGain = null, musicGain = null;
let musicNodes = null;
let sfxVolume = 0.6, musicVolume = 0.4;

function getCtx(){
  if(!ctx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    ctx = new AC();
    sfxGain = ctx.createGain(); sfxGain.gain.value = sfxVolume; sfxGain.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = musicVolume; musicGain.connect(ctx.destination);
  }
  return ctx;
}

// À appeler depuis un vrai geste utilisateur (clic menu) : les navigateurs
// bloquent l'audio tant qu'aucune interaction n'a eu lieu.
export function unlockAudio(){
  const c = getCtx();
  if(c && c.state === 'suspended') c.resume();
}

export function setVolumes(sfxPct, musicPct){
  sfxVolume = Math.max(0, Math.min(1, sfxPct));
  musicVolume = Math.max(0, Math.min(1, musicPct));
  if(sfxGain) sfxGain.gain.setTargetAtTime(sfxVolume, ctx.currentTime, 0.05);
  if(musicGain) musicGain.gain.setTargetAtTime(musicVolume*0.22, ctx.currentTime, 0.4);
}

function tone(freq, dur, type='sine', gainMult=1, delay=0, glideTo=null){
  const c = getCtx();
  if(!c || sfxVolume<=0) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t0);
  if(glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0+dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gainMult, t0+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  osc.connect(g); g.connect(sfxGain);
  osc.start(t0); osc.stop(t0+dur+0.02);
}

function noiseBurst(dur, gainMult=1, delay=0, filterFreq=1800){
  const c = getCtx();
  if(!c || sfxVolume<=0) return;
  const t0 = c.currentTime + delay;
  const bufferSize = Math.floor(c.sampleRate*dur);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * (1 - i/bufferSize);
  const src = c.createBufferSource(); src.buffer = buffer;
  const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = filterFreq;
  const g = c.createGain(); g.gain.setValueAtTime(gainMult, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  src.connect(filt); filt.connect(g); g.connect(sfxGain);
  src.start(t0);
}

const SFX = {
  swing: () => noiseBurst(0.09, 0.5, 0, 2600),
  cast:  () => tone(340, 0.16, 'sawtooth', 0.25, 0, 620),
  hit:   () => noiseBurst(0.07, 0.6, 0, 1200),
  crit:  () => { noiseBurst(0.09, 0.7, 0, 1600); tone(880, 0.12, 'square', 0.2, 0.02); },
  hurt:  () => tone(140, 0.18, 'sawtooth', 0.35, 0, 70),
  death: () => tone(220, 0.35, 'sawtooth', 0.3, 0, 40),
  pickup:() => tone(660, 0.09, 'sine', 0.2, 0, 990),
  purchase: () => { tone(520, 0.08, 'square', 0.18); tone(780, 0.1, 'square', 0.18, 0.06); },
  levelup: () => { [523,659,784,1047].forEach((f,i)=>tone(f, 0.18, 'triangle', 0.22, i*0.09)); },
  bossdown: () => { [392,494,587,784].forEach((f,i)=>tone(f, 0.22, 'sawtooth', 0.2, i*0.11)); },
  questcomplete: () => { tone(659, 0.12, 'triangle', 0.22); tone(988, 0.18, 'triangle', 0.24, 0.1); },
  ui: () => tone(440, 0.05, 'square', 0.12),
};

export function playSfx(kind){
  const fn = SFX[kind];
  if(fn) fn();
}

// Nappe d'ambiance très discrète (deux oscillateurs graves désaccordés +
// filtre passe-bas modulé), pour que le silence total ne dure pas éternellement.
export function startMusic(){
  const c = getCtx();
  if(!c || musicNodes) return;
  const o1 = c.createOscillator(), o2 = c.createOscillator();
  o1.type='sine'; o2.type='sine';
  o1.frequency.value = 55; o2.frequency.value = 55*1.5;
  const filt = c.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value = 400;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.06;
  const lfoGain = c.createGain(); lfoGain.gain.value = 120;
  lfo.connect(lfoGain); lfoGain.connect(filt.frequency);
  o1.connect(filt); o2.connect(filt); filt.connect(musicGain);
  o1.start(); o2.start(); lfo.start();
  musicNodes = {o1,o2,filt,lfo};
}
export function stopMusic(){
  if(!musicNodes) return;
  musicNodes.o1.stop(); musicNodes.o2.stop(); musicNodes.lfo.stop();
  musicNodes = null;
}
