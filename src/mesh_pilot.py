"""시범용: 측면 파츠(위/아래 조각)를 한 장짜리 팔·다리로 합쳐 메시 변형(스키닝) 리그를 시험한다.
- 그림을 새로 그리거나 늘이지 않음: 이미 조립된 512x1024 파츠를 같은 자리에서 겹쳐 한 장으로 합칠 뿐.
- 결과는 art/avatar/base/<원본>_pilot/<방향>/ 에 따로 저장(원본 파츠 그대로 유지). 최종 에셋 아님.
"""
import json, os, sys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = ROOT + '/art/avatar/base'

def build(body, d):
    src = '%s/%s/%s' % (ART, body, d); dst = '%s/%s_pilot/%s' % (ART, body.replace('_base', ''), d)
    os.makedirs(dst, exist_ok=True)
    J = json.load(open(src + '/joints.json'))['joints']
    L = lambda n: Image.open('%s/%s.png' % (src, n)).convert('RGBA')
    for n in ('head', 'torso'): L(n).save('%s/%s.png' % (dst, n))
    fwd = 1 if d == 'right' else -1
    for S in ('Near', 'Far'):
        leg = L('lowerLeg' + S); leg.alpha_composite(L('upperLeg' + S)); leg.save('%s/leg%s.png' % (dst, S))
        arm = L('lowerArm' + S); arm.alpha_composite(L('upperArm' + S)); arm.save('%s/arm%s.png' % (dst, S))
        a = np.array(L('lowerLeg' + S))[..., 3] > 40
        ys, xs = np.where(a); yb = ys.max()
        band = np.where(a[yb - 14:yb + 1].any(0))[0]
        toe, heel = (band.max(), band.min()) if fwd > 0 else (band.min(), band.max())
        J['ball' + S] = [round(heel + 0.70 * (toe - heel), 1), float(yb - 10)]
        J['toe' + S] = [float(toe), float(yb - 6)]
        J['heel' + S] = [float(heel), float(yb - 4)]
    json.dump({'rig': 'mesh', 'joints': J, 'note': '시범(파일럿): %s/%s 측면 파츠를 합친 한 장짜리 팔·다리. 최종 에셋 아님.' % (body, d)},
              open(dst + '/joints.json', 'w'), ensure_ascii=False, indent=1)
    print(dst)

if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else 'female_base', sys.argv[2] if len(sys.argv) > 2 else 'right')
