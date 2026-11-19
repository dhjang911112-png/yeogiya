"""전신 코디 세트 시트(속옷 시트와 같은 4x4 배치) → 게임용 프레임 + 키 맞춤 표(h, c) + 헤어/가디건 맞춤 상자
사용: python3 set_sprites.py <set_id> <male_sheet> <female_sheet> <outdir>"""
import sys, json, hashlib, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from underwear_sprites import figures

STAND = {'front': 3, 'back': 1, 'left': 3, 'right': 3}


def headbox(im):
    a = im.split()[-1].point(lambda v: 255 if v > 60 else 0); W, H = im.size
    widths = []
    for y in range(H):
        row = a.crop((0, y, W, y + 1)).getbbox(); widths.append((row[2] - row[0]) if row else 0)
    lo, hi = int(H * 0.28), int(H * 0.55)
    neck = min(range(lo, hi), key=lambda y: widths[y])
    return a.crop((0, 0, W, neck)).getbbox(), neck


sid, msheet, fsheet, outdir = sys.argv[1:5]
os.makedirs(outdir, exist_ok=True)
FRS, HB, TB = {}, {}, {}
for g, sheet in (('male', msheet), ('female', fsheet)):
    F = figures(sheet)
    FRS[g] = {}
    for d in ['front', 'back', 'left', 'right']:
        ims = [F[(d, c)] for c in range(4)]
        unit = 1128 / ims[STAND[d]].size[1]
        out = []
        for c, im in enumerate(ims):
            hid = hashlib.md5(('set-' + sid + g + d + str(c)).encode() + im.tobytes()[:4096]).hexdigest()
            im.save('%s/%s.png' % (outdir, hid), optimize=True)
            a = np.array(im)[..., 3] > 60; ys, xs = np.where(a)
            h = round(im.size[1] * unit, 1)
            out.append({'s': 'assets/%s.png' % hid, 'h': h, 'c': round(xs.mean() * unit, 1)})
            hb, neck = headbox(im)
            HB[hid] = {'x0': hb[0], 'x1': hb[2], 'y0': hb[1], 'neck': neck, 'H': im.size[1], 'W': im.size[0]}
            nb = im.split()[-1].point(lambda v: 255 if v > 60 else 0).crop((0, neck, im.size[0], neck + 1)).getbbox()
            TB[hid] = {'cx': (nb[0] + nb[2]) / 2, 'neck': neck, 'H': im.size[1], 'h': h}
        FRS[g][d] = {'stand': out[STAND[d]], 'walk': out}
json.dump({'FR': FRS, 'HB': HB, 'TB': TB}, open('%s/set_%s.json' % (outdir, sid), 'w'))
print('ok', sid)
