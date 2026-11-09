const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
 p.on('pageerror', e => console.log('ERR', e.message));
 await p.goto('http://localhost:8080/avatar-lab.html'); await p.waitForTimeout(1500);
 for (const g of ['male_base', 'female_base']) for (const [dir, key] of [['right', 'r'], ['left', 'l']]) {
  await p.click(g === 'female_base' ? '#bf' : '#bm');
  await p.evaluate(([dir]) => { __lab.keys.clear(); __lab.me.x = dir === 'right' ? 50 : 340; __lab.me.y = 420; __lab.me.vx = 0; __lab.prints.length = 0; }, [dir]);
  await p.waitForTimeout(300); await p.evaluate((k) => __lab.keys.add(k), key);
  const r = await p.evaluate(([g, dir]) => new Promise((res) => { const AV = YGAvatar; const segs = {}; const t0 = performance.now(); let n = 0;
   const f = () => { const L = __lab, a = L.anim;
     if (a.walk > 0.97 && L.look.dir === dir) { const d = AV.manifest.bodies[g].directions[dir]; const pose = AV.pose(d, dir, { walk: a.walk, phase: a.phase, t: a.t });
       const S = Math.min(document.getElementById('stage').clientHeight * 0.34, 190) / 1000;
       for (const leg of ['Near', 'Far']) { const nm = 'lowerLeg' + leg, ps = pose[nm], pt = d.parts[nm], pv = pt.pivot;
         const ph = (a.phase + (leg === 'Far' ? 0.5 : 0)) % 1; const cyc = Math.floor((L.me.x) / 1); 
         pt.sole.forEach((q, qi) => { const dx = q[0] - pv[0], dy = q[1] - pv[1]; const rx = ps.x + dx * Math.cos(ps.rot) - dy * Math.sin(ps.rot), ry = ps.y + dx * Math.sin(ps.rot) + dy * Math.cos(ps.rot);
           const gy = Math.max(...pt.sole.map(z => z[1]));
           if (ry >= gy - 3) { const key = leg + ':' + Math.floor((a.phase + (leg === 'Far' ? 0.5 : 0)) + L.me.cyc) + ':' + qi; (segs[key] = segs[key] || []).push((L.me.x + (rx - 256) * S) / S); } }); }
     }
     if (a.phase < (L.me.lp || 0)) L.me.cyc = (L.me.cyc || 0) + 1; L.me.lp = a.phase;
     if (performance.now() - t0 < 3000) requestAnimationFrame(f); else { const out = {}; for (const k in segs) { const v = segs[k]; if (v.length > 3) { const kk = k.split(':').slice(0, 2).join(':'); out[kk] = Math.max(out[kk] || 0, Math.max(...v) - Math.min(...v)); } } res(out); } };
   setTimeout(() => requestAnimationFrame(f), 700); }), [g, dir]);
  await p.evaluate(() => __lab.keys.clear());
  const vals = Object.values(r).map(v => +v.toFixed(1));
  console.log(g, dir, '땅에 닿아 있는 발바닥 점의 수평 미끄러짐(리그 px) 최대', Math.max(...vals), '구간별', JSON.stringify(vals));
  await p.waitForTimeout(300);
 }
 await b.close(); })();
