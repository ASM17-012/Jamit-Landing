# 릴 타일 영상 출처

전부 [Coverr](https://coverr.co) 무료 클립이다. Coverr 라이선스: 상업적 사용 무료,
출처 표기 의무 없음, 재판매·재배포 금지. 원본을 자르고 무음으로 다시 인코딩했다.

얼굴이 식별되는 클립은 전부 제외했다. 스톡 라이선스는 등장 인물이 제품을 지지·사용하는
것처럼 보이게 쓰는 것을 금지하는데, 이 영상들은 앱 화면 목업 안에 들어가므로 손·악기만
나오는 클립이어야 그 조항에 걸리지 않는다. 새 클립을 추가할 때도 같은 기준을 지킬 것.

## 규격 두 가지

칸 모양이 다르면 크롭도 달라야 한다. 세로 칸에 가로 영상을 넣으면 가운데만 남아 못 알아본다.

| 쓰임 | 칸 비율 | 인코딩 |
|---|---|---|
| 두 명 · 네 명 슬라이드 (`guitar-*`, `keys-*`) | 세로 | `crop=ih*9/16:ih,scale=360:640` |
| 세 명 슬라이드 (`trio-*`) | 가로 띠 | `crop='min(iw,ih*1.69)':ih,scale=528:312` |

공통: `-an -vf ...,fps=24 -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 32 -preset slow -movflags +faststart`, 6초.

| 파일 | 원본 | 시작 |
|---|---|---|
| guitar-1.mp4 | coverr-hands-playing-the-guitar-551 | 00:03 |
| guitar-2.mp4 | coverr-guitar-strings-3067 | 00:01 |
| keys-1.mp4 | coverr-a-finger-moving-over-piano-keys-5583 | 00:00 |
| keys-2.mp4 | coverr-close-up-playing-the-piano-5446 | 00:05 |
| trio-1.mp4 | coverr-man-tuning-a-guitar-9254 | 00:06 |
| trio-2.mp4 | coverr-playing-the-cello-in-the-park-9360 | 00:02 |
| trio-3.mp4 | coverr-musician-playing-the-ukulele-7419 | 00:05 |

원본 주소는 `https://cdn.coverr.co/videos/<원본이름>/720p.mp4`.

## 없는 것

드럼 · 보컬은 얼굴 없는 무료 클립을 찾지 못했다(Coverr에 드럼 영상 자체가 없다).
그래서 릴의 파트 라벨은 실제 화면에 맞춰 기타 · 피아노 · 키보드 · 우쿨렐레 · 베이스로만 적었다.
직접 찍은 영상이 생기면 위 규격대로 인코딩해 이 폴더에 넣고 `index.html`의
`assets/reel/...` 경로와 라벨을 바꾸면 된다.
