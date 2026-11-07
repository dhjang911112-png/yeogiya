/* 여기야 아바타 v2 — 기본 바디 파츠 + 의상/헤어 레이어 공통 렌더러
 *
 * 좌표계: 모든 파츠는 512x1024 리그 캔버스 좌표를 쓴다. 발바닥 기준선 y=1000, 캐릭터 중심 x≈256.
 * 한 캐릭터의 모든 레이어(몸·옷·헤어)는 같은 방향·같은 동작 상태·같은 보행 위상(phase)을 공유한다.
 * 의상 레이어는 자신이 붙는 신체 파츠(attach)의 변환을 그대로 따라가므로 몸과 따로 움직일 수 없다.
 *
 * 파츠 이름
 *   정면/뒷면: head, torso, armL, armR, legL, legR  (또는 10파츠: upperArmL, lowerArmL, upperLegL, lowerLegL …)
 *              L/R = 화면 왼쪽/오른쪽
 *   측면(left/right): head, torso, upperArmNear, lowerArmNear, upperArmFar, lowerArmFar,
 *              upperLegNear, lowerLegNear, upperLegFar, lowerLegFar   (Near = 카메라 쪽 팔다리)
 */
(function () {
  const AV = { manifest: null, img: {}, ready: null };
  const TAU = Math.PI * 2, DEG = Math.PI / 180;

  AV.load = function (url) {
    if (AV.ready) return AV.ready;
    AV.ready = fetch(url || 'assets/avatar/manifest.json', { cache: 'no-cache' }).then((r) => r.json()).then((m) => {
      AV.manifest = m;
      const srcs = [];
      Object.values(m.bodies).forEach((b) => Object.values(b.directions).forEach((d) => Object.values(d.parts).forEach((p) => srcs.push(p.src))));
      Object.values(m.items || {}).forEach((it) => Object.values(it.layers || {}).forEach((ls) => ls.forEach((l) => srcs.push(l.src))));
      return Promise.all(srcs.map(AV.image)).then(() => m);
    }).catch((e) => { console.warn('avatar manifest', e); AV.manifest = { bodies: {}, items: {} }; return AV.manifest; });
    return AV.ready;
  };
  AV.image = function (src) {
    if (AV.img[src]) return AV.img[src].p;
    const im = new Image(); const rec = { im: im, ok: false };
    rec.p = new Promise((res) => { im.onload = () => { rec.ok = true; res(im); }; im.onerror = () => res(null); });
    im.src = src; AV.img[src] = rec; return rec.p;
  };

  // ---------- 동작 파라미터 ----------
  AV.STEP_H = 0.26;   // 정면/뒷면: 한 걸음 = 키(1000단위)의 26% 이동마다 (깊이 방향이라 제자리 디딤 표현)
  AV.LIFT = 30;       // 정면 스윙 발 들어 올림
  AV.BOB = 9;         // 정면 몸통 상하
  AV.SWAY = 4;        // 정면 좌우 체중 이동
  AV.ARM = 5.5;       // 정면 팔 흔들림(도)
  AV.STRIDE_SIDE = 150; // 측면: 디딤 동안 발이 몸 기준으로 뒤로 밀리는 거리(리그 단위) = 몸이 앞으로 가는 거리 → 미끄럼 0
  AV.LIFT_SIDE = 46;  // 측면 스윙 발 높이
  AV.BOB_SIDE = 14;   // 측면 몸통 상하
  AV.ARM_SIDE = 24;   // 측면 팔 흔들림(도)

  const limbOf = (name) => {
    const m = /^(arm|upperArm|lowerArm|leg|upperLeg|lowerLeg)(L|R|Near|Far)$/.exec(name);
    return m ? { kind: m[1], side: m[2] } : null;
  };
  const smooth = (u) => u * u * (3 - 2 * u);

  // 정면: 다리를 위로만(하의 뒤로) 들어 올려 허벅지 틈이 생기지 않게 한다
  function legLift(p) {
    if (p < 0.5) return 34 * (p / 0.5);
    const u = (p - 0.5) / 0.5; return 34 * (1 - smooth(u)) + AV.LIFT * Math.sin(Math.PI * u);
  }

  // 결과: 파츠별 { x, y (새 회전축 위치), rot (라디안), sy }
  function poseFrontBack(dirData, a, isBack) {
    const J = dirData.joints || {}, parts = dirData.parts;
    const w = a.walk || 0, p = a.phase || 0, t = a.t || 0;
    const breathe = Math.sin(t * TAU / 3.2);
    const bob = -AV.BOB * Math.pow(Math.sin(p * TAU * 2 - Math.PI / 2) * 0.5 + 0.5, 1.2);
    const bobLag = -AV.BOB * Math.pow(Math.sin((p - 0.04) * TAU * 2 - Math.PI / 2) * 0.5 + 0.5, 1.2);
    const sway = AV.SWAY * Math.sin(p * TAU), sL = Math.sin(p * TAU);
    const bodyY = w * bob + (1 - w) * (-1.2 * (breathe * 0.5 + 0.5));
    const out = {};
    const at = (name, dx, dy, rot, sy) => { const pv = parts[name].pivot; out[name] = { x: pv[0] + dx, y: pv[1] + dy, rot: rot || 0, sy: sy || 1 }; };
    Object.keys(parts).forEach((name) => {
      const L = limbOf(name);
      if (name === 'torso') return at(name, w * sway, bodyY, w * 0.6 * sL * DEG, 1 + (1 - w) * 0.006 * breathe);
      if (name === 'head') return at(name, w * sway * 1.1, w * bobLag + (1 - w) * (-1.6 * (breathe * 0.5 + 0.5)), w * -0.8 * sL * DEG);
      if (!L) return at(name, 0, 0, 0);
      const A = L.side === 'L' || L.side === 'Near';
      const ph = A ? p : (p + 0.5) % 1;
      if (L.kind === 'leg' || L.kind === 'upperLeg' || L.kind === 'lowerLeg') {
        const off = w * legLift(ph);
        return at(name, 0, -(L.kind === 'upperLeg' ? off * 0.35 : off), 0);
      }
      const fwdArm = (A ? -sL : sL) * (isBack ? -1 : 1);
      const sign = L.side === 'L' ? -1 : 1;
      const rot = w * sign * AV.ARM * fwdArm * DEG;
      if (L.kind === 'lowerArm') {
        // 팔꿈치는 위팔 회전을 따라간다
        const up = parts['upperArm' + L.side];
        const sp = up ? up.pivot : parts[name].pivot, ep = parts[name].pivot;
        const ex = sp[0] + (ep[0] - sp[0]) * Math.cos(rot) - (ep[1] - sp[1]) * Math.sin(rot) + w * sway;
        const ey = sp[1] + (ep[0] - sp[0]) * Math.sin(rot) + (ep[1] - sp[1]) * Math.cos(rot) + bodyY + w * 3 * fwdArm;
        out[name] = { x: ex, y: ey, rot: rot * 1.3, sy: 1 }; return;
      }
      return at(name, w * sway, bodyY + w * 3 * fwdArm, rot, 1 - w * 0.05 * Math.abs(fwdArm));
    });
    return out;
  }

  // 측면: 2관절 IK로 디딤발을 바닥에 고정(몸이 앞으로 가는 만큼 발이 뒤로 → 화면상 정지)
  function ik2(hip, foot, l1, l2, fwd) {
    const dx = foot[0] - hip[0], dy = foot[1] - hip[1];
    const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
    const base = Math.atan2(dy, dx);
    const c = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
    const thigh = base - fwd * Math.acos(c);
    const knee = [hip[0] + l1 * Math.cos(thigh), hip[1] + l1 * Math.sin(thigh)];
    const shin = Math.atan2(foot[1] - knee[1], foot[0] - knee[0]);
    return { thigh: thigh, shin: shin, knee: knee };
  }
  function poseSide(dirData, a, fwd) {
    const J = dirData.joints || {}, parts = dirData.parts;
    const w = a.walk || 0, p = a.phase || 0, t = a.t || 0;
    const breathe = Math.sin(t * TAU / 3.2);
    const passing = Math.pow(Math.sin(p * TAU * 2 - Math.PI / 2) * 0.5 + 0.5, 1.3);
    const bodyY = w * (-AV.BOB_SIDE * passing + AV.BOB_SIDE * 0.35) + (1 - w) * (-1.2 * (breathe * 0.5 + 0.5));
    const out = {};
    const tor = parts.torso ? parts.torso.pivot : [256, 717];
    out.torso = { x: tor[0], y: tor[1] + bodyY, rot: w * fwd * 1.5 * DEG, sy: 1 + (1 - w) * 0.006 * breathe };
    if (parts.head) { const hp = parts.head.pivot; out.head = { x: hp[0], y: hp[1] + bodyY * 0.92, rot: w * fwd * 0.8 * Math.sin(p * TAU * 2) * DEG, sy: 1 }; }
    ['Near', 'Far'].forEach((S, i) => {
      const ph = (p + i * 0.5) % 1;
      // 다리
      const hip = J['hip' + S], knee = J['knee' + S], ank = J['ankle' + S];
      if (hip && knee && ank && (parts['upperLeg' + S] || parts['leg' + S])) {
        const l1 = Math.hypot(knee[0] - hip[0], knee[1] - hip[1]), l2 = Math.hypot(ank[0] - knee[0], ank[1] - knee[1]);
        let fx, fy;
        if (ph < 0.5) { fx = fwd * AV.STRIDE_SIDE * (0.5 - ph / 0.5); fy = 0; }
        else { const u = (ph - 0.5) / 0.5; fx = fwd * AV.STRIDE_SIDE * (-0.5 + smooth(u)); fy = -AV.LIFT_SIDE * Math.sin(Math.PI * u); }
        const foot = [ank[0] + w * fx, ank[1] + w * fy];
        const hp = [hip[0], hip[1] + bodyY];
        const r = ik2(hp, foot, l1, l2, fwd);
        const restThigh = Math.atan2(knee[1] - hip[1], knee[0] - hip[0]), restShin = Math.atan2(ank[1] - knee[1], ank[0] - knee[0]);
        if (parts['upperLeg' + S]) {
          out['upperLeg' + S] = { x: hp[0], y: hp[1], rot: r.thigh - restThigh, sy: 1 };
          if (parts['lowerLeg' + S]) out['lowerLeg' + S] = { x: r.knee[0], y: r.knee[1], rot: r.shin - restShin, sy: 1 };
        } else {
          const restLeg = Math.atan2(ank[1] - hip[1], ank[0] - hip[0]), now = Math.atan2(foot[1] - hp[1], foot[0] - hp[0]);
          out['leg' + S] = { x: hp[0], y: hp[1], rot: now - restLeg, sy: 1 };
        }
      }
      // 팔: 반대쪽 다리와 함께 앞으로
      const sh = J['shoulder' + S], el = J['elbow' + S];
      const swing = w * AV.ARM_SIDE * Math.sin((ph + 0.5) * TAU) * DEG; // +면 앞으로
      const rotU = -fwd * swing;
      const spx = sh ? sh[0] : 256, spy = (sh ? sh[1] : 460) + bodyY;
      if (parts['upperArm' + S]) {
        out['upperArm' + S] = { x: spx, y: spy, rot: rotU, sy: 1 };
        if (parts['lowerArm' + S] && el) {
          const ex = spx + (el[0] - sh[0]) * Math.cos(rotU) - (el[1] - sh[1]) * Math.sin(rotU);
          const ey = spy + (el[0] - sh[0]) * Math.sin(rotU) + (el[1] - sh[1]) * Math.cos(rotU);
          const bend = (6 + 16 * Math.max(0, Math.sin((ph + 0.5) * TAU))) * DEG * w;
          out['lowerArm' + S] = { x: ex, y: ey, rot: rotU - fwd * bend, sy: 1 };
        }
      } else if (parts['arm' + S]) out['arm' + S] = { x: spx, y: spy, rot: rotU, sy: 1 };
    });
    Object.keys(parts).forEach((n) => { if (!out[n]) { const pv = parts[n].pivot; out[n] = { x: pv[0], y: pv[1] + bodyY, rot: 0, sy: 1 }; } });
    return out;
  }

  AV.pose = function (dirData, dir, a) {
    if (dir === 'left' || dir === 'right') return poseSide(dirData, a, dir === 'right' ? 1 : -1);
    return poseFrontBack(dirData, a, dir === 'back');
  };

  const ORDER = {
    front: ['hair_back', 'legL', 'legR', 'upperLegL', 'upperLegR', 'lowerLegL', 'lowerLegR', 'torso', 'armL', 'armR', 'upperArmL', 'upperArmR', 'lowerArmL', 'lowerArmR', 'head'],
    back: ['head', 'armL', 'armR', 'upperArmL', 'upperArmR', 'lowerArmL', 'lowerArmR', 'legL', 'legR', 'upperLegL', 'upperLegR', 'lowerLegL', 'lowerLegR', 'torso'],
    side: ['upperArmFar', 'lowerArmFar', 'armFar', 'upperLegFar', 'lowerLegFar', 'legFar', 'torso', 'upperLegNear', 'lowerLegNear', 'legNear', 'head', 'upperArmNear', 'lowerArmNear', 'armNear']
  };
  AV.SLOT_ORDER = ['bottom', 'shoes', 'top', 'outer', 'accessory', 'hair'];

  // 이 캐릭터를 새 시스템으로 그릴 수 있는가(몸 방향 + 장착한 모든 칸의 그림이 있을 때만)
  AV.canDraw = function (look, opts) {
    const m = AV.manifest; if (!m) return { ok: false, why: '매니페스트 로딩 중' };
    const body = m.bodies[look.body]; if (!body) return { ok: false, why: '기본 바디 없음' };
    const dir = look.dir || 'front';
    if (!body.directions[dir]) return { ok: false, why: dir + ' 방향 기본 바디 없음' };
    if (opts && opts.bodyOnly) return { ok: true };
    const eq = AV.withDefaultHair(look.equip, body.gender);
    for (const slot of AV.SLOT_ORDER) {
      const id = eq[slot]; if (!id) continue;
      const it = m.items[id];
      if (!it || !it.layers || !it.layers[dir]) return { ok: false, why: slot + ':' + id + ' ' + dir + ' 그림 없음' };
    }
    return { ok: true };
  };

  // 헤어 칸이 비어 있으면 기본 헤어 아이템(hair_base_m / hair_base_f)이 있을 때 그것을 씀
  // (기본 바디 머리가 대머리로 교체된 뒤에만 의미 있음)
  AV.withDefaultHair = function (equip, gender) {
    const e = Object.assign({}, equip || {});
    const def = 'hair_base_' + (gender === 'female' ? 'f' : 'm');
    if (!e.hair && AV.manifest && AV.manifest.items[def]) e.hair = def;
    return e;
  };

  // ---------- 그리기 ----------
  // look: { body:'male_base', equip:{hair,top,bottom,shoes,outer,accessory}, dir }
  // anim: { phase, walk, t }
  AV.draw = function (ctx, look, anim, opt) {
    const m = AV.manifest; if (!m) return { missing: ['manifest'] };
    const body = m.bodies[look.body]; if (!body) return { missing: ['body ' + look.body] };
    const want = look.dir || 'front';
    const firstDir = Object.keys(body.directions)[0];
    const usedDir = body.directions[want] ? want : (body.directions.front ? 'front' : firstDir);
    const dirData = body.directions[usedDir];
    if (!dirData) return { missing: ['no directions'] };
    const missing = []; if (usedDir !== want) missing.push(want + ' 방향 이미지 없음');
    const pose = AV.pose(dirData, usedDir, anim || {});
    const order = (usedDir === 'left' || usedDir === 'right') ? ORDER.side : ORDER[usedDir];
    const g = body.gender;
    const extra = {};
    const eq = AV.withDefaultHair(look.equip, g);
    AV.SLOT_ORDER.forEach((slot, si) => {
      const id = eq[slot]; if (!id) return;
      const it = m.items[id];
      if (!it) { missing.push(slot + ':' + id + ' 그림 없음'); return; }
      const ls = (it.layers && it.layers[usedDir]) || [];
      const mine = ls.filter((l) => l.gender === g || l.gender === 'unisex');
      if (!mine.length) { missing.push(slot + ':' + id + ' ' + usedDir + ' 그림 없음'); return; }
      mine.forEach((l) => { (extra[l.attach] = extra[l.attach] || []).push(Object.assign({ order: si }, l)); });
    });
    const S = (opt && opt.scale) || 1;
    ctx.save();
    ctx.scale(S, S);
    const xf = (name, fn) => {
      const part = dirData.parts[name]; if (!part) return;
      const ps = pose[name] || { x: part.pivot[0], y: part.pivot[1], rot: 0, sy: 1 };
      ctx.save();
      ctx.translate(ps.x, ps.y);
      if (ps.rot) ctx.rotate(ps.rot);
      if (ps.sy && ps.sy !== 1) ctx.scale(1, ps.sy);
      ctx.translate(-part.pivot[0], -part.pivot[1]);
      fn(part);
      ctx.restore();
    };
    const img = (l) => { const r = AV.img[l.src]; if (r && r.ok) ctx.drawImage(r.im, l.x, l.y); };
    // 1) 몸보다 뒤에 그릴 레이어(뒷머리·아우터 뒷판): 붙은 파츠 변환을 따라 맨 먼저
    order.forEach((name) => xf(name, () => (extra[name] || []).filter((l) => l.z < 0).sort((a, b) => a.order - b.order).forEach(img)));
    // 2) 몸 파츠 + 그 위의 의상 레이어
    order.forEach((name) => xf(name, (part) => {
      img(part);
      (extra[name] || []).filter((l) => l.z >= 0).sort((a, b) => a.order - b.order).forEach(img);
      if (opt && opt.debug) {
        ctx.fillStyle = '#ff3b6b'; ctx.beginPath(); ctx.arc(part.pivot[0], part.pivot[1], 7, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,59,107,.6)'; ctx.lineWidth = 2; ctx.strokeRect(part.x, part.y, part.w, part.h);
      }
    }));
    ctx.restore();
    return { missing: missing, dir: usedDir, pose: pose };
  };

  // 디딤발(발목) 화면 위치 — 미끄럼 측정용
  AV.footPos = function (look, anim, which) {
    const m = AV.manifest, body = m.bodies[look.body]; const dir = look.dir || 'front';
    const used = body.directions[dir] ? dir : (body.directions.front ? 'front' : Object.keys(body.directions)[0]);
    const d = body.directions[used]; if (!d) return null;
    const pose = AV.pose(d, used, anim);
    const J = d.joints;
    const side = used === 'left' || used === 'right';
    const legName = side ? (d.parts['lowerLeg' + which] ? 'lowerLeg' + which : 'leg' + which) : (d.parts['lowerLeg' + which] ? 'lowerLeg' + which : 'leg' + which);
    const ps = pose[legName], part = d.parts[legName]; if (!ps || !part) return null;
    const ank = J['ankle' + which]; if (!ank) return null;
    const dx = ank[0] - part.pivot[0], dy = ank[1] - part.pivot[1];
    return [ps.x + dx * Math.cos(ps.rot) - dy * Math.sin(ps.rot), ps.y + dx * Math.sin(ps.rot) + dy * Math.cos(ps.rot)];
  };

  // ---------- 애니메이터: 이동 거리로 보행 위상을 진행 ----------
  // scale: 화면 px / 리그 단위
  AV.Animator = function () { this.phase = 0; this.walk = 0; this.t = 0; };
  AV.Animator.prototype.update = function (dt, movedPx, scale, moving, dir) {
    this.t += dt;
    const side = dir === 'left' || dir === 'right';
    const stepPx = side ? AV.STRIDE_SIDE * scale : AV.STEP_H * 1000 * scale;
    if (movedPx > 0 && scale > 0) this.phase = (this.phase + movedPx / (2 * stepPx)) % 1;
    const target = moving ? 1 : 0;
    const k = 1 - Math.exp(-dt * (moving ? 14 : 9));
    this.walk += (target - this.walk) * k;
    if (!moving && this.walk < 0.02) {
      const tgt = this.phase < 0.25 ? 0 : this.phase < 0.75 ? 0.5 : 1;
      this.phase += (tgt - this.phase) * Math.min(1, dt * 10); this.phase %= 1;
    }
    return { phase: this.phase, walk: this.walk, t: this.t };
  };

  // ---------- 디버그 마네킹(실험실 전용, 게임 그림이 아님) ----------
  // 측면 걷기 수학(IK·미끄럼 0)을 그림이 오기 전에 검증하기 위한 회색 막대 인형
  AV.makeMannequin = function () {
    const m = AV.manifest; if (!m || m.bodies.mannequin) return;
    const front = m.bodies.male_base && m.bodies.male_base.directions.front.joints;
    if (!front) return;
    const J0 = front;
    const cap = (key, a, b, wdt, col) => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 1024; const x = c.getContext('2d');
      x.strokeStyle = col; x.lineCap = 'round'; x.lineWidth = wdt; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
      x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 3; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
      const bx = Math.min(a[0], b[0]) - wdt, by = Math.min(a[1], b[1]) - wdt, bw = Math.abs(a[0] - b[0]) + wdt * 2, bh = Math.abs(a[1] - b[1]) + wdt * 2;
      const o = document.createElement('canvas'); o.width = bw; o.height = bh; o.getContext('2d').drawImage(c, bx, by, bw, bh, 0, 0, bw, bh);
      AV.img[key] = { im: o, ok: true, p: Promise.resolve(o) };
      return { src: key, x: bx, y: by, w: bw, h: bh };
    };
    const dirs = {};
    ['right', 'left'].forEach((dir) => {
      const f = dir === 'right' ? 1 : -1;
      const J = { neck: [256, J0.neck[1]], root: [256, 1000] };
      [['Near', 0], ['Far', -10 * f]].forEach(([S, ox]) => {
        J['hip' + S] = [256 + ox, J0.hipL[1]]; J['knee' + S] = [256 + ox + 10 * f, J0.kneeL[1]]; J['ankle' + S] = [256 + ox, 925];
        J['shoulder' + S] = [256 + ox, J0.shoulderL[1] + 6]; J['elbow' + S] = [256 + ox, (J0.shoulderL[1] + J0.handL[1]) / 2]; J['hand' + S] = [256 + ox + 4 * f, J0.handL[1]];
      });
      const P = {};
      const add = (n, a, b, wd, col, pv) => { P[n] = Object.assign(cap('mq:' + dir + ':' + n, a, b, wd, col), { pivot: pv }); };
      ['Far', 'Near'].forEach((S) => {
        const col = S === 'Near' ? '#c9c2b4' : '#a39c8e';
        add('upperLeg' + S, J['hip' + S], J['knee' + S], 46, col, J['hip' + S]);
        add('lowerLeg' + S, J['knee' + S], [J['ankle' + S][0] + 22 * f, 990], 40, col, J['knee' + S]);
        add('upperArm' + S, J['shoulder' + S], J['elbow' + S], 34, col, J['shoulder' + S]);
        add('lowerArm' + S, J['elbow' + S], J['hand' + S], 30, col, J['elbow' + S]);
      });
      add('torso', [256, J0.neck[1] + 20], [256, J0.hipL[1] - 10], 120, '#d8d1c3', [256, J0.hipL[1]]);
      add('head', [256 + 6 * f, J0.neck[1] - 210], [256 + 6 * f, J0.neck[1] - 200], 330, '#e2dbcd', [256, J0.neck[1]]);
      dirs[dir] = { parts: P, joints: J };
    });
    m.bodies.mannequin = { gender: 'male', directions: dirs, missing: ['디버그 전용 — 게임에 쓰지 않음'] };
  };

  // ---------- 저장 데이터 이전(기존 eq → 새 장착 칸) ----------
  AV.OUTER_IDS = { tbcard: 1, gcard: 1 };
  AV.FREE = { hoodie: 1, jeans: 1, sneakers: 1 };
  AV.SLOTS = ['hair', 'top', 'bottom', 'shoes', 'outer', 'accessory'];
  AV.migrateProfile = function (d) {
    d = d || {};
    const eq = d.eq || {};
    const ex = d.equipped || {};
    return {
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
  };
  // 새 칸 → 기존 eq (운영 중인 main 버전과 같은 계정을 같이 써도 깨지지 않게 함께 저장)
  AV.legacyEq = function (e) {
    e = e || {};
    return { hair: e.hair || '', top: e.outer || e.top || 'hoodie', bottom: e.bottom || 'jeans', shoes: e.shoes || 'sneakers' };
  };
  // 보유 확인: 기본 지급 아이템, owned 맵, 보관함(inv)
  AV.owns = function (id, owned, inv) {
    if (!id) return true;
    if (AV.FREE[id]) return true;
    if (owned && owned[id]) return true;
    return Array.isArray(inv) && inv.indexOf(id) >= 0;
  };
  AV.sanitize = function (equipped, owned, inv) {
    const e = Object.assign({}, equipped || {}), dropped = [];
    AV.SLOTS.forEach((s) => {
      if (e[s] === undefined) e[s] = '';
      if (!AV.owns(e[s], owned, inv)) { dropped.push(s + ':' + e[s]); e[s] = s === 'top' ? 'hoodie' : s === 'bottom' ? 'jeans' : s === 'shoes' ? 'sneakers' : ''; }
    });
    return { equipped: e, dropped: dropped };
  };

  window.YGAvatar = AV;
})();
