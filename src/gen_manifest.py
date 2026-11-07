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
PIVOT = {'head': 'neck', 'armL': 'shoulderL', 'armR': 'shoulderR', 'legL': 'hipL', 'legR': 'hipR',
         'upperArmL': 'shoulderL', 'upperArmR': 'shoulderR', 'lowerArmL': 'elbowL', 'lowerArmR': 'elbowR',
         'upperLegL': 'hipL', 'upperLegR': 'hipR', 'lowerLegL': 'kneeL', 'lowerLegR': 'kneeR'}
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
    return {'src': WEB + '/' + dst_rel, 'x': bb[0], 'y': bb[1], 'w': bb[2] - bb[0], 'h': bb[3] - bb[1]}


M = {'version': 2, 'canvas': [512, 1024], 'footY': 1000, 'drawOrder': ORDER, 'bodies': {}, 'items': {}, 'problems': problems}
for body in sorted(os.listdir(ART + '/base')):
    bd = {'gender': 'female' if body.startswith('female') else 'male', 'directions': {}, 'missing': []}
    for d in DIRS:
        p = ART + '/base/%s/%s' % (body, d)
        if not os.path.isdir(p): bd['missing'].append(d + ' 방향 기본 바디'); continue
        J = json.load(open(p + '/joints.json'))['joints'] if os.path.exists(p + '/joints.json') else {}
        if not J: problems.append('%s: joints.json 없음' % p)
        parts = {}
        for f in sorted(os.listdir(p)):
            if not f.endswith('.png'): continue
            name = f[:-4]
            rec = crop_save(p + '/' + f, 'base/%s/%s/%s' % (body, d, f))
            if not rec: continue
            if name == 'torso': rec['pivot'] = [J.get('root', [256, 1000])[0], min(J.get('hipL', [0, 700])[1], J.get('hipR', [0, 700])[1])]
            else: rec['pivot'] = J.get(PIVOT.get(name, ''), [256, 500])
            parts[name] = rec
        bd['directions'][d] = {'parts': parts, 'joints': J}
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
