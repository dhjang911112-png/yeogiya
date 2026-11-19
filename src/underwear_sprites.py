"""속옷 기본 캐릭터 시트(4행x4열: 정면/뒷면/왼쪽/오른쪽) → 게임용 개별 스프라이트
원본은 art/underwear/*_sheet_original.png 로 보관(수정 안 함).
하는 일: 칸마다 캐릭터 덩어리만 남기고 배경 제거 잔여(거의 투명한 빨강·노랑 얼룩) 삭제 → 딱 맞게 자르기."""
import os, sys, json, hashlib
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = ROOT + '/art/underwear'
DIRS = ['front', 'back', 'left', 'right']


def figures(path):
    a = np.array(Image.open(path).convert('RGBA'))
    solid = a[..., 3] > 200
    lab, n = ndimage.label(solid)
    sz = ndimage.sum(solid, lab, range(1, n + 1))
    objs = ndimage.find_objects(lab)
    big = [i for i in range(n) if sz[i] > 5000]
    big.sort(key=lambda i: (objs[i][0].start + objs[i][0].stop) / 2)
    rows = [sorted(big[r * 4:r * 4 + 4], key=lambda i: objs[i][1].start) for r in range(4)]
    out = {}
    for r, d in enumerate(DIRS):
        for c, i in enumerate(rows[r]):
            core = lab == (i + 1)
            # 작은 떨어진 조각(머리카락 끝 등)도 몸 근처면 포함
            near = ndimage.binary_dilation(core, iterations=6)
            keep_solid = ndimage.binary_dilation((solid & near) | core, iterations=3)
            m = keep_solid & (a[..., 3] > 0)
            p = np.zeros_like(a); p[m] = a[m]
            # 남은 가장자리의 반투명 빨강/노랑 얼룩 제거
            r_, g_, b_, al = [p[..., k].astype(int) for k in range(4)]
            junk = (al < 120) & (((r_ > 170) & (g_ < 110) & (b_ < 110)) | ((r_ > 170) & (g_ > 170) & (b_ < 110)))
            p[..., 3][junk] = 0
            ys, xs = np.where(p[..., 3] > 30)
            bb = (xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 1)
            out[(d, c)] = Image.fromarray(p).crop(bb)
    return out


if __name__ == '__main__':
    outdir = sys.argv[1]
    os.makedirs(outdir, exist_ok=True)
    res = {}
    for g in ['male', 'female']:
        F = figures('%s/%s_sheet_original.png' % (SRC, g))
        res[g] = {}
        for (d, c), im in F.items():
            buf = im.tobytes()
            hid = hashlib.md5(('uw-' + g + d + str(c)).encode() + buf[:4096]).hexdigest()
            im.save('%s/%s.png' % (outdir, hid), optimize=True)
            res[g].setdefault(d, []).append({'id': hid, 'W': im.size[0], 'H': im.size[1]})
    json.dump(res, open(outdir + '/uw_frames.json', 'w'), indent=1)
    print(json.dumps({g: {d: [(f['W'], f['H']) for f in v] for d, v in res[g].items()} for g in res}))
