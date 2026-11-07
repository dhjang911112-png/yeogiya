# exec'd for the character creation page (index.html): new base-body renderer
import re as _re
xdc = rep(xdc, '<h1 style="margin: 0; font-family: \'Jua\', sans-serif; font-weight: 400; font-size: 22px">캐릭터 선택</h1>',
               '<h1 style="margin: 0; font-family: \'Jua\', sans-serif; font-weight: 400; font-size: 22px">내 캐릭터 만들기</h1>')
_i = xdc.index('<div style="position: absolute; left: {{posLeft}}; bottom: {{posBottom}};')
_j = xdc.index('  </section>', _i)
xdc = xdc[:_i] + '''<div style="position: absolute; left: 50%; bottom: 14px; margin-left: -130px; width: 260px; height: 360px">
      <div style="position: absolute; left: 65px; bottom: 0; width: 130px; height: 13px; margin-bottom: -6px; border-radius: 50%; background: rgba(40,90,140,0.22)"></div>
      <canvas id="yg-av-prev" width="520" height="720" aria-label="{{spriteAlt}}" style="position: absolute; left: 0; bottom: 0; width: 260px; height: 360px"></canvas>
    </div>
    <span style="position: absolute; left: 12px; top: 12px; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.85); font-size: 11px; font-weight: 700; color: #3d5a52">기본 바디 · 정면 미리보기</span>
''' + xdc[_j:]
xdc = rep(xdc, '<img src="{{maleImg}}" alt="" style="position: absolute; left: 50%; top: 0; width: 64px; margin-left: -32px; display: block">',
               '<img src="assets/avatar/base/male_base/portrait.png" alt="" style="position: absolute; left: 50%; top: 2px; width: 60px; margin-left: -30px; display: block">')
xdc = rep(xdc, '<img src="{{femaleImg}}" alt="" style="position: absolute; left: 50%; top: 0; width: 62px; margin-left: -31px; display: block">',
               '<img src="assets/avatar/base/female_base/portrait.png" alt="" style="position: absolute; left: 50%; top: 2px; width: 60px; margin-left: -30px; display: block">')
xdc = rep(xdc, '<label for="nick" style="font-size: 13px; font-weight: 700; color: #5d5a52">닉네임</label>',
               '<label for="nick" style="font-size: 13px; font-weight: 700; color: #5d5a52">캐릭터 이름</label>')
xdc = rep(xdc, '<p style="margin: 14px 16px 0; font-size: 13px; color: #5d5a52; line-height: 1.6; text-align: center">모두 같은 기본 모습으로 시작해요.<br>노동 활동으로 머니를 벌어 옷과 아이템을 사서 꾸며보세요.</p>',
               '''<div style="margin: 12px 16px 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px" aria-label="헤어와 의상 미리보기">
    <span style="padding: 7px 4px; border-radius: 12px; border: 2px dashed #e4ddce; font-size: 11px; text-align: center; color: #6b665c">헤어<br><b style="color: #2b2a26">기본</b></span>
    <span style="padding: 7px 4px; border-radius: 12px; border: 2px dashed #e4ddce; font-size: 11px; text-align: center; color: #6b665c">상의<br><b style="color: #b5532f">그림 준비 중</b></span>
    <span style="padding: 7px 4px; border-radius: 12px; border: 2px dashed #e4ddce; font-size: 11px; text-align: center; color: #6b665c">하의<br><b style="color: #b5532f">그림 준비 중</b></span>
    <span style="padding: 7px 4px; border-radius: 12px; border: 2px dashed #e4ddce; font-size: 11px; text-align: center; color: #6b665c">신발<br><b style="color: #b5532f">그림 준비 중</b></span>
  </div>
  <p style="margin: 10px 16px 0; font-size: 12px; color: #5d5a52; line-height: 1.6; text-align: center">기본 바디 위에 옷과 헤어를 겹쳐 입혀요. 알바로 머니를 벌어 꾸며보세요.</p>''')
# remember the selected base body for the renderer + save it with the profile
js = rep(js, "          YGA.save({ gender: this.state.gender }, true).then(() => { location.href = 'game.html'; });",
         "          const av = YGAvatar.migrateProfile(Object.assign({}, YGA.data || {}, { gender: this.state.gender, baseBody: this.state.gender === 'female' ? 'female_base' : 'male_base' }));\n          YGA.save({ gender: this.state.gender, baseBody: av.baseBody, equipped: av.equipped, eq: YGAvatar.legacyEq(av.equipped), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, true).then(() => { location.href = 'game.html'; });")
