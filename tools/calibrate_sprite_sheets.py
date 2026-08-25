#!/usr/bin/env python3
"""Calibre les planches générées en cellules 96 px sans débordement.

Entrée : 8 colonnes x 6 lignes, fond transparent.
Sortie : 8 colonnes x 8 lignes de 96 px, ancre des pieds identique à y=91.
Les deux dernières lignes réservent de futurs états et reprennent l'idle.
"""
from pathlib import Path
from PIL import Image
import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "fervent": "fervent_master_8x6.png",
    "pyromancienne": "pyromancienne_master_8x6.png",
    "ombrelame": "ombrelame_master_8x6.png",
    "necrophore": "necrophore_master_8x6.png",
    "sentinelle": "sentinelle_master_8x6.png",
}
ENEMY_SOURCES = {
    "voile_ombre": "voile_ombre_master_8x6.png",
    "squelette_guerrier": "squelette_guerrier_master_8x6.png",
    "gardien_pierre": "gardien_pierre_master_8x6.png",
    "troll_roc": "troll_roc_master_8x6.png",
    "geant_givre": "geant_givre_master_8x6.png",
    "cultiste_nihilash": "cultiste_nihilash_master_8x6.png",
    "golem_cendre": "golem_cendre_master_8x6.png",
    "minotaure_lave": "minotaure_lave_master_8x6.png",
}
SRC = ROOT / "assets/source/generated-v2"


def alpha_bbox(frame):
    alpha = frame.getchannel("A")
    # Les pixels presque transparents sont des halos résiduels, pas du sprite.
    alpha = alpha.point(lambda a: 255 if a >= 18 else 0)
    return alpha.getbbox()


def remove_neighbor_fragments(sprite):
    data=np.array(sprite)
    mask=data[:,:,3]>=14
    labels,count=ndimage.label(mask)
    if count<2:return sprite
    areas=np.bincount(labels.ravel());areas[0]=0
    main=int(areas.argmax());edge_limit=max(12,int(areas[main]*.15))
    h,w=mask.shape
    keep=np.zeros_like(mask)
    for index in range(1,count+1):
        component=labels==index
        ys,xs=np.where(component)
        touches_edge=xs.min()==0 or xs.max()==w-1
        if touches_edge and index!=main and areas[index]<edge_limit:continue
        keep|=component
    data[:,:,3]=np.where(keep,data[:,:,3],0)
    return Image.fromarray(data,'RGBA')


def calibrate(source, destination):
    image = Image.open(source).convert("RGBA")
    out = Image.new("RGBA", (8 * 96, 8 * 96))
    for row in range(6):
        y0 = round(row * image.height / 6)
        y1 = round((row + 1) * image.height / 6)
        for col in range(8):
            x0 = round(col * image.width / 8)
            x1 = round((col + 1) * image.width / 8)
            frame = image.crop((x0, y0, x1, y1))
            bbox = alpha_bbox(frame)
            if not bbox:
                continue
            sprite = frame.crop(bbox)
            scale = min(84 / sprite.width, 88 / sprite.height, 1)
            size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
            sprite = sprite.resize(size, Image.Resampling.LANCZOS)
            # Seuil final : aucune poussière alpha ne peut apparaître dans la
            # cellule voisine pendant les déplacements.
            r, g, b, a = sprite.split()
            a = a.point(lambda value: 0 if value < 14 else value)
            sprite = Image.merge("RGBA", (r, g, b, a))
            sprite = remove_neighbor_fragments(sprite)
            px = col * 96 + (96 - sprite.width) // 2
            py = row * 96 + 92 - sprite.height
            out.alpha_composite(sprite, (px, py))
    for row in (6, 7):
        for col in range(8):
            idle = out.crop((col * 96, 0, (col + 1) * 96, 96))
            out.alpha_composite(idle, (col * 96, row * 96))
    destination.parent.mkdir(parents=True, exist_ok=True)
    out.save(destination, optimize=True)
    portrait = out.crop((0, 0, 96, 96)).resize((128, 128), Image.Resampling.NEAREST)
    portrait.save(destination.with_name("portrait_v2.png"), optimize=True)


if __name__ == "__main__":
    for hero, filename in SOURCES.items():
        calibrate(SRC / filename, ROOT / f"assets/sprites/heroes/{hero}/{hero}_8dir_actions_v2.png")
        print(f"calibré: {hero}")
    for enemy, filename in ENEMY_SOURCES.items():
        destination=ROOT/f"assets/sprites/enemies/v2/{enemy}_8dir_actions.png"
        calibrate(SRC/filename,destination)
        destination.with_name("portrait_v2.png").unlink(missing_ok=True)
        print(f"calibré: {enemy}")
