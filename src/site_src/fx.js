/* 여기야 fireworks effect: rocket rises, then an 8-frame burst; three in a row */
(function () {
  const FR = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => 'assets/fx/fw' + i + '.png');
  FR.concat(['assets/fx/rocket.png']).forEach((s) => { const im = new Image(); im.src = s; });
  let actx = null;
  const sound = (delay) => {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const t0 = actx.currentTime + delay;
      // whistle up
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(700, t0); o.frequency.exponentialRampToValueAtTime(1900, t0 + 0.75);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.8);
      o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.85);
      // boom
      const len = actx.sampleRate * 1.2, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g2 = actx.createGain();
      s.buffer = buf; f.type = 'lowpass'; f.frequency.value = 900; g2.gain.value = 0.5;
      s.connect(f); f.connect(g2); g2.connect(actx.destination); s.start(t0 + 0.8);
    } catch (e) {}
  };

  function burst(layer, x, y, delay, quiet) {
    setTimeout(() => {
      const rk = document.createElement('img');
      rk.src = 'assets/fx/rocket.png'; rk.alt = '';
      rk.style.cssText = 'position:absolute;width:44px;height:44px;left:' + (x - 22) + 'px;top:' + (layer.clientHeight - 60) + 'px;transform:rotate(-25deg);transition:top .8s cubic-bezier(.2,.7,.4,1),opacity .15s .7s;opacity:1';
      layer.appendChild(rk);
      requestAnimationFrame(() => requestAnimationFrame(() => { rk.style.top = (y - 22) + 'px'; rk.style.opacity = '0'; }));
      setTimeout(() => {
        rk.remove();
        const ex = document.createElement('img');
        ex.alt = '';
        ex.style.cssText = 'position:absolute;width:260px;height:260px;left:' + (x - 130) + 'px;top:' + (y - 130) + 'px;pointer-events:none';
        layer.appendChild(ex);
        let i = 0;
        ex.src = FR[0];
        const iv = setInterval(() => {
          i++;
          if (i >= FR.length) { clearInterval(iv); ex.style.transition = 'opacity .3s'; ex.style.opacity = '0'; setTimeout(() => ex.remove(), 320); return; }
          ex.src = FR[i];
        }, 110);
      }, 820);
      if (!quiet) sound(0);
    }, delay);
  }

  window.YGFX = {
    fireworks(spots, quiet) {
      const layer = document.getElementById('yg-fx');
      if (!layer) return;
      (spots || []).slice(0, 3).forEach((p, k) => burst(layer, p[0], p[1], k * 750, quiet));
    },
    spots() {
      const out = [];
      for (let k = 0; k < 3; k++) out.push([70 + Math.round(Math.random() * 250), 110 + Math.round(Math.random() * 120)]);
      return out;
    }
  };
})();
