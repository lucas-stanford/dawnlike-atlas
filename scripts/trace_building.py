#!/usr/bin/env python3
"""Lift a building out of a magenta-keyed screenshot into a standalone sprite.

    python3 scripts/trace_building.py shot.png atlas/buildings/barn.png

Buildings do not go in the shared atlas. Everything in DawnLike is one cell
because everything in DawnLike is a thing you pick up, stand on or fight; a
building is a thing you walk AROUND, and slicing one into 16px cells to make
it look like the rest of the pack costs you the art and buys nothing — the
slices are only ever drawn together, in one fixed arrangement. So this writes
one PNG at the source's own resolution, on its own palette, and the renderer
places it as a single image.

Three things have to happen in order, and the middle one is the one that is
easy to get wrong:

  1. KEY OUT the background, by the SHAPE of the colour rather than by fixed
     thresholds. A screenshot has been through a lossy encoder, so the field
     is not #FF00FF any more -- the barn this was written for keys on
     (191, 22, 179), which every `> 195` test on the red and blue channels
     misses completely, leaving the whole frame "opaque" and the bounding box
     covering the entire image.

  2. UNDO THE UPSCALE. A screenshot of pixel art is pixel art blown up by
     some factor; sampling it straight to the target size lands the sample
     points inside blocks at irregular offsets and returns half-tones on no
     palette at all. The factor is MEASURED. Not, however, by taking the GCD
     of runs of identical colour: a lossy encoder leaves almost no two
     adjacent pixels exactly equal, every run comes back length 1, and the
     GCD is 1 -- i.e. "not upscaled", the one answer that is never right.
     Edge energy survives compression where exact equality does not, so the
     grid is fitted to that instead.

  3. KEEP THE ART'S OWN COLOURS. No snapping to the pack's ramp. Snapping is
     what makes an import stop being the art you imported.

Requires Pillow and numpy.
"""
import argparse

import numpy as np
from PIL import Image


# ---------------------------------------------------------------------
# keying
# ---------------------------------------------------------------------

def key_mask(rgb):
    """The magenta field, found by channel shape rather than by threshold.

    Sheets ship on magenta because no artist picks magenta: red and blue
    both far above green, and the two of them near each other. That holds
    however badly the encoder has mauled the exact value.
    """
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (r > g + 60) & (b > g + 60) & (np.abs(r - b) < 90) & (r > 90) & (b > 90)


# ---------------------------------------------------------------------
# the upscale factor
# ---------------------------------------------------------------------

def _score(sig, period, offset):
    idx = np.round(np.arange(offset, len(sig) - 1, period)).astype(int)
    idx = idx[(idx >= 0) & (idx < len(sig))]
    return sig[idx].mean() if len(idx) >= 4 else -1.0


def fit_grid(sig, lo=2.0, hi=12.0):
    """Fit the block grid to a one-dimensional profile of edge energy.

    Returns (period, offset). Every MULTIPLE of the true period also lands
    on block boundaries, and scores higher for it -- it samples fewer, and
    only the strongest, edges. So the best fit is a ceiling rather than an
    answer: score each of its divisors and take the smallest one that is a
    local maximum. Divisors that are genuine factors of the grid sit on
    edges; the ones between them straddle blocks and score visibly worse,
    which is what makes the fundamental stand out.
    """
    best = (-1.0, 1.0, 0.0)
    for period in np.arange(lo, hi, 0.002):
        for offset in np.arange(0, period, 0.05):
            score = _score(sig, period, offset)
            if score > best[0]:
                best = (score, period, offset)

    _, period, offset = best
    scored = []
    for k in range(1, 9):
        candidate = period / k
        if candidate < lo:
            break
        scored.append((k, *max(
            ((_score(sig, candidate, off), off) for off in np.arange(0, candidate, 0.02)),
            key=lambda t: t[0])))

    for i in range(len(scored) - 2, 0, -1):
        if scored[i][1] > scored[i - 1][1] and scored[i][1] > scored[i + 1][1]:
            return period / scored[i][0], scored[i][2]
    return period, offset


def collapse(img, px, ox, py, oy):
    """Reduce each block to its median, ignoring the rim where ringing lives."""
    h, w, _ = img.shape
    nx, ny = int((w - ox) // px), int((h - oy) // py)
    out = np.zeros((ny, nx, 3))
    for j in range(ny):
        lo, hi = oy + j * py, oy + (j + 1) * py
        ya, yb = int(np.ceil(lo + 0.55)), int(np.floor(hi - 0.55))
        if yb <= ya:
            ya = int(round((lo + hi) / 2))
            yb = ya + 1
        for i in range(nx):
            lo, hi = ox + i * px, ox + (i + 1) * px
            xa, xb = int(np.ceil(lo + 0.55)), int(np.floor(hi - 0.55))
            if xb <= xa:
                xa = int(round((lo + hi) / 2))
                xb = xa + 1
            block = img[max(0, ya):min(h, yb), max(0, xa):min(w, xb)]
            out[j, i] = np.median(block.reshape(-1, 3), axis=0) if block.size else 0
    return out.round().clip(0, 255).astype(int)


# ---------------------------------------------------------------------
# de-fringing
# ---------------------------------------------------------------------

def dilate(mask):
    """Grow a mask by one pixel, counting everything past the border as set.

    Padding rather than rolling, because wrapping is a real bug here: with
    np.roll the left edge neighbours the right one, so a fringe running down
    BOTH outer columns sees opaque art across the join and survives.
    """
    padded = np.pad(mask, 1, constant_values=True)
    out = np.zeros_like(mask)
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            out |= padded[dy:dy + mask.shape[0], dx:dx + mask.shape[1]]
    return out


def keyness(art, key):
    """How nearly each pixel is the key colour's own hue, 0..1.

    The cosine between the pixel and the key as vectors, which ignores
    brightness and asks only about the MIX of channels. That is the right
    question: a halo pixel is the key darkened and muddied by whatever it
    overlaps, so it keeps the key's hue while losing its brightness, and a
    test on brightness or on distance would miss it.

    It separates cleanly in practice. On the barn this was written for the
    halo scores 0.96–1.00 while the darkest real timber reaches 0.87, with
    nothing at all in between.
    """
    unit = key / (np.linalg.norm(key) or 1.0)
    norms = np.maximum(np.linalg.norm(art, axis=-1), 1e-6)
    return (art @ unit) / norms


def defringe(art, background, key, limit=0.93):
    """Drop the halo of key-coloured bleed around the art.

    Two conditions, and it needs both. A pixel goes only if it is the key's
    hue (`limit`, see `keyness`) AND it is reachable from the background
    through other pixels that are — so the halo is followed inwards however
    thick it is, while a genuinely magenta detail somewhere inside the
    building would survive, having nothing to reach it by.

    They are dropped rather than un-blended. Pixel art has hard edges; there
    is no correct colour to give a pixel that was never really there.
    """
    tinted = keyness(art, key) > limit
    dropped = background.copy()
    while True:
        newly = dilate(dropped) & tinted & ~dropped
        if not newly.any():
            return dropped
        dropped |= newly


# ---------------------------------------------------------------------

def trace(src, dst, colors=64):
    img = np.asarray(Image.open(src).convert('RGB')).astype(float)

    px, ox = fit_grid(np.abs(np.diff(img, axis=1)).sum(axis=(0, 2)))
    py, oy = fit_grid(np.abs(np.diff(img, axis=0)).sum(axis=(1, 2)))
    print(f'grid     block {px:.3f} x {py:.3f} px, offset {ox:.2f} / {oy:.2f}')

    flat = collapse(img, px, ox, py, oy)
    bg = key_mask(flat)
    if bg.all() or not bg.any():
        raise SystemExit(f'{src}: no magenta field found — is this a keyed sheet?')
    key = np.median(flat[bg].reshape(-1, 3), axis=0)

    ys, xs = np.where(~bg)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    art, background = flat[y0:y1, x0:x1], bg[y0:y1, x0:x1]
    print(f'content  {x1 - x0} x {y1 - y0} logical, key rgb{tuple(int(v) for v in key)}')

    dropped = defringe(art, background, key)
    print(f'keyed    {background.sum()} px background, '
          f'{dropped.sum() - background.sum()} px fringe')

    # Flood the keyed-out pixels with a colour the art already uses before
    # quantising, so the palette is spent on what you can see.
    filled = art.copy()
    filled[dropped] = np.median(art[~dropped].reshape(-1, 3), axis=0)
    quant = Image.fromarray(filled.astype(np.uint8)).quantize(
        colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')

    out = quant.copy()
    out.putalpha(Image.fromarray(np.where(dropped, 0, 255).astype(np.uint8)))
    out.save(dst)
    used = len(set(map(tuple, np.asarray(quant)[~dropped])))
    print(f'wrote    {dst} — {out.width}x{out.height}, {used} colours, '
          f'{(~dropped).sum()} opaque px')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('source', help='screenshot or sheet, building on magenta')
    ap.add_argument('dest', help='PNG to write')
    ap.add_argument('--colors', type=int, default=64, help='palette size (default 64)')
    args = ap.parse_args()
    trace(args.source, args.dest, args.colors)
