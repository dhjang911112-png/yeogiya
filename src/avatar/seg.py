# Split the official front base body into rig parts on the shared 512x1024 canvas.
import json, sys
import numpy as np
from PIL import Image
SRC = sys.argv[1]; OUT = sys.argv[2]; NAME = sys.argv[3]
CFG = json.loads(sys.argv[4])
im = Image.open(SRC).convert('RGBA'); A = np.array(im); al = A[..., 3] > 40
H, W = al.shape
r, g, b = [A[..., i].astype(int) for i in range(3)]
sat = np.max(A[..., :3], axis=2).astype(int) - np.min(A[..., :3], axis=2).astype(int)
cx = CFG['cx']
lab = np.zeros((H, W), 'U6'); lab[al] = 'torso'
# head: above the neck cut line
lab[:CFG['neck']][al[:CFG['neck']]] = 'head'
# arms: per row find the transparent gap between arm and torso; interpolate where they touch
def side_boundary(sign):
    ys = range(CFG['armTop'], CFG['armBot'])
    bnd = {}
    for y in ys:
        row = al[y]
        xs = range(cx, -1, -1) if sign < 0 else range(cx, W)
        # walk outward from centre: first leave torso, look for a gap then arm
        seen_body = False; gap_start = None; res = None
        for x in xs:
            if row[x]:
                if gap_start is not None:
                    if abs(gap_start - x) >= 3 and abs((gap_start + x) / 2 - (cx + sign * CFG['shoulderDX'])) < 45: res = (gap_start + x) / 2
                    break
                seen_body = True
            elif seen_body and gap_start is None: gap_start = x
        bnd[y] = res
    known = [(y, v) for y, v in bnd.items() if v is not None and y > CFG['gapMin']]
    out = {}
    for y in ys:
        if bnd[y] is not None and y > CFG['gapMin']: out[y] = bnd[y]; continue
        # interpolate between shoulder point and first known gap
        sy, sx = CFG['shoulderY'], cx + sign * CFG['shoulderDX']
        below = [k for k in known if k[0] > y]
        if y <= sy: out[y] = sx
        elif below:
            ky, kx = below[0]; t = (y - sy) / max(1, ky - sy); out[y] = sx + (kx - sx) * t
        else: out[y] = known[-1][1] if known else sx
    return out
for sign, name in [(-1, 'armL'), (1, 'armR')]:
    bd = side_boundary(sign)
    for y, bx in bd.items():
        bx = int(round(bx))
        if sign < 0: sl = slice(0, bx)
        else: sl = slice(bx + 1, W)
        row = al[y, sl]; seg = lab[y, sl]; seg[row] = name; lab[y, sl] = seg
# legs: below the shorts hem; hem pixels (grey, low saturation) stay on the torso
hem = CFG['hem']
for y in range(hem - 25, H):
    for x in range(W):
        if not al[y, x] or lab[y, x] in ('armL', 'armR'): continue
        if y < hem and sat[y, x] < 28: continue  # shorts fabric
        if y < hem - 0 and y < hem: 
            if sat[y, x] < 28: continue
        lab[y, x] = 'legL' if x < CFG['crotchX'] else 'legR'
# skin directly under the shorts band above the hem stays torso
for y in range(hem - 25, hem):
    for x in range(W):
        if lab[y, x] in ('legL', 'legR') and y < hem - 12: lab[y, x] = 'torso'
parts = {}
for p in ['head', 'torso', 'armL', 'armR', 'legL', 'legR']:
    m = lab == p
    P = A.copy(); P[~m, 3] = 0
    Image.fromarray(P).save('%s/%s_front_%s.png' % (OUT, NAME, p), optimize=True)
    ys, xs = np.nonzero(m)
    parts[p] = {'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())], 'px': int(m.sum())}
# overlay preview
col = {'head': (255, 80, 80), 'torso': (80, 200, 120), 'armL': (80, 140, 255), 'armR': (255, 200, 60), 'legL': (200, 90, 255), 'legR': (60, 220, 220)}
pv = np.zeros((H, W, 4), 'uint8')
for p, c in col.items():
    m = lab == p; pv[m, :3] = c; pv[m, 3] = 150
base = Image.new('RGBA', (W, H), (30, 30, 34, 255)); base.alpha_composite(im); base.alpha_composite(Image.fromarray(pv))
base.save('%s/%s_seg_preview.png' % (OUT, NAME))
print(json.dumps(parts))
