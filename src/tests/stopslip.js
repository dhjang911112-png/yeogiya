const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto('http://localhost:8080/avatar-lab.html'); await p.waitForTimeout(1500);
 const r = await p.evaluate(() => { const AV = YGAvatar, d = AV.manifest.bodies.female_pilot.directions.right, J = d.joints; const S = 0.3, V = 0.75 * 300, dt = 1 / 60;
  const res = []; for (let trial = 0; trial < 12; trial++) { const an = new AV.Animator(); let px = 0, vx = 0; const look = { body: 'female_pilot', dir: 'right', equip: {} };
   const walkT = 1.5 + trial * 0.037; let worst = 0; const runs = {};
   for (let i = 0; i < 60 * (walkT + 1.5); i++) { const t = i * dt; const tv = t < walkT ? V : 0; const acc = (tv ? 1000 : 1500) / 128 * V * dt; vx += Math.max(-acc, Math.min(acc, tv - vx)); const ox = px; px += vx * dt;
    const a = an.update(dt, px - ox, S, (px - ox) > 0.001, 'right', AV.animOpt(look)); const ps = AV.pose(d, 'right', a);
    ['Near', 'Far'].forEach((L) => { const f = ps._bones['leg' + L][2]; ['heel', 'toe'].forEach((k) => { const q = J[k + L], v = [q[0] - f.a[0], q[1] - f.a[1]], c = Math.cos(f.rot), s = Math.sin(f.rot); const x = px + (f.to[0] + v[0] * c - v[1] * s) * S, y = f.to[1] + v[0] * s + v[1] * c; const key = L + k;
      if (t > walkT - 0.6 && y >= q[1] - 1.5) (runs[key] = runs[key] || []).push(x); else { const a2 = runs[key]; if (a2 && a2.length > 3) worst = Math.max(worst, Math.max(...a2) - Math.min(...a2)); runs[key] = []; } }); }); }
   Object.values(runs).forEach((a2) => { if (a2.length > 3) worst = Math.max(worst, Math.max(...a2) - Math.min(...a2)); });
   res.push(+(worst / S).toFixed(1)); }
  return res; });
 console.log('멈출 때 땅에 닿은 발 미끄러짐(리그 px), 멈춤 시점 12가지:', JSON.stringify(r)); await b.close(); })();
