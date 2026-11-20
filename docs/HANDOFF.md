# 여기야 — 작업 인수인계 (2026-11-20 기준)

## 이어서 작업할 Claude에게 줄 프롬프트

```
너는 '여기야' 게임 작업을 이어받는다. 모든 답변은 한국어로만 한다.
GitHub 저장소 dhjang911112-png/yeogiya 를 연결(add_repo, push 권한)하고 클론한 뒤,
main 브랜치의 docs/HANDOFF.md 를 먼저 끝까지 읽고 그 내용대로 이어서 작업해라.
규칙:
- 운영(main) 반영·배포는 내가 "운영 올려"라고 할 때만. 그 전엔 시험 브랜치에서 테스트하고 캡처로 보여줘.
- 원본 그림은 덮어쓰거나 지우지 말고 art/ 아래 보관.
- 그림이 몸에 안 맞으면 억지로 늘이거나 잘라서 맞추지 말고, 어디를 다시 그려야 하는지 말해줘.
- 이용자 데이터(돈·계정·Firestore)는 내 승인 없이 건드리지 마.
- 유료 API 없이 무료 방식으로.
지금 할 일: (여기에 새 요청을 적는다)
```

## 1. 프로젝트 개요
- 모바일 2D 소셜 게임. 실제 한국 도시(해운대·광안리 등)를 걷고, 채팅·클럽·바·상점·알바·옷 구매.
- 운영 주소: https://dhjang911112-png.github.io/yeogiya/ (GitHub Pages, main 브랜치에 push 하면 1~2분 뒤 자동 배포)
- 실시간: MQTT 공개 브로커 wss://broker.emqx.io:8084/mqtt, 토픽 접두 `yeogiya-kr-7c1e/v1/`
- 계정: Firebase Auth(이메일=닉네임 hex 변환 'u'+hex+'@yeogiya.app'), Firestore users/{uid}. 프로젝트 yeogiya-d39cf. 운영자 닉네임 '운영자'.
- 채팅 명령: /폭죽(해운대·광안리), /춤멈춰·/춤시작(클럽 댄서), 운영자 /지급 닉네임 금액

## 2. 브랜치 / 파일 구조 (중요)
- **main** = 운영. 루트의 `game.html`, `index.html` 이 이미 빌드된 결과물이고, **최근 수정은 이 두 파일을 직접 패치**해서 올렸다. 이미지들은 `assets/<md5>.png`, 배경 `assets/bg/haeundae.webp`.
- **visual-overhaul-v1** = 새 아바타(파츠 분리 리깅) 실험 + 모든 원본 그림·스크립트 보관.
  - `art/underwear/` 속옷 기본 캐릭터 시트 원본(남/여)
  - `art/items/` 옷 시트 원본들(아래 4번)
  - `src/underwear_sprites.py` 4x4 시트 → 프레임 자르기(빨강·노랑 배경 찌꺼기 제거)
  - `src/set_sprites.py <id> <남시트|-> <여시트|-> <outdir>` 전신 시트 → 게임 프레임 + FR/HB/TB 표(json)
  - `src/compose_sets.py` 몸 시트 + 옷 분리본 레이어 합성 → `art/items/composed/<조합>_<성별>.png`
  - `src/build_site.py` 등은 예전 빌드 파이프라인(design-canvas → preact). 지금 main 의 game.html 과 완전히 동기화돼 있지 않으니, 운영 수정은 main 의 game.html 직접 패치 방식 유지.
- 새 아바타(v2, 파츠 리깅)는 품질 미달로 보류. `?dev=1` 기기에서만 노출. 이용자에겐 안 보임.

## 3. 캐릭터 그림 시스템 (현재 운영 방식)
- 모든 캐릭터 그림 시트는 **1086x1448, 4행x4열**: 1행 정면, 2행 뒷면, 3행 왼쪽 보기, 4행 오른쪽 보기, 각 행 걷기 4칸. 투명 배경(빨강·노랑 얼룩은 스크립트가 제거).
- 기본 캐릭터 = 속옷 차림 (`FRU`). 후드티 세트 = 예전 통짜 그림 (`FR`, 후드티+청바지+스니커즈 한 벌).
- **옷은 전신 그림 방식**: 옷 하나 입은 모습 전체를 프레임으로 교체. (옷만 따로 겹치는 방식은 "얹어놓은 것"처럼 보여 사용자가 거부함 — 쓰지 말 것)
- 옷 "분리본"(옷만 그린 시트)이 그 성별 속옷 몸에 정확히 맞게 그려져 있으면, `compose_sets.py`로 몸+옷을 합쳐 전신 시트를 만든 뒤 `set_sprites.py`로 변환한다. 조합(상의+하의)도 이렇게 미리 합성.
- game.html 안의 주요 코드:
  - `FRU`(속옷), `FR`(후드티), `FRSET = Object.assign({ hoodie: FR, tbcard: {...} }, {jeans, shirt, shirt_jeans, tee, tee_jeans})`
  - `frOf(g, top, bottom)`: 조합키 `top_bottom` → 상의 단독 → 속옷 순으로 찾음
  - `FRSET_IDS`(상의 전신 있는 것), `BOT_IDS = { jeans }`, `ART_G = { jeans: { male: 1 } }`(성별별 그림 유무), `NOART`(그림 없어 입기 막는 옷: tank, slacks, shorts, loafers, runners)
  - `eqNorm(eq)`: 후드티면 청바지·스니커즈 자동, 가디건+청바지는 아직 조합 없어 청바지 해제 등 정리
  - presence 에 `ot`(상의), `ob`(하의), `hd`(후드) 보내서 다른 사람 화면에도 같은 그림
  - 크기 맞춤: 방향별 서기 프레임 키를 1128 기준으로 맞춤(`h`, `c`), 헤어·가디건 오버레이 위치표 `HB`, `TB`
- 새 전신 세트 추가 절차:
  1. 원본을 visual-overhaul-v1 의 `art/items/`에 보관
  2. (분리본이면) compose_sets.py 의 COMBOS 에 추가해 합성
  3. `python3 src/set_sprites.py <id> <남> <여> <outdir>` → png들 + set_<id>.json
  4. main 의 game.html 에서 FRSET 에 FR 추가, FRSET_IDS/BOT_IDS/ART_G 갱신, HB·TB 표에 병합(`const HB = Object.assign(` 뒤, `Object.assign(TB, ` 뒤에 삽입), png 를 assets/ 로 복사
  5. Playwright 로 로컬 테스트(아래) → 캡처 보여주고 승인 받은 뒤 main push

## 4. 옷 그림 현황
| 옷 | 남자 | 여자 | 비고 |
|---|---|---|---|
| 속옷(기본) | ✅ | ✅ | |
| 후드티 세트 | ✅ | ✅ | 예전 통짜 그림 |
| 흰 티셔츠 tee | ✅ 전신 | ✅ 전신 | 흰티 분리본은 옆모습 소매가 사각판으로 깨져 미사용 |
| 셔츠 shirt | ✅ (분리본 합성) | ✅ (분리본 합성) | |
| 청바지 jeans | ✅ (분리본) | ❌ 준비 중 | 흰티+청바지, 셔츠+청바지 조합 합성됨 |
| 톰브라운 가디건 tbcard | ✅ 전신 | ⚠ 예전 오버레이 방식 | 가디건+청바지 조합 없음(입기 막음) |
| 녹색 가디건 gcard, 헤어 hair1/hair2 | 예전 오버레이 방식 | | |
| 민소매·슬랙스·반바지·로퍼·운동화 | ❌ | ❌ | 상점에 '그림 준비 중' |

**사용자에게 요청해 둔 그림**: 여자 청바지 분리본, 여자 톰브라운 가디건 전신 시트, 남자 톰브라운 가디건 분리본(→ 가디건+청바지 조합용).

## 5. 마지막 작업 내용 (2026-11-20 새벽)
1. 해운대 배경을 사용자 그림으로 교체(바다 진입 막음, 시작 위치 조정) — 운영 반영
2. /춤멈춰·/춤시작 명령 — 운영 반영
3. 기본 캐릭터를 속옷 차림으로 변경, 후드티는 '후드티 세트' 아이템(입기/벗기) — 운영 반영. 기존 이용자 1회 후드 벗김(uw1), 예전 기본 청바지 표시 정리(uw2)
4. 흰티·셔츠(남녀), 청바지(남자, 단품/조합), 톰브라운 가디건(남자 전신) — **운영 반영 완료 (main 커밋 dcb2108)**
5. 다음 할 일: 위 요청 그림이 오면 같은 절차로 연결. 사용자가 원하면 운영에서 특정 옷 빼기.

## 6. 로컬 테스트 방법
```
# main 체크아웃 폴더에서
python3 -m http.server 8090 &
# MQTT 로컬 브로커(aedes 등)를 ws://localhost:8883 로 띄우고
# Playwright: index.html 에서 닉네임 입력 → game.html?broker=ws://localhost:8883
# firebase-config.js 를 route 로 막아 로그인 없이 테스트: window.YG_FIREBASE=null
# __dc 가 게임 컴포넌트: __dc.setState({...}), __dc.walkTo(x,y), __dc.slashCmd('/춤멈춰')
```
배포 확인: `gh api repos/dhjang911112-png/yeogiya/actions/runs --jq '.workflow_runs[0]'`

## 7. 사용자 성향
- 한국어로만 답할 것. 결과는 캡처로 직접 보여주길 원함.
- 어색한 그림은 솔직하게 "안 맞는다"고 말할 것(잘 맞는다고 했다가 틀려서 크게 질책받음).
- 짧게 지시함("이거 만들고 운영 올려봐"). 운영 반영 여부는 물어보고 진행.
