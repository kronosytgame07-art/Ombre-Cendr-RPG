#!/usr/bin/env python3
"""Extrait les éléments transparents utiles de l'atlas du village v2."""
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
source=Image.open(ROOT/'assets/source/generated-v2/fortified_village_master.png').convert('RGBA')
outdir=ROOT/'assets/sprites/world/village-v2';outdir.mkdir(parents=True,exist_ok=True)

ASSETS={
    'wall_straight':(0,0,330,315),
    'wall_corner':(320,0,650,320),
    'tower':(820,0,1110,325),
    'gatehouse':(1210,0,1536,350),
    'inn':(0,275,330,625),
    'house':(310,275,650,625),
    'forge':(780,280,1070,625),
    'shop':(1020,280,1300,625),
    'tent':(1260,300,1536,625),
}
for name,box in ASSETS.items():
    crop=source.crop(box)
    bbox=crop.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox()
    if bbox:crop=crop.crop(bbox)
    crop.save(outdir/f'{name}.png',optimize=True)
    print(name,crop.size)
