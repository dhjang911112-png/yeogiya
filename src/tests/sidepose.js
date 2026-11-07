const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
 p.on('pageerror', e => console.log('ERR', e.message));
 await p.goto('http://localhost:8080/avatar-lab.html'); await p.waitForTimeout(1200);
 const url = await p.evaluate(() => {
   const AV = YGAvatar; AV.makeMannequin(); const S = 0.32;
   const N = 9, step = AV.STRIDE_SIDE * S; // body advances one stride per half cycle
   const c = document.createElement('canvas'); c.width = 1300; c.height = 1024 * S + 60; const x = c.getContext('2d');
   x.fillStyle = '#f3ecdc'; x.fillRect(0, 0, c.width, c.height);
   x.strokeStyle = '#c9a57a'; x.beginPath(); x.moveTo(0, 1000 * S + 10); x.lineTo(c.width, 1000 * S + 10); x.stroke();
   for (let i = 0; i < N; i++) {
     const ph = i / 8; // 0..1 one full cycle
     const bodyX = 60 + ph * 2 * step * 1.0 + i * 70; // spread out + true advance
     x.save(); x.translate(bodyX - 256 * S, 10);
     AV.draw(x, { body: 'mannequin', dir: 'right', equip: {} }, { phase: ph % 1, walk: 1, t: 0 }, { scale: S });
     x.restore();
     x.fillStyle = '#6b665c'; x.font = '12px sans-serif'; x.fillText('phase ' + ph.toFixed(3), bodyX - 30, 1000 * S + 40);
   }
   return c.toDataURL();
 });
 fs.writeFileSync('sidepose.png', Buffer.from(url.split(',')[1], 'base64')); await b.close(); })();
