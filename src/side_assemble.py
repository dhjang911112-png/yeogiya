"""측면 파츠 시트(10조각 한 장) → 리그 규격 파츠(512x1024, 발바닥 y=1000) + joints.json

원본 시트는 art/avatar/source/side_sheets/ 에 그대로 보관(수정 금지).
하는 일: 조각 분리 → 붉은 반투명 찌꺼기(배경 제거 잔여) 제거 → 관절끼리 맞춰 평행이동 조립
         → 정면과 같은 키로 균일 배율 → 각 파츠를 원래 자리 캔버스에 저장.
그림 자체(형태·색·비율)는 바꾸지 않음. 배율은 전체에 한 번만 적용.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = ROOT + '/art/avatar'
SRC = ART + '/source/side_sheets'
FRONT_TOP = {'male_base': 40, 'female_base': 56}  # 정면 머리 꼭대기 y → 키 = 1000 - top

# 시트 배치(행 우선): head torso / upperArmNear lowerArmNear / upperArmFar lowerArmFar /
#                     upperLegNear lowerLegNear / upperLegFar lowerLegFar
NAMES = ['head', 'torso', 'upperArmNear', 'lowerArmNear', 'upperArmFar', 'lowerArmFar',
         'upperLegNear', 'lowerLegNear', 'upperLegFar', 'lowerLegFar']

# 몸통 위 부착점(시트 좌표, 눈으로 잡은 값): 어깨 돌기 중심 / 반바지 안쪽 엉덩이
TORSO_PTS = {
    'male_right':   {'shoulderNear': (765, 113), 'shoulderFar': (885, 105), 'hipNear': (795, 262), 'hipFar': (868, 262)},
    'male_left':    {'shoulderNear': (887, 127), 'shoulderFar': (750, 117), 'hipNear': (850, 286), 'hipFar': (777, 286)},
    'female_right': {'shoulderNear': (751, 111), 'shoulderFar': (895, 111), 'hipNear': (790, 290), 'hipFar': (872, 290)},
    'female_left':  {'shoulderNear': (846, 109), 'shoulderFar': (728, 109), 'hipNear': (818, 280), 'hipFar': (745, 280)},
}


def clean(a):
    a = a.copy()
    r, g, b, al = [a[..., i].astype(int) for i in range(4)]
    junk = (r > g + 80) & (r > b + 80) & (al < 160)
    a[..., 3][junk] = 0
    return a


def pieces(a):
    al = a[..., 3] > 40
    lab, n = ndimage.label(al)
    objs = ndimage.find_objects(lab)
    sz = ndimage.sum(al, lab, range(1, n + 1))
    big = [i for i in range(n) if sz[i] > 3000]
    # 행 묶기: 세로 중심 순으로 2개씩 → 각 행 안에서 왼쪽(위팔·허벅지·머리) / 오른쪽(아래팔·정강이·몸통)
    big.sort(key=lambda i: (objs[i][0].start + objs[i][0].stop) / 2)
    big = [i for k in range(0, len(big), 2) for i in sorted(big[k:k + 2], key=lambda i: objs[i][1].start)]
    assert len(big) == 10, '조각이 10개가 아님: %d' % len(big)
    # 작은 부스러기는 가장 가까운 큰 조각에 붙임
    dist, (iy, ix) = ndimage.distance_transform_edt(~np.isin(lab, [i + 1 for i in big]), return_indices=True)
    owner = lab[iy, ix]
    out = {}
    for k, i in enumerate(big):
        m = (owner == i + 1) & (a[..., 3] > 0) & (dist < 6)
        p = np.zeros_like(a); p[m] = a[m]
        ys, xs = np.where(p[..., 3] > 40)
        out[NAMES[k]] = {'img': p, 'bb': (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)}
    return out


def row_center(img, y):
    xs = np.where(img[int(y), :, 3] > 40)[0]
    return float((xs.min() + xs.max()) / 2) if len(xs) else None


def limb_joints(name, P):
    img, (x0, y0, x1, y1) = P['img'], P['bb']
    h = y1 - y0
    if name.startswith('upperArm'):
        t, b = y0 + 0.16 * h, y1 - 0.07 * h
    elif name.startswith('lowerArm'):
        t, b = y0 + 0.07 * h, y1 - 0.22 * h
    elif name.startswith('upperLeg'):
        t, b = y0 + 0.10 * h, y1 - 0.09 * h
    else:  # lowerLeg: 무릎 / 발목(정강이 중심 x, 발바닥 위)
        t = y0 + 0.07 * h
        return (row_center(img, t), t), (row_center(img, y1 - 0.34 * h), y1 - 0.14 * h), y1
    return (row_center(img, t), t), (row_center(img, b), b), y1


def assemble(sheet, body, dirn):
    a = clean(np.array(Image.open('%s/%s_sheet.png' % (SRC, sheet)).convert('RGBA')))
    P = pieces(a)
    T = TORSO_PTS[sheet]
    off = {'torso': (0.0, 0.0)}
    J = {}
    tb = P['torso']['bb']
    neck = (row_center(P['torso']['img'], tb[1] + 0.06 * (tb[3] - tb[1])), tb[1] + 0.10 * (tb[3] - tb[1]))
    hb = P['head']['bb']
    hn = (row_center(P['head']['img'], hb[3] - 0.05 * (hb[3] - hb[1])), hb[3] - 0.07 * (hb[3] - hb[1]))
    off['head'] = (neck[0] - hn[0], neck[1] - hn[1])
    J['neck'] = neck
    soles = {}
    for S in ('Near', 'Far'):
        for up, lo, j0, j1, j2 in (('upperArm', 'lowerArm', 'shoulder', 'elbow', 'hand'), ('upperLeg', 'lowerLeg', 'hip', 'knee', 'ankle')):
            ut, ub, _ = limb_joints(up + S, P[up + S])
            lt, lb, sole = limb_joints(lo + S, P[lo + S])
            anchor = T[j0 + S]
            off[up + S] = (anchor[0] - ut[0], anchor[1] - ut[1])
            mid = (ub[0] + off[up + S][0], ub[1] + off[up + S][1])
            off[lo + S] = (mid[0] - lt[0], mid[1] - lt[1])
            J[j0 + S] = anchor; J[j1 + S] = mid
            J[j2 + S] = (lb[0] + off[lo + S][0], lb[1] + off[lo + S][1])
            if up == 'upperLeg': soles[S] = sole + off[lo + S][1]
    # 먼 다리 발바닥을 가까운 다리 높이에 맞춤(엉덩이 점을 위아래로만 이동 — 반바지 안이라 안 보임)
    dy = soles['Near'] - soles['Far']
    for n in ('upperLegFar', 'lowerLegFar'): off[n] = (off[n][0], off[n][1] + dy)
    for j in ('hipFar', 'kneeFar', 'ankleFar'): J[j] = (J[j][0], J[j][1] + dy)
    ground = soles['Near']
    top = hb[1] + off['head'][1]
    H = ground - top
    s = (1000 - FRONT_TOP[body]) / H
    # 좌우 전환 튐 방지: 서 있는 전체 그림의 무게중심 x를 정면과 같은 256에 맞춤
    mass = cxs = 0.0
    for n, pc in P.items():
        ys, xs = np.where(pc['img'][..., 3] > 40)
        mass += len(xs); cxs += (xs.mean() + off[n][0]) * len(xs)
    cx = cxs / mass
    tf = lambda p: [round((p[0] - cx) * s + 256, 1), round((p[1] - ground) * s + 1000, 1)]
    outdir = '%s/base/%s/%s' % (ART, body, dirn)
    os.makedirs(outdir, exist_ok=True)
    info = {}
    for n, p in P.items():
        x0, y0, x1, y1 = p['bb']
        crop = Image.fromarray(p['img']).crop((x0 - 4, y0 - 4, x1 + 4, y1 + 4))
        W, Hh = crop.size
        crop = crop.resize((max(1, round(W * s)), max(1, round(Hh * s))), Image.LANCZOS)
        px, py = tf((x0 - 4 + off[n][0], y0 - 4 + off[n][1]))
        can = Image.new('RGBA', (512, 1024), (0, 0, 0, 0))
        can.alpha_composite(crop, (int(round(px)), int(round(py))))
        can.save(outdir + '/' + n + '.png')
        info[n] = [int(round(px)), int(round(py)), crop.size[0], crop.size[1]]
    joints = {k: tf(v) for k, v in J.items()}
    joints['root'] = [256, 1000]
    json.dump({'joints': joints, 'note': '측면 시트 %s_sheet.png 에서 자동 조립(side_assemble.py). 배율 %.4f' % (sheet, s), 'scale': s,
               'sheet_heights': {'head': int(hb[3] - hb[1]), 'torso': int(tb[3] - tb[1]), 'total': round(H, 1)}},
              open(outdir + '/joints.json', 'w'), ensure_ascii=False, indent=1)
    return s, joints


if __name__ == '__main__':
    for sheet in ('male_right', 'male_left', 'female_right', 'female_left'):
        g, d = sheet.split('_')
        s, J = assemble(sheet, g + '_base', d)
        print(sheet, 'scale %.3f' % s, {k: J[k] for k in ('neck', 'hipNear', 'kneeNear', 'ankleNear', 'shoulderNear')})
