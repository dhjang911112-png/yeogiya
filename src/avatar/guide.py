import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
F='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
def font(n): return ImageFont.truetype(F, n, index=1)  # KR
R=json.load(open('avatar/rig_front.json'))
COL={'head':(231,76,60),'torso':(46,170,100),'armL':(60,120,230),'armR':(240,170,30),'legL':(160,80,220),'legR':(30,180,190)}
NAMES={'head':'머리','torso':'몸통','armL':'왼팔(화면 왼쪽)','armR':'오른팔(화면 오른쪽)','legL':'왼다리','legR':'오른다리'}
def guide(g):
    base=None
    S=1.0; W,H=1500,1120
    cv=Image.new('RGBA',(W,H),(250,247,240,255)); d=ImageDraw.Draw(cv)
    ox,oy=40,60
    # canvas frame + grid
    d.rectangle([ox,oy,ox+512,oy+1024],fill=(236,231,220,255),outline=(150,140,120),width=2)
    for y in range(0,1025,100):
        d.line([(ox,oy+y),(ox+512,oy+y)],fill=(205,198,184),width=1); d.text((ox-36,oy+y-8),str(y),fill=(120,112,98),font=font(14))
    for x in range(0,513,100):
        d.line([(ox+x,oy),(ox+x,oy+1024)],fill=(205,198,184),width=1); d.text((ox+x-10,oy-22),str(x),fill=(120,112,98),font=font(14))
    # tinted parts
    lay=Image.new('RGBA',(512,1024),(0,0,0,0))
    for p,c in COL.items():
        m=np.array(Image.open('avatar/%s_front_%s.png'%(g,p)))
        a=m[...,3]>40; tint=np.zeros_like(m); tint[a,:3]=c; tint[a,3]=95
        part=Image.fromarray(m); lay.alpha_composite(part); lay.alpha_composite(Image.fromarray(tint))
    cv.alpha_composite(lay,(ox,oy))
    # foot line
    d.line([(ox,oy+1000),(ox+512,oy+1000)],fill=(200,40,60),width=3); d.text((ox+400,oy+1003),'발바닥 y=1000',fill=(200,40,60),font=font(15))
    d.line([(ox+256,oy),(ox+256,oy+1024)],fill=(200,40,60,120),width=1)
    J=R[g]['joints']
    piv={'neck':'목 회전축','shoulderL':'왼어깨','shoulderR':'오른어깨','hipL':'왼골반','hipR':'오른골반','kneeL':'왼무릎','kneeR':'오른무릎','ankleL':'왼발목','ankleR':'오른발목','handL':'왼손','handR':'오른손','root':'기준점(발 중심)'}
    for k,(x,y) in J.items():
        X,Y=ox+x,oy+y; r=9 if k in ('neck','shoulderL','shoulderR','hipL','hipR','root') else 6
        d.ellipse([X-r,Y-r,X+r,Y+r],fill=(255,255,255),outline=(220,30,70),width=4)
    # bboxes
    for p,b in R[g]['bbox'].items():
        d.rectangle([ox+b[0],oy+b[1],ox+b[2],oy+b[3]],outline=COL[p]+(255,),width=2)
    # right column: table
    tx=600; y=60
    d.text((tx,10),('남자' if g=='male' else '여자')+' 기본 바디 · 정면 파츠 가이드 (512×1024 캔버스)',fill=(43,42,38),font=font(26))
    d.text((tx,y),'파츠      위치·크기 (x, y, 폭×높이)        회전축',fill=(43,42,38),font=font(18)); y+=30
    pv={'head':J['neck'],'torso':[J['root'][0],min(J['hipL'][1],J['hipR'][1])],'armL':J['shoulderL'],'armR':J['shoulderR'],'legL':J['hipL'],'legR':J['hipR']}
    for p in ['head','torso','armL','armR','legL','legR']:
        b=R[g]['bbox'][p]
        d.rectangle([tx,y+4,tx+16,y+20],fill=COL[p])
        d.text((tx+24,y),'%s'%NAMES[p],fill=(43,42,38),font=font(17))
        d.text((tx+24,y+22),'(%d, %d)  %d×%d   축 (%d, %d)'%(b[0],b[1],b[2]-b[0]+1,b[3]-b[1]+1,pv[p][0],pv[p][1]),fill=(90,84,74),font=font(16)); y+=52
    y+=6; d.text((tx,y),'관절 좌표',fill=(43,42,38),font=font(18)); y+=28
    for k in ['neck','shoulderL','shoulderR','handL','handR','hipL','hipR','kneeL','kneeR','ankleL','ankleR','root']:
        d.text((tx,y),'• %s  (%d, %d)'%(piv[k],J[k][0],J[k][1]),fill=(90,84,74),font=font(16)); y+=24
    y+=8; d.text((tx,y),'겹침 순서 (정면, 아래→위)',fill=(43,42,38),font=font(18)); y+=28
    d.text((tx,y),'뒷머리 → 왼다리·오른다리 → 몸통 → 하의 → 상의 → 왼팔·오른팔(소매)\n→ 아우터 → 머리(얼굴) → 앞머리 → 액세서리',fill=(90,84,74),font=font(16),spacing=6); y+=66
    d.text((tx,y),'움직일 때 드러나므로 꼭 그려야 하는 숨은 부분',fill=(181,83,47),font=font(18)); y+=28
    notes=['• 몸통: 겨드랑이~옆구리를 팔 뒤까지 매끈하게 이어서(팔이 벌어질 때 빈틈 방지)',
           '• 팔: 어깨 윗부분을 둥근 관절 모양으로 15~20px 더 그리기(몸통과 겹침)',
           '• 다리: 허벅지를 속옷 안쪽으로 80px 더 위까지(골반선 y=%d 위로)'%(min(J['hipL'][1],J['hipR'][1])-80),
           '• 목: 턱 아래로 숨은 목을 30px 더 위까지',
           '• 머리카락 없는 머리(이마·두피 포함) — 헤어 교체용',
           '• 기본 헤어 = 앞머리 / 뒷머리 두 장으로 분리']
    for n in notes: d.text((tx,y),n,fill=(90,84,74),font=font(15)); y+=24
    cv.convert('RGB').save('avatar/guide_%s_front.png'%g,quality=92)
guide('male'); guide('female')
