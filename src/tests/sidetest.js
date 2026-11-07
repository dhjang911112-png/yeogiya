const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
 p.on('pageerror', e => console.log('ERR', e.message));
 await p.goto('http://localhost:8080/avatar-lab.html'); await p.waitForTimeout(1200);
 await p.click('#bq'); await p.evaluate(() => { __lab.me.x = 60; __lab.me.y = 400; __lab.keys.add('r'); });
 const samples = await p.evaluate(() => new Promise((res) => { const out = []; const t0 = performance.now(); const f = () => { const ft = __lab.foot; if (ft) out.push([ft.leg, ft.x, ft.y, ft.phase, __lab.me.x]); if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(out); }; setTimeout(() => requestAnimationFrame(f), 500); }));
 let segs = [], cur = null; for (const s of samples) { if (!cur || cur.leg !== s[0]) { cur = { leg: s[0], xs: [], ys: [] }; segs.push(cur); } cur.xs.push(s[1]); cur.ys.push(s[2]); }
 const full = segs.slice(1, -1);
 console.log('SIDE mannequin: body moved', +(samples[samples.length-1][4]-samples[0][4]).toFixed(1), 'px; steps', full.length, '; planted-foot drift per stance x:', JSON.stringify(full.map(s => +(Math.max(...s.xs)-Math.min(...s.xs)).toFixed(2))), 'y:', JSON.stringify(full.map(s => +(Math.max(...s.ys)-Math.min(...s.ys)).toFixed(2))));
 await p.evaluate(() => { __lab.me.x = 120; }); await p.waitForTimeout(200);
 for (let i = 0; i < 6; i++) { await p.waitForTimeout(70); await p.screenshot({ path: `side_${i}.png`, clip: { x: 0, y: 150, width: 390, height: 520 } }); }
 await p.evaluate(() => __lab.keys.clear()); 
 await b.close(); })();
