# exec'd from build_site.py right before the game page is written; operates on `js` and `xdc`
import re as _re
WB = json.load(open(B + '/wearboxes.json'))
WI = json.load(open(B + '/wearitems.json'))
H1 = {'front': 0.9792, 'left': 1.0157, 'right': 1.0019, 'back': 0.9923}

PREM_JS = '''const PREM = {
  hair1: { name: '웨이브 헤어', cat: 'hair', price: 120000, icon: 'assets/hair/hair1_front.png', male: true },
  hair2: { name: '댄디 블랙 헤어', cat: 'hair', price: 150000, icon: 'assets/hair/hair2_front.png', male: true },
  tbcard: { name: '톰브라운 가디건', cat: 'top', price: 1680000, icon: 'assets/wear/tbcard_icon.png' },
  gcard: { name: '녹색 루즈핏 롱가디건', cat: 'top', price: 340000, icon: 'assets/wear/gcard_icon.png' }
};
const INV_MAX = 6, WEAR_MAX = 4;
'''
js = PREM_JS + js

# ---- hair table + top overlay fitter ----
js, n = _re.subn(r'const HAIRS = \{ hair1: \{[^;]*\} \};',
    'const HAIRS = { hair1: { name: "웨이브 헤어", ar: ' + json.dumps(H1) + ' }, hair2: { name: "댄디 블랙 헤어", ar: ' + json.dumps(WB['H2']) + ' } };\n'
    + '    const TB = ' + json.dumps(WB['TB']) + ', TW = ' + json.dumps(WI) + ', TDY = { front: 0, back: 0, left: -0.02, right: -0.02 };\n'
    + '    const topFit = (fr, dir, gg, topId, k, imgL) => { if (!PREM[topId] || PREM[topId].cat !== "top" || !TW.REF[topId] || !fr) return null; const id = (String(fr.s).match(/[0-9a-f]{32}/) || [])[0]; const t = TB[id]; if (!t) return null; const s = fr.h * k / t.H; const hh = TW.REF[topId][gg] * k; const w = hh / TW.CAR[topId][dir].ar * TW.SW[topId][dir]; const cx = imgL + t.cx * s + TW.SX[topId][gg][dir] * w; return { src: "assets/wear/" + topId + "_" + dir + ".png", l: (cx - w / 2).toFixed(1) + "px", t: (t.neck * s + hh * TDY[dir]).toFixed(1) + "px", w: w.toFixed(1) + "px", h: hh.toFixed(1) + "px" }; };',
    js)
assert n == 1

js = rep(js, "      const hf = o.hair ? hairFit(o.fr, o.dir || 'front', o.hair, k, 70 - o.fr.c * k) : null;",
         "      const hf = o.hair ? hairFit(o.fr, o.dir || 'front', o.hair, k, 70 - o.fr.c * k) : null;\n      const tf = o.top ? topFit(o.fr, o.dir || 'front', o.g === 'female' ? 'female' : 'male', o.top, k, 70 - o.fr.c * k) : null;\n      ret.hasTop = !!tf; ret.topSrc = tf ? tf.src : ''; ret.topL = tf ? tf.l : '0px'; ret.topT = tf ? tf.t : '0px'; ret.topW = tf ? tf.w : '0px'; ret.topH = tf ? tf.h : '0px';")
js = rep(js, "actor({ key: 'me', hair: g === 'male' ? (st.eq.hair || '') : '', dir: st.facing,",
         "actor({ key: 'me', hair: g === 'male' ? (st.eq.hair || '') : '', top: PREM[st.eq.top] ? st.eq.top : '', g: g, dir: st.facing,")
js = rep(js, "actor({ key: 'u' + id, hair: u.g === 'male' ? u.hair : '', dir: u.f,",
         "actor({ key: 'u' + id, hair: u.g === 'male' ? u.hair : '', top: u.top, g: u.g, dir: u.f,")
xdc = rep(xdc, """                <sc-if value="{{a.hasHair}}" hint-placeholder-val="{{ false }}">""",
          """                <sc-if value="{{a.hasTop}}" hint-placeholder-val="{{ false }}">
                  <img src="{{a.topSrc}}" alt="" style="position: absolute; left: {{a.topL}}; top: {{a.topT}}; width: {{a.topW}}; height: {{a.topH}}; max-width: none; pointer-events: none">
                </sc-if>
                <sc-if value="{{a.hasHair}}" hint-placeholder-val="{{ false }}">""")

# ---- shop preview: top + hair ----
xdc = rep(xdc, """          <sc-if value="{{shopHair.on}}" hint-placeholder-val="{{ false }}">""",
          """          <sc-if value="{{shopTop.on}}" hint-placeholder-val="{{ false }}">
            <img src="{{shopTop.src}}" alt="" style="position: absolute; left: {{shopTop.l}}; top: {{shopTop.t}}; width: {{shopTop.w}}; height: {{shopTop.h}}; max-width: none">
          </sc-if>
          <sc-if value="{{shopHair.on}}" hint-placeholder-val="{{ false }}">""")
js = rep(js, "      shopHair: (() => {",
         "      shopTop: (() => { if (!PREM[st.eq.top]) return { on: false }; const fr0 = FR[g].front.stand; const id = (String(fr0.s).match(/[0-9a-f]{32}/) || [])[0]; const t = TB[id]; if (!t) return { on: false }; const kk = 165 / fr0.h; const s = 165 / t.H; const tf = topFit(fr0, 'front', g, st.eq.top, kk, 55 - t.W_ * s); return { on: false }; })(),\n      shopHair: (() => {")
# (simpler exact version for the preview: compute left of the centered image)
js = rep(js, "const tf = topFit(fr0, 'front', g, st.eq.top, kk, 55 - t.W_ * s); return { on: false }; })(),",
         "const hb = HB[id]; const tf = hb ? topFit(fr0, 'front', g, st.eq.top, kk, 55 - hb.W * s / 2) : null; if (!tf) return { on: false }; return { on: true, src: tf.src, l: tf.l, t: (parseFloat(tf.t) + 5).toFixed(1) + 'px', w: tf.w, h: tf.h }; })(),")
js = rep(js, "      eqHair: st.eq.hair && HAIRS[st.eq.hair] ? HAIRS[st.eq.hair].name : '기본',\n      eqTop: nameOf(st.eq.top),",
         "      eqHair: st.eq.hair && PREM[st.eq.hair] ? PREM[st.eq.hair].name : '기본',\n      eqTop: PREM[st.eq.top] ? PREM[st.eq.top].name : nameOf(st.eq.top),")

# ---- shop: premium items go to the inventory ----
js = rep(js, "      { id: 'hair1', cat: 'hair', name: '웨이브 헤어', price: 120000, img: 'assets/hair/hair1_front.png' },\n",
         "      { id: 'hair1', cat: 'hair', name: '웨이브 헤어', price: 120000, img: 'assets/hair/hair1_front.png' },\n      { id: 'hair2', cat: 'hair', name: '댄디 블랙 헤어', price: 150000, img: 'assets/hair/hair2_front.png' },\n      { id: 'tbcard', cat: 'top', name: '톰브라운 가디건', price: 1680000, img: 'assets/wear/tbcard_icon.png' },\n      { id: 'gcard', cat: 'top', name: '녹색 루즈핏 롱가디건', price: 340000, img: 'assets/wear/gcard_icon.png' },\n")
js, n = _re.subn(r"      if \(i\.cat === 'hair'\) \{.*?\n(?=      if \(i\.cat === 'item'\) \{)",
    lambda m: "      if (PREM[i.id]) { const P = PREM[i.id]; const inv = st.inv || []; const afford = st.money >= i.price; const full = inv.length >= INV_MAX; const have = inv.filter((x) => x === i.id).length; return { name: i.name, pos: 'center', bi: 'url(' + i.img + ')', bs: 'contain', priceText: fmt(i.price) + '원' + (P.male ? ' · 남자 전용' : '') + (have ? ' · 보관 ' + have + '개' : ''), btn: full ? '보관함 가득' : '구매', btnBg: afford && !full ? accent : '#d8d2c6', btnFg: '#ffffff', disabled: false, border: '#ece5d6', act: () => { const s2 = this.state; const inv2 = s2.inv || []; if (inv2.length >= INV_MAX) { this.flash('보관함(6칸)이 가득 찼어요. 거래로 정리해 주세요', true); return; } if (s2.money < i.price) { this.flash('머니가 부족해요. 알바로 벌어오세요!', true); return; } this.setState({ money: s2.money - i.price, inv: inv2.concat([i.id]) }); this.flash(i.name + ' 구매! 보관함에 넣었어요. 보관함에서 꺼내 착용하세요', false); this.saveLocal(true); } }; }\n",
    js, flags=_re.S)
assert n == 1

# ---- inventory (보관함) panel in the shop tab ----
xdc = rep(xdc, """      <div style="display: flex; gap: 6px">
        <sc-for list="{{cats}}" as="c" hint-placeholder-count="4">""", """      <div style="padding: 12px; border-radius: 18px; background: #ffffff; border: 1px solid #ece5d6; display: flex; flex-direction: column; gap: 8px">
        <div style="display: flex; align-items: center; justify-content: space-between">
          <span style="font-family: 'Jua', sans-serif; font-size: 17px">보관함</span>
          <span style="font-size: 12px; font-weight: 700; color: #6b665c">{{invInfo}}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px">
          <sc-for list="{{invSlots}}" as="sl" hint-placeholder-count="6">
            <div style="height: 116px; border-radius: 12px; border: 2px {{sl.bs}} {{sl.bc}}; background: {{sl.bg}}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 4px; box-sizing: border-box">
              <sc-if value="{{sl.full}}" hint-placeholder-val="{{ false }}">
                <img src="{{sl.icon}}" alt="" style="width: 46px; height: 46px; object-fit: contain">
                <span style="font-size: 11px; font-weight: 700; text-align: center; line-height: 1.25">{{sl.name}}</span>
                <button onClick="{{sl.act}}" disabled="{{sl.dis}}" style="height: 26px; padding: 0 10px; border-radius: 8px; border: none; background: {{sl.btnBg}}; color: #ffffff; font-size: 11px; font-weight: 700">{{sl.btn}}</button>
              </sc-if>
              <sc-if value="{{sl.empty}}" hint-placeholder-val="{{ true }}">
                <span style="font-size: 11px; color: #b5ae9f">빈 칸</span>
              </sc-if>
            </div>
          </sc-for>
        </div>
        <span style="font-size: 11px; color: #8a857a; line-height: 1.5">착용은 최대 4개(헤어·상의·하의·신발 각 1개). 다른 사람을 눌러 '거래하기'로 주고받기·팔기·사기·교환을 할 수 있어요</span>
      </div>

      <div style="display: flex; gap: 6px">
        <sc-for list="{{cats}}" as="c" hint-placeholder-count="4">""")
js = rep(js, "      eqHair: st.eq.hair && PREM[st.eq.hair]",
         """      ...(() => {
        const inv = st.inv || [];
        const wornIdx = {};
        ['hair', 'top', 'bottom', 'shoes'].forEach((c) => { const v = st.eq[c]; if (v && PREM[v]) { const ix = inv.indexOf(v); if (ix >= 0) wornIdx[ix] = c; } });
        const wornN = Object.keys(wornIdx).length;
        const slots = [];
        for (let s = 0; s < INV_MAX; s++) {
          const id = inv[s];
          if (!id || !PREM[id]) { slots.push({ key: 'sl' + s, full: false, empty: true, bs: 'dashed', bc: '#e4ddce', bg: '#fbf7ef' }); continue; }
          const P = PREM[id], worn = wornIdx[s] !== undefined, blocked = P.male && g !== 'male';
          let btn = worn ? '해제' : (blocked ? '남자 전용' : '착용');
          const act = () => {
            const s2 = this.state; const eq = Object.assign({}, s2.eq);
            if (worn) { eq[P.cat] = P.cat === 'top' ? 'hoodie' : ''; this.setState({ eq: eq }); this.flash(P.name + ' 해제했어요', false); this.saveLocal(true); return; }
            if (blocked) return;
            eq[P.cat] = id; this.setState({ eq: eq }); this.flash(P.name + ' 착용!', false); this.saveLocal(true);
          };
          slots.push({ key: 'sl' + s, full: true, empty: false, icon: P.icon, name: P.name, btn: btn, act: act, dis: !worn && blocked, btnBg: worn ? '#2b2a26' : (blocked ? '#d8d2c6' : accent), bs: 'solid', bc: worn ? accent : '#ece5d6', bg: worn ? '#e6f3f0' : '#ffffff' });
        }
        return { invSlots: slots, invInfo: '보관 ' + inv.length + '/' + INV_MAX + ' · 착용 ' + wornN + '/' + WEAR_MAX };
      })(),
      eqHair: st.eq.hair && PREM[st.eq.hair]""")

# ---- trade: menu button + compose sheet + incoming offer sheet ----
xdc = rep(xdc, """            <button class="sheet-btn" onClick="{{openReport}}" disabled="{{u.reported}}" style="background: #ffffff; border: 2px solid #e8c9bd; color: #b5532f">{{u.reportText}}</button>""",
          """            <button class="sheet-btn" onClick="{{openReport}}" disabled="{{u.reported}}" style="background: #ffffff; border: 2px solid #e8c9bd; color: #b5532f">{{u.reportText}}</button>
            <button class="sheet-btn" onClick="{{openTrade}}" style="grid-column: 1 / -1; background: #e0a21b; color: #ffffff">거래하기 · 주기 · 팔기 · 사기 · 교환</button>""")
TRADE_TPL = """        <sc-if value="{{isTrade}}" hint-placeholder-val="{{ false }}">
          <div style="display: flex; flex-direction: column; gap: 8px; max-height: 470px; overflow-y: auto">
            <span style="font-size: 13px; font-weight: 700">내가 줄 아이템</span>
            <div style="display: flex; flex-wrap: wrap; gap: 6px">
              <sc-for list="{{tr.mine}}" as="ti" hint-placeholder-count="0">
                <button onClick="{{ti.pick}}" aria-pressed="{{ti.on}}" style="height: 34px; padding: 0 10px; border-radius: 10px; border: 2px solid {{ti.bc}}; background: {{ti.bg}}; font-size: 12px; font-weight: 700; color: #2b2a26">{{ti.name}}</button>
              </sc-for>
              <sc-if value="{{tr.mineEmpty}}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; color: #8a857a">보관함이 비어 있어요</span></sc-if>
            </div>
            <label for="trGive" style="font-size: 13px; font-weight: 700">내가 줄 머니</label>
            <input id="trGive" class="fld" type="number" inputmode="numeric" placeholder="0" value="{{tr.giveMoney}}" onChange="{{tr.onGive}}">
            <span style="font-size: 13px; font-weight: 700">받을 아이템 ({{u.name}}님 보관함)</span>
            <div style="display: flex; flex-wrap: wrap; gap: 6px">
              <sc-for list="{{tr.theirs}}" as="tt" hint-placeholder-count="0">
                <button onClick="{{tt.pick}}" aria-pressed="{{tt.on}}" style="height: 34px; padding: 0 10px; border-radius: 10px; border: 2px solid {{tt.bc}}; background: {{tt.bg}}; font-size: 12px; font-weight: 700; color: #2b2a26">{{tt.name}}</button>
              </sc-for>
              <sc-if value="{{tr.theirsEmpty}}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; color: #8a857a">상대 보관함이 비어 있어요</span></sc-if>
            </div>
            <label for="trWant" style="font-size: 13px; font-weight: 700">받을 머니</label>
            <input id="trWant" class="fld" type="number" inputmode="numeric" placeholder="0" value="{{tr.wantMoney}}" onChange="{{tr.onWant}}">
            <div style="padding: 10px 12px; border-radius: 12px; background: #fff4dc; font-size: 12px; line-height: 1.6; color: #5d4a1a">{{tr.summary}}</div>
            <button onClick="{{tr.send}}" style="height: 50px; border-radius: 14px; border: none; background: #e0a21b; color: #ffffff; font-family: 'Jua', sans-serif; font-size: 18px">거래 제안 보내기</button>
            <button onClick="{{backMenu}}" style="height: 36px; border: none; background: transparent; font-size: 13px; font-weight: 700; color: #6b665c">← 메뉴로</button>
          </div>
        </sc-if>
        <sc-if value="{{isTradeIn}}" hint-placeholder-val="{{ false }}">
          <div style="display: flex; flex-direction: column; gap: 10px">
            <span style="font-family: 'Jua', sans-serif; font-size: 19px">{{tin.title}}</span>
            <div style="padding: 12px; border-radius: 12px; background: #e6f3f0; display: flex; flex-direction: column; gap: 4px">
              <span style="font-size: 12px; color: #3d5a52">내가 받는 것</span>
              <span style="font-size: 15px; font-weight: 700; color: #23756b">{{tin.get}}</span>
            </div>
            <div style="padding: 12px; border-radius: 12px; background: #fbeee8; display: flex; flex-direction: column; gap: 4px">
              <span style="font-size: 12px; color: #7a4a3a">내가 주는 것</span>
              <span style="font-size: 15px; font-weight: 700; color: #b5532f">{{tin.give}}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px">
              <button onClick="{{tin.no}}" style="height: 50px; border-radius: 14px; border: 2px solid #e4ddce; background: #ffffff; font-size: 15px; font-weight: 700; color: #2b2a26">거절</button>
              <button onClick="{{tin.yes}}" style="height: 50px; border-radius: 14px; border: none; background: {{accent}}; color: #ffffff; font-family: 'Jua', sans-serif; font-size: 18px">수락</button>
            </div>
          </div>
        </sc-if>
"""
xdc = rep(xdc, """        <sc-if value="{{isReport}}" hint-placeholder-val="{{ false }}">""", TRADE_TPL + """        <sc-if value="{{isReport}}" hint-placeholder-val="{{ false }}">""")
js = rep(js, "      isMenu: !!sh && sh.type === 'menu',",
         """      isTrade: !!sh && sh.type === 'trade' && !!su, isTradeIn: !!sh && sh.type === 'tradeIn' && !!st.tradeIn,
      openTrade: () => this.setState({ sheet: { type: 'trade', id: sh.id }, trade: { give: '', want: '', giveMoney: '', wantMoney: '' } }),
      tr: (() => {
        const T = st.trade || { give: '', want: '', giveMoney: '', wantMoney: '' };
        const set = (o) => this.setState({ trade: Object.assign({}, this.state.trade || {}, o) });
        const chip = (id, on, pick) => ({ key: id + (on ? 1 : 0), name: PREM[id] ? PREM[id].name : id, on: on ? 'true' : 'false', bc: on ? '#e0a21b' : '#e4ddce', bg: on ? '#fff4dc' : '#ffffff', pick: pick });
        const uniq = (a) => a.filter((x, i) => a.indexOf(x) === i && PREM[x]);
        const mine = uniq(st.inv || []).map((id) => chip(id, T.give === id, () => set({ give: T.give === id ? '' : id })));
        const theirs = uniq((su && su.inv) || []).map((id) => chip(id, T.want === id, () => set({ want: T.want === id ? '' : id })));
        const gm = Math.max(0, parseInt(T.giveMoney, 10) || 0), wm = Math.max(0, parseInt(T.wantMoney, 10) || 0);
        const desc = (item, money) => [item && PREM[item] ? PREM[item].name : '', money ? fmt(money) + '원' : ''].filter(Boolean).join(' + ') || '없음';
        return { mine: mine, theirs: theirs, mineEmpty: mine.length === 0, theirsEmpty: theirs.length === 0, giveMoney: T.giveMoney, wantMoney: T.wantMoney,
          onGive: (e) => set({ giveMoney: e.target.value.replace(/[^0-9]/g, '').slice(0, 9) }), onWant: (e) => set({ wantMoney: e.target.value.replace(/[^0-9]/g, '').slice(0, 9) }),
          summary: '내가 줌: ' + desc(T.give, gm) + '  ↔  받음: ' + desc(T.want, wm),
          send: () => this.tradeSend(sh.id, { item: T.give || '', money: gm }, { item: T.want || '', money: wm }) };
      })(),
      tin: (() => {
        const o = st.tradeIn; if (!o) return { title: '', get: '', give: '', yes: () => {}, no: () => {} };
        const desc = (p) => [p.item && PREM[p.item] ? PREM[p.item].name : '', p.money ? fmt(p.money) + '원' : ''].filter(Boolean).join(' + ') || '없음';
        return { title: o.name + '님의 거래 제안', get: desc(o.give), give: desc(o.want), yes: () => this.tradeAnswer(true), no: () => this.tradeAnswer(false) };
      })(),
      isMenu: !!sh && sh.type === 'menu',""")
# load + migrate the inventory
js = rep(js, "['money', 'owned', 'eq', 'myLike', 'share', 'energy', 'fireworks'].forEach",
         "['money', 'owned', 'eq', 'myLike', 'share', 'energy', 'fireworks', 'inv'].forEach")
js = rep(js, "      st.users = {}; st.log = [",
         "      st.inv = Array.isArray(st.inv) ? st.inv.filter((x) => PREM[x]).slice(0, INV_MAX) : [];\n      if (st.owned && st.owned.hair1 && st.inv.indexOf('hair1') < 0 && st.inv.length < INV_MAX) st.inv.push('hair1');\n      if (st.eq.hair && st.inv.indexOf(st.eq.hair) < 0) st.eq.hair = '';\n      if (PREM[st.eq.top] && st.inv.indexOf(st.eq.top) < 0) st.eq.top = 'hoodie';\n      st.users = {}; st.log = [")
