#!/usr/bin/env python3
"""
extract_spritesheet.py — Découpe robuste de planches de sprites générées par IA.

Contexte
--------
Une planche unique (PNG/JPG) contient plusieurs personnages "Ombre Cendrée",
chacun avec plusieurs lignes d'animation (Idle, Walk, Attack, Take Damage,
Death...), chaque frame étant posée dans un petit cadre rectangulaire gris
foncé. La grille n'est PAS parfaitement régulière (généré par IA), et du
texte (titres, "Idle (8)", numéros de frame...) est mélangé à l'image.

Ce script :
  1. Détecte les cadres gris (bounding boxes) par analyse de couleur + contours
     OpenCV — PAS par une grille fixe rows/cols.
  2. Filtre les contours par taille/ratio pour ne garder que les cadres de
     sprites (carrés, taille homogène) et rejeter texte + gros blocs.
  3. Découpe chaque cadre depuis l'image source.
  4. Supprime le fond gris de chaque cadre (chroma key tolérant + feather,
     avec "décontamination" des pixels de bord, ou via rembg en option).
  5. Recadre chaque sprite sur son propre contenu non-transparent et le
     centre dans un canevas carré fixe (ancrage/pivot constant).
  6. Trie les frames gauche->droite puis haut->bas (clustering en lignes
     puis en groupes par écart horizontal = une "section" d'animation) et
     exporte dans une arborescence de dossiers + un manifest.json.

Installation
------------
    pip install opencv-python pillow numpy
    # optionnel, pour la méthode de détourage par IA :
    pip install rembg onnxruntime

Utilisation de base
-------------------
    python extract_spritesheet.py --input planche.png --output out/

Étape recommandée : lancez d'abord avec --debug pour vérifier visuellement
la détection avant de tout exporter :

    python extract_spritesheet.py --input planche.png --output out/ --debug

Cela produit :
    out/_debug/mask.png            -> masque binaire des zones "gris cadre"
    out/_debug/boxes_overlay.png   -> cadres détectés dessinés en vert sur
                                       l'image source (les rejetés en rouge)

Paramètres à ajuster en cas de mauvaise détection
--------------------------------------------------
--gray-min / --gray-max
    Plage de niveaux de gris (0-255) considérée comme "fond de cadre".
    Si des cadres ne sont pas détectés du tout : ouvrez mask.png, et si les
    cadres apparaissent noirs (non détectés), élargissez la plage (baissez
    gray-min ou montez gray-max). Si TOUT l'arrière-plan de la planche
    apparaît blanc dans mask.png (trop permissif), resserrez la plage.

--min-side / --max-side
    Taille (en pixels, côté du carré) minimale/maximale d'un cadre valide.
    Sert à rejeter le texte (trop petit/trop plat) et les grands blocs de
    biome (trop grand). Regardez boxes_overlay.png : les rectangles rouges
    sont ceux rejetés — ajustez ces bornes en conséquence.

--aspect-tol
    Tolérance sur le ratio largeur/hauteur autour de 1.0 (cadres "carrés").
    Une planche avec des cadres plus rectangulaires nécessite une valeur
    plus grande (ex: 0.35 au lieu de 0.2).

--bg-tolerance / --bg-feather
    Détourage : bg-tolerance = distance couleur en dessous de laquelle un
    pixel est considéré comme 100% fond (transparent). bg-feather = largeur
    de la zone de dégradé (anti-crénelage) au-delà de ce seuil avant d'être
    100% opaque. Augmentez bg-tolerance si des résidus gris restent visibles
    autour des personnages ; diminuez-la si des morceaux du personnage
    (ex: armure grise, os de squelette) disparaissent par erreur.

--bg-sample-inset
    Certaines planches dessinent un fin liseré de bordure (ex: gris-bleu
    clair) autour d'un cadre dont le FOND réel est en fait la même couleur
    que l'arrière-plan général de l'image (souvent très sombre). Dans ce
    cas, échantillonner uniquement l'anneau extrême du cadre découpé ne
    capture que la couleur du liseré, et le vrai fond (plus sombre) reste
    opaque après détourage. Réglez --bg-sample-inset à ~8-10 px pour aller
    échantillonner un second anneau plus profond (au-delà du liseré) : les
    deux couleurs sont alors détourées. Laissez à 0 (défaut) quand le cadre
    n'a pas de liseré distinct (un seul fond uniforme).

--method chroma|rembg
    "chroma" (par défaut) = détourage par distance de couleur, rapide et
    déterministe, idéal si le fond est un gris assez homogène et différent
    des couleurs du personnage. "rembg" = détourage par IA (U^2-Net), plus
    lent mais bien plus robuste quand le personnage contient des teintes
    grises proches du fond (ex: Squelette Guerrier, Golem de pierre, Troll
    de Roc) — dans ce cas le chroma key risque de manger des morceaux du
    sprite. N'hésitez pas à relancer seulement ces feuilles-là en --method
    rembg si vous voyez des trous après un premier passage en chroma.

--canvas-size
    Taille (px) du canevas carré final dans lequel chaque sprite est centré
    (ex: 64, 128, 256). Ne changez pas cette valeur entre les frames d'une
    même animation, sinon l'ancrage ne sera plus cohérent dans le moteur.

--row-tol
    Tolérance verticale (fraction de la hauteur médiane des cadres) pour
    regrouper des cadres dans la même "ligne". Augmentez si des cadres d'une
    même ligne visuelle sont séparés à tort en deux lignes.

--group-gap-mult
    Multiplicateur de l'écart horizontal médian entre cadres consécutifs
    d'une ligne, au-delà duquel on considère qu'on change de "section"
    d'animation (ex: fin du bloc "Idle", début du bloc "Walk"). Diminuez-le
    si deux sections voisines sont fusionnées à tort ; augmentez-le si une
    même section est coupée en plusieurs groupes.

Sortie
------
    out/row00_group00/frame_00.png
    out/row00_group01/frame_00.png
    ...
    out/manifest.json   -> liste ordonnée de toutes les frames avec leurs
                            coordonnées d'origine dans la planche, utile
                            pour retrouver quelle section correspond à quel
                            personnage/animation en regardant l'overlay.
"""

import argparse
import json
import os
import sys
from statistics import median

import numpy as np
import cv2
from PIL import Image


# --------------------------------------------------------------------------
# 1-2. DETECTION + FILTRAGE DES CADRES
# --------------------------------------------------------------------------

def detect_frame_boxes(bgr, gray_min, gray_max, min_side, max_side, aspect_tol,
                        min_fill=0.35, close_kernel=0, close_iter=1):
    """Retourne (boxes_ok, boxes_rejected) où chaque box = dict(x,y,w,h,cx,cy).

    ATTENTION: les cadres adjacents sont souvent séparés par une bordure très
    fine (2-3 px). Une fermeture morphologique trop agressive (gros noyau)
    fusionne les cadres voisins en un seul bloc — d'où close_kernel=0 par
    défaut (aucune fermeture). N'augmentez close_kernel que si la planche a
    de vrais trous à combler ET une bordure inter-cadre plus large.
    """
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    mask = cv2.inRange(gray, gray_min, gray_max)

    if close_kernel and close_kernel > 0:
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (close_kernel, close_kernel))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=close_iter)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    candidates = []
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w == 0 or h == 0:
            continue
        area = w * h
        contour_area = cv2.contourArea(c)
        fill_ratio = contour_area / area if area else 0
        aspect = w / h
        candidates.append({
            'x': x, 'y': y, 'w': w, 'h': h,
            'cx': x + w / 2, 'cy': y + h / 2,
            'area': area, 'fill_ratio': fill_ratio, 'aspect': aspect,
        })

    # Premier filtre : taille + ratio + remplissage minimal (rejette le texte,
    # qui est fin/allongé et peu "plein").
    stage1 = [
        b for b in candidates
        if min_side <= b['w'] <= max_side
        and min_side <= b['h'] <= max_side
        and abs(b['aspect'] - 1.0) <= aspect_tol
        and b['fill_ratio'] >= min_fill
    ]

    if not stage1:
        return [], candidates

    # Deuxième filtre : cohérence de taille. Une planche peut mélanger
    # PLUSIEURS échelles de cadres (ex: portraits de héros plus petits que
    # les sprites d'ennemis) — on ne compare donc pas à une médiane globale
    # unique, mais on regroupe les tailles en clusters (tri + coupure sur
    # grand écart relatif) et on ne garde que les clusters assez peuplés
    # (>= 3 cadres), ce qui rejette le bruit isolé sans exiger une taille
    # unique pour toute la planche.
    sizes = sorted(stage1, key=lambda b: max(b['w'], b['h']))
    clusters = []
    current = [sizes[0]]
    for b in sizes[1:]:
        prev_size = max(current[-1]['w'], current[-1]['h'])
        cur_size = max(b['w'], b['h'])
        if cur_size <= prev_size * 1.35:
            current.append(b)
        else:
            clusters.append(current)
            current = [b]
    clusters.append(current)

    valid_clusters = [c for c in clusters if len(c) >= 3]
    if not valid_clusters:
        valid_clusters = clusters  # planche avec très peu de cadres : tout garder

    ok_ids = set()
    for c in valid_clusters:
        cw = median(b['w'] for b in c)
        ch = median(b['h'] for b in c)
        for b in c:
            if 0.7 * cw <= b['w'] <= 1.3 * cw and 0.7 * ch <= b['h'] <= 1.3 * ch:
                ok_ids.add(id(b))

    ok = [b for b in stage1 if id(b) in ok_ids]
    rejected = [b for b in candidates if id(b) not in ok_ids]
    return ok, rejected


# --------------------------------------------------------------------------
# CLUSTERING EN LIGNES PUIS EN GROUPES (sections d'animation)
# --------------------------------------------------------------------------

def cluster_rows(boxes, row_tol_ratio):
    if not boxes:
        return []
    med_h = median(b['h'] for b in boxes)
    row_tol = med_h * row_tol_ratio
    boxes_sorted = sorted(boxes, key=lambda b: b['cy'])
    rows = []
    current = [boxes_sorted[0]]
    row_mean_cy = boxes_sorted[0]['cy']
    for b in boxes_sorted[1:]:
        if abs(b['cy'] - row_mean_cy) <= row_tol:
            current.append(b)
            row_mean_cy = sum(x['cy'] for x in current) / len(current)
        else:
            rows.append(current)
            current = [b]
            row_mean_cy = b['cy']
    rows.append(current)
    for row in rows:
        row.sort(key=lambda b: b['x'])
    rows.sort(key=lambda row: sum(b['cy'] for b in row) / len(row))
    return rows


def fill_row_gaps(group, tol=0.22, max_fill=3):
    """Comble les trous À L'INTÉRIEUR d'un groupe (une section d'animation
    déjà délimitée par cluster_groups) quand une frame n'a pas été détectée
    (ex: silhouette trop proche des bords du cadre, comme des ailes de
    démon qui fragmentent le masque). Si l'écart entre deux cadres
    consécutifs vaut ~N fois le pas régulier du groupe (N petit, <=max_fill),
    on insère N-1 cadres synthétiques (taille médiane du groupe) aux
    positions attendues. Appliqué APRÈS le découpage en groupes : on ne doit
    jamais combler le grand espace qui sépare deux sections différentes
    (ex: fin d'Idle / début de Walk), seulement de petits trous internes."""
    if len(group) < 3:
        return group
    group = sorted(group, key=lambda b: b['cx'])
    diffs = [group[i + 1]['cx'] - group[i]['cx'] for i in range(len(group) - 1)]
    pitch = median(diffs)
    if pitch <= 1:
        return group
    med_w = median(b['w'] for b in group)
    med_h = median(b['h'] for b in group)
    med_y = median(b['y'] for b in group)
    result = [group[0]]
    for i in range(1, len(group)):
        gap = group[i]['cx'] - group[i - 1]['cx']
        n = round(gap / pitch)
        if 2 <= n <= max_fill and abs(gap / n - pitch) <= tol * pitch:
            for k in range(1, n):
                cx = group[i - 1]['cx'] + k * pitch
                result.append({
                    'x': int(round(cx - med_w / 2)), 'y': int(round(med_y)),
                    'w': int(round(med_w)), 'h': int(round(med_h)),
                    'cx': cx, 'cy': med_y + med_h / 2, 'synthetic': True,
                })
        result.append(group[i])
    return result


def cluster_groups(row, group_gap_mult, floor_mult=0.6):
    """floor_mult : plancher minimal du seuil de coupure, en fraction de la
    largeur médiane d'un cadre. Sur une planche où chaque ligne est UNE
    seule séquence continue (ex: une planche de sorts/VFX), montez
    fortement floor_mult (ex: 3.0+) pour empêcher qu'une simple frame
    manquante ne déclenche une coupure de groupe à tort — laissez
    fill_row_gaps combler le trou à la place."""
    if len(row) <= 1:
        return [row]
    med_w = median(b['w'] for b in row)
    gaps = [row[i + 1]['x'] - (row[i]['x'] + row[i]['w']) for i in range(len(row) - 1)]
    med_gap = median(gaps) if gaps else med_w
    threshold = max(med_gap * group_gap_mult, med_w * floor_mult)
    groups = []
    current = [row[0]]
    for i in range(1, len(row)):
        gap = row[i]['x'] - (row[i - 1]['x'] + row[i - 1]['w'])
        if gap > threshold:
            groups.append(current)
            current = [row[i]]
        else:
            current.append(row[i])
    groups.append(current)
    return groups


# --------------------------------------------------------------------------
# 4. SUPPRESSION DU FOND
# --------------------------------------------------------------------------

def _sample_ring(frame_bgr, start, thickness):
    h, w = frame_bgr.shape[:2]
    start = max(0, min(start, h // 3, w // 3))
    end = min(start + thickness, h // 2, w // 2)
    if end <= start:
        end = start + 1
    strip = np.concatenate([
        frame_bgr[start:end, :, :].reshape(-1, 3),
        frame_bgr[h - end:h - start, :, :].reshape(-1, 3),
        frame_bgr[:, start:end, :].reshape(-1, 3),
        frame_bgr[:, w - end:w - start, :].reshape(-1, 3),
    ], axis=0)
    return np.median(strip, axis=0)


def sample_background_color(frame_bgr, border=4):
    return _sample_ring(frame_bgr, 0, border)


def sample_background_colors(frame_bgr, border=4, inset=0):
    """Retourne (couleur_bordure, couleur_fond_intérieur). Sur beaucoup de
    planches, les deux sont identiques (pas de liseré de cadre distinct) ;
    sur d'autres (ex: planche de sorts avec un fin trait de bordure clair
    différent du fond sombre), échantillonner uniquement l'anneau extrême
    (0..border) capture la couleur du TRAIT et pas celle du vrai fond, ce
    qui laisse le fond non détouré. `inset` permet d'aller échantillonner
    un second anneau plus profond, au-delà du trait, pour récupérer la
    vraie couleur de fond ; les deux couleurs sont alors détourées."""
    outer = _sample_ring(frame_bgr, 0, border)
    inner = _sample_ring(frame_bgr, inset, border) if inset > 0 else outer
    return outer, inner


def remove_background_chroma(frame_bgr, tolerance, feather, decontaminate=True,
                              keep_largest_component=True, bg_sample_inset=0):
    outer_bg, inner_bg = sample_background_colors(frame_bgr, inset=bg_sample_inset)
    f = frame_bgr.astype(np.float32)
    diff_outer = np.linalg.norm(f - outer_bg.astype(np.float32), axis=2)
    diff_inner = np.linalg.norm(f - inner_bg.astype(np.float32), axis=2)
    diff = np.minimum(diff_outer, diff_inner)
    use_outer = diff_outer <= diff_inner

    alpha = np.clip((diff - tolerance) / max(feather, 1e-6), 0.0, 1.0)

    if keep_largest_component:
        fg_mask = (alpha > 0.05).astype(np.uint8)
        n, labels, stats, _ = cv2.connectedComponentsWithStats(fg_mask, connectivity=8)
        if n > 1:
            largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
            keep = (labels == largest)
            alpha = alpha * keep

    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)

    if decontaminate:
        a = alpha[..., None]
        safe_a = np.clip(a, 0.12, 1.0)  # évite une division explosive sur les pixels quasi transparents
        outer_rgb = np.array([outer_bg[2], outer_bg[1], outer_bg[0]], dtype=np.float32)
        inner_rgb = np.array([inner_bg[2], inner_bg[1], inner_bg[0]], dtype=np.float32)
        bg_rgb_map = np.where(use_outer[..., None], outer_rgb, inner_rgb)
        decontam = (rgb - (1 - a) * bg_rgb_map) / safe_a
        rgb = np.where(a > 0.02, np.clip(decontam, 0, 255), rgb)

    rgba = np.dstack([rgb, alpha * 255.0]).astype(np.uint8)
    return rgba


def remove_background_rembg(frame_bgr):
    try:
        from rembg import remove
    except ImportError:
        print("ERREUR: --method rembg nécessite `pip install rembg onnxruntime`", file=sys.stderr)
        sys.exit(1)
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    pil_in = Image.fromarray(rgb)
    pil_out = remove(pil_in)
    return np.array(pil_out.convert('RGBA'))


# --------------------------------------------------------------------------
# 5. RECADRAGE + CENTRAGE
# --------------------------------------------------------------------------

def crop_to_content(rgba, alpha_thresh=10):
    alpha = rgba[..., 3]
    ys, xs = np.where(alpha > alpha_thresh)
    if len(xs) == 0:
        return rgba, (0, 0, rgba.shape[1], rgba.shape[0])
    x0, x1 = xs.min(), xs.max() + 1
    y0, y1 = ys.min(), ys.max() + 1
    return rgba[y0:y1, x0:x1], (int(x0), int(y0), int(x1 - x0), int(y1 - y0))


def center_on_canvas(rgba, size):
    h, w = rgba.shape[:2]
    scale = min(1.0, (size - 4) / max(w, h)) if max(w, h) > (size - 4) else 1.0
    if scale < 1.0:
        new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
        img = Image.fromarray(rgba).resize((new_w, new_h), Image.NEAREST)
        rgba = np.array(img)
        h, w = rgba.shape[:2]
    canvas = np.zeros((size, size, 4), dtype=np.uint8)
    ox, oy = (size - w) // 2, (size - h) // 2
    canvas[oy:oy + h, ox:ox + w] = rgba
    return canvas


# --------------------------------------------------------------------------
# MAIN
# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--input', required=True, help="Image source (planche complète)")
    ap.add_argument('--output', required=True, help="Dossier de sortie")
    ap.add_argument('--method', choices=['chroma', 'rembg'], default='chroma')
    ap.add_argument('--gray-min', type=int, default=45)
    ap.add_argument('--gray-max', type=int, default=110)
    ap.add_argument('--min-side', type=int, default=55)
    ap.add_argument('--max-side', type=int, default=230)
    ap.add_argument('--aspect-tol', type=float, default=0.22)
    ap.add_argument('--close-kernel', type=int, default=0,
                     help="taille du noyau de fermeture morphologique (0 = désactivé, "
                          "à utiliser seulement si les cadres ont de vrais trous à combler)")
    ap.add_argument('--close-iter', type=int, default=1)
    ap.add_argument('--min-fill', type=float, default=0.35,
                     help="ratio (aire du contour / aire du rectangle englobant) minimal pour garder un cadre")
    ap.add_argument('--bg-tolerance', type=float, default=18.0)
    ap.add_argument('--bg-sample-inset', type=int, default=0,
                     help="si le cadre a un liseré de bordure distinct de la couleur de fond "
                          "réelle (fond non détouré malgré tout), mettez ceci à ~8-10 px pour "
                          "échantillonner un second anneau plus profond : les DEUX couleurs "
                          "(liseré + fond) seront alors détourées.")
    ap.add_argument('--bg-feather', type=float, default=22.0)
    ap.add_argument('--no-decontaminate', action='store_true')
    ap.add_argument('--no-keep-largest', action='store_true')
    ap.add_argument('--canvas-size', type=int, default=128)
    ap.add_argument('--row-tol', type=float, default=0.6, help="tolérance verticale (fraction hauteur médiane)")
    ap.add_argument('--group-gap-mult', type=float, default=2.2)
    ap.add_argument('--group-gap-floor', type=float, default=0.6,
                     help="plancher du seuil de coupure de groupe, en fraction de la largeur "
                          "médiane d'un cadre. Augmentez fortement (ex: 3.0) si vos lignes sont "
                          "chacune UNE seule séquence continue (planche de sorts/VFX) pour éviter "
                          "qu'une frame manquante ne coupe la ligne en deux groupes à tort.")
    ap.add_argument('--no-fill-gaps', action='store_true',
                     help="désactive le comblement automatique des frames manquantes dans une ligne")
    ap.add_argument('--debug', action='store_true')
    args = ap.parse_args()

    bgr = cv2.imread(args.input, cv2.IMREAD_COLOR)
    if bgr is None:
        print(f"ERREUR: impossible de lire l'image '{args.input}'", file=sys.stderr)
        sys.exit(1)

    os.makedirs(args.output, exist_ok=True)

    boxes, rejected = detect_frame_boxes(
        bgr, args.gray_min, args.gray_max, args.min_side, args.max_side, args.aspect_tol,
        min_fill=args.min_fill, close_kernel=args.close_kernel, close_iter=args.close_iter,
    )
    print(f"[detect] {len(boxes)} cadres retenus, {len(rejected)} rejetés "
          f"(texte / séparateurs / hors gabarit)")

    if args.debug:
        dbg_dir = os.path.join(args.output, '_debug')
        os.makedirs(dbg_dir, exist_ok=True)
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        mask = cv2.inRange(gray, args.gray_min, args.gray_max)
        cv2.imwrite(os.path.join(dbg_dir, 'mask.png'), mask)
        overlay = bgr.copy()
        for b in boxes:
            cv2.rectangle(overlay, (b['x'], b['y']), (b['x'] + b['w'], b['y'] + b['h']), (0, 220, 0), 2)
        for b in rejected:
            cv2.rectangle(overlay, (b['x'], b['y']), (b['x'] + b['w'], b['y'] + b['h']), (0, 0, 220), 1)
        cv2.imwrite(os.path.join(dbg_dir, 'boxes_overlay.png'), overlay)
        print(f"[debug] mask.png et boxes_overlay.png écrits dans {dbg_dir}")

    if not boxes:
        print("Aucun cadre détecté : ajustez --gray-min/--gray-max/--min-side/--max-side "
              "en vous aidant de --debug.", file=sys.stderr)
        sys.exit(2)

    rows = cluster_rows(boxes, args.row_tol)

    manifest = []
    total = 0
    n_synth = 0
    for r_idx, row in enumerate(rows):
        groups = cluster_groups(row, args.group_gap_mult, floor_mult=args.group_gap_floor)
        if not args.no_fill_gaps:
            groups = [fill_row_gaps(g) for g in groups]
        n_synth += sum(1 for g in groups for b in g if b.get('synthetic'))
        for g_idx, group in enumerate(groups):
            out_dir = os.path.join(args.output, f"row{r_idx:02d}_group{g_idx:02d}")
            os.makedirs(out_dir, exist_ok=True)
            for f_idx, b in enumerate(group):
                crop = bgr[b['y']:b['y'] + b['h'], b['x']:b['x'] + b['w']]

                if args.method == 'rembg':
                    rgba = remove_background_rembg(crop)
                else:
                    rgba = remove_background_chroma(
                        crop, args.bg_tolerance, args.bg_feather,
                        decontaminate=not args.no_decontaminate,
                        keep_largest_component=not args.no_keep_largest,
                        bg_sample_inset=args.bg_sample_inset,
                    )

                content, bbox = crop_to_content(rgba)
                final = center_on_canvas(content, args.canvas_size)

                fname = f"frame_{f_idx:02d}.png"
                fpath = os.path.join(out_dir, fname)
                Image.fromarray(final, mode='RGBA').save(fpath)

                manifest.append({
                    'row': r_idx, 'group': g_idx, 'index': f_idx,
                    'file': os.path.relpath(fpath, args.output),
                    'source_box': {'x': b['x'], 'y': b['y'], 'w': b['w'], 'h': b['h']},
                    'synthetic': bool(b.get('synthetic', False)),
                })
                total += 1

    with open(os.path.join(args.output, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    if n_synth:
        print(f"[fill-gaps] {n_synth} frame(s) manquante(s) comblée(s) par interpolation "
              f"(désactivez avec --no-fill-gaps si indésirable)")
    print(f"[done] {total} frames exportées dans {len(rows)} ligne(s) -> {args.output}")
    print("Vérifiez le manifest.json pour retrouver quelle section (row/group) "
          "correspond à quel personnage/animation, puis renommez les dossiers "
          "(ex: row00_group00 -> guerrier_idle) selon vos besoins.")


if __name__ == '__main__':
    main()
