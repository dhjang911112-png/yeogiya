import json, numpy as np
from PIL import Image, ImageDraw, ImageFont
F='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
def font(n): return ImageFont.truetype(F, n, index=1)
g='male'; P='art/avatar/base/male_base/front/'
J=json.load(open(P+'joints.json'))['joints']
M={p:np.array(Image.open(P+p+'.png')) for p in ['head','torso','armL','armR','legL','legR']}
base=Image.new('RGBA',(512,1024),(0,0,0,0))
for p in ['legL','legR','torso','armL','armR','head']: base.alpha_composite(Image.fromarray(M[p]))
elbowY=(J['shoulderL'][1]+J['handL'][1])//2; waist=600; hem=722
def zone(parts, y0, y1, col):
    z=np.zeros((1024,512,4),'uint8')
    for p in parts:
        a=M[p][...,3]>40; rows=np.zeros_like(a); rows[y0:y1,:]=True; m=a&rows; z[m,:3]=col; z[m,3]=150
    return Image.fromarray(z)
panels=[('티셔츠 (top / tee_white)',[(['torso'],428,waist+40,(70,140,235)),(['armL','armR'],440,elbowY-20,(120,180,255))],
         ['torso.png  — 몸통(목선~허리, 바지 허리 위로 살짝 덮게)','armL.png / armR.png — 반팔 소매','(측면 10파츠: torso, upperArmNear, upperArmFar)']),
        ('바지 (bottom / jeans_blue)',[(['torso'],waist,hem+2,(60,90,170)),(['legL','legR'],700,935,(90,130,210))],
         ['torso.png  — 허리·골반(속옷 덮기)','legL.png / legR.png — 바짓가랑이(발목까지)','(측면: torso, upperLeg·lowerLeg Near/Far)']),
        ('신발 (shoes / sneakers_white)',[(['legL','legR'],905,1001,(235,120,60))],
         ['legL.png / legR.png — 발 부분만(발목 아래)','(측면: lowerLegNear, lowerLegFar 의 발 부분)','밑창은 y=1000 아래로 8px까지'])]
W=3*520+40; cv=Image.new('RGBA',(W,1250),(250,247,240,255)); d=ImageDraw.Draw(cv)
d.text((20,10),'의상 레이어 나누기 예시 (남자 정면, 512×1024 같은 자리에 그림)',fill=(43,42,38),font=font(28))
for i,(title,zs,files) in enumerate(panels):
    x0=20+i*530; y0=60
    d.text((x0,y0),title,fill=(43,42,38),font=font(22))
    pane=Image.new('RGBA',(512,1024),(236,231,220,255)); pane.alpha_composite(base)
    for parts,a,b,col in zs: pane.alpha_composite(zone(parts,a,b,col))
    cv.alpha_composite(pane,(x0,y0+36))
    for k,t in enumerate(files): d.text((x0,y0+36+1024+8+k*24),t,fill=(90,84,74),font=font(16))
cv.convert('RGB').save('kit/clothing_layers_example.png',quality=90)
print('ok')
