import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
F='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
def font(n): return ImageFont.truetype(F, n, index=1)
B='./'; OUT='kit/'
os.makedirs(OUT,exist_ok=True)
Image.new('RGBA',(512,1024),(0,0,0,0)).save(OUT+'blank_512x1024.png')
NAMES={'neck':'목','shoulder':'어깨','elbow':'팔꿈치','hand':'손','hip':'골반','knee':'무릎','ankle':'발목'}
for g in ['male','female']:
    J=json.load(open(B+'art/avatar/base/%s_base/front/joints.json'%g))['joints']
    front=Image.open(B+'base/%s_base_front_idle.png'%g)
    ys={'neck':J['neck'][1],'shoulder':J['shoulderL'][1],'elbow':(J['shoulderL'][1]+J['handL'][1])//2,'hand':J['handL'][1],'hip':J['hipL'][1],'knee':J['kneeL'][1],'ankle':925}
    headTop=front.getbbox()[1]
    for d in ['left','right']:
        f=1 if d=='right' else -1
        # suggested side joints (near limbs on x=256, far limbs 10px behind)
        SJ={'neck':[256,ys['neck']],'root':[256,1000]}
        for S,ox in [('Near',0),('Far',-10*f)]:
            SJ['shoulder'+S]=[256+ox,ys['shoulder']+6]; SJ['elbow'+S]=[256+ox,ys['elbow']]; SJ['hand'+S]=[256+ox+4*f,ys['hand']]
            SJ['hip'+S]=[256+ox,ys['hip']]; SJ['knee'+S]=[256+ox+10*f,ys['knee']]; SJ['ankle'+S]=[256+ox,925]
        os.makedirs(OUT+'%s_base/%s'%(g,d),exist_ok=True)
        json.dump({'joints':SJ,'note':'제안 좌표입니다. 그린 그림에 맞게 고쳐주세요(관절 중심). Near=카메라 쪽 팔다리, Far=반대쪽'},open(OUT+'%s_base/%s/joints.json'%(g,d),'w'),ensure_ascii=False,indent=1)
        # guide overlay (transparent PNG, put it on a separate layer, hide/delete before export)
        gd=Image.new('RGBA',(512,1024),(0,0,0,0)); dr=ImageDraw.Draw(gd)
        ghost=np.array(front).copy(); ghost[...,3]=(ghost[...,3]*0.13).astype('uint8'); gd.alpha_composite(Image.fromarray(ghost))
        dr.line([(256,0),(256,1024)],fill=(230,40,80,160),width=1)
        dr.line([(0,1000),(512,1000)],fill=(230,40,80,230),width=3); dr.text((6,1003),'발바닥 y=1000',fill=(230,40,80,255),font=font(14))
        dr.line([(0,headTop),(512,headTop)],fill=(40,120,230,200),width=1); dr.text((6,headTop+2),'머리 꼭대기 y=%d'%headTop,fill=(40,120,230,255),font=font(13))
        for k,y in ys.items():
            dr.line([(0,y),(512,y)],fill=(40,160,120,170),width=1); dr.text((6,y+2),'%s y=%d'%(NAMES[k],y),fill=(30,130,100,255),font=font(13))
        for k,(x,y) in SJ.items():
            col=(230,40,80,255) if 'Near' in k or k in ('neck','root') else (120,120,140,255)
            dr.ellipse([x-6,y-6,x+6,y+6],outline=col,width=3)
        arrow='→ 앞(오른쪽을 봄)' if d=='right' else '← 앞(왼쪽을 봄)'
        dr.text((300 if d=='left' else 150,20),arrow,fill=(230,40,80,255),font=font(18))
        gd.save(OUT+'%s_base/%s/_guide_%s_%s.png'%(g,d,g,d))
        # preview on paper for the chat
        pv=Image.new('RGBA',(512,1024),(250,247,240,255)); pv.alpha_composite(gd); pv.convert('RGB').save(OUT+'preview_%s_%s.jpg'%(g,d),quality=88)
print(os.listdir(OUT))
