/* 여기야 accounts: nickname + password + birthdate, stored in Firebase Auth + Firestore */
(function () {
  const cfg = window.YG_FIREBASE;
  const on = !!(cfg && cfg.apiKey && window.firebase);
  const A = { on: on, user: null, data: null };

  // 청소년보호법: 만 19세 미만 차단, 단 만 19세가 되는 해의 1월 1일부터는 허용 → 출생연도 <= 올해 - 19
  A.adultOk = function (birth) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth || '');
    if (!m) return false;
    const y = +m[1], mo = +m[2], d = +m[3];
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return false;
    if (y < 1900) return false;
    return y <= new Date().getFullYear() - 19;
  };
  A.validBirth = function (birth) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth || '');
    if (!m) return false;
    const y = +m[1], mo = +m[2], d = +m[3];
    const dt = new Date(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d && y >= 1900 && dt <= new Date();
  };
  A.nickOk = (n) => /^[가-힣a-zA-Z0-9_]{2,10}$/.test(n || '');
  A.nickEmail = function (nick) {
    const bytes = new TextEncoder().encode(String(nick).trim().toLowerCase());
    let hex = ''; bytes.forEach((b) => { hex += b.toString(16).padStart(2, '0'); });
    return 'u' + hex + '@yeogiya.app';
  };

  const msg = (e) => {
    const c = (e && e.code) || '';
    if (c.indexOf('email-already-in-use') >= 0) return '이미 사용 중인 닉네임이에요';
    if (c.indexOf('invalid-credential') >= 0 || c.indexOf('wrong-password') >= 0 || c.indexOf('user-not-found') >= 0 || c.indexOf('invalid-login') >= 0) return '닉네임 또는 비밀번호가 맞지 않아요';
    if (c.indexOf('weak-password') >= 0) return '비밀번호는 6자리 이상이에요';
    if (c.indexOf('too-many-requests') >= 0) return '시도가 너무 많아요. 잠시 후 다시 해주세요';
    if (c.indexOf('network') >= 0) return '인터넷 연결을 확인해 주세요';
    if (c.indexOf('permission') >= 0) return '가입 조건을 확인해 주세요';
    return '잠시 후 다시 시도해 주세요';
  };

  if (on) {
    firebase.initializeApp(cfg);
    A.auth = firebase.auth();
    A.db = firebase.firestore();
  }

  A.ready = function () {
    if (!on) return Promise.resolve(null);
    return new Promise((res) => {
      const un = A.auth.onAuthStateChanged(async (u) => {
        un();
        if (!u) { res(null); return; }
        try {
          const snap = await A.db.collection('users').doc(u.uid).get();
          A.user = u; A.data = snap.exists ? snap.data() : null;
          res(A.data ? { uid: u.uid, data: A.data } : null);
        } catch (e) { console.error(e); res(null); }
      });
    });
  };

  A.signup = async function (nick, pw, birth) {
    nick = String(nick || '').trim();
    if (!A.nickOk(nick)) throw new Error('닉네임은 한글·영문·숫자 2~10자예요');
    if (String(pw || '').length < 6) throw new Error('비밀번호는 6자리 이상이에요');
    if (!A.validBirth(birth)) throw new Error('생년월일을 정확히 입력해 주세요');
    if (!A.adultOk(birth)) throw new Error('만 19세 미만은 가입할 수 없어요 (청소년 이용 불가)');
    let cred;
    try { cred = await A.auth.createUserWithEmailAndPassword(A.nickEmail(nick), pw); }
    catch (e) { throw new Error(msg(e)); }
    const data = {
      nick: nick, birth: birth, gender: 'male', money: 5000, energy: 80, myLike: 0,
      owned: { hoodie: true, jeans: true, sneakers: true }, eq: { top: 'hoodie', bottom: 'jeans', shoes: 'sneakers' },
      banned: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try { await A.db.collection('users').doc(cred.user.uid).set(data); }
    catch (e) { try { await cred.user.delete(); } catch (e2) {} throw new Error(msg(e)); }
    A.user = cred.user; A.data = data;
    return { uid: cred.user.uid, data: data };
  };

  A.login = async function (nick, pw) {
    nick = String(nick || '').trim();
    if (!nick || !pw) throw new Error('닉네임과 비밀번호를 입력해 주세요');
    let cred;
    try { cred = await A.auth.signInWithEmailAndPassword(A.nickEmail(nick), pw); }
    catch (e) { throw new Error(msg(e)); }
    const snap = await A.db.collection('users').doc(cred.user.uid).get();
    if (!snap.exists) { await A.auth.signOut(); throw new Error('가입 정보를 찾을 수 없어요'); }
    A.user = cred.user; A.data = snap.data();
    return { uid: cred.user.uid, data: A.data };
  };

  A.logout = async function () { if (on) await A.auth.signOut(); A.user = null; A.data = null; };

  let lastSaved = '';
  A.save = function (patch, force) {
    if (!on || !A.user) return Promise.resolve();
    const s = JSON.stringify(patch);
    if (!force && s === lastSaved) return Promise.resolve();
    lastSaved = s;
    return A.db.collection('users').doc(A.user.uid).set(patch, { merge: true }).catch((e) => console.error('save', e));
  };

  window.YGA = A;
})();
