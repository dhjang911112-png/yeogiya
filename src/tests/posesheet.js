const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
 p.on('pageerror', e => console.log('ERR', e.message));
 await p.goto('http://localhost:8080/avatar-lab.html'); await p.waitForTimeout(1200);
 const url = await p.evaluate(() => {
   const AV = YGAvatar; const S = 0.42, cw = 512 * S * 0.9, ch = 1024 * S;
   const phases = [0, 0.125, 0.25, 0.5, 0.625, 0.75];
   const c = document.createElement('canvas'); c.width = cw * (phases.length + 1); c.height = ch * 2 + 40; const x = c.getContext('2d');
   x.fillStyle = '#f3ecdc'; x.fillRect(0, 0, c.width, c.height);
   ['male_base', 'female_base'].forEach((body, row) => {
     const items = [{ walk: 0, phase: 0, t: 0, label: 'idle' }].concat(phases.map((ph) => ({ walk: 1, phase: ph, t: 0, label: 'walk ' + ph })));
     items.forEach((a, i) => {
       x.save(); x.translate(i * cw + cw / 2 - 256 * S, row * (ch + 20) + 10);
       x.strokeStyle = 'rgba(200,80,80,.5)'; x.beginPath(); x.moveTo(0, 1000 * S); x.lineTo(512 * S, 1000 * S); x.stroke();
       x.beginPath(); x.moveTo(0, 230 * S); x.lineTo(512 * S, 230 * S); x.stroke();
       AV.draw(x, { body: body, dir: 'front', equip: {} }, a, { scale: S, debug: false });
       x.restore();
       x.fillStyle = '#6b665c'; x.font = '12px sans-serif'; x.fillText(a.label, i * cw + 6, row * (ch + 20) + ch + 14);
     });
   });
   return c.toDataURL('image/png');
 });
 fs.writeFileSync('posesheet.png', Buffer.from(url.split(',')[1], 'base64'));
 await b.close(); })();
