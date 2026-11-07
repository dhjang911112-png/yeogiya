const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
 const mk = async (nick, fem) => { const cx = await b.newContext({ viewport: { width: 390, height: 844 } }); await cx.route('**/lib/firebase-config.js', r => r.fulfill({ body: 'window.YG_FIREBASE=null', contentType: 'text/javascript' }));
   const p = await cx.newPage(); p.on('pageerror', e => console.log(nick, 'ERR', e.message));
   await p.goto('http://localhost:8080/index.html'); await p.waitForTimeout(300); if (fem) { await p.evaluate(() => __dc.setState({ gender: 'female' })); await p.waitForTimeout(100); }
   await p.fill('#nick', nick); await p.click('text=여기야 시작하기'); await p.waitForURL('**/game.html');
   await p.goto('http://localhost:8080/game.html?broker=ws://localhost:8883'); await p.waitForTimeout(1800); return p; };
 const A = await mk('덕환'), C = await mk('지은', true); await A.waitForTimeout(1200);
 await A.evaluate(() => __dc.setState({ money: 3000000, tab: 'shop', cat: 'all' })); await A.waitForTimeout(200);
 const buy = async (P, name) => { await P.evaluate((n) => { const it = __dc.renderVals().items.find((i) => i.name.startsWith(n)); it.act(); }, name); await P.waitForTimeout(100); };
 await buy(A, '댄디'); await buy(A, '톰브라운'); await buy(A, '녹색'); await buy(A, '웨이브');
 console.log('A inv/money:', JSON.stringify(await A.evaluate(() => [__dc.state.inv, __dc.state.money])));
 // equip hair2 + gcard
 await A.evaluate(() => { const v = __dc.renderVals(); v.invSlots[0].act(); }); await A.waitForTimeout(50);
 await A.evaluate(() => { const v = __dc.renderVals(); v.invSlots[2].act(); }); await A.waitForTimeout(200);
 console.log('A eq/info:', JSON.stringify(await A.evaluate(() => [__dc.state.eq, __dc.renderVals().invInfo])));
 await A.screenshot({ path: 'inv_shop.png' });
 await A.evaluate(() => __dc.setState({ tab: 'map', zoomI: 4 })); await C.evaluate(() => __dc.setState({ zoomI: 4 }));
 for (const f of ['front','left','right','back']) { await A.evaluate((f) => __dc.setState({ facing: f }), f); await A.waitForTimeout(600); await C.screenshot({ path: 'inv_c_' + f + '.png' }); }
 // female equip test on C: give C money and tbcard trade: A gives tbcard to C for 100,000
 await C.evaluate(() => __dc.setState({ money: 200000 }));
 const cid = await C.evaluate(() => __dc.myId);
 await A.evaluate((id) => __dc.tradeSend(id, { item: 'tbcard', money: 0 }, { item: '', money: 100000 }), cid); await A.waitForTimeout(600);
 console.log('C sheet:', JSON.stringify(await C.evaluate(() => [__dc.state.sheet, __dc.renderVals().tin.get, __dc.renderVals().tin.give])));
 await C.screenshot({ path: 'trade_in.png' });
 await C.evaluate(() => __dc.tradeAnswer(true)); await A.waitForTimeout(1000);
 console.log('after sale A:', JSON.stringify(await A.evaluate(() => [__dc.state.inv, __dc.state.money])), 'C:', JSON.stringify(await C.evaluate(() => [__dc.state.inv, __dc.state.money])));
 // swap: C offers tbcard for A's hair1 ; A declines first, then accept another
 const aid = await A.evaluate(() => __dc.myId);
 await C.evaluate((id) => __dc.tradeSend(id, { item: 'tbcard', money: 0 }, { item: 'hair1', money: 0 }), aid); await A.waitForTimeout(600);
 await A.evaluate(() => __dc.tradeAnswer(false)); await A.waitForTimeout(600); console.log('C toast after decline:', await C.evaluate(() => __dc.state.toast));
 await C.evaluate((id) => __dc.tradeSend(id, { item: 'tbcard', money: 0 }, { item: 'hair1', money: 0 }), aid); await A.waitForTimeout(600);
 await A.evaluate(() => __dc.tradeAnswer(true)); await A.waitForTimeout(1000);
 console.log('after swap A:', JSON.stringify(await A.evaluate(() => __dc.state.inv)), 'C:', JSON.stringify(await C.evaluate(() => __dc.state.inv)));
 // C (female) equip tbcard
 await C.evaluate(() => { __dc.setState({ tab: 'shop' }); const v = __dc.renderVals(); v.invSlots.find((s) => s.name && s.name.startsWith('웨이브')).act(); }); await C.waitForTimeout(300);
 await C.screenshot({ path: 'inv_c_shop.png' });
 await b.close(); })();
