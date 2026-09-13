# 프로젝트 수업 진행 현황 게시판

7개 학급이 **하나의 공통 프로젝트 수업**을 함께 진행하면서, 관리자가 정한
**탐구 단원(UOI) → 탐구 주제(LOI) → 수업 단계**(관계맺기 → 집중하기 → 조사하기 → 조직 및 정리하기 → 일반화하기)
구조마다 각 반 선생님이 사진/동영상과 글로 진행 상황을 기록·공유하는
게시판입니다. Next.js(App Router) + Prisma + Postgres + Cloudflare R2로
만들어졌고, Vercel에 무료로 배포할 수 있습니다.

## 구조 한눈에 보기

- **관리자**: 프로젝트 제목, 탐구 단원(UOI)/탐구 주제(LOI)/수업 단계(이름·순서·추가·삭제)를 관리 (`/admin`, 관리자 비밀번호로 보호)
- **학급(7개)**: 각자 슬러그(`/class/1` ~ `/class/7`)를 가지며, 학급 비밀번호로 보호
- **UOI > LOI > 단계**: 전체 학급 공통 구조. 하나의 UOI 안에 여러 LOI, 하나의 LOI 안에 여러 단계가 순서대로 존재
- **게시글**: 각 학급은 각 단계마다 여러 개의 게시글(텍스트+사진/동영상 여러 장)을 등록 가능
- **홈 화면**: 프로젝트 제목, UOI 목록, 학급별로 UOI마다 어디까지 진행했는지 보여주는 진행바

## 주요 기능

- 홈 화면(`/`): 공통 프로젝트 제목 + UOI 목록 + 7개 학급 카드(학급명, 선생님, UOI별 진행률, 현재 위치)
- 학급별 페이지(`/class/[slug]`): UOI > LOI > 단계 순서로 중첩된 섹션, 각 단계마다 새 소식 등록 폼 + 그 단계의 게시글 타임라인
- 새 소식 등록: 텍스트 + 사진/동영상(여러 장, 자동 압축) — 사이트 로그인 시 저장된 학급 비밀번호로 자동 인증
- 관리자 페이지(`/admin`): 프로젝트 제목 수정, UOI/LOI/단계 추가·이름변경·순서변경(↑↓)·삭제 (관리자 비밀번호로 보호)
- 사진/동영상은 Cloudflare R2에 저장, 텍스트/메타데이터는 DB에 저장

## 폴더 구조

```
src/app/page.tsx                 홈 화면 (공통 프로젝트 + 학급별 UOI 진행 현황)
src/app/class/[slug]/page.tsx    학급별 상세 페이지 (UOI>LOI>단계별 등록 폼 + 타임라인)
src/app/admin/page.tsx           관리자 페이지 (UOI/LOI/단계 관리)
src/app/admin/actions.ts         관리자 서버 액션 (관리자 비밀번호 검증 포함)
src/app/actions.ts               게시글 등록 서버 액션 (학급 비밀번호 검증 포함)
src/app/api/upload/route.ts      사진/동영상 업로드용 R2 presigned URL 발급 라우트
src/lib/r2.ts                    Cloudflare R2 S3 클라이언트 설정
src/lib/uploadToR2.ts            브라우저에서 R2로 직접 업로드하는 헬퍼
src/components/                  화면 구성 요소 (ClassCard, ClassBoard, NewPostForm, PostCard, AdminPanel)
src/lib/prisma.ts                Prisma 클라이언트
src/lib/config.ts                공통 설정(Config) 조회 헬퍼
src/lib/password.ts              비밀번호 해시/검증 (bcrypt)
prisma/schema.prisma             DB 스키마 (Config, Uoi, Loi, Stage, ClassRoom, Post, Attachment)
prisma/seed.ts                   초기 데이터 생성 스크립트 (설정 1개, UOI 3개 x LOI 3개 x 단계 5개, 학급 7개)
```

## 데이터 모델

- `Config`: 공통 프로젝트 제목 + 관리자 비밀번호 (딱 1개 row)
- `Uoi`: 탐구 단원 (이름 + 순서). 전체 학급이 공유
- `Loi`: 탐구 주제 (이름 + 순서). 하나의 `Uoi`에 속함
- `Stage`: 수업 단계 (이름 + 순서, 예: 관계맺기/일반화하기). 하나의 `Loi`에 속함
- `ClassRoom`: 학급 (이름, 선생님, 학급 비밀번호)
- `Post`: `ClassRoom` + `Stage`에 속한 게시글 (텍스트 + 여러 첨부파일)
- `Attachment`: `Post`에 속한 사진/동영상 (여러 개 가능)

## 1. 로컬 준비

- Node.js 18.18 이상, npm 필요
- 이 폴더에서 의존성 설치:

```bash
npm install
```

## 2. 데이터베이스 준비

로컬 개발과 배포 모두 **같은 방식(Postgres)**을 사용합니다. 로컬용으로
[Neon](https://neon.tech)(또는 Supabase 등)에 무료 프로젝트를 하나 더
만들어서 그 연결 문자열을 로컬 `.env`에 쓰는 걸 추천합니다 (배포용 DB와는
분리해서, 로컬에서 이것저것 테스트해도 실제 데이터에 영향이 없도록).

`.env.example`을 복사해 `.env`를 만들고 값을 채워주세요.

```bash
cp .env.example .env
```

```
DATABASE_URL="postgresql://..."   # 로컬 개발용 Neon 프로젝트의 연결 문자열
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="..."
R2_PUBLIC_URL="https://pub-xxxx.r2.dev"
```

Cloudflare R2 버킷/토큰 발급 방법은 `.env.example`의 안내 주석을 참고하세요.
(R2 값 없이도 텍스트만으로는 로컬 테스트가 가능합니다. 사진/동영상 업로드까지
테스트하려면 R2 값이 필요합니다.)

## 3. 테이블 생성 + 초기 데이터 넣기

```bash
npx prisma migrate dev --name init
npm run db:seed
```

`db:seed`는 `prisma/seed.ts`에 적힌 대로 다음을 만듭니다:

- 공통 프로젝트 제목 1개 (`PROJECT_TITLE`) + 관리자 비밀번호 1개 (`ADMIN_PASSWORD`)
- 탐구 단원(UOI) 3개, 각 UOI마다 탐구 주제(LOI) 3개, 각 LOI마다 수업 단계 5개(`STAGE_NAMES` 배열, 기본값: 관계맺기 / 집중하기 / 조사하기 / 조직 및 정리하기 / 일반화하기)
- 7개 학급 (`classes` 배열: 이름, 선생님, 학급 비밀번호)

**배포 전에 이 값들을 실제 정보로 수정한 뒤 다시 시드하세요.** 이미 데이터가
있으면 기본적으로 덮어쓰지 않으니, 강제로 갱신하려면 `UPDATE_EXISTING`을
`true`로 바꾼 뒤 실행하세요. (UOI/LOI/단계 이름·순서·개수는 배포 후 `/admin`
페이지에서도 바로 바꿀 수 있습니다.)

## 4. 로컬 실행

```bash
npm run dev
```

`http://localhost:3000`에서 홈 화면을, `http://localhost:3000/admin`에서
관리자 페이지를 확인할 수 있습니다.

## 5. Vercel 배포

1. 이 폴더를 GitHub 저장소로 push 합니다.
2. [vercel.com](https://vercel.com)에서 New Project → 방금 만든 저장소 Import.
3. **Environment Variables**에 배포용(프로덕션) 값들을 넣습니다 — 로컬 `.env`와는
   다른, 실제 서비스용 Neon 프로젝트의 연결 문자열을 써야 합니다:
   `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
4. **Deploy**를 누릅니다.
5. 배포가 끝나면 실제 테이블을 만들고 초기 데이터를 넣습니다 (로컬 터미널에서 프로덕션 `DATABASE_URL`로 한 번만 실행):

```bash
npx prisma migrate deploy
npm run db:seed
```

6. 배포된 주소로 접속해 확인합니다. 홈 화면에 프로젝트 제목과 7개 학급 카드가
   보이고, 각 학급 페이지에서 단계별로 비밀번호를 입력해 글/이미지를 등록할 수
   있습니다. `/admin`에서 관리자 비밀번호로 수업 단계를 관리하세요.

## 나중에 값을 바꾸고 싶다면

- **UOI/LOI/수업 단계(이름/순서/추가/삭제)**: `/admin` 페이지에서 바로 가능 (관리자 비밀번호 필요)
- **프로젝트 제목**: `/admin` 페이지에서 바로 가능
- **학급 이름/선생님/비밀번호**: 아직 관리 화면이 없어 `prisma/seed.ts` 값을 수정하고
  `UPDATE_EXISTING = true`로 바꾼 뒤 `npm run db:seed` 재실행 (또는 `npm run db:studio`로
  표 형태로 직접 수정). 필요하면 학급 관리도 `/admin`에 추가해드릴 수 있어요.

## 커스터마이징 아이디어

- 학급 수가 7개보다 늘어나면 `prisma/seed.ts`의 `classes` 배열에 항목만 추가하면 됩니다.
- 게시글 수정은 각 단계에서 "수정" 버튼을 누르면 가능합니다 (단계마다 최신 게시글 1개를 계속 고쳐 쓰는 방식).
- 게시글 삭제 기능은 아직 없습니다. 필요하면 말씀해주세요.
