const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
 const mk = async (nick, fem) => { const cx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await cx.route('**/lib/firebase-config.js', r => r.fulfill({ body: 'window.YG_FIREBASE=null', contentType: 'text/javascript' }));
   const p = await cx.newPage(); p.on('pageerror', e => console.log(nick, 'ERR', e.message));
   await p.goto('http://localhost:8080/index.html'); await p.waitForTimeout(900);
   if (fem) { await p.click('text=여자'); await p.waitForTimeout(400); }
   await p.screenshot({ path: 'create_' + (fem ? 'f' : 'm') + '.png' });
   await p.fill('#nick', nick); await p.click('text=여기야 시작하기'); await p.waitForURL('**/game.html');
   await p.goto('http://localhost:8080/game.html?broker=ws://localhost:8883'); await p.waitForTimeout(2000); return p; };
 const A = await mk('덕환'), C = await mk('지은', true); await A.waitForTimeout(1200);
 console.log('A state av:', JSON.stringify(await A.evaluate(() => [__dc.state.baseBody, __dc.state.equipped])));
 await A.evaluate(() => __dc.setState({ money: 2000000, inv: ['tbcard','hair1'], eq: Object.assign({}, __dc.state.eq, { top: 'tbcard', hair: 'hair1', bottom: 'slacks' }) })); await A.waitForTimeout(800);
 console.log('C sees A av:', JSON.stringify(await C.evaluate(() => Object.values(__dc.state.users).map(u => u.av))));
 await A.evaluate(() => __dc.saveLocal(true)); console.log('A saved:', JSON.stringify(await A.evaluate(() => { const s = JSON.parse(localStorage.getItem('yg_state')); return [s.baseBody, s.equipped, s.eq]; })));
 await A.reload(); await A.waitForTimeout(1800);
 console.log('A after reload:', JSON.stringify(await A.evaluate(() => [__dc.state.baseBody, __dc.state.equipped, __dc.state.eq])));
 await b.close(); })();
