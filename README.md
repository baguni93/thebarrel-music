# 더베럴 뮤직 홈페이지

Cloudflare 무료 플랜 하나로 운영하는 학원 홈페이지입니다.

- 공개 홈페이지: `/`
- 관리자 페이지: `/admin` (비밀번호 로그인)

## 구조

| 역할 | 담당 |
|---|---|
| 홈페이지·관리자 API | Cloudflare Worker (`src/`) |
| 스타일·관리자 화면 | 정적 파일 (`public/`), Worker를 거치지 않고 바로 전달 |
| 사진·영상·홈페이지 내용 | Cloudflare R2 버킷 `thebarrel-media` |
| 관리자 로그인 | Worker Secret `ADMIN_PASSWORD` |

**홈페이지는 미리 만들어 둡니다.** 관리자에서 **저장하기**를 누르면 그때 한 번 홈페이지 HTML을 만들어 R2에 보관하고, 방문자에게는 그 완성본을 그대로 보냅니다. 방문할 때마다 계산하지 않아서 무료 플랜의 CPU 제한(요청당 10ms)에 걸리지 않습니다.

R2 안의 파일:

- `content.json`: 관리자에서 저장한 내용
- `site/index.html`: 미리 만들어 둔 홈페이지
- `media/YYYY-MM/…`: 올린 사진·영상
- `history/…json`: 저장할 때마다 남는 직전 내용 백업. 실수로 지웠을 때 여기서 되살릴 수 있습니다.

## 관리자 페이지에서 바꿀 수 있는 것

| 탭 | 내용 |
|---|---|
| 기본 정보 | 학원 이름, 전화·메일, 인스타그램·블로그·카카오 채널, 사업자 정보 |
| 메인 | 큰 제목, 소개 문구, 버튼 문구, 대표 이미지 / 배경 영상(mp4) / 유튜브 |
| 학원소개 | 소개 글·사진, 요약 정보, 수업 과정(과정별 사진) |
| 공간 사진 | 공간별 사진·영상 추가, 순서 변경, 삭제 |
| 영상 | 유튜브 링크 목록 (넣으면 '영상' 메뉴가 생김) |
| 수강료 | 수강료 표, 하단 안내 문구 |
| 위치 | 주소, 교통, 주차, 운영 시간, 지도 링크, 약도 이미지 |

**미리보기**는 편집 칸 오른쪽에 늘 떠 있고, 고칠 때마다 자동으로 바뀝니다. PC·모바일 화면을 바꿔 볼 수 있고, 기본은 **이 탭만** 보기라서, 지금 편집 중인 탭이 바꾸는 부분만 보입니다(예: 수강료 탭 → 수강료 표만). **전체**를 누르면 홈페이지 전체를 볼 수 있습니다. 화면이 좁을 때(휴대폰 등)는 아래 **미리보기** 버튼으로 엽니다. 미리보기는 실제 홈페이지를 바꾸지 않습니다.

사진은 올릴 때 브라우저에서 긴 변 2000px로 자동으로 줄여서 저장합니다. 영상 파일은 50MB까지 올릴 수 있지만, 긴 영상은 유튜브 링크를 권장합니다.

## 처음 설정

### 1. R2 버킷 만들기
1. Cloudflare 대시보드 › **R2 Object Storage** › 시작하기
   - 결제수단 등록을 요구할 수 있지만, 무료 한도 안에서는 청구되지 않습니다.
2. **Create bucket** › 이름: `thebarrel-media` (위치는 Automatic)

### 2. Worker 배포 (GitHub 연결)
1. **Workers & Pages** › **Create** › **Import a repository** › `baguni93/thebarrel-music`
2. 빌드 설정은 기본값 그대로 두면 됩니다. 배포 명령은 `npx wrangler deploy`입니다.
3. 배포가 끝나면 Worker › **Settings** › **Variables and Secrets** › **Add**
   - Type: **Secret**, Name: `ADMIN_PASSWORD`, Value: 관리자 비밀번호
   - 다른 사람이 추측하기 어려운 12자 이상을 권장합니다. 이 비밀번호 하나로 관리자에 들어갑니다.
4. `https://thebarrel-music.<계정>.workers.dev/admin`에서 로그인해 확인합니다.

이후에는 `main`에 머지할 때마다 자동으로 다시 배포됩니다.

### 3. 도메인 연결
1. Cloudflare › **Add a domain** › 학원 도메인 입력
2. 안내되는 네임서버 2개를 도메인 산 곳(가비아 등) 관리 화면에 입력
3. Worker › Settings › **Domains & Routes** › **Custom domain** 추가

## 내 컴퓨터에서 실행
```bash
npm install
cp .dev.vars.example .dev.vars   # 로컬용 관리자 비밀번호
npm run dev                       # http://localhost:8787
```
로컬에서는 R2 대신 컴퓨터 안의 임시 저장소(`.wrangler/`)를 씁니다.

## 비밀번호를 바꾸려면
Worker › Settings › Variables and Secrets에서 `ADMIN_PASSWORD` 값을 바꾸면 됩니다. 바꾸는 즉시 기존 로그인은 모두 풀립니다.
