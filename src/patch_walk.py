import sys, json, hashlib, re
sys.path.insert(0,'/home/claude/tmpart/src')
import numpy as np
from PIL import Image
from underwear_sprites import figures
# headbox from set_sprites without running its main
src=open('/home/claude/tmpart/src/set_sprites.py').read()
ns={}; exec(src[src.find('def headbox'):src.find('sid, msheet')], {'Image':Image,'np':np}, ns); headbox=ns['headbox']
G='/home/claude/yeogiya/game.html'; s=open(G,encoding='utf-8').read()
i=s.find('const FRU = ')+len('const FRU = '); FRU,end=json.JSONDecoder().raw_decode(s[i:])
F=figures('/home/claude/art/male_sheet_original.png')
HBn,TBn={},{}
for d,p in [('left','/home/claude/new/male_left3.png'),('right','/home/claude/new/male_right3.png')]:
    n=Image.open(p).convert('RGBA'); a=np.array(n); ys,xs=np.nonzero(a[...,3]>40)
    n=n.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
    ref=F[(d,0)]; Ht=ref.height-3  # ref includes 2px top + 1px bottom margin
    n=n.resize((round(n.width*Ht/n.height),Ht),Image.LANCZOS)
    im=Image.new('RGBA',(n.width+5,n.height+3),(0,0,0,0)); im.paste(n,(2,2))
    stand=F[(d,3)]; unit=1128/stand.size[1]
    hid=hashlib.md5(('uw-fix-male'+d+'2').encode()+im.tobytes()[:4096]).hexdigest()
    im.save('/home/claude/yeogiya/assets/%s.png'%hid,optimize=True)
    al=np.array(im)[...,3]>60; ys,xs=np.where(al)
    h=round(im.size[1]*unit,1); fr={'s':'assets/%s.png'%hid,'h':h,'c':round(xs.mean()*unit,1)}
    hb,neck=headbox(im)
    HBn[hid]={'x0':hb[0],'x1':hb[2],'y0':hb[1],'neck':neck,'H':im.size[1],'W':im.size[0]}
    nb=im.split()[-1].point(lambda v:255 if v>60 else 0).crop((0,neck,im.size[0],neck+1)).getbbox()
    TBn[hid]={'cx':(nb[0]+nb[2])/2,'neck':neck,'H':im.size[1],'h':h}
    print(d,'old',FRU['male'][d]['walk'][2],'new',fr)
    FRU['male'][d]['walk'][2]=fr
s=s[:i]+json.dumps(FRU)+s[i+end:]
k='const HB = Object.assign('; j=s.find(k)+len(k); s=s[:j]+json.dumps(HBn)+', '+s[j:]
k='Object.assign(TB, '; j=s.find(k)+len(k); s=s[:j]+json.dumps(TBn)+', '+s[j:]
open(G,'w',encoding='utf-8').write(s); print('patched')
