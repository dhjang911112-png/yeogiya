# exec'd from build_site.py (game page) before the template is converted
import re as _re
# drop the old setInterval walkers (replaced by motion_methods.js)
for _name in ['walkTo', 'walkLoop', 'press', 'lift', 'step']:
    js, _n = _re.subn(r'\n  ' + _name + r'\([^)]*\) \{\n.*?\n  \}\n', '\n', js, count=1, flags=_re.S)
    assert _n == 1, _name
js = rep(js, "    if (this.iv) { clearInterval(this.iv); this.iv = null; }\n    if (this.to) { clearTimeout(this.to); this.to = null; }\n  }",
         "    if (this.iv) { clearInterval(this.iv); this.iv = null; }\n    if (this.to) { clearTimeout(this.to); this.to = null; }\n    this.motionStop();\n  }")
js = rep(js, "    this.netBoot();\n  }", "    this.netBoot();\n    this.motionInit();\n  }")
js = rep(js, "\n  renderVals() {", "\n" + open(B + '/site_src/motion_methods.js').read() + "\n  renderVals() {")
js = rep(js, "    const cam = this.camFor(st, st.pan.x, st.pan.y);",
         "    const cam = this.camFor(this.mv && this.mv.area === st.area ? Object.assign({}, st, { px: this.mv.cx, py: this.mv.cy }) : st, st.pan.x, st.pan.y);")
js = rep(js, "      camTr: st.dragging ? 'none' : 'transform 0.16s linear',", "      camTr: 'none',")
xdc = rep(xdc, '<div style="position: absolute; left: 0; top: 0; width: {{worldW}}; height: {{worldH}}; transform-origin: 0 0; transform: {{camT}}; transition: {{camTr}}">',
          '<div id="yg-world" style="position: absolute; left: 0; top: 0; width: {{worldW}}; height: {{worldH}}; transform-origin: 0 0; transform: {{camT}}; transition: {{camTr}}; will-change: transform">')
xdc = rep(xdc, '<div style="position: absolute; left: {{a.left}}; top: {{a.top}}; width: 0; height: 0; z-index: {{a.zz}}; transition: {{a.tr}}">',
          '<div id="{{a.domId}}" style="position: absolute; left: {{a.left}}; top: {{a.top}}; width: 0; height: 0; z-index: {{a.zz}}; transition: {{a.tr}}">')
js = rep(js, "key: o.key, tr: o.tr || 'left 0.14s linear, top 0.14s linear',", "key: o.key, domId: o.domId || null, tr: o.tr || 'left 0.14s linear, top 0.14s linear',")
js = rep(js, "    const meA = actor({ key: 'me', ", "    const meA = actor({ key: 'me', domId: 'yg-me', tr: 'none', ")
js = rep(js, "dir: st.facing, x: st.px, y: st.py, fr: myFr,", "dir: st.facing, x: this.mv ? this.mv.x : st.px, y: this.mv ? this.mv.y : st.py, fr: myFr,")
js = rep(js, "      const a = actor({ key: 'u' + id, hair: u.g === 'male' ? u.hair : '', top: u.top, g: u.g, dir: u.f, tr: 'left 0.3s linear, top 0.3s linear', walking: u.w, x: u.x, y: u.y, fr: u.w ? wk[st.tick % wk.length] : FR[u.g][u.f].stand,",
         "      const rp = (this.remotePos && this.remotePos(id)) || { x: u.x, y: u.y };\n      const a = actor({ key: 'u' + id, domId: 'yg-u-' + id, hair: u.g === 'male' ? u.hair : '', top: u.top, g: u.g, dir: u.f, tr: 'none', walking: u.w, x: rp.x, y: rp.y, fr: u.w ? wk[Math.floor(performance.now() / 117) % wk.length] : FR[u.g][u.f].stand,")
js = rep(js, "      const a = actor({ key: 'n' + d.id, x: n.x,", "      const a = actor({ key: 'n' + d.id, tr: 'left 0.26s linear, top 0.26s linear', x: n.x,")

# ---- sprite normalisation: keep head size and head centre identical across walk frames ----
# (the source walk frames were drawn at slightly different scales/offsets, which made the
#  character "pop" in size and wobble sideways every frame)
_HB = json.load(open(B + '/headboxes.json'))
_m = _re.search(r'const FR = (\{.*?\});\n', js)
_FR = json.loads(_m.group(1))
_FIX = {}
for _g in _FR:
    for _d in _FR[_g]:
        _sd = _FR[_g][_d]['stand']; _sb = _HB[_sd['s'].split('/')[-1].split('.')[0]]
        _su = _sd['h'] / _sb['H']; _shead = (_sb['x1'] - _sb['x0']) * _su; _sdx = (_sb['x0'] + _sb['x1']) / 2 * _su - _sd['c']
        for _q in _FR[_g][_d]['walk']:
            _b = _HB[_q['s'].split('/')[-1].split('.')[0]]
            _u = _q['h'] / _b['H']; _head = (_b['x1'] - _b['x0']) * _u
            _k = max(0.97, min(1.03, _shead / _head))
            _q['h'] = round(_q['h'] * _k, 1); _u = _q['h'] / _b['H']
            _q['c'] = round((_b['x0'] + _b['x1']) / 2 * _u - _sdx, 1)
js = js[:_m.start(1)] + json.dumps(_FR, ensure_ascii=False) + js[_m.end(1):]

# ---- avatar v2 data: baseBody + 6 equip slots kept in sync with the legacy eq (render stays legacy until art arrives) ----
js = rep(js, "      st.users = {}; st.log = [",
         "      { const _av = YGAvatar.migrateProfile({ gender: st.gender, baseBody: sv.baseBody, equipped: sv.equipped, eq: st.eq }); st.baseBody = _av.baseBody; st.equipped = _av.equipped; }\n      st.users = {}; st.log = [")
