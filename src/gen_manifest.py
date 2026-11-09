"""art/avatar  ->  site/assets/avatar (cropped parts) + manifest.json
폴더 규칙
  art/avatar/base/{body}/{dir}/{part}.png        512x1024 전체 캔버스, 파츠는 원래 자리에 그대로
  art/avatar/base/{body}/{dir}/joints.json       관절 좌표 (가이드 이미지 참고)
  art/avatar/items/{slot}/{itemId}/{gender}/{dir}/{part}.png        의상/헤어 레이어 (gender = male|female|unisex)
  art/avatar/items/{slot}/{itemId}/{gender}/{dir}/{part}_back.png   몸 파츠보다 뒤에 그릴 레이어(뒷머리, 아우터 뒷판 등)
  art/avatar/items/{slot}/{itemId}/item.json     {"name": "...", "price": 0}  (선택)
"""
import os, json, sys
from PIL import Image
B = os.path.dirname(os.path.abspath(__file__)) + '/'
ART = sys.argv[1] if len(sys.argv) > 1 else B + 'art/avatar'
OUT = sys.argv[2] if len(sys.argv) > 2 else B + 'site/assets/avatar'
WEB = 'assets/avatar'
DIRS = ['front', 'back', 'left', 'right']
SLOTS = ['hair', 'top', 'bottom', 'shoes', 'outer', 'accessory']
import re
JOINT_OF = {'arm': 'shoulder', 'upperArm': 'shoulder', 'lowerArm': 'elbow', 'leg': 'hip', 'upperLeg': 'hip', 'lowerLeg': 'knee', 'foot': 'ankle'}
PARTS_SIDE = ['head', 'torso', 'upperArmNear', 'lowerArmNear', 'upperArmFar', 'lowerArmFar', 'upperLegNear', 'lowerLegNear', 'upperLegFar', 'lowerLegFar']
JOINTS_SIDE = ['neck', 'root'] + [j + s for s in ('Near', 'Far') for j in ('shoulder', 'elbow', 'hand', 'hip', 'knee', 'ankle')]


def pivot_for(name, J):
    if name == 'head': return J.get('neck')
    if name == 'torso':
        hips = [v for k, v in J.items() if k.startswith('hip')]
        return [J.get('root', [256, 1000])[0], min(h[1] for h in hips)] if hips else None
    m = re.match(r'^(arm|upperArm|lowerArm|leg|upperLeg|lowerLeg|foot)(L|R|Near|Far)$', name)
    return J.get(JOINT_OF[m.group(1)] + m.group(2)) if m else None


def check_part(path, im, name, d, body_h):
    a = im.split()[-1]
    if im.getpixel((0, 0))[3] > 10 or im.getpixel((511, 1023))[3] > 10: problems.append('%s: 배경이 투명하지 않음(모서리)' % path)
    bb = a.point(lambda v: 255 if v > 40 else 0).getbbox()
    if not bb: return
    if bb[0] == 0 or bb[1] == 0 or bb[2] == 512: problems.append('%s: 그림이 캔버스 가장자리에 닿음(잘렸을 수 있음)' % path)
    if name.startswith('lowerLeg') or name.startswith('leg'):
        if not (985 <= bb[3] <= 1008): problems.append('%s: 발바닥이 y=1000 기준선에 없음(현재 아래끝 y=%d)' % (path, bb[3]))
    if name == 'head' and body_h:
        top_ref = 1000 - body_h
        if abs(bb[1] - top_ref) > 25: problems.append('%s: 머리 꼭대기 y=%d (정면 기준 y=%d와 25px 넘게 다름 → 키가 달라 보임)' % (path, bb[1], top_ref))
ORDER = {'front': ['legL', 'legR', 'torso', 'armL', 'armR', 'head'],
         'back': ['head', 'armL', 'armR', 'legL', 'legR', 'torso'],
         'left': ['armR', 'legR', 'torso', 'legL', 'head', 'armL'],
         'right': ['armL', 'legL', 'torso', 'legR', 'head', 'armR']}
problems = []


def crop_save(src, dst_rel):
    im = Image.open(src).convert('RGBA')
    if im.size != (512, 1024): problems.append('%s: 캔버스가 512x1024가 아님 %s' % (src, im.size))
    bb = im.getbbox()
    if not bb: problems.append('%s: 비어 있음' % src); return None
    os.makedirs(os.path.dirname(OUT + '/' + dst_rel), exist_ok=True)
    im.crop(bb).save(OUT + '/' + dst_rel, optimize=True)
    rec = {'src': WEB + '/' + dst_rel, 'x': bb[0], 'y': bb[1], 'w': bb[2] - bb[0], 'h': bb[3] - bb[1]}
    nm = os.path.basename(src)[:-4]
    if nm.startswith('lowerLeg') or nm.startswith('foot'):
        # 발바닥 양 끝(뒤꿈치/발끝) — 걸을 때 발이 땅에 파묻히지 않게 쓰는 값
        al = im.split()[-1].point(lambda v: 255 if v > 40 else 0)
        sb = al.getbbox()
        if sb:
            import numpy as _np
            A = _np.array(al) > 0
            band = A[max(0, sb[3] - 40):sb[3]]
            cols = _np.where(band.any(0))[0]
            if len(cols):
                xs = _np.linspace(cols.min(), cols.max(), 9).astype(int)
                pts = []
                for x in xs:
                    ys = _np.where(A[:, x])[0]
                    if len(ys): pts.append([int(x), int(ys.max()) + 1])
                rec['sole'] = pts
    return rec


M = {'version': 2, 'canvas': [512, 1024], 'footY': 1000, 'drawOrder': ORDER, 'bodies': {}, 'items': {}, 'problems': problems}
front_h = {}
for body in sorted(os.listdir(ART + '/base')):
    hp = ART + '/base/%s/front/head.png' % body
    if os.path.exists(hp):
        bb = Image.open(hp).convert('RGBA').split()[-1].point(lambda v: 255 if v > 40 else 0).getbbox()
        if bb: front_h[body] = 1000 - bb[1]
for body in sorted(os.listdir(ART + '/base')):
    bd = {'gender': 'female' if body.startswith('female') else 'male', 'directions': {}, 'missing': []}
    for d in DIRS:
        p = ART + '/base/%s/%s' % (body, d)
        if not os.path.isdir(p): bd['missing'].append(d + ' 방향 기본 바디'); continue
        JD = json.load(open(p + '/joints.json')) if os.path.exists(p + '/joints.json') else {}
        J = JD.get('joints', {}); rig = JD.get('rig', 'parts')
        if not J: problems.append('%s: joints.json 없음' % p)
        parts = {}
        for f in sorted(os.listdir(p)):
            if not f.endswith('.png'): continue
            name = f[:-4]
            rec = crop_save(p + '/' + f, 'base/%s/%s/%s' % (body, d, f))
            if not rec: continue
            check_part(p + '/' + f, Image.open(p + '/' + f).convert('RGBA'), name, d, front_h.get(body))
            pv = pivot_for(name, J)
            if pv is None: problems.append('%s/%s: 회전축 관절을 joints.json에서 찾을 수 없음' % (p, f)); pv = [256, 500]
            rec['pivot'] = pv
            parts[name] = rec
        if d in ('left', 'right') and rig == 'mesh':
            miss = [p_ for p_ in ['head', 'torso', 'legNear', 'legFar', 'armNear', 'armFar'] if p_ not in parts]
            if miss: problems.append('%s: 메시 리그 파츠 없음 %s' % (p, ', '.join(miss)))
            jm = [j for j in JOINTS_SIDE + ['ballNear', 'ballFar', 'toeNear', 'toeFar', 'heelNear', 'heelFar'] if j not in J]
            if jm: problems.append('%s/joints.json: 관절 없음 %s' % (p, ', '.join(jm)))
        elif d in ('left', 'right'):
            miss = [p_ for p_ in PARTS_SIDE if p_ not in parts]
            if miss: problems.append('%s: 측면 파츠 없음 %s' % (p, ', '.join(miss)))
            jm = [j for j in JOINTS_SIDE if j not in J]
            if jm: problems.append('%s/joints.json: 관절 없음 %s' % (p, ', '.join(jm)))
        bd['directions'][d] = {'parts': parts, 'joints': J, 'rig': rig}
    if 'front' in bd['directions']:
        bd['missing'] += ['머리카락 없는 머리(헤어 분리)', '가려진 부분 보완(겨드랑이·속옷 안 허벅지·턱 아래 목)']
    M['bodies'][body] = bd
for slot in SLOTS:
    sp = ART + '/items/' + slot
    if not os.path.isdir(sp): continue
    for item in sorted(os.listdir(sp)):
        ip = sp + '/' + item
        if not os.path.isdir(ip): continue
        meta = json.load(open(ip + '/item.json')) if os.path.exists(ip + '/item.json') else {}
        it = {'slot': slot, 'name': meta.get('name', item), 'price': meta.get('price', 0), 'layers': {}, 'genders': []}
        for g in ['male', 'female', 'unisex']:
            gp = ip + '/' + g
            if not os.path.isdir(gp): continue
            it['genders'].append(g)
            for d in DIRS:
                dp = gp + '/' + d
                if not os.path.isdir(dp): continue
                for f in sorted(os.listdir(dp)):
                    if not f.endswith('.png'): continue
                    name = f[:-4]; back = name.endswith('_back'); part = name[:-5] if back else name
                    rec = crop_save(dp + '/' + f, 'items/%s/%s/%s/%s/%s' % (slot, item, g, d, f))
                    if not rec: continue
                    rec.update({'attach': part, 'z': -1 if back else 1, 'gender': g})
                    it['layers'].setdefault(d, []).append(rec)
        M['items'][item] = it
os.makedirs(OUT, exist_ok=True)
json.dump(M, open(OUT + '/manifest.json', 'w'), ensure_ascii=False, indent=1)
print('bodies', {k: list(v['directions']) for k, v in M['bodies'].items()}, 'items', list(M['items']), 'problems', problems)
