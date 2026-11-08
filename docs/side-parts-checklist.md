# 측면(좌·우) 파츠 투입 체크리스트

이 문서는 이미지 제작자가 바로 작업하도록 만든 체크리스트입니다. 브랜치는 `visual-overhaul-v1`만 사용합니다.
- 방향 이름은 **캐릭터가 바라보는 방향**입니다. `right`는 화면 오른쪽을 보는 몸이고, `left`는 왼쪽을 보는 몸입니다.
- **Near**는 카메라(보는 사람) 쪽 팔다리이고, **Far**는 몸 뒤로 가려지는 반대쪽 팔다리입니다.

## 1. 파일 목록 (방향당 10장 + joints.json 1개 = 총 44개)

### 남자 · 왼쪽 보기 — `art/avatar/base/male_base/left/`
```
head.png
torso.png
upperArmNear.png
lowerArmNear.png
upperArmFar.png
lowerArmFar.png
upperLegNear.png
lowerLegNear.png
upperLegFar.png
lowerLegFar.png
joints.json
```
### 남자 · 오른쪽 보기 — `art/avatar/base/male_base/right/`
(위와 같은 11개 파일)
### 여자 · 왼쪽 보기 — `art/avatar/base/female_base/left/`
(위와 같은 11개 파일)
### 여자 · 오른쪽 보기 — `art/avatar/base/female_base/right/`
(위와 같은 11개 파일)

- 파일 이름은 **대소문자까지 정확히** 맞춰야 합니다. 예: `upperArmNear.png`는 되지만 `UpperArmNear.png`나 `upper_arm_near.png`는 인식되지 않습니다.
- `joints.json`은 `art/avatar/_kit/{성별}_base/{방향}/joints.json`을 복사한 뒤, 그린 그림의 관절 위치에 맞게 숫자를 고쳐 쓰면 됩니다.
- 왼쪽 그림을 좌우 반전해서 오른쪽을 만들어도 됩니다. 단, 가르마·액세서리처럼 비대칭인 부분은 확인해 주세요.

## 2. 파츠별 샘플 경로와 회전축

| 파츠 | 샘플 경로 (남자·오른쪽) | 회전축 관절 | 그리는 범위 |
|---|---|---|---|
| head | `art/avatar/base/male_base/right/head.png` | neck | 머리 + 얼굴 + 목 윗부분 |
| torso | `.../right/torso.png` | root·엉덩이 높이 | 목 아래 ~ 골반(속옷 포함) |
| upperArmNear / Far | `.../right/upperArmNear.png` | shoulderNear / Far | 어깨 ~ 팔꿈치 |
| lowerArmNear / Far | `.../right/lowerArmNear.png` | elbowNear / Far | 팔꿈치 ~ 손끝 |
| upperLegNear / Far | `.../right/upperLegNear.png` | hipNear / Far | 엉덩이 ~ 무릎 |
| lowerLegNear / Far | `.../right/lowerLegNear.png` | kneeNear / Far | 무릎 ~ 발끝(발 포함) |

- 관절이 만나는 곳(어깨, 팔꿈치, 엉덩이, 무릎)은 **양쪽 파츠 모두 8~15px 정도 겹치게 둥글게** 그려 주세요. 걸을 때 관절이 꺾여도 틈이 보이지 않게 하기 위해서입니다.
- Far 팔다리는 몸 뒤에 그려지므로 **살짝 어둡게**(그림자 톤) 칠하면 입체감이 납니다. 선택 사항입니다.

## 3. PNG 저장 규칙

1. **크기**: 512×1024 고정입니다. `_kit/blank_512x1024.png`나 `_guide_*.png` 위에서 작업하세요. 모든 파츠는 전체 캔버스에서 **원래 자리에 그대로 둔 상태로** 저장합니다. 잘라내면 안 되며, 자르기는 프로그램이 자동으로 합니다.
2. **배경**: 완전 투명(알파)이어야 합니다. 흰 배경, 체크무늬 그림, 그림자 바닥은 넣지 마세요.
3. **바닥선**: 발바닥 아래끝이 **y = 1000** 줄에 오게 합니다. 985~1008 범위는 허용합니다.
4. **키**: 정면과 같아야 합니다. 머리 꼭대기는 **남자 y ≈ 40, 여자 y ≈ 56**이며 ±25px까지 허용합니다.
5. **여백**: 그림이 캔버스 가장자리(위·왼쪽·오른쪽 끝)에 닿으면 안 됩니다.
6. **배율**: 정면 원본과 같은 배율로 그립니다. 가이드 이미지의 실루엣 크기를 그대로 따르면 됩니다.
7. **형식**: PNG, RGBA, 8bit입니다. 색상 프로필은 sRGB를 쓰고 압축은 상관없습니다.
8. **guide 레이어 끄기**: 저장 전에 `_guide_` 레이어(관절 점, 선)를 반드시 끄세요.

## 4. 겹침 순서 (아래 → 위, 측면)

```
1  upperArmFar     ← 가장 뒤
2  lowerArmFar
3  upperLegFar
4  lowerLegFar
5  torso
6  upperLegNear
7  lowerLegNear
8  head
9  upperArmNear
10 lowerArmNear    ← 가장 앞
```
- 옷은 각 몸 파츠 바로 위에 붙습니다. 예를 들어 `upperArmNear` 소매는 `upperArmNear` 위에 그려집니다.
- 이름 끝에 `_back`이 붙은 옷 그림(예: 후드 뒷부분)은 해당 방향의 맨 뒤에 그려집니다.
- 슬롯 순서는 하의 → 신발 → 상의 → 아우터 → 액세서리 → 헤어입니다. 그래서 가디건은 바지 위에 놓입니다.

## 5. 가장 빠른 테스트 방법

**A. 채팅으로 보내기 (가장 빠름)**
1. PNG를 이 대화에 첨부하세요. 한 방향 10장만 있어도 됩니다.
2. Claude가 폴더 배치, 빌드, 검사를 하고, 비교 캡처(정면 vs 측면, 발자국 미끄러짐 수치, 좌우 전환)를 보내 드립니다.

**B. 직접 GitHub에 올리기**
1. `visual-overhaul-v1` 브랜치에서 위 경로에 업로드합니다.
2. Claude에게 "올렸어"라고 말해 주세요. 빌드와 검사를 진행한 뒤 아래 주소에서 확인할 수 있습니다.
   - 실험실: `https://raw.githack.com/dhjang911112-png/yeogiya/visual-overhaul-v1/avatar-lab.html`
   - 게임 안: `https://raw.githack.com/dhjang911112-png/yeogiya/visual-overhaul-v1/game.html?avatar=force`

## 6. 잘못 들어왔을 때 보는 곳

빌드하면 `assets/avatar/manifest.json`의 `problems` 목록에 아래 문구가 나옵니다. 실험실 화면 상단에도 같은 경고가 표시됩니다.

| 경고 문구 | 원인 | 고치는 법 |
|---|---|---|
| `측면 파츠 없음 …` | 파일 이름이 틀렸거나 빠짐 | 1번 목록과 철자, 대소문자 대조 |
| `joints.json: 관절 없음 …` | 관절 키 누락 | kit의 joints.json을 복사해서 수정 |
| `배경이 투명하지 않음` | 흰 배경으로 저장됨 | 배경 레이어를 끄고 PNG로 다시 저장 |
| `캔버스 가장자리에 닿음` | 512×1024 밖으로 잘림 | 그림을 안쪽으로 옮기거나 크기 확인 |
| `발바닥이 y=1000 기준선에 없음` | 발 위치가 위나 아래로 어긋남 | 발바닥을 y=1000에 맞춤 |
| `머리 꼭대기 y=… 다름` | 측면 키가 정면과 다름 | 배율을 가이드 실루엣에 맞춤 |
| `회전축 관절을 찾을 수 없음` | 파일명과 관절 이름 불일치 | Near/Far 철자 확인 |

이 밖에 눈으로 확인할 점:
- **관절 틈**: 걸을 때 무릎이나 팔꿈치에 틈이 보이면 겹침 여유(8~15px)가 부족한 것입니다.
- **팔다리가 엉뚱하게 회전함**: joints.json 좌표가 그림의 관절 중심과 어긋난 것입니다. 실험실에서 "관절 표시"를 켜면 빨간 점이 보입니다.
- **좌우 전환 때 튐**: 왼쪽과 오른쪽의 root x, 머리 높이, 몸통 폭이 다른 것입니다.

## 7. 합격 기준 (Claude가 측정 후 보고)
1. 측면 걷기에서 디딘 발의 미끄러짐이 2px 이하
2. 정면 원본 대비 키와 다리 비율 차이가 ±3% 이내
3. 좌우 전환 시 위치 튐 없음 (root·머리 높이 일치)
4. 게임 화면과 실험실이 같은 렌더러로 같은 모습

## 8. 다음 차수
- **2차**: 대머리 머리(`head.png` 교체용)와 기본 헤어 앞/뒤(front/left/right)입니다.
  - 경로: `art/avatar/items/hair/hair_base_m/male/{front|left|right}/head.png` (앞머리)
  - 뒷머리는 같은 폴더의 `head_back.png`입니다.
- **3차**: 티셔츠, 바지, 신발입니다.
  - 경로: `art/avatar/items/{top|bottom|shoes}/{아이템id}/{male|female|unisex}/{방향}/{몸파츠이름}.png`
  - 예: `items/top/tee_white/unisex/right/torso.png`, `upperArmNear.png`
