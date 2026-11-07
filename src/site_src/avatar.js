/* 여기야 아바타 v2 — 기본 바디 파츠 + 의상/헤어 레이어 공통 렌더러
 *
 * 좌표계: 모든 파츠는 512x1024 리그 캔버스 좌표를 쓴다. 발바닥 기준선 y=1000, 캐릭터 중심 x≈256.
 * 한 캐릭터의 모든 레이어(몸·옷·헤어)는 같은 방향·같은 동작 상태·같은 보행 위상(phase)을 공유한다.
 * 의상 레이어는 자신이 붙는 신체 파츠(attach)의 변환을 그대로 따라가므로 몸과 따로 움직일 수 없다.
 */
(function () {
  const AV = { manifest: null, img: {}, ready: null };
  const TAU = Math.PI * 2;

  AV.load = function (url) {
    if (AV.ready) return AV.ready;
    AV.ready = fetch(url || 'assets/avatar/manifest.json', { cache: 'no-cache' }).then((r) => r.json()).then((m) => {
      AV.manifest = m;
      const srcs = [];
      Object.values(m.bodies).forEach((b) => Object.values(b.directions).forEach((d) => Object.values(d.parts).forEach((p) => srcs.push(p.src))));
      Object.values(m.items || {}).forEach((it) => Object.values(it.layers || {}).forEach((byDir) => Object.values(byDir).forEach((ls) => ls.forEach((l) => srcs.push(l.src)))));
      return Promise.all(srcs.map(AV.image)).then(() => m);
    });
    return AV.ready;
  };
  AV.image = function (src) {
    if (AV.img[src]) return AV.img[src].p;
    const im = new Image(); const rec = { im: im, ok: false };
    rec.p = new Promise((res) => { im.onload = () => { rec.ok = true; res(im); }; im.onerror = () => res(null); });
    im.src = src; AV.img[src] = rec; return rec.p;
  };

  // ---------- 동작(포즈) 계산 ----------
  // 정면 보행: 디딤발은 몸이 전진하는 만큼 화면상 위로 이동(=바닥에 고정), 나머지 발은 들려서 앞으로 나온다.
  // 다리는 반바지/하의 뒤로 위쪽만 들어가게(위로만 이동) 처리해서 허벅지 틈이 생기지 않는다.
  // 정면/뒷면은 화면 깊이 방향 이동이라 실제 보폭을 다리 길이로 표현할 수 없다(3/4 탑다운 게임 공통).
  // 그래서 정면은 '제자리 디딤 + 발 접지 순간' 표현으로 하고, 보폭(STEP_H)은 캐릭터 키 대비 비율로 정한다.
  // 측면(좌/우) 그림이 들어오면 디딤발이 바닥에 정확히 고정되도록(미끄럼 0) 같은 함수를 STRIDE 기준으로 쓴다.
  AV.STRIDE = 34;   // 리그 단위: 디딤 동안 발이 몸 기준으로 뒤로(정면에선 위로) 밀리는 양
  AV.STEP_H = 0.26; // 정면 한 걸음 = 캐릭터 키(1000 단위)의 26% 이동마다 (초당 약 2.5걸음)
  AV.LIFT = 30;     // 스윙 발 들어 올림 높이
  AV.BOB = 9;       // 몸통 상하 진폭(지나감 자세에서 최고점)
  AV.SWAY = 4;      // 디딤발 쪽 좌우 체중 이동
  AV.ARM = 5.5;     // 팔 흔들림 각도(도)
  function legOffset(p) {
    // p: 0..1 (이 다리 기준). 0~0.5 디딤(stance), 0.5~1 스윙(swing). 반환: 위로 들어간 양(>=0)
    if (p < 0.5) { const s = p / 0.5; return AV.STRIDE * s; }
    const u = (p - 0.5) / 0.5; const e = u * u * (3 - 2 * u);
    return AV.STRIDE * (1 - e) + AV.LIFT * Math.sin(Math.PI * u);
  }
  AV.pose = function (st) {
    // st: { phase(0..1), walk(0..1 blend), t(sec) }
    const w = st.walk || 0, p = st.phase || 0, t = st.t || 0;
    const breathe = Math.sin(t * TAU / 3.2);
    const P = {};
    const lL = legOffset(p % 1), lR = legOffset((p + 0.5) % 1);
    const bob = -AV.BOB * Math.pow(Math.sin(p * TAU * 2 - Math.PI / 2) * 0.5 + 0.5, 1.2); // 최저=접지(0,0.5) 최고=지나감(0.25,0.75)
    const sway = AV.SWAY * Math.sin(p * TAU);
    const sL = Math.sin(p * TAU);
    const bodyY = w * bob + (1 - w) * (-1.2 * (breathe * 0.5 + 0.5));
    P.legL = { dx: 0, dy: -w * lL, rot: 0 };
    P.legR = { dx: 0, dy: -w * lR, rot: 0 };
    P.torso = { dx: w * sway, dy: bodyY, rot: w * 0.6 * sL, sy: 1 + (1 - w) * 0.006 * breathe };
    // 머리: 몸통을 약간 늦게 따라감(부드러운 연결)
    const bobLag = -AV.BOB * Math.pow(Math.sin((p - 0.04) * TAU * 2 - Math.PI / 2) * 0.5 + 0.5, 1.2);
    P.head = { dx: w * sway * 1.1, dy: w * bobLag + (1 - w) * (-1.6 * (breathe * 0.5 + 0.5)), rot: w * -0.8 * sL };
    // 팔: 반대쪽 다리와 함께 앞으로(정면에서는 앞쪽 팔이 살짝 안으로 내려오고 짧아 보임)
    const aL = -sL, aR = sL; // +면 앞으로
    P.armL = { dx: P.torso.dx, dy: bodyY + w * 3 * aL, rot: w * -AV.ARM * aL, sy: 1 - w * 0.05 * Math.abs(aL) };
    P.armR = { dx: P.torso.dx, dy: bodyY + w * 3 * aR, rot: w * AV.ARM * aR, sy: 1 - w * 0.05 * Math.abs(aR) };
    return P;
  };

  // ---------- 그리기 ----------
  // look: { body:'male_base', equip:{hair,top,bottom,shoes,outer,accessory}, dir:'front' }
  // anim: { phase, walk, t }
  AV.draw = function (ctx, look, anim, opt) {
    const m = AV.manifest; if (!m) return { missing: ['manifest'] };
    const body = m.bodies[look.body]; if (!body) return { missing: ['body ' + look.body] };
    const want = look.dir || 'front';
    const dirData = body.directions[want] || body.directions.front;
    const usedDir = body.directions[want] ? want : 'front';
    const missing = []; if (usedDir !== want) missing.push(want + ' 방향 이미지 없음');
    const pose = AV.pose(anim || {});
    const order = m.drawOrder[usedDir] || m.drawOrder.front;
    // 의상 레이어를 파츠별로 모음: item.layers[dir] = [{ attach:'torso', z:+1, src, x, y }]
    const extra = {};
    const eq = look.equip || {};
    ['bottom', 'shoes', 'top', 'outer', 'accessory', 'hair'].forEach((slot, si) => {
      const id = eq[slot]; if (!id) return;
      const it = m.items[id];
      if (!it) { missing.push(slot + ':' + id + ' 그림 없음'); return; }
      const ls = it.layers && it.layers[usedDir];
      if (!ls) { missing.push(slot + ':' + id + ' ' + usedDir + ' 그림 없음'); return; }
      ls.forEach((l) => { (extra[l.attach] = extra[l.attach] || []).push(Object.assign({ order: si, z: 1 }, l)); });
    });
    const S = (opt && opt.scale) || 1;
    ctx.save();
    ctx.scale(S, S);
    const drawPart = (name) => {
      const part = dirData.parts[name]; if (!part) return;
      const ps = pose[name] || { dx: 0, dy: 0, rot: 0 };
      const pv = part.pivot;
      ctx.save();
      ctx.translate(pv[0] + (ps.dx || 0), pv[1] + (ps.dy || 0));
      if (ps.rot) ctx.rotate(ps.rot * Math.PI / 180);
      if (ps.sy && ps.sy !== 1) ctx.scale(1, ps.sy);
      ctx.translate(-pv[0], -pv[1]);
      const layers = (extra[name] || []).slice().sort((a, b) => (a.z - b.z) || (a.order - b.order));
      layers.filter((l) => l.z < 0).forEach((l) => { const r = AV.img[l.src]; if (r && r.ok) ctx.drawImage(r.im, l.x, l.y); });
      const r = AV.img[part.src]; if (r && r.ok) ctx.drawImage(r.im, part.x, part.y);
      layers.filter((l) => l.z >= 0).forEach((l) => { const r2 = AV.img[l.src]; if (r2 && r2.ok) ctx.drawImage(r2.im, l.x, l.y); });
      if (opt && opt.debug) {
        ctx.fillStyle = '#ff3b6b'; ctx.beginPath(); ctx.arc(pv[0], pv[1], 7, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,59,107,.6)'; ctx.lineWidth = 2; ctx.strokeRect(part.x, part.y, part.w, part.h);
      }
      ctx.restore();
    };
    order.forEach(drawPart);
    ctx.restore();
    return { missing: missing, dir: usedDir };
  };

  // ---------- 애니메이터: 이동 거리로 보행 위상을 진행(발 미끄러짐 방지) ----------
  // scale: 화면 px / 리그 단위. 몸이 STRIDE*scale 만큼 움직이면 반주기가 지나간다.
  AV.Animator = function () { this.phase = 0; this.walk = 0; this.t = 0; };
  AV.Animator.prototype.update = function (dt, movedPx, scale, moving, dir) {
    this.t += dt;
    const side = dir === 'left' || dir === 'right';
    const stepPx = side ? AV.STRIDE * scale : AV.STEP_H * 1000 * scale;
    if (movedPx > 0 && scale > 0) this.phase = (this.phase + movedPx / (2 * stepPx)) % 1;
    const target = moving ? 1 : 0;
    const k = 1 - Math.exp(-dt * (moving ? 14 : 9));
    this.walk += (target - this.walk) * k;
    if (!moving && this.walk < 0.02) {
      // 멈출 때는 가장 가까운 두 발 접지 자세(0 또는 0.5)로 부드럽게 수렴
      const tgt = this.phase < 0.25 ? 0 : this.phase < 0.75 ? 0.5 : 1;
      this.phase += (tgt - this.phase) * Math.min(1, dt * 10); this.phase %= 1;
    }
    return { phase: this.phase, walk: this.walk, t: this.t };
  };

  // ---------- 저장 데이터 이전(기존 eq → 새 장착 칸) ----------
  AV.OUTER_IDS = { tbcard: 1, gcard: 1 };
  AV.migrateProfile = function (d) {
    d = d || {};
    const eq = d.eq || {};
    const ex = d.equipped || {};
    const out = {
      baseBody: d.baseBody || ((d.gender === 'female') ? 'female_base' : 'male_base'),
      equipped: {
        hair: ex.hair !== undefined ? ex.hair : (eq.hair || ''),
        top: ex.top !== undefined ? ex.top : (AV.OUTER_IDS[eq.top] ? 'hoodie' : (eq.top || 'hoodie')),
        bottom: ex.bottom !== undefined ? ex.bottom : (eq.bottom || 'jeans'),
        shoes: ex.shoes !== undefined ? ex.shoes : (eq.shoes || 'sneakers'),
        outer: ex.outer !== undefined ? ex.outer : (AV.OUTER_IDS[eq.top] ? eq.top : ''),
        accessory: ex.accessory !== undefined ? ex.accessory : ''
      }
    };
    return out;
  };
  // 새 칸 → 기존 eq (운영 중인 main 버전과 같은 계정을 같이 써도 깨지지 않게 함께 저장)
  AV.legacyEq = function (equipped) {
    const e = equipped || {};
    return { hair: e.hair || '', top: e.outer || e.top || 'hoodie', bottom: e.bottom || 'jeans', shoes: e.shoes || 'sneakers' };
  };

  window.YGAvatar = AV;
})();
