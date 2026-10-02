# 더베럴 뮤직 홈페이지

공개 홈페이지(`/`)와 관리자 페이지(`/admin`)로 구성된 Next.js 사이트입니다.
내용·이미지·영상은 Supabase에 저장되고, 관리자 페이지에서 **저장하기**를 누르면 홈페이지에 바로 반영됩니다.

## 관리자 페이지에서 바꿀 수 있는 것

| 탭 | 내용 |
|---|---|
| 기본 정보 | 학원 이름, 전화·메일, 인스타그램·블로그·카카오 채널, 사업자 정보 |
| 메인 | 큰 제목, 소개 문구, 버튼 문구, **대표 이미지 / 배경 영상(mp4) / 유튜브** |
| 학원소개 | 소개 글·사진, 요약 정보, 수업 과정(과정별 사진 포함) |
| 공간 사진 | 공간별 사진·영상 추가, 순서 변경, 삭제 |
| 영상 | 유튜브 링크 목록 (넣으면 홈페이지에 '영상' 메뉴가 생김) |
| 수강료 | 수강료 표, 하단 안내 문구 |
| 위치 | 주소, 교통, 주차, 운영 시간, 지도 링크, 약도 이미지 |

## 처음 설정 (약 15분)

### 1. Supabase 준비
1. https://supabase.com 에서 새 프로젝트 생성 (무료 플랜 가능, 지역은 Seoul 권장)
2. **SQL Editor**에서 `supabase/schema.sql` 내용을 붙여넣고 Run
3. **Authentication > Users > Add user**로 관리자 계정(이메일·비밀번호) 생성
4. **Authentication > Sign In / Providers**에서 *Allow new users to sign up* 끄기
   → 다른 사람이 가입해서 관리자 페이지에 들어오는 것을 막습니다.
5. **Project Settings > API**에서 `Project URL`과 `anon public` 키 복사

### 2. 로컬 실행
```bash
cp .env.example .env.local   # 복사한 URL과 키 붙여넣기
npm install
npm run dev
```
- 홈페이지: http://localhost:3000
- 관리자: http://localhost:3000/admin

### 3. 배포 (Vercel)
1. 이 폴더를 GitHub 저장소에 올리기
2. https://vercel.com 에서 저장소 Import
3. Environment Variables에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 입력 후 Deploy
4. 학원 도메인(예: thebarrel.kr)을 Vercel > Domains에서 연결

## 참고
- 영상 파일은 Supabase 무료 플랜 기준 한 파일 50MB까지 올라갑니다. 긴 연주 영상은 유튜브에 올리고 링크로 넣는 편이 빠르고 비용도 들지 않습니다.
- 메인 대표 영상은 소리 없이 자동 반복 재생됩니다(브라우저 정책상 소리 있는 자동재생은 막혀 있음).
- 처음에는 DB가 비어 있어 `lib/content.ts`의 기본 문구가 보입니다. 관리자에서 한 번 저장하면 그때부터 DB 내용이 쓰입니다.
