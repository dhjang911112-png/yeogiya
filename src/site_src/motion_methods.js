  // ================= Phase A: smooth movement / camera (requestAnimationFrame) =================
  // World units are map pixels. Speeds are per second, so movement is frame-rate independent.
  motionInit() {
    this.mv = { x: this.state.px, y: this.state.py, vx: 0, vy: 0, cx: this.state.px, cy: this.state.py, area: this.state.area,
      target: null, keys: new Set(), dist: 0, lastSync: 0, sync: true, moving: false };
    this.remoteHist = {};
    const KEYS = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
    const typing = (e) => { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); };
    window.addEventListener('keydown', (e) => {
      const k = KEYS[e.code]; if (!k || typing(e)) return;
      const st = this.state; if (st.tab !== 'map' || st.sheet || st.travel) return;
      e.preventDefault();
      if (st.seated) this.standUp();
      if (!this.mv.keys.has(k)) { this.mv.keys.add(k); this.mv.target = null; }
    });
    window.addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) this.mv.keys.delete(k); });
    window.addEventListener('blur', () => this.mv.keys.clear());
    let last = performance.now();
    this.fps = { frames: 0, renders: 0, worst: 0, t0: last };
    const loop = (t) => {
      this.raf = requestAnimationFrame(loop);
      const raw = t - last; last = t;
      const dt = Math.min(0.05, Math.max(0, raw / 1000));
      this.fps.frames++; if (raw > this.fps.worst) this.fps.worst = raw;
      try { this.motionTick(dt, t); } catch (e) { console.error(e); }
    };
    this.raf = requestAnimationFrame(loop);
  }

  // called by every place that used to stop the old setInterval walkers
  motionStop() {
    if (!this.mv) return;
    this.mv.target = null; this.mv.vx = 0; this.mv.vy = 0; this.mv.sync = true;
  }

  walkTo(tx, ty) {
    if (this.state.seated) this.standUp();
    this.stopTimers();
    this.pressed = false;
    const M = this.mv;
    M.sync = false;
    M.target = { x: Math.round(tx), y: Math.round(ty) };
    this.setState({ target: { x: M.target.x, y: M.target.y }, walking: true, pan: { x: 0, y: 0 } });
  }

  // legacy entry points (kept for compatibility with older UI code)
  walkLoop(facing) { const k = { front: 'd', back: 'u', left: 'l', right: 'r' }[facing]; this.mv.keys.clear(); this.mv.keys.add(k); }
  press(facing) { if (this.state.seated) this.standUp(); this.pressed = true; this.walkLoop(facing); }
  lift() { this.pressed = false; this.mv.keys.clear(); }
  step(facing) { this.walkLoop(facing); setTimeout(() => this.mv.keys.clear(), 300); }

  motionTick(dt, now) {
    const st = this.state, M = this.mv;
    if (!M) return;
    // adopt teleports / area changes made elsewhere (portals, bars, KTX, loading)
    if (M.area !== st.area || (M.sync && !M.target && !M.keys.size && (Math.abs(st.px - M.x) > 0.5 || Math.abs(st.py - M.y) > 0.5))) {
      const far = M.area !== st.area || Math.hypot(st.px - M.x, st.py - M.y) > 160;
      M.x = st.px; M.y = st.py; M.vx = 0; M.vy = 0; M.area = st.area; M.target = null;
      if (far) { M.cx = M.x; M.cy = M.y; }
    }
    const active = st.tab === 'map' && !st.travel && !st.seated && !st.shift && !st.sheet;
    let ix = 0, iy = 0, arrive = 1;
    if (active && M.keys.size) {
      ix = (M.keys.has('r') ? 1 : 0) - (M.keys.has('l') ? 1 : 0);
      iy = (M.keys.has('d') ? 1 : 0) - (M.keys.has('u') ? 1 : 0);
      M.target = null;
    } else if (active && M.target) {
      const dx = M.target.x - M.x, dy = M.target.y - M.y, d = Math.hypot(dx, dy);
      if (d < 3) M.target = null;
      else { ix = dx / d; iy = dy / d; arrive = Math.max(0.3, Math.min(1, d / 28)); }
    }
    const len = Math.hypot(ix, iy);
    if (len > 0) { ix /= len; iy /= len; }
    const VMAX = 128, ACC = 1000, DEC = 1500;
    const tvx = ix * VMAX * arrive, tvy = iy * VMAX * arrive;
    const step = (v, t, r) => (v < t ? Math.min(t, v + r) : Math.max(t, v - r));
    const rate = (len ? ACC : DEC) * dt;
    M.vx = step(M.vx, tvx, rate); M.vy = step(M.vy, tvy, rate);
    let moved = 0;
    if (Math.abs(M.vx) + Math.abs(M.vy) > 0.5) {
      M.sync = false;
      let nx = M.x + M.vx * dt, ny = M.y + M.vy * dt;
      if (this.blocked(st.area, nx, ny)) {
        // slide along walls instead of stopping dead
        if (Math.abs(M.vx) > 1 && !this.blocked(st.area, nx, M.y)) { ny = M.y; M.vy = 0; }
        else if (Math.abs(M.vy) > 1 && !this.blocked(st.area, M.x, ny)) { nx = M.x; M.vx = 0; }
        else { nx = M.x; ny = M.y; M.vx = 0; M.vy = 0; M.target = null; }
      }
      moved = Math.hypot(nx - M.x, ny - M.y);
      M.x = nx; M.y = ny; M.dist += moved;
    } else { M.vx = 0; M.vy = 0; }
    const walking = moved > 0.02 || (Math.hypot(M.vx, M.vy) > 2);
    // facing with hysteresis so diagonal movement does not flicker between directions
    let f = st.facing;
    const ax = Math.abs(M.vx), ay = Math.abs(M.vy);
    if (walking) { if (ax > ay * 1.2) f = M.vx > 0 ? 'right' : 'left'; else if (ay > ax * 1.2) f = M.vy > 0 ? 'front' : 'back'; else if (f !== 'left' && f !== 'right' && f !== 'front' && f !== 'back') f = 'front'; }
    // walk cycle is tied to distance travelled (one frame per stride) so feet do not slide
    const frame = walking ? Math.floor(M.dist / 15) : 0;
    // camera follows a smoothed point (critically damped), clamped by camFor()
    const k = 1 - Math.exp(-dt * 9);
    M.cx += (M.x - M.cx) * k; M.cy += (M.y - M.cy) * k;
    if (Math.abs(M.x - M.cx) < 0.05) M.cx = M.x;
    if (Math.abs(M.y - M.cy) < 0.05) M.cy = M.y;
    const changed = walking !== !!st.walking || f !== st.facing || frame !== st.frame;
    if (changed || (walking && now - M.lastSync > 120)) {
      M.lastSync = now;
      this.setState({ px: M.x, py: M.y, facing: f, frame: frame, walking: walking, target: walking && M.target ? { x: M.target.x, y: M.target.y } : null });
    } else if (walking || Math.abs(M.cx - M.x) > 0.05 || Math.abs(M.cy - M.y) > 0.05) {
      if (!walking && (st.px !== M.x || st.py !== M.y)) this.setState({ px: M.x, py: M.y });
    }
    this.motionPaint(now);
  }

  // per-frame DOM update for the moving pieces only (no full re-render)
  motionPaint(now) {
    const st = this.state, M = this.mv;
    if (st.tab !== 'map') return;
    const world = document.getElementById('yg-world');
    if (world && !st.dragging) {
      const cam = this.camFor(Object.assign({}, st, { px: M.cx, py: M.cy }), st.pan.x, st.pan.y);
      world.style.transform = 'translate(' + cam.x.toFixed(1) + 'px, ' + cam.y.toFixed(1) + 'px) scale(' + cam.zoom + ')';
    }
    const me = document.getElementById('yg-me');
    if (me) { me.style.left = M.x.toFixed(1) + 'px'; me.style.top = M.y.toFixed(1) + 'px'; me.style.zIndex = Math.round(M.y) + 10; }
    const U = st.users || {};
    Object.keys(U).forEach((id) => {
      const el = document.getElementById('yg-u-' + id);
      if (!el) return;
      const p = this.remotePos(id, now);
      if (!p) return;
      el.style.left = p.x.toFixed(1) + 'px'; el.style.top = p.y.toFixed(1) + 'px'; el.style.zIndex = Math.round(p.y) + 10;
    });
  }

  // remote players: keep a short history of network samples and draw them ~260ms in the past,
  // interpolating between samples (and briefly extrapolating) so they glide instead of teleporting
  remoteSample(id, p) {
    const H = this.remoteHist[id] || (this.remoteHist[id] = []);
    const t = performance.now();
    const last = H[H.length - 1];
    if (last && (last.area !== p.area || Math.hypot(last.x - p.x, last.y - p.y) > 260)) H.length = 0;
    H.push({ t: t, x: Number(p.x) || 0, y: Number(p.y) || 0, area: p.area });
    while (H.length > 12) H.shift();
  }

  remotePos(id, now) {
    const H = this.remoteHist[id];
    if (!H || !H.length) return null;
    const t = (now || performance.now()) - 260;
    if (t <= H[0].t) return { x: H[0].x, y: H[0].y };
    for (let i = H.length - 1; i > 0; i--) {
      const a = H[i - 1], b = H[i];
      if (t >= a.t && t <= b.t) { const u = (t - a.t) / Math.max(1, b.t - a.t); return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }; }
    }
    const b = H[H.length - 1], a = H[H.length - 2];
    if (a && t - b.t < 250) { const u = (t - b.t) / Math.max(1, b.t - a.t); const cu = Math.min(u, 0.6); return { x: b.x + (b.x - a.x) * cu, y: b.y + (b.y - a.y) * cu }; }
    return { x: b.x, y: b.y };
  }
  // ================= /Phase A =================

