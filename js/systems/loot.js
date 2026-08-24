import { generateItem, randomWeaponType, randomArmorType, rollRarity } from '../data/items.js';
import { Rng } from '../engine/rng.js';
import { createPickup } from '../entities.js';

const ACCESSORY_TYPES = ['anneau','amulette'];

export function rollLootForEnemy(enemy, player){
  const rng = new Rng((Math.random()*1e9)|0);
  const drops = [];
  const itemLevel = Math.max(1, enemy.level || 1);
  const isBossLike = enemy.isBoss || enemy.isElite;

  const gold = Math.round((5 + itemLevel*3) * (0.7+rng.next()*0.6) * (1+(player.stats.goldFind||0)/100));
  drops.push({kind:'gold', amount: gold});

  const dropChance = isBossLike ? 1.0 : 0.28;
  if(rng.next() < dropChance){
    const n = isBossLike ? 1+rng.int(1,3) : 1;
    for(let i=0;i<n;i++){
      const roll = rng.next();
      let baseType;
      if(roll < 0.4) baseType = randomWeaponType(rng);
      else if(roll < 0.85) baseType = randomArmorType(rng);
      else baseType = rng.pick(ACCESSORY_TYPES);
      const rarity = rollRarity(rng, (player.stats.itemFind||0) + (isBossLike?20:0));
      const item = generateItem({baseType, itemLevel, rarity, rng, forClass: player.classId});
      drops.push({kind:'item', item});
    }
  }
  if(rng.next() < 0.15) drops.push({kind:'potion', potionKind: rng.pick(['vie','mana'])});

  return drops;
}

export function spawnLootPickups(game, enemy){
  const drops = rollLootForEnemy(enemy, game.player);
  let i = 0;
  for(const d of drops){
    const ang = (i/drops.length)*Math.PI*2;
    const x = enemy.pos.x + Math.cos(ang)*18;
    const y = enemy.pos.y + Math.sin(ang)*18;
    game.pickups.push(createPickup(d.kind, x, y, d));
    i++;
  }
}
