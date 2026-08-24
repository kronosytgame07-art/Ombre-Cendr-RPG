import { Rng } from './rng.js';

// Génère une carte de donjon organique par automate cellulaire, garantit sa
// connexité, puis y place le spawn du joueur, le portail de sortie (gardé
// par le boss de zone), les points d'apparition d'ennemis et les coffres.

const WALL = 0, FLOOR = 1;

function makeGrid(w, h, fill){
  const g = new Array(h);
  for(let y=0;y<h;y++){ g[y] = new Array(w).fill(fill); }
  return g;
}

function countWallNeighbors(grid, x, y, w, h){
  let c = 0;
  for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
    if(dx===0 && dy===0) continue;
    const nx=x+dx, ny=y+dy;
    if(nx<0||ny<0||nx>=w||ny>=h) c++;
    else if(grid[ny][nx]===WALL) c++;
  }
  return c;
}

function generateCave(w, h, rng, fillProb=0.44, iterations=5){
  let grid = makeGrid(w, h, WALL);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    if(x===0||y===0||x===w-1||y===h-1){ grid[y][x]=WALL; continue; }
    grid[y][x] = rng.next() < fillProb ? WALL : FLOOR;
  }
  for(let it=0; it<iterations; it++){
    const next = makeGrid(w, h, WALL);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      if(x===0||y===0||x===w-1||y===h-1){ next[y][x]=WALL; continue; }
      const wn = countWallNeighbors(grid, x, y, w, h);
      next[y][x] = wn >= 5 ? WALL : FLOOR;
    }
    grid = next;
  }
  return grid;
}

function floodFillRegion(grid, w, h, sx, sy){
  const seen = makeGrid(w, h, 0);
  const stack = [[sx,sy]];
  const cells = [];
  seen[sy][sx] = 1;
  while(stack.length){
    const [x,y] = stack.pop();
    cells.push([x,y]);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for(const [dx,dy] of dirs){
      const nx=x+dx, ny=y+dy;
      if(nx<0||ny<0||nx>=w||ny>=h) continue;
      if(seen[ny][nx]) continue;
      if(grid[ny][nx]!==FLOOR) continue;
      seen[ny][nx]=1;
      stack.push([nx,ny]);
    }
  }
  return cells;
}

function largestFloorRegion(grid, w, h){
  const visited = makeGrid(w, h, 0);
  let best = [];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    if(grid[y][x]===FLOOR && !visited[y][x]){
      const region = floodFillRegion(grid, w, h, x, y);
      for(const [rx,ry] of region) visited[ry][rx]=1;
      if(region.length > best.length) best = region;
    }
  }
  return best;
}

function bfsFarthest(grid, w, h, sx, sy){
  const dist = makeGrid(w, h, -1);
  dist[sy][sx] = 0;
  const q = [[sx,sy]];
  let far = [sx,sy], qi=0;
  while(qi<q.length){
    const [x,y] = q[qi++];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for(const [dx,dy] of dirs){
      const nx=x+dx, ny=y+dy;
      if(nx<0||ny<0||nx>=w||ny>=h) continue;
      if(dist[ny][nx]!==-1) continue;
      if(grid[ny][nx]!==FLOOR) continue;
      dist[ny][nx] = dist[y][x]+1;
      if(dist[ny][nx] > dist[far[1]][far[0]]) far=[nx,ny];
      q.push([nx,ny]);
    }
  }
  return {point:far, dist};
}

function generateTownLayout(w, h, rng){
  const grid = makeGrid(w, h, FLOOR);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    if(x===0||y===0||x===w-1||y===h-1) grid[y][x]=WALL;
  }
  const buildings = 6 + rng.int(0,3);
  for(let i=0;i<buildings;i++){
    const bw = rng.int(4,8), bh = rng.int(4,8);
    const bx = rng.int(3, w-bw-3), by = rng.int(3, h-bh-3);
    for(let y=by;y<by+bh;y++) for(let x=bx;x<bx+bw;x++){
      const border = (x===bx||x===bx+bw-1||y===by||y===by+bh-1);
      if(border) grid[y][x]=WALL;
    }
    const doorSide = rng.int(0,3);
    if(doorSide===0) grid[by+Math.floor(bh/2)][bx]=FLOOR;
    else if(doorSide===1) grid[by+Math.floor(bh/2)][bx+bw-1]=FLOOR;
    else if(doorSide===2) grid[by][bx+Math.floor(bw/2)]=FLOOR;
    else grid[by+bh-1][bx+Math.floor(bw/2)]=FLOOR;
  }
  return grid;
}

export function generateZoneMap(zone, seed){
  const rng = new Rng(seed >>> 0);
  const w = zone.size.w, h = zone.size.h;
  let grid;

  if(zone.kind === 'town'){
    grid = generateTownLayout(w, h, rng);
  } else {
    let attempts = 0;
    let region = [];
    do{
      grid = generateCave(w, h, rng, 0.44, 5);
      region = largestFloorRegion(grid, w, h);
      attempts++;
    } while(region.length < (w*h)*0.28 && attempts < 8);
    // ne garder que la plus grande région connexe
    const keep = makeGrid(w, h, 0);
    for(const [x,y] of region) keep[y][x]=1;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      if(grid[y][x]===FLOOR && !keep[y][x]) grid[y][x]=WALL;
    }
  }

  // point de spawn : case praticable la plus proche du centre de la carte
  // (évite de faire apparaître le joueur collé au coin de la caméra, sous
  // les widgets d'interface comme la mini-carte).
  const cx0 = w/2, cy0 = h/2;
  let spawn = null, bestSpawnD = Infinity;
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
    if(grid[y][x]!==FLOOR) continue;
    const d = (x-cx0)*(x-cx0) + (y-cy0)*(y-cy0);
    if(d < bestSpawnD){ bestSpawnD = d; spawn = [x,y]; }
  }
  if(!spawn) spawn=[Math.floor(w/2), Math.floor(h/2)];

  let portal = spawn, farInfo = null;
  if(zone.kind !== 'town'){
    farInfo = bfsFarthest(grid, w, h, spawn[0], spawn[1]);
    portal = farInfo.point;
  }

  const floorTiles = [];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    if(grid[y][x]===FLOOR) floorTiles.push([x,y]);
  }

  function distTo(a,b){ return Math.hypot(a[0]-b[0], a[1]-b[1]); }

  const enemySpawns = [];
  if(zone.enemyPool && zone.enemyPool.length){
    const density = zone.kind==='town' ? 0 : Math.min(35, Math.max(12, Math.floor(floorTiles.length/110)));
    let tries = 0;
    while(enemySpawns.length < density && tries < density*20){
      tries++;
      const t = rng.pick(floorTiles);
      if(distTo(t, spawn) < 6) continue;
      if(distTo(t, portal) < 4) continue;
      enemySpawns.push({x:t[0], y:t[1], typeId: rng.pick(zone.enemyPool)});
    }
  }

  const chests = [];
  if(zone.kind !== 'town'){
    const chestCount = 2 + rng.int(0,2);
    let tries=0;
    while(chests.length < chestCount && tries < chestCount*25){
      tries++;
      const t = rng.pick(floorTiles);
      if(distTo(t, spawn) < 8) continue;
      if(chests.some(c=>distTo([c.x,c.y], t) < 6)) continue;
      chests.push({x:t[0], y:t[1]});
    }
  }

  return {
    w, h, grid, spawn:{x:spawn[0], y:spawn[1]},
    portal: zone.kind==='town' ? null : {x:portal[0], y:portal[1]},
    bossSpawn: zone.kind==='town' ? null : {x:portal[0], y:portal[1]},
    enemySpawns, chests, floorTiles,
  };
}

export function isWalkable(map, tx, ty){
  if(tx<0||ty<0||tx>=map.w||ty>=map.h) return false;
  return map.grid[ty][tx] === FLOOR;
}
