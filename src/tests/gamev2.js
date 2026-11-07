const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
 const mk = async (nick, fem, mode) => { const cx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await cx.route('**/lib/firebase-config.js', r => r.fulfill({ body: 'window.YG_FIREBASE=null', contentType: 'text/javascript' }));
   const p = await cx.newPage(); p.on('pageerror', e => console.log(nick, 'ERR', e.message));
   await p.goto('http://localhost:8080/index.html'); await p.waitForTimeout(600); if (fem) { await p.click('text=여자'); await p.waitForTimeout(200); }
   await p.fill('#nick', nick); await p.click('text=여기야 시작하기'); await p.waitForURL('**/game.html');
   await p.goto('http://localhost:8080/game.html?broker=ws://localhost:8883&avatar=' + mode); await p.waitForTimeout(2200); return p; };
 const A = await mk('덕환', false, 'force'), C = await mk('지은', true, 'force'), D = await mk('민수', false, 'on'); await A.waitForTimeout(1500);
 const info = (P) => P.evaluate(() => ({ mode: YG.avMode(), canvases: [...document.querySelectorAll('canvas.yg-av')].map(c => c.getAttribute('data-k')), why: __dc.avWhy }));
 console.log('A(force):', JSON.stringify(await info(A)));
 console.log('D(on):', JSON.stringify(await info(D)));
 await A.evaluate(() => __dc.setState({ zoomI: 4 })); await C.evaluate(() => __dc.setState({ zoomI: 4 }));
 await A.evaluate(() => __dc.walkTo(__dc.state.px, __dc.state.py + 120)); await A.waitForTimeout(500); await A.screenshot({ path: 'g2_A_walkdown.png' });
 await A.waitForTimeout(1200);
 await A.keyboard.down('ArrowLeft'); await A.waitForTimeout(500); console.log('A facing left canvases:', JSON.stringify(await info(A))); await A.screenshot({ path: 'g2_A_left.png' }); await A.keyboard.up('ArrowLeft');
 await A.waitForTimeout(800); await C.screenshot({ path: 'g2_C_view.png' });
 // ownership guard
 const r = await A.evaluate(() => { __dc.setState({ eq: Object.assign({}, __dc.state.eq, { top: 'tbcard', hair: 'hair2' }) }); return [__dc.state.eq, __dc.state.equipped]; });
 console.log('A equip not-owned ->', JSON.stringify(r));
 const r2 = await A.evaluate(() => { __dc.setState({ inv: ['tbcard'] }); __dc.setState({ eq: Object.assign({}, __dc.state.eq, { top: 'tbcard' }) }); return [__dc.state.eq.top, __dc.state.equipped.top, __dc.state.equipped.outer]; });
 console.log('A equip owned tbcard ->', JSON.stringify(r2));
 // fps while walking with v2
 const fps = await A.evaluate(() => new Promise((res) => { __dc.walkTo(__dc.state.px + 200, __dc.state.py); let n = 0, worst = 0, last = performance.now(); const t0 = last; const f = (t) => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 2000) requestAnimationFrame(f); else res({ fps: Math.round(n / ((t - t0) / 1000)), worst: Math.round(worst) }); }; requestAnimationFrame(f); }));
 console.log('A fps v2:', JSON.stringify(fps));
 await b.close(); })();
