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
      { u: 0.72, x: -0.30, lift: 0.075, foot: -30 }, // 6 스윙 초반(무릎 굽힘)
      { u: 0.84, x: 0.10, lift: 0.075, foot: -6 },   // 7 스윙 중간(발이 몸 아래 지나감)
      { u: 0.94, x: 0.46, lift: 0.025, foot: 12 }    // 8 스윙 끝(뻗기)
    ],
    // 몸 키포즈: 반 주기(한 걸음) 안에서 반복. u는 0~0.5 (0 = 앞발 접지)
    // y: 골반 높이(다리길이 배수, + = 아래로), lean: 몸통 앞 기울기(도), head: 머리 끄덕임(도, + = 앞으로)
    body: [
      { u: 0.00, y: 0.004, lean: 3.0, head: -0.6 },
      { u: 0.08, y: 0.012, lean: 3.4, head: -0.2 },
      { u: 0.25, y: -0.008, lean: 2.6, head: 0.6 },
      { u: 0.40, y: -0.002, lean: 2.8, head: 0.2 }
    ],
    // 팔: 반대쪽 다리와 함께 앞뒤로. swing: 어깨 흔들림(도), elbow: 기본 팔꿈치 굽힘(도), elbowFwd: 앞으로 갈 때 추가 굽힘, lag: 다리보다 늦는 정도(주기)
    arm: { swing: 15, back: 0.8, elbow: 8, elbowFwd: 16, lag: 0.05 },
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
    G.S = AV.GAIT.stepLen * G.L;
    d._geo = G; return G;
  }
  AV.stepRig = function (look) {
    const m = AV.manifest; const b = m && m.bodies[look.body]; const d = b && b.directions[look.dir];
    if (d && d.rig === 'mesh') return meshGeo(d).S;
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
      const piv = a > 0 ? g.heel : g.ball; // 발끝 들림 → 뒤꿈치 축, 뒤꿈치 들림 → 발볼 축
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
    const low = Math.max(...[g.heel, g.toe, g.ball].map((q) => rotv(sub(q, g.ank), th)[1])) - Math.max(...[g.heel, g.toe, g.ball].map((q) => q[1] - g.ank[1]));
    y = Math.min(y, groundY - Math.max(0, low));
    return { ank: [cr('x'), y], th, lift: groundY - y };
  }

  function poseMesh(d, a, fwd) {
    const GA = AV.GAIT, J = d.joints, G = meshGeo(d);
    const w = Math.max(0, Math.min(1, a.walk || 0)), ph = a.phase || 0, t = a.t || 0;
    const L = G.L;
    // 몸
    const bu = ph % 0.5;
    const bodyYw = keyAt(GA.body, bu, 'y', 0.5) * L, lean = keyAt(GA.body, bu, 'lean', 0.5), headN = keyAt(GA.body, bu, 'head', 0.5);
    const breath = Math.sin(t * 2.2) * GA.idleBreath * L * (1 - w);
    // 걸을 때 다리가 닿도록 골반을 낮춤(필요한 만큼만, 미리 계산)
    if (G._sinkFor !== JSON.stringify(GA)) {
      let need = 0;
      ['Near', 'Far'].forEach((S) => {
        const g = Object.assign({}, G[S], { hx: G[S].hip[0], S2: G.S });
        for (let k = 0; k < 100; k++) {
          const tg = legTarget(g, k / 100, 1, 1);
          const dx = tg.ank[0] - g.hip[0], by = keyAt(GA.body, (k / 100) % 0.5, 'y', 0.5) * L;
          const dyMax = Math.sqrt(Math.max(0, (g.L * 0.975) ** 2 - dx * dx));
          need = Math.max(need, (tg.ank[1] - g.hip[1] - by) - dyMax);
        }
      });
      G.sink = Math.max(0, need); G._sinkFor = JSON.stringify(GA);
    }
    const bodyY = w * (bodyYw + G.sink) + breath;
    const out = {}, bones = {};
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
      const idleAnk = g0.ank, ank = [idleAnk[0] + (tg.ank[0] - idleAnk[0]) * w, idleAnk[1] + (tg.ank[1] - idleAnk[1]) * w];
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
  AV.drawSkinned = function (ctx, part, bones, imgs) {
    const m = meshFor(part, bones); if (!m) return;
    const P = m.vx.map((v) => {
      let x = 0, y = 0;
      bones.forEach((b, k) => { const q = add(b.to, rotv(sub(v.p, b.a), b.rot)); x += q[0] * v.w[k]; y += q[1] * v.w[k]; });
      return [x, y];
    });
    (imgs || [part]).forEach((l) => {
      const r = AV.img[l.src]; if (!r || !r.ok) return;
      m.cells.forEach((c) => {
        drawTri(ctx, r.im, m.vx[c[0]].p, m.vx[c[1]].p, m.vx[c[2]].p, P[c[0]], P[c[1]], P[c[2]], l.x, l.y);
        drawTri(ctx, r.im, m.vx[c[0]].p, m.vx[c[2]].p, m.vx[c[3]].p, P[c[0]], P[c[2]], P[c[3]], l.x, l.y);
      });
    });
  };
