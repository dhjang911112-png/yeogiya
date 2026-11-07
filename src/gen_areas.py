import json

# feature: [kind, x, y, w, h, label, color]
NW, NE, SW, SE = (40, 40, 380, 500), (520, 40, 860, 500), (40, 700, 380, 1160), (520, 700, 860, 1160)

PAL = {
    'bldg': ['#e9edf2', '#efe6da', '#e6eef0', '#f1e8f0', '#eceadf'],
    'shop': ['#e0703f', '#3f86b8', '#2f8a5a', '#c45a5a', '#b07ad0', '#d9a514'],
}

def quad_items(q, items, feats, seed):
    x0, y0, x1, y1 = q
    if not items:
        return
    n = len(items)
    gap = 40
    hh = (y1 - y0 - gap * (n - 1)) / n
    for i, it in enumerate(items):
        kind, label = it[0], it[1]
        ty = y0 + i * (hh + gap)
        if kind in ('park', 'plaza', 'sand', 'water'):
            feats.append([kind, x0, ty, x1 - x0, hh, label, None])
            if kind == 'park':
                feats.append(['tree', x0 + 30, ty + 30, 44, 44, None, None])
                feats.append(['tree', x1 - 74, ty + hh - 74, 44, 44, None, None])
        else:
            w = (x1 - x0) * (0.86 if kind != 'small' else 0.6)
            h = hh * 0.78
            bx = x0 + ((x1 - x0) - w) / 2
            by = ty + (hh - h) / 2
            col = it[2] if len(it) > 2 else ('#4a2f2a' if kind == 'bar' else '#2a1a3a' if kind == 'club' else PAL['shop' if kind in ('shop', 'market') else 'bldg'][(seed + i) % 5])
            feats.append([kind if kind != 'small' else 'shop', round(bx), round(by), round(w), round(h), label, col])
            if kind != 'ktx':
                feats.append(['tree', round(bx - 14), round(by + h - 20), 30, 30, None, None])

def roads(feats, horiz_only_south=False):
    feats.append(['road', 0, 540, 900, 80, None, None])
    if horiz_only_south:
        feats.append(['road', 410, 620, 80, 580, None, None])
    else:
        feats.append(['road', 410, 0, 80, 1200, None, None])
    feats.append(['cross', 350, 540, 60, 80, None, None])
    feats.append(['cross', 490, 540, 60, 80, None, None])

def build(spec, seed):
    feats = []
    theme = spec.get('theme', 'city')
    if theme == 'beach':
        feats.append(['water', 0, 0, 900, 300, None, None])
        feats.append(['bridge_deco', 0, 70, 900, 16, None, None])
        feats.append(['sand', 0, 300, 900, 230, spec.get('sandLabel'), None])
        roads(feats, horiz_only_south=True)
        quad_items(SW, spec.get('SW', []), feats, seed)
        quad_items(SE, spec.get('SE', []), feats, seed + 2)
    elif theme == 'lake':
        feats.append(['park', 90, 30, 720, 480, spec.get('parkLabel'), None])
        feats.append(['water', 180, 90, 540, 360, spec.get('waterLabel'), 'lake'])
        feats.append(['tree', 110, 60, 44, 44, None, None]); feats.append(['tree', 750, 70, 44, 44, None, None]); feats.append(['tree', 120, 440, 44, 44, None, None]); feats.append(['tree', 740, 440, 44, 44, None, None])
        roads(feats, horiz_only_south=True)
        quad_items(SW, spec.get('SW', []), feats, seed)
        quad_items(SE, spec.get('SE', []), feats, seed + 2)
    else:
        roads(feats)
        quad_items(NW, spec.get('NW', []), feats, seed)
        quad_items(NE, spec.get('NE', []), feats, seed + 1)
        quad_items(SW, spec.get('SW', []), feats, seed + 2)
        quad_items(SE, spec.get('SE', []), feats, seed + 3)
        if theme == 'river':
            feats.append(['water', 0, 270, 900, 60, spec.get('waterLabel'), None])
            feats.append(['bridge', 400, 262, 100, 76, None, None])
            feats.append(['bridge', 120, 262, 70, 76, None, None])
            feats.append(['bridge', 700, 262, 70, 76, None, None])
            # carve buildings that overlap river
            out = []
            for f in feats:
                if f[0] in ('bldg', 'shop', 'market', 'tree') and not (f[2] + f[4] < 262 or f[2] > 338):
                    if f[2] < 270:
                        f[4] = 262 - f[2] - 8
                        if f[4] < 40: continue
                    else:
                        d = 346 - f[2]; f[2] += d; f[4] -= d
                        if f[4] < 40: continue
                out.append(f)
            feats = out
        if theme == 'skywalk':
            feats.append(['skywalk', 60, 610, 780, 22, None, None])
    # station
    if spec.get('ktx'):
        st = [690, 524]
    else:
        feats.append(['station', 505, 628, 70, 44, spec['station'], '#3a6fb0'])
        st = [540, 690]
    return feats, st

S = {
 'gwangalli': dict(city='busan', name='광안리', sub='광안대교 · 해변', bg='#e8e2d6', theme='beach', sandLabel='광안리 해수욕장', station='광안역',
     SW=[('shop', '광안리 카페거리'), ('park', '민락수변공원')], SE=[('market', '횟집거리'), ('bldg', '루프탑 바')]),
 'beomil': dict(city='busan', name='범일동', sub='부산진시장 · 골목', bg='#ebe5d9', station='범일역',
     NW=[('market', '부산진시장')], NE=[('market', '자유시장')], SW=[('shop', '범일동 골목'), ('club', '클럽 그린라이트')], SE=[('bar', '감나무집'), ('park', '작은 쉼터')]),
 'busanst': dict(city='busan', name='부산역', sub='KTX · 차이나타운', bg='#e9e4da', station='부산역', ktx=True,
     NW=[('shop', '차이나타운', '#c43f3f'), ('shop', '초량 이바구길')], NE=[('ktx', 'KTX 부산역', '#dfe7f0')], SW=[('plaza', '부산역 광장')], SE=[('bldg', '비즈니스 호텔'), ('small', '어묵 가게')]),
 'dongdaegu': dict(city='daegu', name='동대구역', sub='KTX · 대구 관문', bg='#e9e6df', station='동대구역', ktx=True,
     NW=[('bldg', '대형 백화점', '#efe1e1')], NE=[('ktx', 'KTX 동대구역', '#dfe7f0')], SW=[('plaza', '동대구 광장')], SE=[('bar', '역전 호프'), ('small', '편의점')]),
 'dongseongno': dict(city='daegu', name='동성로', sub='대구 번화가', bg='#ede6dc', station='중앙로역', theme='city',
     NW=[('shop', '동성로 거리'), ('shop', '로데오 골목')], NE=[('bldg', '대구 근대골목', '#e9dccb')], SW=[('plaza', '동성로 광장')], SE=[('market', '서문시장 가는 길'), ('small', '납작만두 집')]),
 'suseongmot': dict(city='daegu', name='수성못', sub='호수 산책로', bg='#e7e6dc', theme='lake', parkLabel='수성못 산책로', waterLabel='수성못', station='수성못역',
     SW=[('shop', '수성못 카페거리')], SE=[('bldg', '오리배 선착장', '#e0eef6'), ('small', '야경 포토존')]),
 'daejeonst': dict(city='daejeon', name='대전역', sub='KTX · 중앙시장', bg='#e9e4da', station='대전역', ktx=True,
     NW=[('market', '대전 중앙시장')], NE=[('ktx', 'KTX 대전역', '#dfe7f0')], SW=[('plaza', '대전역 광장')], SE=[('shop', '빵집 골목', '#d9a514'), ('small', '칼국수 집')]),
 'dunsan': dict(city='daejeon', name='둔산동', sub='시청 · 먹자골목', bg='#e6e6e0', station='시청역',
     NW=[('bldg', '대전시청', '#e6eef0')], NE=[('bldg', '정부청사', '#eceadf'), ('bldg', '백화점', '#efe1e1')], SW=[('park', '샘머리공원')], SE=[('shop', '둔산 먹자골목'), ('small', '노래방')]),
 'eunhaeng': dict(city='daejeon', name='은행동', sub='으능정이 거리', bg='#ede6dc', station='중앙로역', theme='skywalk',
     NW=[('shop', '으능정이 거리')], NE=[('shop', '스카이로드', '#3f86b8')], SW=[('bldg', '은행동 지하상가 입구')], SE=[('small', '분식집'), ('shop', '옷가게 골목')]),
 'daeheung': dict(city='daejeon', name='대흥동', sub='문화예술 거리', bg='#ebe5dc', station='대흥역',
     NW=[('bldg', '대흥동 성당', '#efe6da')], NE=[('shop', '소극장 골목', '#b07ad0')], SW=[('shop', '대흥동 카페 골목')], SE=[('bar', '대흥동 막걸리집'), ('small', '갤러리')]),
 'seoulst': dict(city='seoul', name='서울역', sub='KTX · 남대문시장', bg='#e8e4dc', station='서울역', ktx=True, theme='skywalk',
     NW=[('market', '남대문시장')], NE=[('ktx', 'KTX 서울역', '#dfe7f0')], SW=[('plaza', '서울역 광장')], SE=[('park', '서울로 정원'), ('bldg', '오피스 빌딩')]),
 'sillim': dict(city='seoul', name='신림동', sub='순대타운 · 도림천', bg='#e9e5dc', theme='river', waterLabel='도림천', station='신림역',
     NW=[('market', '신림 순대타운')], NE=[('bldg', '고시촌', '#eceadf')], SW=[('shop', '신림 먹자골목')], SE=[('park', '관악산 입구'), ('small', '편의점')]),
 'hongdae': dict(city='seoul', name='홍대', sub='버스킹 · 연남동', bg='#ece5e3', station='홍대입구역',
     NW=[('park', '경의선숲길')], NE=[('shop', '걷고싶은거리', '#ff6fa8'), ('shop', '클럽 거리', '#3b2f5c')], SW=[('plaza', '버스킹 광장')], SE=[('shop', '연남동 카페'), ('small', '소품숍')]),
 'jongno3': dict(city='seoul', name='종로3가', sub='익선동 · 포차거리', bg='#e9e4da', station='종로3가역',
     NW=[('shop', '익선동 한옥거리', '#8a5a3a')], NE=[('park', '종묘')], SW=[('park', '탑골공원')], SE=[('bar', '종로 포차'), ('small', '귀금속 상가')]),
 'itaewon': dict(city='seoul', name='이태원', sub='세계음식 · 경리단길', bg='#ebe5df', station='이태원역',
     NW=[('shop', '세계음식거리', '#2f8a5a')], NE=[('shop', '경리단길'), ('small', '해방촌 계단')], SW=[('club', '클럽 이태원')], SE=[('bar', '이태원 펍'), ('park', '작은 공원')]),
 'gangnam': dict(city='seoul', name='강남', sub='강남역 · 테헤란로', bg='#e6e6e2', station='강남역',
     NW=[('bldg', '테헤란로 빌딩', '#dfe7f0')], NE=[('bldg', '대형 서점', '#efe6da'), ('bldg', '오피스 타워', '#e6eef0')], SW=[('plaza', '강남역 사거리 광장')], SE=[('shop', '신논현 먹자골목'), ('small', '카페')]),
}

USERS = {
 'gwangalli': [('불꽃축제기다림', 'female', 210, 420, 34, '광안대교 야경 최고'), ('민락동주민', 'male', 650, 360, 8, '')],
 'beomil': [('시장구경러', 'female', 300, 640, 12, '국밥 먹으러 왔어요'), ('조방앞사장님', 'male', 640, 650, 52, '')],
 'busanst': [('여행중인곰', 'male', 300, 640, 3, '서울 가는 KTX 기다리는 중'), ('차이나타운만두', 'female', 220, 520, 41, '')],
 'dongdaegu': [('대구토박이', 'male', 300, 640, 77, '대구 처음이세요?'), ('출장러', 'female', 620, 650, 2, '')],
 'dongseongno': [('동성로패피', 'female', 300, 640, 118, '오늘 쇼핑 성공'), ('납작만두러버', 'male', 640, 660, 15, '')],
 'suseongmot': [('오리배타자', 'female', 300, 560, 36, '수성못 노을 보러 왔어요'), ('산책하는대구남', 'male', 640, 560, 9, '')],
 'daejeonst': [('빵지순례', 'female', 300, 640, 58, '빵 사러 대전 왔어요'), ('칼국수마니아', 'male', 640, 650, 4, '')],
 'dunsan': [('둔산직장인', 'male', 300, 640, 22, '점심 뭐 먹지'), ('샘머리산책', 'female', 640, 650, 31, '')],
 'eunhaeng': [('으능정이', 'female', 300, 640, 19, '스카이로드 보러 오세요'), ('은행동러', 'male', 640, 660, 6, '')],
 'daeheung': [('연극배우지망', 'female', 300, 640, 44, '오늘 공연 있어요'), ('대흥동카페', 'male', 640, 650, 11, '')],
 'seoulst': [('서울상경', 'male', 300, 640, 5, '서울 도착!'), ('남대문쇼핑', 'female', 640, 650, 27, '')],
 'sillim': [('고시생', 'male', 300, 640, 13, '공부하다 바람 쐬러'), ('순대볶음러', 'female', 640, 660, 39, '')],
 'hongdae': [('버스킹가수', 'male', 300, 640, 132, '노래 들으러 오세요'), ('연남동러', 'female', 640, 650, 48, '')],
 'jongno3': [('익선동한복', 'female', 300, 640, 66, '한옥 카페 추천해요'), ('포차사장', 'male', 640, 650, 18, '')],
 'itaewon': [('글로벌친구', 'male', 300, 640, 29, 'Hi! 반가워요'), ('경리단길', 'female', 640, 660, 55, '')],
 'gangnam': [('강남직장인', 'male', 300, 640, 103, '퇴근 후 한잔할 분'), ('신논현러', 'female', 640, 650, 14, '')],
}

def zones_from(feats, name):
    z = []
    for f in feats:
        if f[5] and f[0] not in ('station',):
            z.append([f[1] - 40, f[2] - 40, f[1] + f[3] + 40, f[2] + f[4] + 40, f[5]])
    z.append([0, 0, 900, 1200, name + ' 근처'])
    return z

out = {}
for i, (aid, sp) in enumerate(S.items()):
    feats, st = build(sp, i)
    blocks = [[f[1], f[2], f[1] + f[3], f[2] + f[4]] for f in feats if f[0] in ('water', 'bldg', 'shop', 'market', 'ktx', 'station', 'bar', 'club')]
    bars = [{'name': f[5], 'kind': f[0], 'rect': [round(f[1]), round(f[2]), round(f[3]), round(f[4])], 'door': [round(f[1] + f[3] / 2), round(f[2] + f[4] + 22)]} for f in feats if f[0] in ('bar', 'club')]
    strect = [[round(f[1]), round(f[2]), round(f[3]), round(f[4])] for f in feats if f[0] in ('station', 'ktx')]
    bridges = [[f[1], f[2], f[1] + f[3], f[2] + f[4]] for f in feats if f[0] == 'bridge']
    signs = [[round(f[1] + f[3] / 2), round(f[2] + (16 if f[0] in ('park', 'plaza', 'sand', 'water') else -14)), f[5], f[6] or '#8a857a'] for f in feats if f[5]]
    out[aid] = {
        'city': sp['city'], 'name': sp['name'], 'sub': sp['sub'], 'bg': sp['bg'], 'gen': True,
        'feats': [[f[0], round(f[1]), round(f[2]), round(f[3]), round(f[4]), f[6]] for f in feats],
        'blocks': blocks, 'bridges': bridges, 'zones': zones_from(feats, sp['name']), 'signs': signs,
        'bars': bars, 'stRect': strect[0] if strect else None, 'station': st, 'spawn': [st[0], st[1] + 40], 'ktx': bool(sp.get('ktx')), 'stationName': sp['station'],
    }
users = {}
for aid, lst in USERS.items():
    for j, (nm, g, x, y, like, bub) in enumerate(lst):
        users[aid + str(j)] = dict(name=nm, area=aid, g=g, f=['front', 'left', 'right'][j % 3], x=x, y=y, like=like, flirted=False, friend=False, reports=0, reported=False, banned=False, height=0, region=S[aid]['name'], pin=S[aid]['name'] + ' 근처', bubble=bub)
json.dump({'areas': out, 'users': users}, open('gen_areas.json', 'w'), ensure_ascii=False)
print(len(out), len(users), sum(len(a['feats']) for a in out.values()))
