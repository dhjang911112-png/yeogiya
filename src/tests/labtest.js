const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
 p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type()==='error') console.log('CONSOLE', m.text()); });
 await p.goto('http://localhost:8080/avatar-lab.html'); await p.waitForTimeout(1200);
 await p.screenshot({ path: 'lab_idle.png' });
 for (const g of ['bm','bf']) {
   await p.click('#' + g); await p.evaluate(() => { __lab.me.y = 230; __lab.prints.length = 0; });
   await p.evaluate(() => __lab.keys.add('d'));
   // sample stance-foot screen y every frame for 2.4s
   const samples = await p.evaluate(() => new Promise((res) => { const out = []; const t0 = performance.now(); const f = () => { const ft = __lab.foot; if (ft) out.push([ft.leg, ft.y, ft.phase, __lab.me.y]); if (performance.now() - t0 < 2400) requestAnimationFrame(f); else res(out); }; setTimeout(() => requestAnimationFrame(f), 500); }));
   // per stance: drift of the planted foot
   let segs = [], cur = null; for (const s of samples) { if (!cur || cur.leg !== s[0]) { cur = { leg: s[0], ys: [] }; segs.push(cur); } cur.ys.push(s[1]); }
   const drift = segs.filter(s => s.ys.length > 5).map(s => +(Math.max(...s.ys) - Math.min(...s.ys)).toFixed(2));
   const bodyMove = +(samples[samples.length-1][3] - samples[0][3]).toFixed(1);
   console.log(g === 'bm' ? 'male' : 'female', 'body moved', bodyMove, 'px; planted-foot drift per stance (px):', JSON.stringify(drift));
   for (let i = 0; i < 4; i++) { await p.waitForTimeout(95); await p.screenshot({ path: `lab_${g}_walk${i}.png`, clip: { x: 0, y: 140, width: 390, height: 520 } }); }
   await p.evaluate(() => __lab.keys.clear()); await p.waitForTimeout(700);
 }
 await p.click('#bd'); await p.click('#bm'); await p.evaluate(() => { __lab.me.y = 380; }); await p.waitForTimeout(400);
 await p.screenshot({ path: 'lab_debug.png' });
 await b.close(); })();
