#!/usr/bin/env python3
"""Échoue si une planche runtime est corrompue ou déborde d'une cellule."""
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SHEETS=(list((ROOT/'assets/sprites/heroes').glob('*/*_v2.png'))+
        list((ROOT/'assets/sprites/enemies/v2').glob('*_8dir_actions.png')))

errors=[]
for path in SHEETS:
    try:
        image=Image.open(path).convert('RGBA')
        if image.size not in ((768,768),(128,128)):
            errors.append(f'{path}: dimensions {image.size}')
            continue
        if image.size==(128,128):continue
        alpha=image.getchannel('A')
        for row in range(8):
            for col in range(8):
                cell=alpha.crop((col*96,row*96,(col+1)*96,(row+1)*96))
                edge=Image.new('L',(96,96))
                edge.paste(cell.crop((0,0,96,4)),(0,0))
                edge.paste(cell.crop((0,92,96,96)),(0,92))
                edge.paste(cell.crop((0,0,4,96)),(0,0))
                edge.paste(cell.crop((92,0,96,96)),(92,0))
                if edge.getbbox():errors.append(f'{path}: débordement cellule {col},{row}')
    except Exception as exc:
        errors.append(f'{path}: PNG invalide ({exc})')

if errors:
    raise SystemExit('\n'.join(errors))
print(f'{len(SHEETS)} planches runtime valides, cellules étanches')
