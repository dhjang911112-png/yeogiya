const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8080', LABEL = process.argv[3] || 'new', THR = +(process.argv[4] || 1);
(async () => { const b = await chromium.launch();
 const mk = async (nick) => { const cx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await cx.route('**/lib/firebase-config.js', r => r.fulfill({ body: 'window.YG_FIREBASE=null', contentType: 'text/javascript' }));
   const p = await cx.newPage(); p.on('pageerror', e => console.log(nick, 'ERR', e.message));
   if (THR > 1) { const s = await cx.newCDPSession(p); await s.send('Emulation.setCPUThrottlingRate', { rate: THR }); }
   await p.goto(BASE + '/index.html'); await p.fill('#nick', nick); await p.click('text=여기야 시작하기'); await p.waitForURL('**/game.html');
   await p.goto(BASE + '/game.html?broker=ws://localhost:8883'); await p.waitForTimeout(2000); return p; };
 const A = await mk('덕환'), C = await mk('지은'); await A.waitForTimeout(1200);
 // sample a DOM element's on-screen position every animation frame
 const sampler = (sel) => `(() => { window.__s = []; window.__r0 = (window.__dc._rc||0); const o = window.__dc; const old = o._render.bind(o); if (!o.__wrapped) { o.__wrapped = true; o._render = function(){ o._rc = (o._rc||0)+1; return old(); }; } const f = (t) => { const el = ${sel}; if (el) { const cs = getComputedStyle(el); const w = document.getElementById('yg-world') || el.parentElement; const m = new DOMMatrix(getComputedStyle(w).transform); window.__s.push([t, parseFloat(cs.left), parseFloat(cs.top), m.e, m.f]); } if (window.__s.length < 600) requestAnimationFrame(f); }; requestAnimationFrame(f); })()`;
 const stats = (s) => { const d = []; for (let i = 1; i < s.length; i++) d.push([s[i][0]-s[i-1][0], Math.hypot(s[i][1]-s[i-1][1], s[i][2]-s[i-1][2])]); const mv = d.filter(x => x[1] > 0.01); const jumps = mv.map(x => x[1]); const dts = d.map(x => x[0]);
   const avg = jumps.reduce((a,b)=>a+b,0)/Math.max(1,jumps.length); const sd = Math.sqrt(jumps.reduce((a,b)=>a+(b-avg)**2,0)/Math.max(1,jumps.length));
   const still = d.filter(x => x[1] <= 0.01).length; const cam = []; for (let i = 1; i < s.length; i++) cam.push(Math.hypot(s[i][3]-s[i-1][3], s[i][4]-s[i-1][4])); const camMv = cam.filter(x => x > 0.01); const big = jumps.filter(x => x > 4).length;
   return { frames: d.length, fps: +(1000 / (dts.reduce((a,b)=>a+b,0)/dts.length)).toFixed(1), worstFrameMs: +Math.max(...dts).toFixed(1), movingFrames: mv.length, frozenFramesWhileWalking: still, maxStepPx: +Math.max(0,...jumps).toFixed(2), avgStepPx: +avg.toFixed(2), stepJitterPx: +sd.toFixed(2), jumpsOver4px: big, camMaxStepPx: +Math.max(0,...camMv).toFixed(2), camFrozenFrames: cam.length - camMv.length }; };
 // 1) tap-to-move: my character on screen (world moves under camera, so track character in world space via actor element)
 const meSel = LABEL === 'new' ? "document.getElementById('yg-me')" : "[...document.querySelectorAll('div')].find(d => d.style && d.style.width==='0px' && d.style.height==='0px' && d.textContent.includes('덕환'))";
 await A.evaluate(sampler(meSel));
 await A.evaluate(() => __dc.walkTo(__dc.state.px + 260, __dc.state.py + 40));
 await A.waitForTimeout(2600);
 const s1 = await A.evaluate(() => window.__s); const rc = await A.evaluate(() => (__dc._rc||0) - window.__r0);
 const st1 = stats(s1.filter((x, i) => i < s1.length)); st1.rendersPerSec = +(rc / ((s1[s1.length-1][0]-s1[0][0])/1000)).toFixed(1);
 console.log(LABEL, 'TAP-MOVE (me on screen):', JSON.stringify(st1));
 if (LABEL === 'new') {
   // 2) keyboard + diagonal normalisation
   const p0 = await A.evaluate(() => [__dc.mv.x, __dc.mv.y]);
   await A.keyboard.down('ArrowRight'); await A.waitForTimeout(1000); await A.keyboard.up('ArrowRight'); await A.waitForTimeout(300);
   const p1 = await A.evaluate(() => [__dc.mv.x, __dc.mv.y]);
   await A.keyboard.down('KeyS'); await A.keyboard.down('KeyA'); await A.waitForTimeout(1000); await A.keyboard.up('KeyS'); await A.keyboard.up('KeyA'); await A.waitForTimeout(300);
   const p2 = await A.evaluate(() => [__dc.mv.x, __dc.mv.y, __dc.state.facing]);
   console.log('KEY right 1s dx=', (p1[0]-p0[0]).toFixed(1), 'dy=', (p1[1]-p0[1]).toFixed(1), '| diag S+A 1s dist=', Math.hypot(p2[0]-p1[0], p2[1]-p1[1]).toFixed(1), 'facing', p2[2]);
   // 3) never walk into the sea / blocks: hold Up for 4s
   await A.keyboard.down('ArrowUp'); await A.waitForTimeout(4000); await A.keyboard.up('ArrowUp'); await A.waitForTimeout(200);
   console.log('UP into sea 4s -> y=', await A.evaluate(() => [Math.round(__dc.mv.y), __dc.blocked(__dc.state.area, __dc.mv.x, __dc.mv.y)]));
   // 4) remote smoothness: watch A from C while A walks
   await C.evaluate(sampler("document.getElementById('yg-u-' + Object.keys(__dc.state.users)[0])"));
   await A.evaluate(() => __dc.walkTo(__dc.state.px - 250, __dc.state.py + 120)); await C.waitForTimeout(3200);
   const s2 = await C.evaluate(() => window.__s);
   console.log('REMOTE (A seen on C):', JSON.stringify(stats(s2)));
   await A.screenshot({ path: 'phaseA_A.png' });
   // 5) regressions: chat bubble, portal/teleport sync, bar entry still teleports correctly
   await A.fill('#chat', '안녕'); await A.press('#chat', 'Enter'); await A.waitForTimeout(400);
   await A.evaluate(() => __dc.setState({ area: 'seomyeon', px: 300, py: 600 })); await A.waitForTimeout(300);
   console.log('teleport sync:', await A.evaluate(() => [__dc.mv.area, Math.round(__dc.mv.x), Math.round(__dc.mv.y), __dc.state.myBubble]));
 }
 await b.close(); })();
