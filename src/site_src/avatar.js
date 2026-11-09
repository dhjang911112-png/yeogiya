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
    const bodyY0 = w * (-AV.BOB_SIDE * passing + AV.BOB_SIDE * 0.35) + (1 - w) * (-1.2 * (breathe * 0.5 + 0.5));
    // 다리가 거의 펴진 그림이면 보폭 끝에서 발이 안 닿아 미끄러짐 → 걸을 때 골반을 필요한 만큼만 낮춤(무릎 살짝 굽힘)
    let sink = 0;
    ['Near', 'Far'].forEach((S) => {
      const hp = J['hip' + S], kn = J['knee' + S], an = J['ankle' + S]; if (!hp || !kn || !an) return;
      const L = (Math.hypot(kn[0] - hp[0], kn[1] - hp[1]) + Math.hypot(an[0] - kn[0], an[1] - kn[1])) * 0.985, half = AV.STRIDE_SIDE / 2;
      sink = Math.max(sink, (an[1] - hp[1]) - Math.sqrt(Math.max(0, L * L - half * half)) + AV.BOB_SIDE * 0.65);
    });
    const bodyY = bodyY0 + w * sink;
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
        const cx = ank[0] + w * (hip[0] - ank[0]); // 걸을 땐 보폭 중심을 골반 바로 아래로
        const foot = [cx + w * fx, ank[1] + w * fy];
        if (parts['foot' + S]) out['foot' + S] = { x: foot[0], y: foot[1], rot: ph < 0.5 ? 0 : -fwd * 8 * DEG * Math.sin(Math.PI * (ph - 0.5) / 0.5) * w, sy: 1 };
        const hp = [hip[0], hip[1] + bodyY];
        const restThigh = Math.atan2(knee[1] - hip[1], knee[0] - hip[0]), restShin = Math.atan2(ank[1] - knee[1], ank[0] - knee[0]);
        let r = ik2(hp, foot, l1, l2, fwd);
        // 발이 정강이 그림에 붙어 있으면 정강이가 기울 때 발끝/뒤꿈치가 땅 밑으로 들어감 → 그만큼 발목을 올려 굴림(뒤꿈치→발끝)
        const lp = parts['lowerLeg' + S];
        if (lp && lp.sole && !parts['foot' + S] && w > 0) {
          const f0 = foot.slice();
          for (let it = 0; it < 5; it++) {
            const rot = r.shin - restShin, c = Math.cos(rot), sn = Math.sin(rot);
            let best = null, by = -1e9;
            lp.sole.forEach((q) => { const dx = q[0] - ank[0], dy = q[1] - ank[1], vy = dx * sn + dy * c; if (vy > by) { by = vy; best = [dx, dy, dx * c - dy * sn, vy]; } });
            const ground = Math.max(...lp.sole.map((q) => q[1])) - ank[1];
            // 디딤: 땅에 닿은 점(뒤꿈치→발바닥→발끝)을 축으로 굴림 → 닿은 점은 미끄러지지 않음
            const pX = f0[0] + best[0] - best[2], pY = f0[1] + ground - best[3];
            // 스윙: 땅 밑으로만 안 들어가게. 스윙 초반엔 디딤 끝 자세에서 부드럽게 이어 붙임(발끝 떼기)
            const sX = f0[0], sY = Math.min(f0[1], f0[1] - Math.max(0, by - ground));
            const k = ph < 0.5 ? 1 : Math.pow(Math.max(0, 1 - (ph - 0.5) / 0.5 / 0.35), 2);
            const nx = sX + k * (pX - sX), ny = sY + k * (pY - sY);
            if (Math.abs(nx - foot[0]) < 0.1 && Math.abs(ny - foot[1]) < 0.1) break;
            foot[0] = nx; foot[1] = ny; r = ik2(hp, foot, l1, l2, fwd);
          }
        }
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

  // ================== 측면 v3: 키포즈 보행 + 메시 변형(스키닝) ==================
  // 팔·다리를 "한 장짜리" 그림으로 받아, 뼈(허벅지·정강이·발 / 위팔·아래팔)에 따라 그림을 부드럽게 휘게 그린다.
  // → 팔꿈치·무릎에 잘린 단면이 생기지 않는다. 동작은 아래 키포즈 표(사람이 직접 조정 가능)로 정한다.
  // 오른쪽 보기 기준 값. 왼쪽은 좌우 반전으로 같은 값을 씀.
  AV.GAIT_DEFAULT = {
    stepLen: 0.60,   // 한 걸음 길이 = 다리 길이 × 값
    stance: 0.60,    // 한 다리 주기 중 땅을 딛는 비율(나머지는 공중). 0.5 넘으면 양발 지지 구간이 생김
    // 다리 키포즈. u: 그 다리의 주기 위치(0 = 뒤꿈치 접지).
    // 디딤 구간(u < stance)은 발 위치를 계산(미끄럼 0)하고 발 각도만 키로 정한다.
    // foot: 발 각도(도, + = 발끝 들림), x: 골반 기준 앞뒤(걸음길이 배수), lift: 발목 높이(다리길이 배수)
    leg: [
      { u: 0.00, foot: 14 },             // 1 접지(뒤꿈치)
      { u: 0.10, foot: 0 },              // 2 체중 받기(발바닥 닿음)
      { u: 0.40, foot: 0 },              // 3 지나가기(한 발 지지)
      { u: 0.52, foot: -14 },            // 4 뒤꿈치 떼기
      { u: 0.60, foot: -34 },            // 5 발끝 떼기
      { u: 0.70, x: -0.34, lift: 0.09, foot: -18 },  // 6 스윙 초반(무릎 굽힘)
      { u: 0.84, x: 0.10, lift: 0.075, foot: -4 },   // 7 스윙 중간(발이 몸 아래 지나감)
      { u: 0.94, x: 0.46, lift: 0.025, foot: 12 }    // 8 스윙 끝(뻗기)
    ],
    // 몸 키포즈: 반 주기(한 걸음) 안에서 반복. u는 0~0.5 (0 = 앞발 접지)
    // y: 골반 높이(다리길이 배수, + = 아래로), lean: 몸통 앞 기울기(도), head: 머리 끄덕임(도, + = 앞으로)
    body: [
      { u: 0.00, y: 0.000, lean: 3.0, head: -0.6 },
      { u: 0.08, y: 0.006, lean: 3.4, head: -0.2 },
      { u: 0.25, y: 0.000, lean: 2.6, head: 0.6 },
      { u: 0.40, y: 0.000, lean: 2.8, head: 0.2 }
    ],
    // 팔: 반대쪽 다리와 함께 앞뒤로. swing: 어깨 흔들림(도), elbow: 기본 팔꿈치 굽힘(도), elbowFwd: 앞으로 갈 때 추가 굽힘, lag: 다리보다 늦는 정도(주기)
    arm: { swing: 15, back: 0.8, elbow: 8, elbowFwd: 16, lag: 0.05 },
    clear: 0.03,     // 스윙 중 발바닥이 땅에서 떨어지는 최소 높이(다리길이 배수)
    idleBreath: 0.004
  };
  AV.GAIT = JSON.parse(JSON.stringify(AV.GAIT_DEFAULT));
  try { const g = localStorage.getItem('yg_gait_side'); if (g && /[?&]gait=local/.test(location.search)) AV.GAIT = Object.assign(AV.GAIT, JSON.parse(g)); } catch (e) {}

  // 주기형 키 보간(Catmull-Rom). keys: [{u, ...}] 정렬됨, period: 1 또는 0.5
  function keyAt(keys, u, field, period) {
    const ks = keys.filter((k) => k[field] !== undefined);
    if (!ks.length) return 0;
    const n = ks.length; u = ((u % period) + period) % period;
    let i = n - 1; for (let j = 0; j < n; j++) if (ks[j].u <= u) i = j;
    const k1 = ks[i], k2 = ks[(i + 1) % n], k0 = ks[(i - 1 + n) % n], k3 = ks[(i + 2) % n];
    let u1 = k1.u, u2 = k2.u; if (u2 <= u1) u2 += period;
    let uu = u; if (uu < u1) uu += period;
    const t = (uu - u1) / Math.max(1e-6, u2 - u1);
    const p0 = k0[field], p1 = k1[field], p2 = k2[field], p3 = k3[field];
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }
  const rotv = (v, th) => [v[0] * Math.cos(th) - v[1] * Math.sin(th), v[0] * Math.sin(th) + v[1] * Math.cos(th)];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const len = (v) => Math.hypot(v[0], v[1]);

  function meshGeo(d) {
    if (d._geo) return d._geo;
    const J = d.joints, G = {};
    ['Near', 'Far'].forEach((S) => {
      const hip = J['hip' + S], knee = J['knee' + S], ank = J['ankle' + S];
      G[S] = { hip, knee, ank, ball: J['ball' + S], heel: J['heel' + S], toe: J['toe' + S], l1: len(sub(knee, hip)), l2: len(sub(ank, knee)) };
      G[S].L = G[S].l1 + G[S].l2;
    });
    G.L = (G.Near.L + G.Far.L) / 2;
    d._geo = G; return G;
  }
  AV.stepRig = function (look) {
    const m = AV.manifest; const b = m && m.bodies[look.body]; const d = b && b.directions[look.dir];
    if (d && d.rig === 'mesh') return AV.GAIT.stepLen * meshGeo(d).L;
    const o = b && (look.dir === 'left' ? b.directions.right : look.dir === 'right' ? b.directions.left : null);
    if (!d && o && o.rig === 'mesh') return AV.GAIT.stepLen * meshGeo(o).L;
    return (look.dir === 'left' || look.dir === 'right') ? AV.STRIDE_SIDE : AV.STEP_H * 1000;
  };

  // 한 다리의 발목 목표·발 각도 (골반 기준 아님: 리그 좌표). th = 발 회전(캔버스 라디안)
  function legTarget(g, u, fwd, w) {
    const GA = AV.GAIT, st = GA.stance, S = g.S2, fx = (x) => fwd * x;
    const groundY = g.ank[1];
    const ankFlat = (uu) => [g.hx + fx(st * S - 2 * S * uu), groundY]; // 디딤 중 발목(평평할 때): 몸이 가는 만큼 뒤로
    const stanceAt = (uu) => {
      const a = keyAt(GA.leg.filter((k) => k.u <= st + 1e-6), uu, 'foot', 1) * DEG;
      const th = -fwd * a, af = ankFlat(uu);
      const piv = a > 0 ? g.heel : g.toe; // 발끝 들림 → 뒤꿈치 축, 뒤꿈치 들림 → 발끝 축(발끝이 땅에 남음)
      const pf = add(af, sub(piv, g.ank)); // 평평할 때 축 점 위치(땅에 고정)
      return { ank: add(pf, rotv(sub(g.ank, piv), th)), th, lift: 0 };
    };
    if (u < st) return stanceAt(u);
    // 스윙: 디딤 끝 → 키 → 다음 접지 를 잇는 곡선
    const s0 = stanceAt(st - 1e-4), s1 = stanceAt(0);
    const pts = [{ u: st, x: s0.ank[0], y: s0.ank[1], a: -fwd * s0.th / DEG }];
    GA.leg.filter((k) => k.u > st).forEach((k) => pts.push({ u: k.u, x: g.hx + fx(k.x * S), y: groundY - k.lift * g.L, a: k.foot }));
    pts.push({ u: 1, x: s1.ank[0] + fx(2 * S), y: s1.ank[1], a: -fwd * s1.th / DEG });
    // 다음 접지 위치는 몸이 한 주기(2걸음) 간 뒤의 위치 → 몸 기준으로는 시작점과 같은 자리
    pts[pts.length - 1].x -= fx(2 * S);
    let i = 0; while (i < pts.length - 2 && pts[i + 1].u <= u) i++;
    const P = (j) => pts[Math.max(0, Math.min(pts.length - 1, j))];
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const t = (u - p1.u) / Math.max(1e-6, p2.u - p1.u), t2 = t * t, t3 = t2 * t;
    const cr = (f) => 0.5 * ((2 * p1[f]) + (-p0[f] + p2[f]) * t + (2 * p0[f] - 5 * p1[f] + 4 * p2[f] - p3[f]) * t2 + (-p0[f] + 3 * p1[f] - 3 * p2[f] + p3[f]) * t3);
    let y = cr('y'); const a = cr('a') * DEG;
    // 땅 아래로 내려가지 않게(발바닥 최저점이 바닥 위)
    const th = -fwd * a;
    const low = Math.max(...[g.heel, g.toe, g.ball].map((q) => rotv(sub(q, g.ank), th)[1] - (q[1] - g.ank[1])));
    // 발이 땅에 끌리지 않게: 스윙 동안 발바닥 최저점이 최소 높이(가운데서 가장 높게) 위에 있도록
    const sw = (u - st) / (1 - st), clr = (GA.clear || 0.03) * g.L * Math.pow(Math.sin(Math.PI * sw), 0.6);
    y = Math.min(y, groundY - Math.max(0, low) - clr);
    return { ank: [cr('x'), y], th, lift: groundY - y };
  }

  AV.animOpt = function (look) {
    const m = AV.manifest; const b = m && m.bodies[look.body]; if (!b) return {};
    const d = b.directions[look.dir] || (look.dir === 'left' ? b.directions.right : look.dir === 'right' ? b.directions.left : null);
    return { stepRig: AV.stepRig(look), mesh: !!(d && d.rig === 'mesh') };
  };
  function poseMesh(d, a, fwd) {
    const GA = AV.GAIT, J = d.joints, G = meshGeo(d);
    G.S = GA.stepLen * G.L;
    const w = Math.max(0, Math.min(1, a.walk || 0)), ph = a.phase || 0, t = a.t || 0;
    const L = G.L;
    // 몸
    const bu = ph % 0.5;
    const bodyYw = keyAt(GA.body, bu, 'y', 0.5) * L, lean = keyAt(GA.body, bu, 'lean', 0.5), headN = keyAt(GA.body, bu, 'head', 0.5);
    const breath = Math.sin(t * 2.2) * GA.idleBreath * L * (1 - w);
    // 골반 높이: 매 순간 "땅을 딛고 있는 다리"가 닿을 만큼만 낮춤 → 양발 지지 때 가장 낮고 한발 지지 때 가장 높은
    // 실제 보행의 상하 움직임이 계산으로 나옴(미리 100단계 표로 만들어 둠)
    const gkey = JSON.stringify(GA);
    if (G._sinkFor !== gkey) {
      const N = 100, tab = new Array(N).fill(0);
      for (let k = 0; k < N; k++) {
        ['Near', 'Far'].forEach((S) => {
          const u = (k / N + (S === 'Far' ? 0.5 : 0)) % 1; if (u >= GA.stance) return;
          const g = Object.assign({}, G[S], { hx: G[S].hip[0], S2: G.S });
          const tg = legTarget(g, u, 1, 1);
          const dx = tg.ank[0] - g.hip[0];
          const dyMax = Math.sqrt(Math.max(0, (g.L * 0.985) ** 2 - dx * dx));
          tab[k] = Math.max(tab[k], (tg.ank[1] - g.hip[1]) - dyMax);
        });
      }
      const sm = tab.map((_, k) => { let a = 0, n = 0; for (let j = -4; j <= 4; j++) { a = Math.max(a, tab[(k + j + N) % N]); n++; } return a; });
      G.drop = sm.map((_, k) => { let a = 0; for (let j = -3; j <= 3; j++) a += sm[(k + j + N) % N]; return a / 7; });
      G._sinkFor = gkey;
    }
    const dropNow = (() => { const x = (ph % 1) * 100, i = Math.floor(x), f = x - i; return G.drop[i % 100] * (1 - f) + G.drop[(i + 1) % 100] * f; })();
    const bodyY = w * (bodyYw + dropNow) + breath;
    const out = {}, bones = {};
    // 정지 자세의 발 위치: 멈춘 순간 땅을 딛던 발은 그 자리, 공중 발은 그 옆에 착지
    const idle = {};
    if (a.stopPhase != null) {
      const st = GA.stance, fl = {};
      ['Near', 'Far'].forEach((S) => {
        const u = (a.stopPhase + (S === 'Far' ? 0.5 : 0)) % 1; if (u >= st) return;
        const g = Object.assign({}, G[S], { hx: G[S].hip[0], S2: G.S }); const tg = legTarget(g, u, fwd, 1);
        // 땅에 닿아 있는 점(뒤꿈치 또는 발끝)을 그대로 두고 발을 평평하게 내림
        const keyA = -fwd * tg.th; const piv = keyA > 0.001 ? g.heel : keyA < -0.001 ? g.toe : g.ank;
        const pw = add(tg.ank, rotv(sub(piv, g.ank), tg.th));
        fl[S] = [pw[0] - (piv[0] - g.ank[0]), g.ank[1]];
      });
      ['Near', 'Far'].forEach((S) => {
        const o = S === 'Near' ? 'Far' : 'Near';
        idle[S] = fl[S] || [G[S].ank[0] + (fl[o] ? -0.35 * (fl[o][0] - G[o].ank[0]) : 0), G[S].ank[1]];
        idle[S].air = !fl[S];
      });
    }
    const tor = d.parts.torso ? d.parts.torso.pivot : [256, 600];
    const torRot = fwd * lean * DEG * w;
    const torPos = [tor[0], tor[1] + bodyY];
    out.torso = { x: torPos[0], y: torPos[1], rot: torRot, sy: 1 };
    const onTorso = (p) => add(torPos, rotv(sub(p, tor), torRot)); // 몸통에 붙은 점(어깨·목)
    if (J.neck && d.parts.head) { const n = onTorso(J.neck); out.head = { x: n[0], y: n[1], rot: torRot * 0.4 + fwd * headN * DEG * w, sy: 1 }; }
    // 다리
    ['Near', 'Far'].forEach((S) => {
      const g0 = G[S]; if (!g0.hip || !d.parts['leg' + S]) return;
      const u = (ph + (S === 'Far' ? 0.5 : 0)) % 1;
      const hipCur = [g0.hip[0], g0.hip[1] + bodyY];
      const g = Object.assign({}, g0, { hx: g0.hip[0], S2: G.S });
      const tg = legTarget(g, u, fwd, w);
      // 정지 자세: 발은 마지막으로 딛던 자리 근처(미끄럼 없이 멈춤)
      const idleAnk = idle[S] || g0.ank;
      // 멈출 때 공중 발: 먼저 제자리로 옮긴 뒤 내려놓음(땅에 끌리지 않게)
      const wx = idleAnk.air ? w * w : w, wy = idleAnk.air ? Math.sqrt(w) : w;
      const ank = [idleAnk[0] + (tg.ank[0] - idleAnk[0]) * wx, idleAnk[1] + (tg.ank[1] - idleAnk[1]) * wy];
      const th = tg.th * w;
      const r = ik2(hipCur, ank, g0.l1, g0.l2, fwd);
      const rT = Math.atan2(g0.knee[1] - g0.hip[1], g0.knee[0] - g0.hip[0]), rS = Math.atan2(g0.ank[1] - g0.knee[1], g0.ank[0] - g0.knee[0]);
      bones['leg' + S] = [
        { a: g0.hip, b: g0.knee, to: hipCur, rot: r.thigh - rT },
        { a: g0.knee, b: g0.ank, to: r.knee, rot: r.shin - rS },
        { a: g0.ank, b: g0.toe, to: ank, rot: th }
      ];
      out['leg' + S] = { x: hipCur[0], y: hipCur[1], rot: 0, sy: 1, mesh: true };
    });
    // 팔: 반대쪽 다리와 같이(Near 팔 = Far 다리)
    ['Near', 'Far'].forEach((S) => {
      const sh = J['shoulder' + S], el = J['elbow' + S], hd = J['hand' + S]; if (!sh || !el || !hd || !d.parts['arm' + S]) return;
      const u = (ph + (S === 'Far' ? 0.5 : 0) - GA.arm.lag + 1) % 1;
      const sw = -Math.cos(TAU * (u - 0.5)); // +1 = 앞
      const swing = (sw > 0 ? sw : sw * GA.arm.back) * GA.arm.swing * w;
      const elb = (GA.arm.elbow + GA.arm.elbowFwd * Math.max(0, sw)) * w;
      const shCur = onTorso(sh);
      const upRot = torRot - fwd * swing * DEG;
      const elCur = add(shCur, rotv(sub(el, sh), upRot));
      const foreRot = upRot - fwd * elb * DEG;
      bones['arm' + S] = [
        { a: sh, b: el, to: shCur, rot: upRot },
        { a: el, b: hd, to: elCur, rot: foreRot }
      ];
      out['arm' + S] = { x: shCur[0], y: shCur[1], rot: 0, sy: 1, mesh: true };
    });
    out._bones = bones;
    return out;
  }
  AV.poseMesh = poseMesh;

  // ---- 메시(격자) 만들기와 스키닝 ----
  const CELL = 14;
  function meshFor(part, bonesRest) {
    if (part._mesh) return part._mesh;
    const rec = AV.img[part.src]; if (!rec || !rec.ok) return null;
    const cv = document.createElement('canvas'); cv.width = part.w; cv.height = part.h;
    const cx = cv.getContext('2d'); cx.drawImage(rec.im, 0, 0);
    let A; try { A = cx.getImageData(0, 0, part.w, part.h).data; } catch (e) { return null; }
    const nx = Math.ceil(part.w / CELL), ny = Math.ceil(part.h / CELL);
    const vx = [], idx = (i, j) => j * (nx + 1) + i;
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const p = [part.x + Math.min(i * CELL, part.w), part.y + Math.min(j * CELL, part.h)];
      // 뼈까지 거리 → 가중치 (가까운 뼈일수록 크게, 관절 근처는 섞임 → 부드럽게 휨)
      const ws = bonesRest.map((b) => {
        const ab = sub(b.b, b.a), ap = sub(p, b.a); const tt = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1]) / (ab[0] * ab[0] + ab[1] * ab[1] || 1)));
        const dd = len(sub(p, add(b.a, [ab[0] * tt, ab[1] * tt]))); return 1 / Math.pow(dd + 6, 4);
      });
      const sw = ws.reduce((s, v) => s + v, 0); vx.push({ p, w: ws.map((v) => v / sw) });
    }
    const cells = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      let hit = false;
      for (let y = j * CELL; y < Math.min(part.h, (j + 1) * CELL) && !hit; y += 2) for (let x = i * CELL; x < Math.min(part.w, (i + 1) * CELL); x += 2) if (A[(y * part.w + x) * 4 + 3] > 8) { hit = true; break; }
      if (hit) cells.push([idx(i, j), idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1)]);
    }
    part._mesh = { vx, cells }; return part._mesh;
  }
  function drawTri(ctx, im, s0, s1, s2, d0, d1, d2, ox, oy) {
    // 원본 삼각형(s, 그림 내부 좌표) → 화면 삼각형(d) 아핀 변환으로 그림 일부를 그림
    const den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]); if (!den) return;
    const a = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den;
    const b = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den;
    const c = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den;
    const dd = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
    const e = d0[0] - a * s0[0] - c * s0[1], f = d0[1] - b * s0[0] - dd * s0[1];
    // 이음새가 안 보이게 삼각형을 아주 조금 키워서 자름
    const mx = (d0[0] + d1[0] + d2[0]) / 3, my = (d0[1] + d1[1] + d2[1]) / 3, g = (p) => { const vx = p[0] - mx, vy = p[1] - my, l = Math.hypot(vx, vy) || 1; return [p[0] + vx / l * 1.1, p[1] + vy / l * 1.1]; };
    const e0 = g(d0), e1 = g(d1), e2 = g(d2);
    ctx.save(); ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.clip();
    ctx.transform(a, b, c, dd, e, f);
    const x0 = Math.min(s0[0], s1[0], s2[0]) - 2, y0 = Math.min(s0[1], s1[1], s2[1]) - 2, x1 = Math.max(s0[0], s1[0], s2[0]) + 2, y1 = Math.max(s0[1], s1[1], s2[1]) + 2;
    const sx = Math.max(0, x0 - ox), sy = Math.max(0, y0 - oy);
    ctx.drawImage(im, sx, sy, Math.min(im.width - sx, x1 - x0), Math.min(im.height - sy, y1 - y0), sx + ox, sy + oy, Math.min(im.width - sx, x1 - x0), Math.min(im.height - sy, y1 - y0));
    ctx.restore();
  }
  // ---- WebGL(그래픽 카드)로 메시를 그림: 삼각형 수백 개도 1ms 안쪽. 안 되면 캔버스 방식으로 대체 ----
  let GL = null;
  function glInit() {
    if (GL !== null) return GL;
    try {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
      const gl = c.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true });
      if (!gl) { GL = false; return GL; }
      const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); return o; };
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p;attribute vec2 uv;uniform vec2 sz;varying vec2 v;void main(){v=uv;gl_Position=vec4(p.x/sz.x*2.0-1.0,1.0-p.y/sz.y*2.0,0.0,1.0);}'));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, 'precision mediump float;varying vec2 v;uniform sampler2D t;void main(){gl_FragColor=texture2D(t,v);}'));
      gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { GL = false; return GL; }
      gl.useProgram(pr);
      GL = { c, gl, pr, aP: gl.getAttribLocation(pr, 'p'), aU: gl.getAttribLocation(pr, 'uv'), uS: gl.getUniformLocation(pr, 'sz'), bP: gl.createBuffer(), bU: gl.createBuffer(), bI: gl.createBuffer(), tex: {} };
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.SCISSOR_TEST);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    } catch (e) { GL = false; }
    return GL;
  }
  function glTex(G, src, im) {
    if (G.tex[src]) return G.tex[src];
    const gl = G.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    G.tex[src] = t; return t;
  }
  AV.useWebGL = !/[?&]mesh=2d/.test(location.search);
  AV.drawSkinned = function (ctx, part, bones, imgs) {
    const m = meshFor(part, bones); if (!m) return;
    const P = m.vx.map((v) => {
      let x = 0, y = 0;
      bones.forEach((b, k) => { const q = add(b.to, rotv(sub(v.p, b.a), b.rot)); x += q[0] * v.w[k]; y += q[1] * v.w[k]; });
      return [x, y];
    });
    const G = AV.useWebGL && glInit();
    if (G) {
      const T = ctx.getTransform(); const D = P.map((q) => [T.a * q[0] + T.c * q[1] + T.e, T.b * q[0] + T.d * q[1] + T.f]);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; D.forEach((q) => { if (q[0] < x0) x0 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[0] > x1) x1 = q[0]; if (q[1] > y1) y1 = q[1]; });
      const bx = Math.floor(x0) - 1, by = Math.floor(y0) - 1, bw = Math.min(1024, Math.ceil(x1 - bx) + 2), bh = Math.min(1024, Math.ceil(y1 - by) + 2);
      const gl = G.gl;
      if (!m.idx) { const I = []; m.cells.forEach((c) => I.push(c[0], c[1], c[2], c[0], c[2], c[3])); m.idx = new Uint16Array(I); m.n = I.length; }
      gl.viewport(0, 1024 - bh, bw, bh); gl.scissor(0, 1024 - bh, bw, bh); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(G.uS, bw, bh);
      const pos = new Float32Array(D.length * 2); D.forEach((q, i) => { pos[i * 2] = q[0] - bx; pos[i * 2 + 1] = q[1] - by; });
      gl.bindBuffer(gl.ARRAY_BUFFER, G.bP); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(G.aP); gl.vertexAttribPointer(G.aP, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, G.bI); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
      (imgs || [part]).forEach((l) => {
        const r = AV.img[l.src]; if (!r || !r.ok) return;
        const uv = new Float32Array(m.vx.length * 2); m.vx.forEach((v, i) => { uv[i * 2] = (v.p[0] - l.x) / r.im.width; uv[i * 2 + 1] = (v.p[1] - l.y) / r.im.height; });
        gl.bindBuffer(gl.ARRAY_BUFFER, G.bU); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(G.aU); gl.vertexAttribPointer(G.aU, 2, gl.FLOAT, false, 0, 0);
        gl.bindTexture(gl.TEXTURE_2D, glTex(G, l.src, r.im));
        gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0);
      });
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(G.c, 0, 0, bw, bh, bx, by, bw, bh); ctx.restore();
      return;
    }
    (imgs || [part]).forEach((l) => {
      const r = AV.img[l.src]; if (!r || !r.ok) return;
      m.cells.forEach((c) => {
        drawTri(ctx, r.im, m.vx[c[0]].p, m.vx[c[1]].p, m.vx[c[2]].p, P[c[0]], P[c[1]], P[c[2]], l.x, l.y);
        drawTri(ctx, r.im, m.vx[c[0]].p, m.vx[c[2]].p, m.vx[c[3]].p, P[c[0]], P[c[2]], P[c[3]], l.x, l.y);
      });
    });
  };

  AV.pose = function (dirData, dir, a) {
    if ((dir === 'left' || dir === 'right') && dirData.rig === 'mesh') return poseMesh(dirData, a, dir === 'right' ? 1 : -1);
    if (dir === 'left' || dir === 'right') return poseSide(dirData, a, dir === 'right' ? 1 : -1);
    return poseFrontBack(dirData, a, dir === 'back');
  };

  const ORDER = {
    front: ['hair_back', 'legL', 'legR', 'upperLegL', 'upperLegR', 'lowerLegL', 'lowerLegR', 'torso', 'armL', 'armR', 'upperArmL', 'upperArmR', 'lowerArmL', 'lowerArmR', 'head'],
    back: ['head', 'armL', 'armR', 'upperArmL', 'upperArmR', 'lowerArmL', 'lowerArmR', 'legL', 'legR', 'upperLegL', 'upperLegR', 'lowerLegL', 'lowerLegR', 'torso'],
    // 아래팔/정강이의 잘린 단면(캡)이 위팔/허벅지 밑에, 허벅지 윗단면이 몸통(반바지) 밑에 숨도록
    side: ['lowerArmFar', 'upperArmFar', 'armFar', 'lowerLegFar', 'footFar', 'upperLegFar', 'legFar', 'lowerLegNear', 'footNear', 'upperLegNear', 'legNear', 'torso', 'head', 'lowerArmNear', 'upperArmNear', 'armNear']
  };
  AV.SLOT_ORDER = ['bottom', 'shoes', 'top', 'outer', 'accessory', 'hair'];

  // 이 캐릭터를 새 시스템으로 그릴 수 있는가(몸 방향 + 장착한 모든 칸의 그림이 있을 때만)
  AV.canDraw = function (look, opts) {
    const m = AV.manifest; if (!m) return { ok: false, why: '매니페스트 로딩 중' };
    const body = m.bodies[look.body]; if (!body) return { ok: false, why: '기본 바디 없음' };
    const dir = look.dir || 'front';
    const opp = dir === 'left' ? body.directions.right : dir === 'right' ? body.directions.left : null;
    if (!body.directions[dir] && !(opp && opp.rig === 'mesh')) return { ok: false, why: dir + ' 방향 기본 바디 없음' };
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
    // 왼쪽/오른쪽 중 한쪽만 있으면 좌우 반전으로 그림(대칭 캐릭터 기준)
    const opp = want === 'left' ? 'right' : want === 'right' ? 'left' : null;
    const mirror = !body.directions[want] && opp && body.directions[opp] && body.directions[opp].rig === 'mesh';
    const usedDir = body.directions[want] ? want : mirror ? opp : (body.directions.front ? 'front' : firstDir);
    const dirData = body.directions[usedDir];
    if (!dirData) return { missing: ['no directions'] };
    const missing = []; if (usedDir !== want && !mirror) missing.push(want + ' 방향 이미지 없음');
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
    if (mirror) { ctx.translate(512, 0); ctx.scale(-1, 1); }
    const xf = (name, fn) => {
      const part = dirData.parts[name]; if (!part) return;
      const ps = pose[name] || { x: part.pivot[0], y: part.pivot[1], rot: 0, sy: 1 };
      if (ps.mesh) { fn(part, pose._bones[name]); return; }
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
    order.forEach((name) => xf(name, (part, bones) => { const ls = (extra[name] || []).filter((l) => l.z < 0).sort((a, b) => a.order - b.order); if (bones) { if (ls.length) AV.drawSkinned(ctx, part, bones, ls); } else ls.forEach(img); }));
    // 2) 몸 파츠 + 그 위의 의상 레이어
    order.forEach((name) => xf(name, (part, bones) => {
      if (bones) { AV.drawSkinned(ctx, part, bones, [part].concat((extra[name] || []).filter((l) => l.z >= 0).sort((a, b) => a.order - b.order))); if (opt && opt.debug) bones.forEach((b) => { ctx.fillStyle = '#ff3b6b'; ctx.beginPath(); ctx.arc(b.to[0], b.to[1], 7, 0, TAU); ctx.fill(); }); return; }
      img(part);
      (extra[name] || []).filter((l) => l.z >= 0).sort((a, b) => a.order - b.order).forEach(img);
      if (opt && opt.debug) {
        ctx.fillStyle = '#ff3b6b'; ctx.beginPath(); ctx.arc(part.pivot[0], part.pivot[1], 7, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,59,107,.6)'; ctx.lineWidth = 2; ctx.strokeRect(part.x, part.y, part.w, part.h);
      }
    }));
    ctx.restore();
    return { missing: missing, dir: mirror ? want : usedDir, mirror: !!mirror, pose: pose };
  };

  // 디딤발(발목) 화면 위치 — 미끄럼 측정용
  AV.footPos = function (look, anim, which) {
    const m = AV.manifest, body = m.bodies[look.body]; const dir = look.dir || 'front';
    const opp = dir === 'left' ? 'right' : dir === 'right' ? 'left' : null;
    const mir = !body.directions[dir] && opp && body.directions[opp] && body.directions[opp].rig === 'mesh';
    const used = body.directions[dir] ? dir : mir ? opp : (body.directions.front ? 'front' : Object.keys(body.directions)[0]);
    const d = body.directions[used]; if (!d) return null;
    const pose = AV.pose(d, used, anim);
    if (pose._bones && pose._bones['leg' + which]) { const q = pose._bones['leg' + which][2].to.slice(); if (mir) q[0] = 512 - q[0]; return q; }
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
  // opt: { stepRig: 한 걸음 길이(리그 단위, AV.stepRig(look)), mesh: 메시 리그 여부 }
  AV.Animator.prototype.update = function (dt, movedPx, scale, moving, dir, opt) {
    this.t += dt;
    const side = dir === 'left' || dir === 'right';
    const stepPx = ((opt && opt.stepRig) || (side ? AV.STRIDE_SIDE : AV.STEP_H * 1000)) * scale;
    if (opt && opt.mesh) {
      // 서 있다가 출발: 한 발 지지 중간 자세(발이 몸 아래)에서 시작 → 서 있는 자세와 가장 가까움
      if (moving && this.walk < 0.05 && this.stopPhase == null) this.phase = 0.3;
      if (movedPx > 0 && scale > 0) this.phase = (this.phase + movedPx / (2 * stepPx)) % 1;
      const k = 1 - Math.exp(-dt * (moving ? 12 : 10));
      this.walk += ((moving ? 1 : 0) - this.walk) * k;
      // 멈춤: 위상을 그대로 두면 디딤발은 그 자리에 고정, 공중 발만 내려와 착지(미끄럼 없음)
      if (moving) this.stopPhase = this.phase; 
      return { phase: this.phase, walk: this.walk, t: this.t, stopPhase: this.stopPhase == null ? null : this.stopPhase };
    }
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
