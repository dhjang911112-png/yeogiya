import re, os, json, shutil, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from dc2preact import convert

B = os.path.dirname(os.path.abspath(__file__))
PROJ = B + '/yeogiya/project/'
ASSET_SRC = B + '/artifact-files/930716c2-de15-4c30-a489-93ffdc37b757/'
OUT = B + '/site/'
os.makedirs(OUT + 'assets', exist_ok=True)
os.makedirs(OUT + 'lib', exist_ok=True)

ext = {}
for f in os.listdir(ASSET_SRC):
    i, e = f.split('.')
    ext[i] = e
    if not os.path.exists(OUT + 'assets/' + f):
        shutil.copy(ASSET_SRC + f, OUT + 'assets/' + f)
NM = B + '/npmw/node_modules/'
shutil.copy(NM + 'preact/dist/preact.min.umd.js', OUT + 'lib/preact.min.js')
shutil.copy(NM + 'mqtt/dist/mqtt.min.js', OUT + 'lib/mqtt.min.js')
shutil.copy(B + '/site_src/runtime.js', OUT + 'lib/runtime.js')
shutil.copy(B + '/site_src/account.js', OUT + 'lib/account.js')
shutil.copy(B + '/site_src/fx.js', OUT + 'lib/fx.js')
shutil.copy(B + '/site_src/avatar.js', OUT + 'lib/avatar.js')
import subprocess
subprocess.run([sys.executable, B + '/gen_manifest.py', B + '/art/avatar', OUT + 'assets/avatar'], check=True)
for _g in ['male', 'female']:
    _h = Image.open(OUT + 'assets/avatar/base/%s_base/front/head.png' % _g)
    _h.resize((160, round(160 * _h.size[1] / _h.size[0])), Image.LANCZOS).save(OUT + 'assets/avatar/base/%s_base/portrait.png' % _g, optimize=True)
shutil.copy(B + '/site_src/avatar-lab.html', OUT + 'avatar-lab.html')
for f in ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js']:
    shutil.copy(NM + 'firebase/' + f, OUT + 'lib/' + f)
if not os.path.exists(OUT + 'lib/firebase-config.js'):
    open(OUT + 'lib/firebase-config.js', 'w').write('window.YG_FIREBASE = null; // 여기에 firebaseConfig\n')


def blob(s):
    return re.sub(r'/_blob/([0-9a-f]{32})', lambda m: 'assets/' + m.group(1) + '.' + ext[m.group(1)], s)


def fullscreen(x):
    x = x.replace('<div style="width: 390px; height: 844px; box-sizing: border-box;', '<div style="width: var(--yg-w); height: var(--yg-h); box-sizing: border-box;')
    x = x.replace('height: 668px;', 'height: calc(var(--yg-h) - 176px);')
    x = x.replace('left: 0; top: 0; width: 390px; height: 780px;', 'left: 0; top: 0; width: 100%; height: calc(var(--yg-h) - 64px);')
    x = x.replace('left: 0; top: 0; width: 390px; height: 844px;', 'left: 0; top: 0; width: 100%; height: 100%;')
    return x


def split(path):
    s = open(path).read()
    xdc = re.search(r'<x-dc>.*</x-dc>', s, re.S).group(0)
    js = re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>', s, re.S).group(1)
    xdc = fullscreen(xdc)
    js = js.replace('VW = 390, VH = 668;', 'VW = (window.__ygW || 390), VH = (window.__ygH || 844) - 176;')
    return xdc, js


def rep(s, a, b, n=1):
    c = s.count(a)
    assert c == n, (c, a[:80])
    return s.replace(a, b)


MOUNT_NOW = "fitFrame(document.getElementById('yg-frame'));\nmountDC(Component, document.getElementById('yg-root'));"


def page(title, head, tpl_fn, cls, extra_body='', extra_head='', boot='', mount=MOUNT_NOW):
    return f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#fbf7ef">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="여기야">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="assets/icon-192.png">
<link rel="icon" href="assets/icon-192.png">
<title>{title}</title>
<meta property="og:title" content="여기야 — 지금 여기 있는 사람들과 만나요">
<meta property="og:description" content="부산·대구·대전·서울 거리를 걸으며 실시간으로 만나는 캐릭터 채팅 게임">
<meta property="og:image" content="assets/470f35cce6d7dfd1142963840e013c18.png">
{head}
<style>
html,body{{margin:0;height:100%;overflow:hidden;background:#fbf7ef;-webkit-tap-highlight-color:transparent;overscroll-behavior:none}}
#yg-frame{{position:fixed;left:0;top:0;width:390px;height:844px;transform-origin:0 0;overflow:hidden;background:#fbf7ef}}
html{{--yg-w:390px;--yg-h:844px}}
#yg-online{{position:absolute;left:10px;bottom:90px;white-space:nowrap;z-index:1900;pointer-events:none;font:700 11px 'Noto Sans KR',sans-serif;padding:4px 9px;border-radius:999px;color:#fff;background:rgba(43,42,38,.72)}}
#yg-online.on::before{{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:#5fe08a;margin-right:5px;vertical-align:1px}}
#yg-online.off::before{{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:#e0a21b;margin-right:5px;vertical-align:1px}}
@keyframes yg-pop{{0%{{transform:translateX(-50%) scale(.6);opacity:0}}100%{{transform:translateX(-50%) scale(1);opacity:1}}}}
.yg-pop{{animation:yg-pop .18s ease-out}}
#yg-ban{{position:absolute;inset:0;z-index:100000;display:none;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(20,18,16,.92);color:#fff;font-family:'Noto Sans KR',sans-serif;text-align:center;padding:24px;box-sizing:border-box}}
</style>
{extra_head}
</head>
<body>
<div id="yg-frame"><div id="yg-root"></div>{extra_body}</div>
<script src="lib/preact.min.js"></script>
<script src="lib/mqtt.min.js"></script>
<script src="lib/runtime.js"></script>
<script src="lib/firebase-app-compat.js"></script>
<script src="lib/firebase-auth-compat.js"></script>
<script src="lib/firebase-firestore-compat.js"></script>
<script src="lib/firebase-config.js"></script>
<script src="lib/account.js"></script>
<script src="lib/fx.js"></script>
<script src="lib/avatar.js"></script>
<script>
{tpl_fn}
{cls}
{mount}
{boot}
</script>
</body>
</html>
'''


# ---------------- Main (character select) ----------------
xdc, js = split(PROJ + 'Main.dc.html')
xdc = rep(xdc, '<a href="Game.dc.html" ', '<a href="game.html" onClick="{{start}}" ')
js = rep(js, "      pickMale: () => this.setState({ gender: 'male' }),",
         """      start: (e) => {
        const el = document.getElementById('nick'); const nick = ((el && el.value) || '').trim().slice(0, 10);
        if (window.YGA && YGA.on) {
          if (e && e.preventDefault) e.preventDefault();
          if (!YGA.user) { if (window.ygShowAuth) window.ygShowAuth(); return; }
          YG.save('me', { gender: this.state.gender, nick: YGA.data.nick });
          YGA.save({ gender: this.state.gender }, true).then(() => { location.href = 'game.html'; });
          return;
        }
        YG.save('me', { gender: this.state.gender, nick: nick });
      },
      pickMale: () => this.setState({ gender: 'male' }),""")
exec(open(B + '/avatar_main_patch.py').read())
head, fn = convert(blob(xdc))
boot_main = '''(function(){ const me = YG.load('me', null); const s = YG.load('state', null);
  const nick = (me && me.nick) || (s && s.prof && s.prof.nick) || '';
  const el = document.getElementById('nick'); if (el && nick) el.value = nick;
  if (me && me.gender) window.__dc.setState({ gender: me.gender }); })();
(function () {
  const AV = window.YGAvatar; if (!AV) return;
  const an = new AV.Animator(); let last = performance.now(); let demo = false;
  document.addEventListener('click', (e) => { if (e.target && e.target.id === 'yg-av-prev') demo = !demo; });
  AV.load().then(() => {
    const loop = (t) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const el = document.getElementById('yg-av-prev'); if (!el) return;
      const S = el.height / 1040;
      const a = an.update(dt, demo ? 128 * dt * 0.6 : 0, S * 0.5, demo, 'front');
      const g = (window.__dc && window.__dc.state.gender) === 'female' ? 'female_base' : 'male_base';
      const c = el.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, el.width, el.height);
      c.translate(el.width / 2 - 256 * S, el.height - 1000 * S - 8);
      AV.draw(c, { body: g, dir: 'front', equip: {} }, a, { scale: S });
    };
    requestAnimationFrame(loop);
  });
})();'''
open(OUT + 'index.html', 'w').write(page('여기야', head, fn, blob(js), boot=boot_main + '\n' + open(B + '/site_src/auth_ui.js').read(), extra_body=open(B + '/site_src/auth_ui.html').read()))

# ---------------- Game ----------------
xdc, js = split(PROJ + 'Game.dc.html')
xdc = rep(xdc, 'z-index: {{a.zz}}; transition: left 0.14s linear, top 0.14s linear">', 'z-index: {{a.zz}}; transition: {{a.tr}}">')
GP = 'padding: 12px; border-radius: 14px; background: #2a2440; color: #ffffff; display: flex; flex-direction: column; gap: 10px">'
xdc = rep(xdc, GP, GP + '''
              <div style="display: flex; gap: 4px; overflow-x: auto; overflow-y: hidden; flex-shrink: 0; padding: 44px 2px 2px">
                <sc-for list="{{seatFaces}}" as="sf" hint-placeholder-count="3">
                  <span style="position: relative; flex-shrink: 0; width: 76px; display: flex; flex-direction: column; align-items: center; gap: 3px">
                    <sc-if value="{{sf.hasBubble}}" hint-placeholder-val="{{ false }}">
                      <span class="yg-pop" style="position: absolute; left: 50%; bottom: 70px; transform: translateX(-50%); z-index: 3; width: max-content; max-width: 84px; padding: 4px 7px; border-radius: 10px; background: #ffffff; color: #2b2a26; font-size: 11px; line-height: 1.3; font-weight: 700; text-align: center; word-break: keep-all; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.3)">{{sf.bubble}}</span>
                    </sc-if>
                    <span style="position: relative; width: 50px; height: 50px; border-radius: 50%; overflow: hidden; background: {{sf.bg}}; border: 2px solid {{sf.ring}}; box-sizing: border-box">
                      <img src="{{sf.src}}" alt="{{sf.alt}}" style="position: absolute; left: 50%; top: 1px; width: 56px; margin-left: -28px; max-width: none">
                    </span>
                    <span style="max-width: 76px; font-size: 10px; font-weight: 700; color: {{sf.fg}}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{sf.name}}</span>
                  </span>
                </sc-for>
              </div>''')
xdc = rep(xdc, '<div style="height: 260px; overflow-y: auto; padding: 10px;', '<div class="yg-autoscroll" style="height: 260px; overflow-y: auto; padding: 10px;')
xdc = rep(xdc, '<div style="flex: 1; min-height: 0; overflow-y: auto; padding: 8px; border-radius: 14px; background: #ffffff; border: 1px solid #ece5d6; display: flex; flex-direction: column; gap: 6px">\n              <sc-for list="{{room.msgs}}"', '<div class="yg-autoscroll" style="flex: 1; min-height: 0; overflow-y: auto; padding: 8px; border-radius: 14px; background: #ffffff; border: 1px solid #ece5d6; display: flex; flex-direction: column; gap: 6px">\n              <sc-for list="{{room.msgs}}"')

net = open(B + '/site_src/net_methods.js').read()
# replace the table/game/room block with the networked versions
js, n = re.subn(r'\n  tableData\(t\) \{.*?\n(?=  cityOrder\(\) \{)', '\n', js, flags=re.S)
assert n == 1
js, n = re.subn(r'\n  say\(text\) \{.*?\n  \}\n', '\n', js, flags=re.S)
assert n == 1
js = rep(js, '\n  renderVals() {', '\n' + net + '\n  renderVals() {')

# constructor: load saved progress + profile from the start screen, drop demo users
js = rep(js, "    this.iv = null; this.to = null; this.pressed = false; this.usedPointer = false; this.regen = null;",
         """    (function (st, self) {
      const ac = YG.acct;
      const me = ac ? { gender: ac.gender, nick: ac.nick } : (YG.load('me', {}) || {});
      const sv = ac ? Object.assign({}, ac, { prof: Object.assign({}, ac.prof || {}, { nick: ac.nick }) }) : (YG.load('state', {}) || {});
      ['money', 'owned', 'eq', 'myLike', 'share', 'energy', 'fireworks'].forEach((k) => { if (sv[k] !== undefined) st[k] = sv[k]; });
      if (sv.prof) st.prof = Object.assign({}, st.prof, sv.prof, { pub: Object.assign({}, st.prof.pub, sv.prof.pub || {}) });
      st.gender = me.gender || sv.gender || st.gender;
      st.prof.nick = (me.nick || (sv.prof && sv.prof.nick) || '').trim() || ('손님' + YG.id.slice(-4));
      if (sv.area && sv.area !== 'bar' && sv.area !== 'club' && self.areaData(sv.area)) { st.area = sv.area; st.px = sv.px; st.py = sv.py; } else { st.px += Math.round(Math.random() * 160 - 80); st.py += Math.round(Math.random() * 60 - 30); }
      st.users = {}; st.log = [{ who: '여기야', text: '같은 동네에 있는 진짜 사람들이 실시간으로 보여요' }];
    })(this.state, this);
    this.peers = {}; this.pws = {}; this.games = {}; this.rel = {}; this.likedBy = {}; this.reportedBy = {};
    this.iv = null; this.to = null; this.pressed = false; this.usedPointer = false; this.regen = null;""")
js = rep(js, "    this.npcIv = setInterval(() => this.npcStep(), 260);\n  }", "    this.npcIv = setInterval(() => this.npcStep(), 260);\n    this.netBoot();\n  }")

# actors: keys, transitions, remote walking/dancing, filter bars/clubs + seated people
js = rep(js, "        left: o.x + 'px', top: o.y + 'px', z: Math.round(o.y), zz: Math.round(o.y) + 10,",
         "        left: o.x + 'px', top: o.y + 'px', z: Math.round(o.y), zz: Math.round(o.y) + 10, key: o.key, tr: o.tr || 'left 0.14s linear, top 0.14s linear',")
js = rep(js, "    const actors = Object.keys(U).filter((id) => !U[id].banned && U[id].area === st.area).map((id) => {\n      const u = U[id];\n      const a = actor({ x: u.x, y: u.y, fr: FR[u.g][u.f].stand, name: u.name, pin: u.pin, bubble: u.bubble });",
         "    const actors = Object.keys(U).filter((id) => !U[id].banned && U[id].area === st.area && (U[id].barOf || '') === this.myBarOf() && !U[id].seat).map((id) => {\n      const u = U[id];\n      const wk = FR[u.g][u.f].walk;\n      const a = actor({ key: 'u' + id, tr: 'left 0.3s linear, top 0.3s linear', walking: u.w, x: u.x, y: u.y, fr: u.w ? wk[st.tick % wk.length] : FR[u.g][u.f].stand, name: u.name, pin: u.pin, bubble: u.bubble });\n      if (u.dance && !u.w) a.motion = 'yg-dance';")
js = rep(js, "    const meA = actor({ x: st.px,", "    const meA = actor({ key: 'me', x: st.px,")
js = rep(js, "        const a = actor({ x: q[0], y: q[1],", "        const a = actor({ key: 'c' + qi, x: q[0], y: q[1],")
js = rep(js, "      const a = actor({ x: n.x, y: n.y, fr: fr, name: d.name,", "      const a = actor({ key: 'n' + d.id, x: n.x, y: n.y, fr: fr, name: d.name,")

# area list shows how many real people are there
js = rep(js, "friendCount: Object.keys(U).filter((id) => U[id].friend).length,", "friendCount: Object.keys(this.rel || {}).filter((id) => this.rel[id].friend).length,")
# ---- shop: fireworks (consumable) ----
js = rep(js, "      { id: 'runners', cat: 'shoes', name: '운동화', price: 5500, pos: '100% 33.333%' }\n", "      { id: 'runners', cat: 'shoes', name: '운동화', price: 5500, pos: '100% 33.333%' },\n      { id: 'firework', cat: 'item', name: '폭죽', price: 1000, pos: 'center', img: 'assets/fx/rocket.png' }\n")
js = rep(js, "const catDefs = [['all', '전체'], ['top', '상의'], ['bottom', '하의'], ['shoes', '신발']];", "const catDefs = [['all', '전체'], ['top', '상의'], ['bottom', '하의'], ['shoes', '신발'], ['item', '아이템']];")
js = rep(js, "    const shown = items.filter((i) => st.cat === 'all' || i.cat === st.cat).map((i) => {\n",
         "    const shown = items.filter((i) => st.cat === 'all' || i.cat === st.cat).map((i) => {\n      if (i.cat === 'item') { const have = st.fireworks || 0; const afford = st.money >= i.price; return { name: i.name + ' (보유 ' + have + '개)', pos: 'center', bi: 'url(' + i.img + ')', bs: 'contain', priceText: fmt(i.price) + '원 · 채팅창에 /폭죽', btn: '구매', btnBg: afford ? accent : '#d8d2c6', btnFg: '#ffffff', disabled: false, border: '#ece5d6', act: () => { const s2 = this.state; if (s2.money < i.price) { this.flash('머니가 부족해요. 알바로 벌어오세요!', true); return; } this.setState({ money: s2.money - i.price, fireworks: (s2.fireworks || 0) + 1 }); this.flash('폭죽 1개 구매! 해운대·광안리에서 채팅창에 /폭죽', false); this.saveLocal(true); } }; }\n")
xdc = rep(xdc, '<span class="T" style="display: block; width: 64px; height: 64px; background-position: {{it.pos}}"></span>', '<span class="T" style="display: block; width: 64px; height: 64px; background-position: {{it.pos}}; background-image: {{it.bi}}; background-size: {{it.bs}}"></span>')

# ---- profile: friends list with online status + 1:1 chat ----
xdc = rep(xdc, '      <div style="display: flex; flex-direction: column; gap: 6px">\n        <label for="pnick"', '''      <div style="padding: 12px 14px; border-radius: 14px; background: #ffffff; border: 1px solid #ece5d6; display: flex; flex-direction: column; gap: 6px">
        <span style="font-size: 13px; font-weight: 700">친구 목록 · 접속 중 {{friendOn}}명</span>
        <sc-if value="{{noFriends}}" hint-placeholder-val="{{ false }}">
          <span style="font-size: 12px; color: #8a857a; line-height: 1.5">아직 친구가 없어요. 거리에서 다른 사람을 눌러 친구 추가해 보세요</span>
        </sc-if>
        <sc-for list="{{friends}}" as="fr" hint-placeholder-count="0">
          <div style="display: flex; align-items: center; gap: 10px; min-height: 50px">
            <span style="position: relative; width: 42px; height: 42px; flex-shrink: 0; border-radius: 50%; overflow: hidden; background: #efe9dd; opacity: {{fr.op}}"><img src="{{fr.face}}" alt="" style="position: absolute; left: 50%; top: 1px; width: 48px; margin-left: -24px; max-width: none"></span>
            <span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
              <span style="font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{fr.name}}</span>
              <span style="display: flex; align-items: center; gap: 5px; font-size: 11px; color: {{fr.stFg}}"><span style="width: 8px; height: 8px; border-radius: 50%; background: {{fr.dot}}; flex-shrink: 0"></span>{{fr.status}}</span>
            </span>
            <button onClick="{{fr.dm}}" disabled="{{fr.off}}" style="height: 36px; padding: 0 12px; border-radius: 10px; border: none; background: {{fr.btnBg}}; color: #ffffff; font-size: 12px; font-weight: 700; flex-shrink: 0">1:1 대화</button>
          </div>
        </sc-for>
      </div>

      <div style="display: flex; flex-direction: column; gap: 6px">
        <label for="pnick"''')
js = rep(js, "      isMe: st.tab === 'me',", "      ...(() => { const out = []; Object.keys(this.rel || {}).forEach((id) => { const r = this.rel[id]; if (!r.friend) return; const p = this.peers[id]; const on = !!p; let where = ''; if (p) { if (p.area === 'bar' || p.area === 'club') { const b = this.areaData(p.barOf); where = (b ? b.name + ' ' : '') + (p.area === 'club' ? '클럽' : '술집'); } else { const a = p.area && this._A && this._A[p.area]; where = a ? this.cityOrder()[a.city].name + ' ' + a.name : '이동 중'; } } const g = (p && p.g === 'female') || (!p && r.g === 'female') ? 'female' : 'male'; out.push({ key: 'f' + id, on: on, name: (p && YG.clip(p.name, 12)) || r.name || '친구', face: FR[g].front.stand.s, status: on ? '접속 중 · ' + where : '오프라인', dot: on ? '#3cc36b' : '#c9c3b6', stFg: on ? '#23756b' : '#8a857a', op: on ? 1 : 0.5, off: !on, btnBg: on ? accent : '#d8d2c6', dm: () => { if (!this.peers[id]) { this.flash('오프라인인 친구에게는 대화를 걸 수 없어요', true); return; } this.setState({ sheet: { type: 'dm', id: id }, dmText: '' }); } }); }); out.sort((a, b) => (b.on - a.on) || (a.name < b.name ? -1 : 1)); return { friends: out, noFriends: out.length === 0, friendOn: out.filter((f) => f.on).length }; })(),\n      isMe: st.tab === 'me',")
# ---- hairstyles: head overlay on the body sprite ----
HB = json.load(open(B + '/headboxes.json'))
HH = {'front': 0.9792, 'left': 1.0157, 'right': 1.0019, 'back': 0.9923}
HAIRJS = 'const HB = ' + json.dumps(HB) + ';\n    const HAIRS = { hair1: { name: "웨이브 헤어", ar: ' + json.dumps(HH) + ' } };\n    const hairFit = (fr, dir, hairId, k, imgL, s0) => { const hd = HAIRS[hairId]; if (!hd || !fr) return null; const id = (String(fr.s).match(/[0-9a-f]{32}/) || [])[0]; const hb = HB[id]; if (!hb) return null; const s = s0 || (fr.h * k / hb.H); const w = (hb.x1 - hb.x0) * 1.08 * s; const hh = w * hd.ar[dir]; const cx = imgL + (hb.x0 + hb.x1) / 2 * s; const bot = (hb.neck + (hb.neck - hb.y0) * 0.06) * s; return { src: "assets/hair/" + hairId + "_" + dir + ".png", l: (cx - w / 2).toFixed(1) + "px", t: (bot - hh).toFixed(1) + "px", w: w.toFixed(1) + "px" }; };\n'
js = rep(js, "    const actor = (o) => {\n      const k = CH / 1130;\n      return {", "    " + HAIRJS + "    const actor = (o) => {\n      const k = CH / 1130;\n      const ret = {")
js = rep(js, "        star: false, sparkle: false, clickable: false, open: () => {}, menuLabel: ''\n      };\n    };",
         "        star: false, sparkle: false, clickable: false, open: () => {}, menuLabel: ''\n      };\n      const hf = o.hair ? hairFit(o.fr, o.dir || 'front', o.hair, k, 70 - o.fr.c * k) : null;\n      ret.hasHair = !!hf; ret.hairSrc = hf ? hf.src : ''; ret.hairL = hf ? hf.l : '0px'; ret.hairT = hf ? hf.t : '0px'; ret.hairW = hf ? hf.w : '0px';\n      return ret;\n    };")
xdc = rep(xdc, """                  <img src="{{a.src}}" alt="{{a.alt}}" style="position: absolute; bottom: {{a.imgBottom}}; left: {{a.imgLeft}}; height: {{a.imgH}}; width: auto; max-width: none">
                </div>""", """                  <img src="{{a.src}}" alt="{{a.alt}}" style="position: absolute; bottom: {{a.imgBottom}}; left: {{a.imgLeft}}; height: {{a.imgH}}; width: auto; max-width: none">
                </div>
                <sc-if value="{{a.hasHair}}" hint-placeholder-val="{{ false }}">
                  <img src="{{a.hairSrc}}" alt="" style="position: absolute; left: {{a.hairL}}; top: {{a.hairT}}; width: {{a.hairW}}; height: auto; max-width: none; pointer-events: none">
                </sc-if>""")
# me + remote get hair
js = rep(js, "    const meA = actor({ key: 'me', x: st.px,", "    const meA = actor({ key: 'me', hair: g === 'male' ? (st.eq.hair || '') : '', dir: st.facing, x: st.px,")
js = rep(js, "      const a = actor({ key: 'u' + id, tr: 'left 0.3s linear, top 0.3s linear',", "      const a = actor({ key: 'u' + id, hair: u.g === 'male' ? u.hair : '', dir: u.f, tr: 'left 0.3s linear, top 0.3s linear',")
# shop preview
xdc = rep(xdc, """          <img src="{{shopSrc}}" alt="내 캐릭터" style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); height: 165px; width: auto">""",
"""          <img src="{{shopSrc}}" alt="내 캐릭터" style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); height: 165px; width: auto">
          <sc-if value="{{shopHair.on}}" hint-placeholder-val="{{ false }}">
            <img src="{{shopHair.src}}" alt="" style="position: absolute; left: {{shopHair.l}}; top: {{shopHair.t}}; width: {{shopHair.w}}; height: auto; max-width: none">
          </sc-if>""")
js = rep(js, "      shopSrc: FR[g].front.stand.s,", "      shopSrc: FR[g].front.stand.s,\n      shopHair: (() => { const fr0 = FR[g].front.stand; const id = (String(fr0.s).match(/[0-9a-f]{32}/) || [])[0]; const hb = HB[id]; if (g !== 'male' || !st.eq.hair || !hb) return { on: false }; const s = 165 / hb.H; const hf = hairFit(fr0, 'front', st.eq.hair, 0, 55 - hb.W * s / 2, s); if (!hf) return { on: false }; return { on: true, src: hf.src, l: hf.l, t: (parseFloat(hf.t) + 5).toFixed(1) + 'px', w: hf.w }; })(),")
js = rep(js, "      eqTop: nameOf(st.eq.top),", "      eqHair: st.eq.hair && HAIRS[st.eq.hair] ? HAIRS[st.eq.hair].name : '기본',\n      eqTop: nameOf(st.eq.top),")
xdc = rep(xdc, """          <span style="font-size: 12px; color: #3d3a35">상의 · <b>{{eqTop}}</b></span>""", """          <span style="font-size: 12px; color: #3d3a35">헤어 · <b>{{eqHair}}</b></span>
          <span style="font-size: 12px; color: #3d3a35">상의 · <b>{{eqTop}}</b></span>""")
xdc = rep(xdc, """          <span style="font-size: 11px; color: #4d5a55; line-height: 1.5">[착용 모습은 옷별 캐릭터 그림이 들어오면 반영]</span>\n""", "")
# shop item: hairstyle
js = rep(js, "      { id: 'firework', cat: 'item',", "      { id: 'hair1', cat: 'hair', name: '웨이브 헤어', price: 120000, img: 'assets/hair/hair1_front.png' },\n      { id: 'firework', cat: 'item',")
js = rep(js, "['shoes', '신발'], ['item', '아이템']];", "['shoes', '신발'], ['hair', '헤어'], ['item', '아이템']];")
js = rep(js, "      if (i.cat === 'item') {", "      if (i.cat === 'hair') { const own = !!st.owned[i.id], worn = st.eq.hair === i.id, male = g === 'male', afford = st.money >= i.price; let btn, bg, dis = false, act = () => {}; if (!male) { btn = '남자 캐릭터 전용'; bg = '#d8d2c6'; dis = true; } else if (worn) { btn = '벗기'; bg = '#2b2a26'; act = () => { this.setState({ eq: Object.assign({}, this.state.eq, { hair: '' }) }); this.flash('기본 헤어로 돌아왔어요', false); this.saveLocal(true); }; } else if (own) { btn = '착용'; bg = '#2b2a26'; act = () => { this.setState({ eq: Object.assign({}, this.state.eq, { hair: i.id }) }); this.flash(i.name + ' 착용!', false); this.saveLocal(true); }; } else { btn = '구매'; bg = afford ? accent : '#d8d2c6'; act = () => { const s2 = this.state; if (s2.money < i.price) { this.flash('머니가 부족해요. 알바로 벌어오세요!', true); return; } this.setState({ money: s2.money - i.price, owned: Object.assign({}, s2.owned, { [i.id]: true }), eq: Object.assign({}, s2.eq, { hair: i.id }) }); this.flash(i.name + ' 구매하고 바로 했어요!', false); this.saveLocal(true); }; } return { name: i.name, pos: 'center', bi: 'url(' + i.img + ')', bs: 'contain', priceText: fmt(i.price) + '원', btn: btn, btnBg: bg, btnFg: '#ffffff', act: act, disabled: dis, border: worn ? accent : '#ece5d6' }; }\n      if (i.cat === 'item') {")
js = rep(js, "      panelChat: st.panel === 'chat', panelCalc: st.panel === 'calc', panelGame: st.panel === 'game',",
         "      seatFaces: (() => { if (!st.seated) return []; const msgs = st.rooms[this.roomKey()] || []; const now = Date.now(); const meN = this.myName(); return roomView.members.map((m) => { const tm = this.tableData(st.seated.t).members.find((x) => x.name === m.name) || {}; let last = null; for (let i = msgs.length - 1; i >= 0; i--) { const q = msgs[i]; if (!q.sys && (q.me ? meN : q.who) === m.name) { last = q; break; } } const show = !!last && now - (last.at || 0) < 7000; const isMe = m.name === meN; let turn = false; if (G2 && !G2.done && Array.isArray(G2.order) && G2.order.length && G2.type !== 'king') turn = G2.order[G2.turn % G2.order.length] === m.name; return { key: 'sf' + m.name, name: (m.owner ? '👑' : '') + m.name, src: FR[tm.g === 'female' ? 'female' : 'male'].front.stand.s, alt: m.name + ' 얼굴', hasBubble: show, bubble: show ? last.text : '', bg: isMe ? '#3f6f66' : '#3a2f5c', ring: turn ? '#ffd56b' : (isMe ? '#9fd8e8' : 'rgba(255,255,255,0.35)'), fg: turn ? '#ffd56b' : '#ffffff' }; }); })(),\n      panelChat: st.panel === 'chat', panelCalc: st.panel === 'calc', panelGame: st.panel === 'game',")
js = rep(js, "return { label: d.name, sub: d.sub, cur: id === st.area", "return { label: d.name, sub: d.sub + this.areaCount(id), cur: id === st.area")

# profile sheet: region is free text now (any city)
js = rep(js, "if (su.region) bits.push('부산 ' + su.region);", "if (su.region) bits.push(su.region);")

# relationships, flirts, friends, reports, DMs go over the network
js = rep(js, "    const patchU = (id, o) => this.setState(", "    const patchU = (id, o) => { this.relSet(id, o); this.setState(")
js = rep(js, "{ [id]: Object.assign({}, U[id], o) }) });\n", "{ [id]: Object.assign({}, U[id], o) }) }); };\n")
js = rep(js, "patchU(sh.id, { friend: true }); this.flash(", "patchU(sh.id, { friend: true }); this.pub('ev/' + sh.id, { type: 'friend', from: this.myId, name: this.myName() }); this.flash(")
js = rep(js, "        patchU(sh.id, { flirted: true, like: like });", "        patchU(sh.id, { flirted: true, like: like });\n        this.pub('ev/' + sh.id, { type: 'flirt', from: this.myId, name: this.myName() });")
js = rep(js, "      dm: dmList.map((m) => ({ text: m, align: 'flex-end', bg: accent, fg: '#ffffff' })),",
         "      dm: dmList.map((m) => (typeof m === 'string' ? { text: m, align: 'flex-end', bg: accent, fg: '#ffffff' } : { text: m.t, align: m.me ? 'flex-end' : 'flex-start', bg: m.me ? accent : '#efe9dd', fg: m.me ? '#ffffff' : '#2b2a26' })),")
js = rep(js, "        this.setState({ dms: Object.assign({}, st.dms, { [sh.id]: dmList.concat([t]) }), dmText: '' });",
         "        this.setState({ dms: Object.assign({}, st.dms, { [sh.id]: dmList.concat([{ t: t, me: true }]).slice(-80) }), dmText: '' });\n        this.pub('dm/' + sh.id, { from: this.myId, name: this.myName(), t: t.slice(0, 200) });")
js = rep(js, "          this.setState({ users: Object.assign({}, U, { [sh.id]: Object.assign({}, su, { reports: n, reported: true, banned: true }) }), sheet: null, reason: '' });",
         "          this.relSet(sh.id, { reported: true, banned: true }); this.pub('ev/' + sh.id, { type: 'report', from: this.myId, name: this.myName(), reason: st.reason }); this.pub('admin/r/' + sh.id + '/' + this.myId, { target: sh.id, targetName: su.name, from: this.myId, fromName: this.myName(), reason: st.reason, at: Date.now() }, { retain: true });\n          this.setState({ users: Object.assign({}, U, { [sh.id]: Object.assign({}, su, { reports: n, reported: true, banned: true }) }), sheet: null, reason: '' });")
js = rep(js, "          this.setState({ users: Object.assign({}, U, { [sh.id]: Object.assign({}, su, { reports: n, reported: true }) }), sheet: { type: 'menu', id: sh.id }, reason: '' });",
         "          this.relSet(sh.id, { reported: true }); this.pub('ev/' + sh.id, { type: 'report', from: this.myId, name: this.myName(), reason: st.reason }); this.pub('admin/r/' + sh.id + '/' + this.myId, { target: sh.id, targetName: su.name, from: this.myId, fromName: this.myName(), reason: st.reason, at: Date.now() }, { retain: true });\n          this.setState({ users: Object.assign({}, U, { [sh.id]: Object.assign({}, su, { reports: n, reported: true }) }), sheet: { type: 'menu', id: sh.id }, reason: '' });")

# drag-to-pan must account for the phone-frame scale
js = rep(js, "        const dx = e.clientX - d.sx, dy = e.clientY - d.sy;", "        const sc = window.__ygScale || 1, dx = (e.clientX - d.sx) / sc, dy = (e.clientY - d.sy) / sc;")

exec(open(B + '/wardrobe_patch.py').read())
exec(open(B + '/motion_patch.py').read())
exec(open(B + '/avatar_game_patch.py').read())
head, fn = convert(blob(xdc))
extra = '''<div id="yg-fx" style="position:absolute;left:0;top:57px;width:100%;height:calc(var(--yg-h) - 176px);pointer-events:none;z-index:1400;overflow:hidden"></div>
<div id="yg-online" class="off">서버 연결 중...</div>
<div id="yg-ban"><div style="font-family:Jua,sans-serif;font-size:26px">이용이 정지된 계정이에요</div><div style="font-size:14px;opacity:.8;line-height:1.6">다른 이용자 신고가 10회 누적되어 자동으로 정지됐어요.</div></div>'''
js = rep(js, "      onNick: (e) => this.setState({ prof: Object.assign({}, st.prof, { nick: e.target.value }) }),",
         "      onNick: (e) => { if (YG.acct) { this.flash('닉네임은 가입할 때 정해져서 바꿀 수 없어요', true); return; } this.setState({ prof: Object.assign({}, st.prof, { nick: e.target.value }) }); },")
mount_game = '''YGA.ready().then((acc) => {
  if (YGA.on && !acc) { location.replace('index.html'); return; }
  if (acc) { YG.id = acc.uid; YG.acct = acc.data; if (acc.data.banned) YG.save('banned', true); }
  fitFrame(document.getElementById('yg-frame'));
  mountDC(Component, document.getElementById('yg-root'));
});'''
open(OUT + 'game.html', 'w').write(page('여기야 · 플레이', head, fn, blob(js), extra_body=extra, mount=mount_game))
print('ok', os.path.getsize(OUT + 'game.html'), os.path.getsize(OUT + 'index.html'))
