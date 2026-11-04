#!/usr/bin/env python3
"""Lift the faint backdrop art out of an operator-screen screenshot into a white-on-transparent PNG.
usage: extract-backdrop.py shot.png out.png x0 y0 x1 y1 [cx cy rx ry]
  x0..y1  crop box around the art (pixels in the screenshot)
  cx cy rx ry  optional soft ellipse (in screenshot pixels) that keeps the art and fades out the 3D model / UI
Bright-magenta pen marks are painted out automatically. Needs pillow, numpy, scipy, opencv."""
import sys, numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi
src, out, x0, y0, x1, y1 = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:7])
ell = list(map(float, sys.argv[7:11])) if len(sys.argv) >= 11 else None
im = np.array(Image.open(src).convert('RGB'))
pen = ((im[..., 0].astype(int) - im[..., 1] > 35) & (im[..., 2].astype(int) - im[..., 1] > 35)).astype(np.uint8) * 255
pen = cv2.dilate(pen, np.ones((5, 5), np.uint8))
im = cv2.inpaint(im, pen, 5, cv2.INPAINT_TELEA)
c = im[y0:y1, x0:x1]
g = np.array(Image.fromarray(c).convert('L')).astype(float)
d = g - ndi.gaussian_filter(g, 25)              # remove the smooth gray gradient, keep linework / halftone
a = np.clip(np.abs(d) * 9, 0, 255)
if ell:
    cx, cy, rx, ry = ell
    yy, xx = np.mgrid[y0:y1, x0:x1]
    r = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    a *= np.clip((1.0 - r) / 0.35, 0, 1)         # soft edge
a = cv2.GaussianBlur(a, (0, 0), 0.8)
rgba = np.dstack([np.full(a.shape, 255, np.uint8)] * 3 + [np.clip(a, 0, 235).astype(np.uint8)])
o = Image.fromarray(rgba, 'RGBA'); o = o.resize((o.width * 2, o.height * 2), Image.LANCZOS)
o.save(out, optimize=True); print(out, o.size)
