// 결정적 프레임 렌더: 실제 Animator + 렌더러로 30fps 프레임을 뽑아 PNG로 저장
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
 const [name, body, script, hgt, speedH] = [process.argv[2], process.argv[3], process.argv[4], +(process.argv[5] || 300), +(process.argv[6] || 0.75)];
 const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 480 } });
 p.on('pageerror', e => console.log('ERR', e.message));
 await p.goto('http://localhost:8080/avatar-lab.html'); await p.waitForTimeout(1500);
 const frames = await p.evaluate(([body, script, hgt, speedH]) => {
  const AV = YGAvatar, W = 960, H = 480, S = hgt / 1000, V = speedH * hgt; // V: 화면 px/s (키 대비 속도)
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const an = new AV.Animator(); let px = 0, vx = 0, dir = 'right'; const prints = []; const out = [];
  // script: "r5,s1,l5" = 오른쪽 5초, 정지 1초, 왼쪽 5초
  const steps = script.split(',').map((t) => ({ k: t[0], d: +t.slice(1) }));
  const dt = 1 / 30; let camX = 0; const groundY = H - 50;
  for (const st of steps) for (let i = 0; i < Math.round(st.d * 30); i++) {
   const tv = st.k === 'r' ? V : st.k === 'l' ? -V : 0; const acc = (tv ? 1000 : 1500) / 128 * V * dt;
   vx += Math.max(-acc, Math.min(acc, tv - vx)); const ox = px; px += vx * dt; if (Math.abs(vx) > 1) dir = vx > 0 ? 'right' : 'left';
   const look = { body, dir, equip: {} }; const moved = Math.abs(px - ox);
   const a = an.update(dt, moved, S, moved > 0.02 * S * 10, dir, AV.animOpt(look));
   camX += (px - camX) * 0.08;
   x.fillStyle = '#efe9da'; x.fillRect(0, 0, W, H);
   x.strokeStyle = 'rgba(120,100,60,.25)'; x.lineWidth = 1;
   for (let gx = Math.floor((camX - W) / 60) * 60; gx < camX + W; gx += 60) { const sx = gx - camX + W / 2; x.beginPath(); x.moveTo(sx, groundY); x.lineTo(sx, H); x.stroke(); }
   x.strokeStyle = 'rgba(160,40,30,.6)'; x.beginPath(); x.moveTo(0, groundY); x.lineTo(W, groundY); x.stroke();
   // 디딤발 발자국(발목이 땅에 있을 때의 화면 위치)
   ['Near', 'Far'].forEach((L) => { const fp = AV.footPos(look, a, L); if (!fp) return; if (a.walk > 0.9 && fp[1] > 960) { const wx = px + (fp[0] - 256) * S; const lp = prints.filter((q) => q.L === L).pop(); if (!lp || Math.abs(lp.x - wx) > 8) prints.push({ L, x: wx }); } });
   x.fillStyle = 'rgba(181,83,47,.45)'; prints.forEach((q) => { x.beginPath(); x.ellipse(q.x - camX + W / 2, groundY + 6, 9, 3, 0, 0, 7); x.fill(); });
   x.fillStyle = 'rgba(60,50,20,.16)'; x.beginPath(); x.ellipse(px - camX + W / 2, groundY, 60, 8, 0, 0, 7); x.fill();
   x.save(); x.translate(px - camX + W / 2 - 256 * S, groundY - 1000 * S); AV.draw(x, look, a, { scale: S }); x.restore();
   x.fillStyle = '#333'; x.font = '15px sans-serif'; x.fillText((st.k === 'r' ? '→ 오른쪽' : st.k === 'l' ? '← 왼쪽 (오른쪽 그림 좌우반전)' : '정지') + '  ·  속도 ' + speedH + ' 키/초  ·  걸음 ' + (V / (AV.stepRig(look) * S)).toFixed(1) + '회/초', 14, 24);
   out.push(c.toDataURL('image/png'));
  }
  return out; }, [body, script, hgt, speedH]);
 const dir = '../gif_' + name; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
 frames.forEach((f, i) => fs.writeFileSync(`${dir}/f${String(i).padStart(4, '0')}.png`, Buffer.from(f.split(',')[1], 'base64')));
 console.log(name, frames.length, 'frames'); await b.close(); })();
