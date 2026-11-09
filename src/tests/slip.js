const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
 await p.goto('http://localhost:8080/avatar-lab.html'); await p.waitForTimeout(1500);
 const r = await p.evaluate(() => { const AV = YGAvatar, out = {};
  for (const g of ['male_base', 'female_base']) for (const dir of ['right', 'left']) { const d = AV.manifest.bodies[g].directions[dir], fwd = dir === 'right' ? 1 : -1;
   let worst = 0, worstToe = 0; const N = 400;
   for (const leg of ['Near', 'Far']) { const nm = 'lowerLeg' + leg, pt = d.parts[nm], pv = pt.pivot, gy = Math.max(...pt.sole.map(z => z[1]));
    const runs = pt.sole.map(() => []); const all = pt.sole.map(() => []);
    for (let i = 0; i <= 2 * N; i++) { const ph = (i / N) % 1; const bx = fwd * (i / N) * 2 * AV.STRIDE_SIDE; const ps = AV.pose(d, dir, { walk: 1, phase: ph, t: 0 })[nm];
     pt.sole.forEach((q, k) => { const dx = q[0] - pv[0], dy = q[1] - pv[1]; const x = bx + ps.x + dx * Math.cos(ps.rot) - dy * Math.sin(ps.rot), y = ps.y + dx * Math.sin(ps.rot) + dy * Math.cos(ps.rot);
       if (y >= gy - 2) runs[k].push(x); else { if (runs[k].length > 5) all[k].push(Math.max(...runs[k]) - Math.min(...runs[k])); runs[k] = []; } }); }
    all.forEach(a => a.forEach(v => { worst = Math.max(worst, v); })); }
   out[g + ' ' + dir] = +worst.toFixed(1); }
  return out; });
 console.log(JSON.stringify(r)); await b.close(); })();
