const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
 const mk = async (nick) => { const cx = await b.newContext({ viewport: { width: 390, height: 844 } }); await cx.route('**/lib/firebase-config.js', r => r.fulfill({ body: 'window.YG_FIREBASE=null', contentType: 'text/javascript' }));
   const p = await cx.newPage(); p.on('pageerror', e => console.log(nick, 'ERR', e.message));
   await p.goto('http://localhost:8080/index.html'); await p.fill('#nick', nick); if (nick==='지은') await p.click('text=여자').catch(()=>{}); await p.click('text=여기야 시작하기'); await p.waitForURL('**/game.html');
   await p.goto('http://localhost:8080/game.html?broker=ws://localhost:8883'); await p.waitForTimeout(1800);
   await p.evaluate(() => __dc.setState({ area: 'bar', barOf: 'seomyeon', barName: '서면 한잔집', px: 300, py: 520 })); return p; };
 const A = await mk('덕환'), C = await mk('지은'), D = await mk('민수'); await A.waitForTimeout(800);
 for (const P of [A, C, D]) { await P.evaluate(() => { __dc.setState({ tableSel: 0 }); __dc.enterTable(0); }); await P.waitForTimeout(500); }
 await A.evaluate(() => __dc.startGame('dice')); await A.waitForTimeout(500);
 for (const P of [A, C, D]) await P.evaluate(() => __dc.setState({ panel: 'game' }));
 await C.fill('#roomIn', '나 주사위 잘 던짐ㅋㅋ'); await C.press('#roomIn', 'Enter');
 await A.fill('#roomIn', '건배!'); await A.press('#roomIn', 'Enter');
 await A.waitForTimeout(700); await A.screenshot({ path: 'barface.png' });
 await b.close(); })();
