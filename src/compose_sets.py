"""몸 시트 + 옷 레이어 시트를 겹쳐 코디 조합별 전신 시트를 만든다(하의 → 상의 순: 상의 밑단이 바지 안으로 들어간 모양)."""
import os, numpy as np
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/art/'
def lay(p):
    a = np.array(Image.open(R + p).convert('RGBA')); a[..., 3][a[..., 3] < 25] = 0; return Image.fromarray(a)
BASE = {'male': 'underwear/male_sheet_original.png', 'female': 'underwear/female_sheet_original.png'}
TEE = {'male': 'items/set_tee_male_sheet_original.png', 'female': 'items/set_tee_female_sheet_original.png'}
SHIRT = {'male': 'items/shirt2_male_sheet_original.png', 'female': 'items/shirt2_female_sheet_original.png'}
JEANS = {'male': 'items/jeans_male_layer_original.png'}
COMBOS = {  # 이름: (몸 시트, [레이어...])
    'tee': (TEE, []), 'shirt': (BASE, [None, SHIRT]),
    'jeans': (BASE, [JEANS]), 'tee_jeans': (TEE, [JEANS]), 'shirt_jeans': (BASE, [JEANS, SHIRT]),
}
os.makedirs(R + 'items/composed', exist_ok=True)
for name, (body, layers) in COMBOS.items():
    for g in ('male', 'female'):
        if any(L is not None and g not in L for L in layers): continue
        im = Image.open(R + body[g]).convert('RGBA')
        for L in layers:
            if L is not None: im.alpha_composite(lay(L[g]))
        im.save(R + 'items/composed/%s_%s.png' % (name, g))
        print(name, g)
