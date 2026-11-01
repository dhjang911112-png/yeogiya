/* 여기야 runtime: Preact shim for design-canvas components + shared helpers */
(function () {
  const { h, render, Fragment } = preact;
  window.h = h; window.F = Fragment;
  window.S = (x) => (x === null || x === undefined ? '' : x);
  window.L = (x) => (Array.isArray(x) ? x : []);
  window.PV = (fn) => (e) => { if (e && e.preventDefault) e.preventDefault(); if (typeof fn === 'function') fn(e); };

  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; this._q = false; }
    setState(p) {
      if (typeof p === 'function') p = p(this.state, this.props);
      if (!p) return;
      this.state = Object.assign({}, this.state, p);
      this._sched();
    }
    forceUpdate() { this._sched(); }
    _sched() {
      if (this._q || !this._root) return;
      this._q = true;
      Promise.resolve().then(() => { this._q = false; this._render(); });
    }
    _render() {
      let vals;
      try { vals = this.renderVals(); }
      catch (e) {
        console.error(e);
        if (this.state.g2) { this.state = Object.assign({}, this.state, { g2: null }); vals = this.renderVals(); }
        else if (this.state.sheet) { this.state = Object.assign({}, this.state, { sheet: null }); vals = this.renderVals(); }
        else throw e;
      }
      render(window.TPL(vals), this._root);
      // chat boxes: jump to the newest message whenever a message is added
      this._root.querySelectorAll('.yg-autoscroll').forEach((el) => {
        const n = el.childElementCount;
        if (el._ygN !== n) { el._ygN = n; el.scrollTop = el.scrollHeight; }
      });
    }
  }
  window.DCLogic = DCLogic;

  window.mountDC = function (Comp, el) {
    const c = new Comp({});
    c._root = el;
    c._render();
    if (c.componentDidMount) c.componentDidMount();
    window.__dc = c;
    return c;
  };

  // phone-frame scaling: the design is 390 x 844
  window.fitFrame = function (frame) {
    const fit = () => {
      const s = Math.min(window.innerWidth / 390, window.innerHeight / 844);
      window.__ygScale = s;
      frame.style.transform = 'scale(' + s + ')';
      frame.style.left = Math.max(0, (window.innerWidth - 390 * s) / 2) + 'px';
      frame.style.top = Math.max(0, (window.innerHeight - 844 * s) / 2) + 'px';
    };
    window.addEventListener('resize', fit);
    fit();
  };

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const YG = {
    P: 'yeogiya-kr-7c1e/v1/',
    BROKER: new URLSearchParams(location.search).get('broker') || 'wss://broker.emqx.io:8084/mqtt',
    load(k, d) { try { const v = ls.get('yg_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    save(k, v) { ls.set('yg_' + k, JSON.stringify(v)); },
    clip(s, n) { return String(s === null || s === undefined ? '' : s).slice(0, n); }
  };
  let id = YG.load('id', '');
  if (!id || !/^[a-z0-9]{8,16}$/.test(id)) { id = Math.random().toString(36).slice(2, 12).padEnd(10, '0'); YG.save('id', id); }
  YG.id = id;
  YG.connect = function () {
    if (!window.mqtt) return null;
    return window.mqtt.connect(YG.BROKER, {
      clientId: 'yg_' + id + '_' + Math.random().toString(36).slice(2, 6),
      clean: true, keepalive: 30, reconnectPeriod: 3000, connectTimeout: 10000,
      will: { topic: YG.P + 'p/' + id, payload: JSON.stringify({ id: id, gone: 1 }), qos: 0, retain: false }
    });
  };
  YG.status = function (on, n) {
    const el = document.getElementById('yg-online');
    if (!el) return;
    el.className = on ? 'on' : 'off';
    el.textContent = on ? '실시간 ' + n + '명 접속 중' : '서버 연결 중...';
  };
  window.YG = YG;
})();
