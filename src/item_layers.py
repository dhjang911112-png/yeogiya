"""옷 아이템 시트(속옷 시트와 같은 4x4 배치, 옷만 그린 투명 PNG) → 몸 프레임과 1:1로 겹치는 레이어 이미지
사용: python3 item_layers.py <uw_frames.json> <item_id> <gender> <sheet.png> <outdir>"""
import sys, json, hashlib, os
import numpy as np
from PIL import Image
frames_json, item, g, sheet, outdir = sys.argv[1:6]
F = json.load(open(frames_json))[g]
im = Image.open(sheet).convert('RGBA')
a = np.array(im)
a[..., 3][a[..., 3] < 25] = 0  # 거의 투명한 찌꺼기 제거
im = Image.fromarray(a)
out = {}
for d, fr in F.items():
    for f in fr:
        x0, y0, x1, y1 = f['bb']
        c = im.crop((x0, y0, x1, y1))
        if not c.split()[-1].getbbox():
            continue
        hid = hashlib.md5(('lay-' + item + f['id']).encode()).hexdigest()
        c.save('%s/%s.png' % (outdir, hid), optimize=True)
        out[f['id']] = 'assets/' + hid + '.png'
print(json.dumps(out))
