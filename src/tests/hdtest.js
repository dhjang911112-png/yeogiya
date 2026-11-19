const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
 const mk = async (nick) => { const cx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await cx.route('**/lib/firebase-config.js', r => r.fulfill({ body: 'window.YG_FIREBASE=null', contentType: 'text/javascript' }));
  const p = await cx.newPage(); p.on('pageerror', e => console.log(nick, 'ERR', e.message.slice(0, 200)));
  await p.goto('http://localhost:8080/index.html'); await p.waitForTimeout(500); await p.fill('#nick', nick); await p.click('text=여기야 시작하기'); await p.waitForURL('**/game.html');
  await p.goto('http://localhost:8080/game.html?broker=ws://localhost:8883'); await p.waitForTimeout(3500); return p; };
 const A = await mk('덕환'), C = await mk('지은');
 await A.screenshot({ path: '../hd1.png' });
 await A.evaluate(() => __dc.setState({ zoomI: 0 })); await A.waitForTimeout(800); await A.screenshot({ path: '../hd2.png' });
 // walk up into sea
 await A.evaluate(() => __dc.setState({ zoomI: 2 })); await A.keyboard.down('ArrowUp'); await A.waitForTimeout(3000); await A.keyboard.up('ArrowUp');
 console.log('위로 걸은 뒤 y', await A.evaluate(() => Math.round(__dc.state.py)));
 await A.screenshot({ path: '../hd3.png' });
 // club: teleport both
 for (const P of [A, C]) { await P.evaluate(() => { const ad = __dc.areaData('club'); __dc.setState({ area: 'club', px: 700, py: 760 }); if (__dc.mv) { __dc.mv.x = 700; __dc.mv.y = 760; __dc.mv.area = 'club'; } }); }
 await A.waitForTimeout(1500);
 const cnt = (P) => P.evaluate(() => document.querySelectorAll('.yg-dance').length);
 console.log('클럽 춤 요소 A', await cnt(A), 'C', await cnt(C));
 await A.evaluate(() => __dc.slashCmd('/춤멈춰')); await A.waitForTimeout(1200);
 console.log('/춤멈춰 후 A', await cnt(A), 'C', await cnt(C), 'C로그', await C.evaluate(() => JSON.stringify(__dc.state.log.slice(-1))));
 await A.screenshot({ path: '../club_stop.png' });
 await C.waitForTimeout(2200); await C.evaluate(() => __dc.slashCmd('/춤시작')); await C.waitForTimeout(1200);
 console.log('/춤시작 후 A', await cnt(A), 'C', await cnt(C));
 await b.close(); })();
