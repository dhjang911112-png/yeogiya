# 여기야 소스 (빌드 원본)

`game.html` / `index.html`은 이 폴더의 원본에서 `build_site.py`로 생성된다. 생성 파일을 직접 고치지 말 것.

- `project/Game.dc.html`, `project/Main.dc.html` — 화면 템플릿 + 게임 로직 원본
- `dc2preact.py` — 템플릿 → Preact 렌더 함수 변환기
- `site_src/` — 런타임(runtime.js), 계정(account.js), 실시간(net_methods.js), 이동(motion_methods.js), 폭죽(fx.js), 로그인 UI
- `wardrobe_patch.py` — 보관함·프리미엄 의상·거래
- `motion_patch.py` — Phase A: rAF 이동 엔진, 카메라, 원격 보간, 스프라이트 정규화
- `data/` — 스프라이트 프레임표(fr.json), NPC(nf.json), 머리/상의 앵커(headboxes, wearboxes, wearitems)
- `tests/` — Playwright 회귀·성능 테스트 (`node tests/phaseA.js http://localhost:8080 new 4` = CPU 4배 감속)

로컬 테스트: `node tests/broker.js`(로컬 MQTT) 후 `game.html?broker=ws://localhost:8883`
