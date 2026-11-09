# exec'd for game.html after wardrobe/motion patches: avatar v2 renderer behind a feature flag, with legacy fallback
# --- template: legacy sprite only when not drawn by v2; v2 canvas otherwise ---
_old_clip = '''                <div style="position: absolute; left: 0; bottom: 0; width: 140px; height: {{a.clipH}}; overflow: hidden; transform: {{a.poseT}}; transform-origin: 70px 100%">
                  <img src="{{a.src}}" alt="{{a.alt}}" style="position: absolute; bottom: {{a.imgBottom}}; left: {{a.imgLeft}}; height: {{a.imgH}}; width: auto; max-width: none">
                </div>'''
xdc = rep(xdc, _old_clip, '''                <sc-if value="{{a.legacy}}" hint-placeholder-val="{{ true }}">
''' + _old_clip + '''
                </sc-if>
                <sc-if value="{{a.v2}}" hint-placeholder-val="{{ false }}">
                  <canvas class="yg-av" data-k="{{a.avKey}}" width="{{a.cvW}}" height="{{a.cvH}}" aria-label="{{a.alt}}" style="position: absolute; left: {{a.cvL}}; bottom: {{a.cvB}}; width: {{a.cvWc}}; height: {{a.cvHc}}; pointer-events: none"></canvas>
                </sc-if>''')
# wardrobe card: 6 slots + renderer status
xdc = rep(xdc, '''          <span style="font-size: 12px; color: #3d3a35">헤어 · <b>{{eqHair}}</b></span>''',
          '''          <span style="font-size: 12px; color: #3d3a35">헤어 · <b>{{eqHair}}</b></span>
          <span style="font-size: 12px; color: #3d3a35">아우터 · <b>{{eqOuter}}</b></span>
          <span style="font-size: 12px; color: #3d3a35">액세서리 · <b>{{eqAcc}}</b></span>
          <span style="font-size: 11px; color: #b5532f; line-height: 1.4">{{avStatus}}</span>''')
# profile: developer toggle
xdc = rep(xdc, '''      <div style="display: flex; flex-direction: column; gap: 6px">
        <label for="pnick"''', '''      <sc-if value="{{isDev}}"><div style="padding: 12px 14px; border-radius: 14px; background: #fff8ea; border: 1px dashed #e0b04a; display: flex; flex-direction: column; gap: 8px">
        <span style="font-size: 13px; font-weight: 700">개발자 시험 · 새 아바타 렌더러</span>
        <span style="font-size: 11px; color: #6b665c; line-height: 1.5">{{avHelp}}</span>
        <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px">
          <sc-for list="{{avModes}}" as="am" hint-placeholder-count="3">
            <button onClick="{{am.pick}}" aria-pressed="{{am.on}}" style="height: 36px; border-radius: 10px; border: 2px solid {{am.bc}}; background: {{am.bg}}; font-size: 12px; font-weight: 700; color: #2b2a26">{{am.label}}</button>
          </sc-for>
        </div>
      </div></sc-if>

      <div style="display: flex; flex-direction: column; gap: 6px">
        <label for="pnick"''')

# --- logic ---
js = rep(js, "      const ret = {\n        left: o.x + 'px', top: o.y + 'px',", "      const ret = {\n        legacy: true, v2: false,\n        left: o.x + 'px', top: o.y + 'px',")
js = rep(js, "      ret.hasTop = !!tf;", """      const avMode = YG.avMode();
      if (o.av && avMode !== 'off' && window.YGAvatar && YGAvatar.manifest && !o.sitting && !o.lying && !o.dancing) {
        const look = { body: o.av.b, equip: o.av.e || {}, dir: o.dir || 'front' };
        // 개발 시험용: ?avbody=female_pilot (이 기기 화면에서만, 저장·전송 안 함)
        const ovb = new URLSearchParams(location.search).get('avbody'); if (ovb && YGAvatar.manifest.bodies[ovb]) look.body = ovb;
        const chk = YGAvatar.canDraw(look, { bodyOnly: avMode === 'force' });
        if (chk.ok) {
          const S = CH / 960, dpr = Math.min(2, window.devicePixelRatio || 1) * (window.__ygScale || 1);
          ret.v2 = true; ret.legacy = false; ret.motion = ''; ret.avKey = o.key;
          ret.cvWc = (512 * S).toFixed(1) + 'px'; ret.cvHc = (1024 * S).toFixed(1) + 'px';
          ret.cvL = (70 - 256 * S).toFixed(1) + 'px'; ret.cvB = (-24 * S).toFixed(1) + 'px';
          ret.cvW = Math.round(512 * S * dpr); ret.cvH = Math.round(1024 * S * dpr);
          this.avLooks = this.avLooks || {};
          this.avLooks[o.key] = { look: look, S: S, walking: !!o.walking, me: !!o.me };
          o.hair = ''; o.top = '';
        } else if (avMode !== 'off') { this.avWhy = this.avWhy || {}; this.avWhy[o.key] = chk.why; }
      }
      ret.hasTop = !!tf;""")
# v2 replaces the old head/top overlays
js = rep(js, "      ret.hasTop = !!tf; ret.topSrc", "      if (ret.v2) { ret.hasHair = false; }\n      ret.hasTop = !!tf && !ret.v2; ret.topSrc")
js = rep(js, "ret.hasHair = !!hf;", "ret.hasHair = !!hf && !ret.v2;")
js = rep(js, "    const meA = actor({ key: 'me', ", "    const meA = actor({ key: 'me', av: { b: st.baseBody || (g === 'female' ? 'female_base' : 'male_base'), e: st.equipped || {} }, dancing: st.dancing, ")
js = rep(js, "      const a = actor({ key: 'u' + id, ", "      const a = actor({ key: 'u' + id, av: u.av, ")
# wardrobe values
js = rep(js, "      eqTop: PREM[st.eq.top] ? PREM[st.eq.top].name : nameOf(st.eq.top),",
         """      eqTop: nameOf((st.equipped || {}).top || st.eq.top),
      eqOuter: (st.equipped || {}).outer && PREM[st.equipped.outer] ? PREM[st.equipped.outer].name : '없음',
      eqAcc: (st.equipped || {}).accessory || '없음',
      avStatus: (() => { const mode = YG.avMode(); if (mode === 'off') return ''; const why = (this.avWhy || {}).me; return mode === 'force' ? '새 아바타(강제): 그림 없는 칸은 비워서 표시' : (why ? '새 아바타 켬 · 지금은 기존 그림으로 표시 (' + why + ')' : '새 아바타로 표시 중'); })(),""")
# developer toggle data
js = rep(js, "      isMe: st.tab === 'me',", """      isDev: YG.isDev(),
      avHelp: '끔: 기존 그림 / 켬: 몸·옷 그림이 모두 있는 방향만 새 렌더러, 없으면 기존 그림 / 강제: 그림 없는 옷 칸은 비우고 새 바디로(속옷 상태). 다른 사람에게는 각자 설정대로 보여요. 지금 상태: ' + ({ off: '끔', on: '켬', force: '강제' })[YG.avMode()],
      avModes: [['off', '끔'], ['on', '켬'], ['force', '강제']].map((m) => ({ key: m[0], label: m[1], on: YG.avMode() === m[0] ? 'true' : 'false', bc: YG.avMode() === m[0] ? accent : '#e4ddce', bg: YG.avMode() === m[0] ? '#e6f3f0' : '#ffffff', pick: () => { YG.setAvMode(m[0]); this.avWhy = {}; this.forceUpdate(); } })),
      isMe: st.tab === 'me',""")
# equip guard: every eq change goes through ownership check and keeps equipped in sync
js = rep(js, "\n  renderVals() {", r"""
  setState(p) {
    if (p && typeof p === 'object' && p.eq) p = this.withEquip(p);
    return super.setState(p);
  }

  withEquip(p) {
    const st = this.state || {};
    const owned = p.owned || st.owned || {}, inv = p.inv || st.inv || [];
    const eq = Object.assign({}, p.eq), prev = st.eq || {};
    let blocked = '';
    ['hair', 'top', 'bottom', 'shoes'].forEach((s) => {
      if (eq[s] && !YGAvatar.owns(eq[s], owned, inv)) { blocked = eq[s]; eq[s] = YGAvatar.owns(prev[s], owned, inv) ? prev[s] : ({ top: 'hoodie', bottom: 'jeans', shoes: 'sneakers' })[s] || ''; }
    });
    if (blocked && this.flash) setTimeout(() => this.flash('보유하지 않은 아이템은 장착할 수 없어요', true), 0);
    const a = YGAvatar.migrateProfile({ gender: p.gender || st.gender, eq: eq });
    a.equipped.accessory = (st.equipped || {}).accessory || '';
    return Object.assign({}, p, { eq: eq, equipped: YGAvatar.sanitize(a.equipped, owned, inv).equipped, baseBody: (p.gender || st.gender) === 'female' ? 'female_base' : 'male_base' });
  }

  // per-frame drawing of v2 avatars (same animator state for every layer of a character)
  avPaint(dt) {
    if (!window.YGAvatar || !YGAvatar.manifest || YG.avMode() === 'off') return;
    const cvs = document.querySelectorAll('canvas.yg-av');
    if (!cvs.length) return;
    this.avAnim = this.avAnim || {};
    const now = performance.now();
    cvs.forEach((cv) => {
      const key = cv.getAttribute('data-k'); const rec = (this.avLooks || {})[key]; if (!rec) return;
      const an = this.avAnim[key] || (this.avAnim[key] = { a: new YGAvatar.Animator(), x: null, y: null });
      let x, y, moving;
      if (rec.me && this.mv) { x = this.mv.x; y = this.mv.y; moving = !!this.state.walking; }
      else { const id = key.slice(1); const p = this.remotePos ? this.remotePos(id, now) : null; const u = (this.state.users || {})[id]; if (!p || !u) return; x = p.x; y = p.y; moving = !!u.w; }
      const moved = an.x === null ? 0 : Math.hypot(x - an.x, y - an.y); an.x = x; an.y = y;
      const a = an.a.update(dt, moved, rec.S, moving || moved > 0.05, rec.look.dir, YGAvatar.animOpt(rec.look));
      const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      YGAvatar.draw(ctx, rec.look, a, { scale: cv.width / 512 });
    });
  }

  renderVals() {""")
js = rep(js, "      try { this.motionTick(dt, t); } catch (e) { console.error(e); }", "      try { this.motionTick(dt, t); } catch (e) { console.error(e); }\n      try { this.avPaint(dt); } catch (e) { console.error(e); }")
# load manifest when the flag is on; sanitize stored equipment against ownership on load
js = rep(js, "    this.netBoot();\n", "    this.netBoot();\n    if (window.YGAvatar && YG.avMode() !== 'off') YGAvatar.load().then(() => this.forceUpdate());\n")
js = rep(js, "st.baseBody = _av.baseBody; st.equipped = _av.equipped; }", "st.baseBody = _av.baseBody; st.equipped = YGAvatar.sanitize(_av.equipped, st.owned, st.inv).equipped; }")
