  // ================= realtime multiplayer (MQTT) =================
  myName() { return (this.state.prof && this.state.prof.nick) || '나'; }

  myBarOf() { const a = this.state.area; return (a === 'bar' || a === 'club') ? (this.state.barOf || '') : ''; }

  onlineCount() { return Object.keys(this.peers || {}).length + 1; }

  areaCount(id) {
    const n = Object.values(this.peers || {}).filter((p) => p.area === id).length + (this.state.area === id ? 1 : 0);
    return n ? ' · ' + n + '명 있어요' : '';
  }

  netBoot() {
    this.peers = this.peers || {}; this.pws = this.pws || {}; this.games = this.games || {};
    this.myId = YG.id;
    const ac = YG.acct || {};
    this.rel = ac.rel || YG.load('rel', {}); this.likedBy = ac.likedBy || YG.load('likedBy', {}); this.reportedBy = ac.reportedBy || YG.load('reportedBy', {});
    this.lastPub = 0; this.lastSig = '';
    this.saveIv = setInterval(() => this.saveLocal(), 4000);
    window.addEventListener('beforeunload', () => { this.saveLocal(true); this.netGone(); });
    window.addEventListener('pagehide', () => { this.saveLocal(true); this.netGone(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.saveLocal(true); });
    this.claimGrants();
    this.listenGrants();
    if (YG.load('banned', false)) { this.showBan(); return; }
    const c = YG.connect();
    if (!c) { YG.status(false, 0); return; }
    this.cli = c;
    const P = YG.P;
    c.on('connect', () => {
      c.subscribe([P + 'p/+', P + 'chat', P + 'dm/' + this.myId, P + 'ev/' + this.myId, P + 'pw/#', P + 'r/#', P + 'g/#', P + 'fx']);
      this.lastSig = '';
      this.netPub(true);
      YG.status(true, this.onlineCount());
      if (!this.welcomed) { this.welcomed = true; setTimeout(() => this.flash('실시간 서버 연결! 지금 ' + this.onlineCount() + '명이 여기야에 있어요', false), 1500); }
    });
    c.on('offline', () => YG.status(false, 0));
    c.on('close', () => YG.status(false, 0));
    c.on('message', (topic, buf) => {
      let m = null;
      try { const s = buf.toString(); m = s ? JSON.parse(s) : null; } catch (e) { return; }
      try { this.netMsg(topic.slice(P.length), m); } catch (e) { console.error(e); }
    });
    this.netIv = setInterval(() => this.netPub(false), 200);
    this.netGc = setInterval(() => this.netClean(), 2000);
  }

  claimGrants() {
    const ac = YG.acct;
    if (!ac || !window.YGA || !YGA.user) return;
    fetch('lib/grants.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.ok ? r.json() : {}).then((all) => {
      const mine = (all && all[ac.nick]) || [];
      const done = Object.assign({}, ac.claimedGrants || {});
      let sum = 0;
      mine.forEach((g) => { if (g && g.id && !done[g.id] && Number(g.amount) > 0) { done[g.id] = true; sum += Number(g.amount); } });
      if (!sum) return;
      const money = Math.min(100000000, this.state.money + sum);
      ac.claimedGrants = done;
      this.setState({ money: money });
      YGA.save({ money: money, claimedGrants: done }, true);
      const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      setTimeout(() => this.flash('운영자 지급 +' + fmt(sum) + '원이 들어왔어요!', false), 1200);
    }).catch(() => {});
  }

  isAdmin() { return !!(YG.acct && YG.acct.nick === '운영자' && window.YGA && YGA.user); }

  parseWon(str) {
    let s = String(str || '').replace(/[,원\s]/g, '');
    let total = 0, m;
    if ((m = /^(\d+(?:\.\d+)?)억(.*)$/.exec(s))) { total += parseFloat(m[1]) * 100000000; s = m[2]; }
    if ((m = /^(\d+(?:\.\d+)?)천만(.*)$/.exec(s))) { total += parseFloat(m[1]) * 10000000; s = m[2]; }
    else if ((m = /^(\d+(?:\.\d+)?)백만(.*)$/.exec(s))) { total += parseFloat(m[1]) * 1000000; s = m[2]; }
    else if ((m = /^(\d+(?:\.\d+)?)만(.*)$/.exec(s))) { total += parseFloat(m[1]) * 10000; s = m[2]; }
    if ((m = /^(\d+(?:\.\d+)?)천(.*)$/.exec(s))) { total += parseFloat(m[1]) * 1000; s = m[2]; }
    if (s) { if (!/^\d+$/.test(s)) return NaN; total += parseInt(s, 10); }
    return Math.round(total);
  }

  slashCmd(raw) {
    const cmd = raw.slice(1).trim().split(/\s+/)[0];
    if (cmd === '폭죽') { this.fireCmd(); return; }
    this.adminCmd(raw);
  }

  fireCmd() {
    const st = this.state;
    const ok = ['haeundae', 'gwangalli', 'gw_cafe', 'gw_fish'].indexOf(st.area) >= 0;
    if (!ok) { this.flash('폭죽은 해운대·광안리 바닷가에서만 터뜨릴 수 있어요', true); return; }
    if ((st.fireworks || 0) < 1) { this.flash('폭죽이 없어요. 상점에서 사 오세요 (개당 1,000원)', true); return; }
    if (Date.now() - (this.lastFire || 0) < 4000) { this.flash('폭죽이 아직 터지고 있어요. 잠깐만요!', true); return; }
    this.lastFire = Date.now();
    const spots = window.YGFX ? YGFX.spots() : [];
    this.setState({ fireworks: st.fireworks - 1 });
    if (window.YGFX) YGFX.fireworks(spots);
    this.pub('fx', { id: this.myId, name: this.myName(), area: st.area, kind: 'fireworks', spots: spots });
    this.flash('폭죽 발사! 남은 폭죽 ' + (st.fireworks - 1) + '개', false);
    this.saveLocal(true);
  }

  adminCmd(raw) {
    const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const parts = raw.slice(1).trim().split(/\s+/);
    const cmd = parts[0];
    if (cmd !== '지급') { this.flash('명령어: /폭죽 (해운대·광안리)' + (this.isAdmin() ? ' · /지급 닉네임 금액' : ''), true); return; }
    if (!this.isAdmin()) { this.flash('운영자 계정만 쓸 수 있는 명령이에요', true); return; }
    const nick = parts[1], amount = this.parseWon(parts.slice(2).join(''));
    if (!nick || !amount || isNaN(amount) || amount <= 0) { this.flash('예: /지급 kk 2000만  ·  /지급 kk 500000', true); return; }
    if (amount > 100000000) { this.flash('한 번에 최대 1억 원까지 지급할 수 있어요', true); return; }
    YGA.db.collection('grants').add({ toNick: nick, toKey: YGA.nickEmail(nick), amount: amount, claimed: false, by: YG.acct.nick, at: firebase.firestore.FieldValue.serverTimestamp() })
      .then(() => this.flash(nick + '님에게 ' + fmt(amount) + '원 지급했어요', false))
      .catch((e) => { console.error(e); this.flash('지급 실패 · 서버 규칙을 확인해 주세요', true); });
  }

  listenGrants() {
    if (!YG.acct || !window.YGA || !YGA.user || this.grantUnsub) return;
    const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const me = YGA.user.email;
    const q = YGA.db.collection('grants').where('toKey', '==', me).where('claimed', '==', false);
    this.grantUnsub = q.onSnapshot((snap) => {
      snap.docChanges().forEach((ch) => {
        if (ch.type !== 'added') return;
        const ref = ch.doc.ref;
        YGA.db.runTransaction(async (tx) => {
          const d = await tx.get(ref);
          if (!d.exists || d.data().claimed) return 0;
          tx.update(ref, { claimed: true, claimedAt: firebase.firestore.FieldValue.serverTimestamp() });
          return Number(d.data().amount) || 0;
        }).then((amt) => {
          if (!amt) return;
          const money = Math.min(100000000, this.state.money + amt);
          this.setState({ money: money });
          YGA.save({ money: money }, true);
          this.flash('운영자 지급 +' + fmt(amt) + '원이 들어왔어요!', false);
        }).catch((e) => console.error('grant', e));
      });
    }, (e) => console.error('grants listen', e));
  }

  // ---------- trading (give / sell / buy / swap) ----------
  invAfter(inv, removeItem, addItem) {
    const out = inv.slice();
    if (removeItem) { const ix = out.indexOf(removeItem); if (ix < 0) return null; out.splice(ix, 1); }
    if (addItem) out.push(addItem);
    return out.length <= INV_MAX ? out : null;
  }

  eqFix(inv, eq) {
    const e = Object.assign({}, eq);
    if (e.hair && inv.indexOf(e.hair) < 0) e.hair = '';
    if (PREM[e.top] && inv.indexOf(e.top) < 0) e.top = 'hoodie';
    return e;
  }

  tradeSend(to, give, want) {
    const st = this.state;
    give = { item: PREM[give.item] ? give.item : '', money: Math.max(0, Math.floor(give.money || 0)) };
    want = { item: PREM[want.item] ? want.item : '', money: Math.max(0, Math.floor(want.money || 0)) };
    if (!give.item && !give.money && !want.item && !want.money) { this.flash('주거나 받을 것을 골라주세요', true); return; }
    if (give.money > st.money) { this.flash('가진 머니보다 많이 줄 수 없어요', true); return; }
    if (!this.invAfter(st.inv || [], give.item, want.item)) { this.flash(give.item ? '보관함 칸이 모자라요' : '보관함(6칸)이 가득 차서 받을 수 없어요', true); return; }
    if (!this.peers[to]) { this.flash('상대가 접속 중이 아니에요', true); return; }
    const tid = Math.random().toString(36).slice(2, 10);
    this.tradesOut = this.tradesOut || {};
    this.tradesOut[tid] = { to: to, give: give, want: want, at: Date.now() };
    this.pub('ev/' + to, { type: 'trade', from: this.myId, name: this.myName(), tid: tid, give: give, want: want });
    this.setState({ sheet: null, trade: null });
    this.flash('거래 제안을 보냈어요. 상대가 수락하면 바로 바뀌어요', false);
  }

  tradeAnswer(yes) {
    const st = this.state, o = st.tradeIn;
    if (!o) return;
    this.setState({ sheet: null, tradeIn: null });
    if (!yes) { this.pub('ev/' + o.from, { type: 'tradeNo', from: this.myId, name: this.myName(), tid: o.tid, why: '상대가 거절했어요' }); return; }
    if (o.want.money > st.money) { this.flash('머니가 부족해서 수락할 수 없어요', true); this.pub('ev/' + o.from, { type: 'tradeNo', from: this.myId, name: this.myName(), tid: o.tid, why: '상대 머니가 부족해요' }); return; }
    if (!this.invAfter(st.inv || [], o.want.item, o.give.item)) { this.flash(o.want.item && (st.inv || []).indexOf(o.want.item) < 0 ? '그 아이템이 이제 없어요' : '보관함이 가득 찼어요', true); this.pub('ev/' + o.from, { type: 'tradeNo', from: this.myId, name: this.myName(), tid: o.tid, why: '상대 보관함 문제로 취소됐어요' }); return; }
    this.tradesIn = this.tradesIn || {};
    this.tradesIn[o.tid] = o;
    this.pub('ev/' + o.from, { type: 'tradeAcc', from: this.myId, name: this.myName(), tid: o.tid });
    this.flash('거래 수락! 상대 확인 중...', false);
  }

  tradeApply(removeItem, addItem, moneyOut, moneyIn) {
    const st = this.state;
    const inv = this.invAfter(st.inv || [], removeItem, addItem);
    if (!inv) return false;
    const money = Math.max(0, Math.min(100000000, st.money - moneyOut + moneyIn));
    this.setState({ inv: inv, money: money, eq: this.eqFix(inv, st.eq) });
    this.lastSig = '';
    this.saveLocal(true);
    return true;
  }

  tradeEvent(from, nm, m) {
    const st = this.state;
    const clean = (p) => ({ item: p && PREM[p.item] ? p.item : '', money: Math.max(0, Math.floor(Number(p && p.money) || 0)) });
    const tid = String(m.tid || '').slice(0, 12);
    const desc = (p) => [p.item ? PREM[p.item].name : '', p.money ? p.money.toLocaleString('ko-KR') + '원' : ''].filter(Boolean).join(' + ') || '없음';
    if (m.type === 'trade') {
      if (this.rel[from] && this.rel[from].blocked) return;
      const o = { tid: tid, from: from, name: nm, give: clean(m.give), want: clean(m.want) };
      if (st.shift) { this.pub('ev/' + from, { type: 'tradeNo', from: this.myId, name: this.myName(), tid: tid, why: '상대가 알바 중이에요' }); return; }
      this.setState({ tradeIn: o, sheet: { type: 'tradeIn', id: from } });
      return;
    }
    if (m.type === 'tradeAcc') {
      const o = (this.tradesOut || {})[tid];
      if (!o || o.to !== from) return;
      delete this.tradesOut[tid];
      if (o.give.money > st.money || !this.tradeApply(o.give.item, o.want.item, o.give.money, o.want.money)) {
        this.pub('ev/' + from, { type: 'tradeNo', from: this.myId, name: this.myName(), tid: tid, why: '제안한 사람의 아이템이나 머니가 바뀌어 취소됐어요' });
        this.flash('거래가 취소됐어요 (내 보관함·머니가 바뀌었어요)', true);
        return;
      }
      this.pub('ev/' + from, { type: 'tradeDone', from: this.myId, name: this.myName(), tid: tid });
      this.flash(nm + '님과 거래 완료! 받음: ' + desc(o.want), false);
      return;
    }
    if (m.type === 'tradeDone') {
      const o = (this.tradesIn || {})[tid];
      if (!o || o.from !== from) return;
      delete this.tradesIn[tid];
      this.tradeApply(o.want.item, o.give.item, o.want.money, o.give.money);
      this.flash(nm + '님과 거래 완료! 받음: ' + desc(o.give), false);
      return;
    }
    if (m.type === 'tradeNo') {
      if (this.tradesOut) delete this.tradesOut[tid];
      if (this.tradesIn) delete this.tradesIn[tid];
      if (st.tradeIn && st.tradeIn.tid === tid) this.setState({ tradeIn: null, sheet: null });
      this.flash('거래 취소: ' + YG.clip(m.why || '취소됐어요', 40), true);
    }
  }

  netGone() {
    try { if (this.cli && this.cli.connected) this.cli.publish(YG.P + 'p/' + this.myId, JSON.stringify({ id: this.myId, gone: 1 })); } catch (e) {}
  }

  pub(t, obj, opts) {
    if (!this.cli) return;
    try { this.cli.publish(YG.P + t, obj === '' ? '' : JSON.stringify(obj), opts || {}); } catch (e) {}
  }

  netMsg(t, m) {
    const st = this.state;
    const clip = YG.clip;
    if (t.indexOf('pw/') === 0) {
      const key = t.slice(3);
      if (m && m.pw) this.pws[key] = { pw: clip(m.pw, 8), by: String(m.by || '') }; else delete this.pws[key];
      this.forceUpdate(); return;
    }
    if (t.indexOf('g/') === 0) {
      const key = t.slice(2);
      const g = m && m.g && typeof m.g === 'object' && Array.isArray(m.g.order) ? m.g : null;
      if (g) this.games[key] = g; else delete this.games[key];
      if ((!m || m.by !== this.myId) && st.seated && this.roomKey() === key) {
        if (g && g.type === 'dice' && !g.rolling && this.gIv) { clearInterval(this.gIv); this.gIv = null; }
        this.setState({ g2: g, gameType: g ? g.type : st.gameType });
      }
      return;
    }
    if (!m) return;
    if (t.indexOf('p/') === 0) {
      const id = t.slice(2);
      if (id === this.myId || m.id !== id) return;
      if (m.gone) delete this.peers[id];
      else { m.seen = Date.now(); this.peers[id] = m; if (this.remoteSample) this.remoteSample(id, m); }
      this.netSync(); return;
    }
    if (t === 'fx') {
      if (m.id === this.myId || m.kind !== 'fireworks' || m.area !== st.area || this.myBarOf()) return;
      if (Date.now() - (this.lastFxIn || 0) < 1500) return;
      this.lastFxIn = Date.now();
      const spots = (Array.isArray(m.spots) ? m.spots : []).slice(0, 3).map((q) => [Math.max(40, Math.min(350, Number(q && q[0]) || 195)), Math.max(80, Math.min(300, Number(q && q[1]) || 160))]);
      if (st.tab === 'map' && !st.travel && window.YGFX) YGFX.fireworks(spots);
      this.setState({ log: st.log.concat([{ who: '여기야', text: clip(m.name, 12) + '님이 폭죽을 터뜨렸어요!' }]).slice(-3) });
      return;
    }
    if (t === 'chat') {
      if (m.id === this.myId) return;
      if (m.area === st.area && (m.barOf || '') === this.myBarOf() && !(this.rel[m.id] && this.rel[m.id].blocked))
        this.setState({ log: st.log.concat([{ who: clip(m.name, 12), text: clip(m.text, 40) }]).slice(-3) });
      return;
    }
    if (t.indexOf('r/') === 0) {
      if (m.from === this.myId) return;
      this.postRoomLocal(t.slice(2), { sys: !!m.sys, who: clip(m.who, 12), text: clip(m.text, 200), me: false });
      return;
    }
    if (t.indexOf('dm/') === 0) {
      const from = String(m.from || ''); if (!from || from === this.myId) return;
      if (this.rel[from] && this.rel[from].blocked) return;
      const list = (st.dms[from] || []).concat([{ t: clip(m.t, 200), me: false }]).slice(-80);
      const dms = Object.assign({}, st.dms, { [from]: list });
      const nm = clip(m.name, 12);
      if (!st.sheet && !st.shift && this.peers[from]) this.setState({ dms: dms, sheet: { type: 'dm', id: from }, dmText: '' });
      else { this.setState({ dms: dms }); if (!(st.sheet && st.sheet.id === from)) this.flash(nm + '님의 1:1 메시지: ' + clip(m.t, 24), false); }
      return;
    }
    if (t.indexOf('ev/') === 0) {
      const from = String(m.from || ''); if (!from || from === this.myId) return;
      const nm = clip(m.name, 12);
      if (m.type === 'flirt' && !this.likedBy[from]) {
        this.likedBy[from] = 1; YG.save('likedBy', this.likedBy);
        const like = st.myLike + 1;
        this.setState({ myLike: like });
        this.flash(nm + '님이 나에게 플러팅했어요! 호감 ' + like + (like === 30 ? ' · 머리 위에 별이 떴어요' : (like === 100 ? ' · 별이 반짝여요' : '')), false);
        this.lastSig = '';
      } else if (m.type === 'trade' || m.type === 'tradeAcc' || m.type === 'tradeDone' || m.type === 'tradeNo') {
        this.tradeEvent(from, nm, m);
      } else if (m.type === 'friend') {
        this.flash(nm + '님이 나를 친구로 추가했어요', false);
      } else if (m.type === 'report' && !this.reportedBy[from]) {
        this.reportedBy[from] = 1; YG.save('reportedBy', this.reportedBy);
        this.lastSig = '';
        if (Object.keys(this.reportedBy).length >= 10) { YG.save('banned', true); if (window.YGA) YGA.save({ banned: true, reportedBy: this.reportedBy }, true); this.netGone(); try { this.cli.end(true); } catch (e) {} this.cli = null; this.showBan(); }
      }
    }
  }

  showBan() {
    const el = document.getElementById('yg-ban');
    if (el) el.style.display = 'flex';
  }

  netUsers() {
    const clip = YG.clip, U = {};
    const FS = ['front', 'back', 'left', 'right'];
    Object.keys(this.peers).forEach((id) => {
      const p = this.peers[id], r = this.rel[id] || {};
      U[id] = {
        name: clip(p.name, 12) || '손님', area: String(p.area || ''), barOf: String(p.barOf || ''), g: p.g === 'female' ? 'female' : 'male',
        f: FS.indexOf(p.f) >= 0 ? p.f : 'front', x: Number(p.x) || 0, y: Number(p.y) || 0, w: !!p.w, dance: !!p.dance, hair: PREM[p.hr] && PREM[p.hr].cat === 'hair' ? p.hr : '', top: PREM[p.tp] && PREM[p.tp].cat === 'top' ? p.tp : '', inv: Array.isArray(p.inv) ? p.inv.filter((x) => PREM[x]).slice(0, INV_MAX) : [],
        like: Math.max(0, Number(p.like) || 0), flirted: !!r.flirted, friend: !!r.friend, reports: Math.max(0, Number(p.rp) || 0),
        reported: !!r.reported, banned: !!r.blocked, height: clip(p.h, 3), region: clip(p.rg, 12), pin: clip(p.pin, 30), bubble: clip(p.b, 40),
        seat: p.seat && typeof p.seat === 'object' ? { k: clip(p.seat.k, 60), since: Number(p.seat.since) || 0 } : null
      };
    });
    return U;
  }

  netSync() {
    this.setState({ users: this.netUsers() });
    YG.status(!!(this.cli && this.cli.connected), this.onlineCount());
  }

  relSet(id, o) {
    const r = Object.assign({}, this.rel[id] || {});
    ['friend', 'flirted', 'reported'].forEach((k) => { if (k in o) r[k] = !!o[k]; });
    if (o.banned) r.blocked = true;
    const p = this.peers && this.peers[id];
    if (p) { r.name = YG.clip(p.name, 12); r.g = p.g === 'female' ? 'female' : 'male'; }
    this.rel[id] = r;
    YG.save('rel', this.rel);
  }

  netPub(force) {
    const c = this.cli; if (!c || !c.connected) return;
    const st = this.state;
    const inside = st.area === 'bar' || st.area === 'club';
    const zone = inside ? st.barName : this.zoneOf(st.area, st.px, st.py);
    const p = {
      id: this.myId, name: this.myName(), g: st.gender, area: st.travel ? '' : st.area, barOf: this.myBarOf(),
      x: Math.round(st.px), y: Math.round(st.py), f: st.facing, w: st.walking ? 1 : 0, dance: st.dancing ? 1 : 0,
      hr: (st.eq && st.eq.hair) || '', tp: (st.eq && PREM[st.eq.top]) ? st.eq.top : '', inv: (st.inv || []).slice(0, INV_MAX), b: st.myBubble || '', pin: st.share ? '여기야! ' + (zone || '') : '', like: st.myLike, rp: Object.keys(this.reportedBy || {}).length,
      h: st.prof.pub.height ? String(st.prof.height || '') : '', rg: st.prof.pub.region ? String(st.prof.region || '') : '',
      seat: st.seated ? { k: this.roomKey(), since: this.seatSince || 0 } : null
    };
    const sig = JSON.stringify(p), now = Date.now();
    if (!force && sig === this.lastSig && now - this.lastPub < 3000) return;
    this.lastSig = sig; this.lastPub = now;
    try { c.publish(YG.P + 'p/' + this.myId, sig); } catch (e) {}
  }

  netClean() {
    const now = Date.now();
    let changed = false;
    Object.keys(this.peers).forEach((id) => { if (now - this.peers[id].seen > 9000) { delete this.peers[id]; changed = true; } });
    if (changed) this.netSync();
    YG.status(!!(this.cli && this.cli.connected), this.onlineCount());
    // keep a game moving when the player whose turn it is has left the table
    const st = this.state, g = st.g2;
    if (st.seated && g && !g.done && !g.rolling && !g.drawing && Array.isArray(g.order) && g.order.length && g.type !== 'king') {
      const d = this.tableData(st.seated.t);
      if (d.owner === this.myName()) {
        const names = d.members.map((m) => m.name);
        const cur = g.order[g.turn % g.order.length];
        if (names.indexOf(cur) < 0) {
          const order = g.order.filter((n) => names.indexOf(n) >= 0);
          const ng = Object.assign({}, g, { order: order });
          if (g.type === 'dice') ng.done = g.turn >= order.length;
          else ng.turn = order.length ? g.turn % order.length : 0;
          if (!order.length) ng.done = true;
          this.setG(ng);
          this.postRoom(this.roomKey(), { sys: true, text: cur + '님이 자리를 떠서 차례를 넘겼어요' });
        }
      }
    }
  }

  saveLocal(force) {
    const st = this.state;
    const outside = st.area !== 'bar' && st.area !== 'club' && !st.travel;
    const o = outside ? { area: st.area, px: st.px, py: st.py } : (st.outPos ? { area: st.outPos.area, px: st.outPos.px, py: st.outPos.py + 10 } : {});
    const data = Object.assign({ money: st.money, owned: st.owned, eq: st.eq, prof: st.prof, myLike: st.myLike, gender: st.gender, share: st.share, energy: st.energy, fireworks: st.fireworks || 0, inv: st.inv || [] }, o);
    if (YG.acct && window.YGA) {
      data.prof = Object.assign({}, st.prof, { nick: YG.acct.nick });
      if (!force && Date.now() - (this.acctAt || 0) < 30000) return;
      this.acctAt = Date.now();
      YGA.save(Object.assign({}, data, { rel: this.rel || {}, likedBy: this.likedBy || {}, reportedBy: this.reportedBy || {} }));
    } else YG.save('state', data);
  }

  tableData(t) { return this.netTable(this.tableKey(t)); }

  netTable(key) {
    const st = this.state, meName = this.myName();
    const mem = [];
    Object.keys(this.peers || {}).forEach((id) => {
      const p = this.peers[id];
      if (p.seat && p.seat.k === key && !(this.rel[id] && this.rel[id].blocked)) {
        let nm = YG.clip(p.name, 12) || '손님';
        if (nm === meName) nm = nm + '²';
        mem.push({ name: nm, g: p.g === 'female' ? 'female' : 'male', since: Number(p.seat.since) || 0, id: id });
      }
    });
    if (st.seated && this.roomKey() === key) mem.push({ name: meName, g: st.gender, me: true, since: this.seatSince || 0, id: this.myId });
    mem.sort((a, b) => (a.since - b.since) || (a.id < b.id ? -1 : 1));
    const owner = mem.length ? mem[0].name : '';
    const pr = (this.pws || {})[key];
    const pw = mem.length && pr && mem.some((m) => m.id === pr.by) ? pr.pw : '';
    return { members: mem, owner: owner, pw: pw };
  }

  setTable(t, d) {
    const key = this.tableKey(t);
    if (d.pw) { this.pws[key] = { pw: d.pw, by: this.myId }; this.pub('pw/' + key, { pw: d.pw, by: this.myId }, { retain: true }); }
    else { delete this.pws[key]; this.pub('pw/' + key, '', { retain: true }); }
    this.forceUpdate();
  }

  roomKey() { const st = this.state; return st.seated ? st.barOf + ':' + st.seated.t : ''; }

  postRoomLocal(key, msg) {
    const rooms = Object.assign({}, this.state.rooms);
    rooms[key] = (rooms[key] || []).concat([Object.assign({ at: Date.now() }, msg)]).slice(-60);
    this.setState({ rooms: rooms });
  }

  postRoom(key, msg) {
    if (!key) return;
    this.postRoomLocal(key, msg);
    this.pub('r/' + key, { from: this.myId, sys: !!msg.sys, who: msg.who || '', text: msg.text });
  }

  setG(ng) {
    this.setState({ g2: ng, gameType: ng ? ng.type : this.state.gameType });
    const key = this.roomKey();
    if (!key) return;
    if (ng) this.games[key] = ng; else delete this.games[key];
    this.pub('g/' + key, { by: this.myId, g: ng }, { retain: true });
  }

  enterTable(t) {
    const st = this.state;
    const me = this.myName();
    const d = this.tableData(t);
    const key = this.tableKey(t);
    const already = !!(st.seated && st.seated.t === t);
    if (already) return;
    if (d.pw && d.members.length && st.tpPw !== d.pw) { this.flash('비밀번호가 맞지 않아요', true); return; }
    if (st.seated) this.standUp();
    this.stopTimers();
    const first = d.members.length === 0;
    this.seatSince = Date.now();
    if (first) { delete this.games[key]; this.pub('g/' + key, '', { retain: true }); delete this.pws[key]; this.pub('pw/' + key, '', { retain: true }); }
    const rooms = Object.assign({}, this.state.rooms);
    if (first || !rooms[key]) rooms[key] = [{ sys: true, text: st.barName + ' 테이블 ' + (t + 1) + ' 단체 채팅방이에요' }];
    const g = this.games[key] || null;
    this.setState({ rooms: rooms, seated: { t: t }, tableSel: null, tpPw: '', panel: 'chat', walking: false, target: null,
      calc: Object.assign({}, st.calc, { n: d.members.length + 1 }), pwText: '', g2: g, gameType: g ? g.type : st.gameType });
    this.postRoom(key, { sys: true, text: me + '님이 입장했어요' + (first ? ' · 방장이 되었어요. 위에서 방 비밀번호를 정할 수 있어요' : '') });
    this.lastSig = ''; this.netPub(true);
  }

  stopGame() {
    if (this.gIv) { clearInterval(this.gIv); this.gIv = null; }
    if (this.gameTo) { clearTimeout(this.gameTo); this.gameTo = null; }
    if (this.spinIv) { clearInterval(this.spinIv); this.spinIv = null; }
  }

  memberNames() {
    const st = this.state;
    if (!st.seated) return [];
    return this.tableData(st.seated.t).members.map((m) => m.name);
  }

  startGame(type) {
    this.stopGame();
    const order = this.memberNames();
    let g = { type: type, order: order, turn: 0, done: false };
    if (type === 'dice') g = Object.assign(g, { res: {}, rolling: false, tumble: 0, last: null });
    if (type === 'updown') g = Object.assign(g, { secret: 1 + Math.floor(Math.random() * 50), low: 1, high: 50, log: [] });
    if (type === 'king') g = Object.assign(g, { drawing: false, map: null, kingName: '' });
    this.setState({ spinning: false, udText: '' });
    this.setG(g);
    if (type === 'updown') this.postRoom(this.roomKey(), { sys: true, text: '업다운 시작! 1~50 사이 숫자, 맞히는 사람이 마셔요 · 순서: ' + order.join(' → ') });
    if (type === 'dice') this.postRoom(this.roomKey(), { sys: true, text: '주사위 대결 시작! 순서: ' + order.join(' → ') + ' · 가장 낮은 숫자가 마셔요' });
  }

  botTurnLater() {}

  rollDiceTurn() {
    const g = this.state.g2;
    if (!g || g.type !== 'dice' || g.rolling || g.done) return;
    const who = g.order[g.turn];
    if (who !== this.myName()) return;
    this.setG(Object.assign({}, g, { rolling: true, tumble: 0 }));
    let ticks = 0;
    if (this.gIv) clearInterval(this.gIv);
    this.gIv = setInterval(() => {
      ticks++;
      const c = this.state.g2;
      if (!c || c.type !== 'dice') { clearInterval(this.gIv); this.gIv = null; return; }
      if (ticks < 11) { this.setState({ g2: Object.assign({}, c, { tumble: ticks % 6 }) }); return; }
      clearInterval(this.gIv); this.gIv = null;
      const v = 1 + Math.floor(Math.random() * 6);
      const res = Object.assign({}, c.res, { [who]: v });
      const turn = c.turn + 1;
      const done = turn >= c.order.length;
      const ng = Object.assign({}, c, { rolling: false, tumble: 0, res: res, turn: turn, done: done, last: { who: who, v: v } });
      this.setG(ng);
      this.postRoom(this.roomKey(), { sys: true, text: '주사위 · ' + who + ' → ' + v });
      if (done) {
        const min = Math.min.apply(null, c.order.map((n) => res[n] || 7));
        const losers = c.order.filter((n) => res[n] === min);
        this.postRoom(this.roomKey(), { sys: true, text: '주사위 결과 · 가장 낮은 ' + min + ' → ' + losers.join(', ') + ' 마시기!' });
      }
    }, 90);
  }

  udGuess(v) {
    const g = this.state.g2;
    if (!g || g.type !== 'updown' || g.done) return;
    const who = g.order[g.turn % g.order.length];
    if (who !== this.myName()) return;
    if (!v || v < g.low || v > g.high) { this.flash(g.low + '~' + g.high + ' 사이 숫자를 말해요', true); return; }
    const key = this.roomKey();
    if (v === g.secret) {
      this.setState({ udText: '' });
      this.setG(Object.assign({}, g, { done: true, log: g.log.concat([who + ' ' + v + ' 정답!']) }));
      this.postRoom(key, { sys: true, text: '업다운 · ' + who + ' ' + v + ' 정답! ' + who + '님 원샷!' });
      return;
    }
    const up = v < g.secret;
    this.setState({ udText: '' });
    this.setG(Object.assign({}, g, { low: up ? v + 1 : g.low, high: up ? g.high : v - 1, turn: g.turn + 1, log: g.log.concat([who + ' ' + v + (up ? ' 업' : ' 다운')]).slice(-12) }));
    this.postRoom(key, { sys: true, text: '업다운 · ' + who + ' ' + v + ' → ' + (up ? '업!' : '다운!') });
  }

  drawKing() {
    const g = this.state.g2;
    if (g && g.drawing) return;
    const order = this.memberNames();
    if (order.length < 2) { this.flash('왕게임은 2명 이상 있어야 해요', true); return; }
    this.setG({ type: 'king', order: order, drawing: true, map: null, kingName: '', done: false, turn: 0 });
    if (this.gameTo) clearTimeout(this.gameTo);
    this.gameTo = setTimeout(() => {
      const labels = ['왕'].concat(order.slice(1).map((x, i) => String(i + 1)));
      for (let i = labels.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const tmp = labels[i]; labels[i] = labels[j]; labels[j] = tmp; }
      const map = {}; order.forEach((n, i) => { map[n] = labels[i]; });
      const kingName = order.find((n) => map[n] === '왕');
      this.setG({ type: 'king', order: order, drawing: false, map: map, kingName: kingName, done: true, turn: 0 });
      this.postRoom(this.roomKey(), { sys: true, text: '왕게임 · 왕은 ' + kingName + '님! 각자 번호는 본인 화면에서만 보여요. 왕님, 번호로 명령하세요 (예: 2번이 4번에게 러브샷)' });
    }, 1400);
  }

  standUp() {
    this.stopGame();
    if (this.spinIv) { clearInterval(this.spinIv); this.spinIv = null; }
    const st = this.state;
    if (st.seated) {
      const t = st.seated.t, d = this.tableData(t), me = this.myName(), key = this.tableKey(t);
      const rest = d.members.filter((m) => !m.me);
      if (rest.length) {
        const pr = this.pws[key];
        if (pr && pr.by === this.myId && d.pw) { this.pws[key] = { pw: d.pw, by: rest[0].id }; this.pub('pw/' + key, { pw: d.pw, by: rest[0].id }, { retain: true }); }
        this.postRoom(key, { sys: true, text: me + '님이 나갔어요' + (d.owner === me ? ' · ' + rest[0].name + '님이 새 방장이에요' : '') });
      } else {
        delete this.pws[key]; delete this.games[key];
        this.pub('pw/' + key, '', { retain: true }); this.pub('g/' + key, '', { retain: true });
      }
    }
    this.setState({ seated: null, panel: 'chat', spinning: false, g2: null });
    this.lastSig = ''; this.netPub(true);
  }

  say(text) {
    const raw = (text || '').trim();
    if (raw.charAt(0) === '/') { this.setState({ chatText: '' }); this.slashCmd(raw); return; }
    const t = raw.slice(0, 40);
    if (!t) return;
    const log = this.state.log.concat([{ who: '나', text: t }]).slice(-3);
    this.setState({ myBubble: t, chatText: '', log: log });
    if (this.bubbleTo) clearTimeout(this.bubbleTo);
    this.bubbleTo = setTimeout(() => this.setState({ myBubble: '' }), 4000);
    this.pub('chat', { id: this.myId, name: this.myName(), area: this.state.area, barOf: this.myBarOf(), text: t });
    this.netPub(true);
  }
  // ================= /realtime =================

