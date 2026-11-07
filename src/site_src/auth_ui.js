(function () {
  if (!window.YGA || !YGA.on) return;
  const $ = (id) => document.getElementById(id);
  const box = $('yg-auth');
  let mode = 'login';
  const setMode = (m) => {
    mode = m;
    $('yg-tab-login').setAttribute('aria-selected', m === 'login' ? 'true' : 'false');
    $('yg-tab-join').setAttribute('aria-selected', m === 'join' ? 'true' : 'false');
    $('yg-a-pw2-wrap').style.display = m === 'join' ? 'flex' : 'none';
    $('yg-a-birth-wrap').style.display = m === 'join' ? 'flex' : 'none';
    $('yg-a-pw').setAttribute('autocomplete', m === 'join' ? 'new-password' : 'current-password');
    $('yg-a-go').textContent = m === 'join' ? '가입하고 시작하기' : '로그인';
    $('yg-a-err').textContent = '';
  };
  $('yg-tab-login').onclick = () => setMode('login');
  $('yg-tab-join').onclick = () => setMode('join');
  ['yg-a-y', 'yg-a-m', 'yg-a-d'].forEach((id, i, arr) => {
    $(id).addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      if (e.target.value.length >= +e.target.maxLength && arr[i + 1]) $(arr[i + 1]).focus();
    });
  });

  const loggedIn = (acc) => {
    box.style.display = 'none';
    $('yg-out').style.display = 'block';
    const el = $('nick');
    if (el) { el.value = acc.data.nick; el.readOnly = true; el.style.background = '#f4efe5'; }
    if (window.__dc && acc.data.gender) window.__dc.setState({ gender: acc.data.gender });
  };
  window.ygShowAuth = () => { box.style.display = 'flex'; };

  $('yg-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('yg-a-err'), go = $('yg-a-go');
    err.textContent = '';
    const nick = $('yg-a-nick').value.trim(), pw = $('yg-a-pw').value;
    try {
      go.disabled = true;
      let acc;
      if (mode === 'join') {
        if (pw !== $('yg-a-pw2').value) throw new Error('비밀번호가 서로 달라요');
        const y = $('yg-a-y').value, m = $('yg-a-m').value.padStart(2, '0'), d = $('yg-a-d').value.padStart(2, '0');
        acc = await YGA.signup(nick, pw, y + '-' + m + '-' + d);
      } else {
        acc = await YGA.login(nick, pw);
      }
      if (acc.data.banned) { await YGA.logout(); throw new Error('신고 누적으로 이용이 정지된 계정이에요'); }
      loggedIn(acc);
    } catch (ex) {
      err.textContent = ex.message || '잠시 후 다시 시도해 주세요';
    } finally { go.disabled = false; }
  });

  $('yg-out').onclick = async () => {
    await YGA.logout();
    try { localStorage.removeItem('yg_me'); } catch (e) {}
    const el = $('nick'); if (el) { el.readOnly = false; el.value = ''; el.style.background = '#fff'; }
    $('yg-out').style.display = 'none';
    setMode('login');
    box.style.display = 'flex';
  };

  YGA.ready().then((acc) => {
    if (acc && !acc.data.banned) loggedIn(acc);
    else { if (acc) YGA.logout(); box.style.display = 'flex'; }
  });
})();
