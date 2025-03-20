# 개발 환경 문서 (SMILE 프레임워크 적용)

## 1. 프로젝트 개요

엑셀 파일 통합 웹서비스는 여러 보험회사의 다양한 형식의 실적자료 엑셀 파일을 업로드하여 통합하고, 보험설계사들의 실적을 정리하여 프린트할 수 있는 웹 기반 서비스입니다. 이 서비스는 PC 환경에 최적화되어 있으며, 다크 모드를 지원합니다.

### MVP 핵심 기능 (첫 배포 목표)

- 엑셀 파일 업로드 (최대 10개) 및 기본 분석
- 간단한 필드 매핑 (수동)
- 통합 데이터 생성 및 엑셀 다운로드
- 기본 A4 출력 형식 지원

### 향후 확장 기능

- 소셜 로그인 및 사용자별 데이터 관리
- 고급 필드 자동 매핑 및 매핑 규칙 저장
- 다양한 템플릿 및 인쇄 옵션
- 10개 이상 파일 통합 지원

### 핵심 가치 제안

- 다양한 형식의 엑셀 파일을 통합하는 번거로움 해소
- 보험설계사 실적 관리 자동화로 업무 효율성 증대
- 소셜 로그인을 통한 편리한 접근성과 사용자별 파일 관리

## 2. 기술 스택 및 의존성

### 필수 의존성 (MVP용)

```json
{
  "dependencies": {
    "next": "14.0.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "tailwindcss": "3.3.0",
    "postcss": "8.4.31",
    "autoprefixer": "10.4.16",
    "xlsx": "0.18.5",
    "react-dropzone": "14.2.3"
  },
  "devDependencies": {
    "eslint": "8.50.0",
    "eslint-config-next": "14.0.0"
  }
}
```

### 확장 의존성 (추후 단계용)

```json
{
  "dependencies": {
    "next-auth": "4.22.1",
    "@supabase/supabase-js": "2.21.0",
    "next-themes": "0.2.1"
  }
}
```

### 프론트엔드

- **프레임워크**: Next.js 14 (React 18 기반)
- **스타일링**: Tailwind CSS
- **파일 처리**: SheetJS/xlsx
- **파일 업로드**: react-dropzone

### 백엔드

- **서버**: Next.js API Routes (서버리스 아키텍처)
- **데이터 저장(MVP)**: localStorage

### 배포

- **배포 환경**: Vercel (서버리스)

## 3. 개발 환경 표준화

### Docker 설정 (선택 사항)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### 환경 설정 자동화 스크립트

```bash
#!/bin/bash
# setup.sh - 개발 환경 자동 설정 스크립트

# 기존 의존성 정리
rm -rf node_modules
rm -f package-lock.json

# 의존성 설치
echo "의존성 설치 중..."
npm ci

# 환경 변수 파일 생성
echo "환경 변수 파일 생성 중..."
cp .env.example .env.local

echo "개발 환경 설정 완료! 'npm run dev'로 서버를 시작하세요."
```

### 의존성 충돌 해결 스크립트

```bash
#!/bin/bash
# fix-deps.sh - 의존성 충돌 해결 스크립트

echo "의존성 충돌 해결 중..."

# 기존 node_modules 삭제
rm -rf node_modules
rm -f package-lock.json

# npm 캐시 정리
npm cache clean --force

# 정확한 버전 설치
npm install --no-save

echo "의존성 충돌 해결 완료!"
```

## 4. 프로젝트 구조

```
excel-merger/
├── public/                  # 정적 파일
│   └── templates/           # 기본 출력 템플릿 파일
├── src/
│   ├── app/                 # Next.js 앱 라우터
│   │   ├── upload/          # 파일 업로드 페이지
│   │   ├── mapping/         # 데이터 매핑 페이지
│   │   ├── preview/         # 통합 데이터 미리보기
│   │   ├── export/          # 결과 다운로드 페이지
│   │   ├── layout.tsx       # 레이아웃 컴포넌트
│   │   └── page.tsx         # 홈페이지
│   ├── components/          # 컴포넌트
│   │   ├── excel/           # 엑셀 관련 컴포넌트
│   │   │   ├── FileUpload.tsx         # 파일 업로드 컴포넌트
│   │   │   ├── SheetPreview.tsx       # 시트 미리보기 컴포넌트
│   │   │   ├── FieldMapper.tsx        # 필드 매핑 컴포넌트
│   │   │   └── DataPreview.tsx        # 데이터 미리보기 컴포넌트
│   │   ├── layout/          # 레이아웃 컴포넌트
│   │   │   ├── Header.tsx             # 헤더 컴포넌트
│   │   │   ├── Footer.tsx             # 푸터 컴포넌트
│   │   │   └── Navigation.tsx         # 네비게이션 컴포넌트
│   │   └── ui/              # 기본 UI 컴포넌트
│   ├── lib/                 # 유틸리티 함수
│   │   ├── excel.ts         # 엑셀 관련 유틸리티
│   │   ├── storage.ts       # 로컬 스토리지 관리
│   │   ├── validators.ts    # 데이터 검증 유틸리티
│   │   └── logger.ts        # 로깅 유틸리티
│   └── providers/           # 프로바이더 컴포넌트
│       └── excel-data-provider.tsx # 엑셀 데이터 컨텍스트 프로바이더
└── package.json             # 프로젝트 의존성
```

## 5. 개발 환경 설정

### 필수 요구사항

- Node.js 18.0.0 이상
- npm 9.0.0 이상

### 개발 환경 설정 단계

1. 프로젝트 클론

```bash
git clone https://github.com/yourusername/excel-merger.git
cd excel-merger
```

2. 의존성 설치 (정확한 버전으로)

```bash
./setup.sh
# 또는
npm ci
```

3. 개발 서버 실행

```bash
npm run dev
```

## 6. 버전 관리 전략

### Git 브랜치 전략

- `main`: 배포 가능한 안정 버전
- `develop`: 개발 중인 다음 릴리스 버전
- `feature/{기능명}`: 개별 기능 개발

### Git 커밋 컨벤션

```
<유형>: <제목>

<본문>
```

**유형**:

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 스타일 변경
- `refactor`: 코드 리팩토링
- `chore`: 빌드 프로세스 변경, 패키지 관리 등

### 버전 관리 규칙

- `0.1.0`: MVP 버전
- `0.2.0`: 확장 기능 추가
- `1.0.0`: 정식 출시 버전

## 7. 코드 작성 표준

### 변수 명명 규칙

- 컴포넌트: PascalCase (예: FileUploader)
- 변수/함수: camelCase (예: uploadFile)
- 상수: UPPER_SNAKE_CASE (예: MAX_FILE_SIZE)

### 코드 품질 도구

```javascript
// .eslintrc.js
module.exports = {
  extends: "next/core-web-vitals",
  rules: {
    "no-redeclare": "error",
    "no-shadow": "error",
    "no-unused-vars": "warn",
  },
};
```

### VSCode 설정

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 8. 디버깅 및 문제 해결 가이드

### 로깅 시스템

```javascript
// lib/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.info(`[INFO] ${message}`, data || "");
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || "");
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[DEBUG] ${message}`, data || "");
    }
  },
};
```

### 자주 발생하는 문제 및 해결책

#### 파일 관련 문제

- **오류**: "File size exceeds limit"
  - **해결**: config에서 최대 파일 크기 수정
- **오류**: "Unsupported file format"
  - **해결**: 지원되는 파일 형식 (.xlsx, .xls, .csv) 확인

#### 엑셀 파싱 문제

- **오류**: "Cannot read properties of undefined"
  - **해결**: 빈 셀 처리 로직 확인, 방어적 프로그래밍 적용
- **오류**: "Sheet not found"
  - **해결**: 시트 이름 정확히 확인, 첫 번째 시트 기본값 설정

#### 환경 문제

- **오류**: "Module not found"
  - **해결**: `./fix-deps.sh` 실행하여 의존성 재설치

## 9. 일일 개발 워크플로우

1. **일일 시작**:

   - GitHub Issues 확인
   - 오늘 진행할 작업 3가지 선정
   - 기능 브랜치 생성 또는 체크아웃

2. **개발 사이클**:

   - 30분 코딩 → 5분 테스트 → 커밋
   - 새 의존성 추가 시 별도 커밋으로 분리

3. **일일 종료**:
   - 작업 상태 README에 업데이트
   - 발생한 문제와 해결책 문서화
   - 내일 진행할 작업 메모

## 10. 주간 유지보수

매주 금요일에 진행:

1. 의존성 정리 및 업데이트 검토
2. 코드 품질 검사 (ESLint 실행)
3. 문서 업데이트
4. 기술 부채 식별 및 해결 계획

## 11. 문제 해결 워크플로우

1. 오류 발생 시:

   - 정확한 오류 메시지 기록
   - 발생 상황 및 단계 기록
   - 브라우저 콘솔 로그 확인

2. 시도할 해결책 순서:

   - 로직 오류 확인
   - 의존성 문제 확인 (`./fix-deps.sh` 실행)
   - 환경 변수 확인
   - 브라우저 캐시 정리

3. 해결 후:
   - 해결책 문서화
   - 유사 오류 방지를 위한 코드 개선
   - 필요시 테스트 케이스 추가
