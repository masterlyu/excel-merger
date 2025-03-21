# 4-3단계: 매핑 검증 및 고급 기능

## 목표

4-1단계와 4-2단계에서 구현한 기능을 바탕으로, 매핑 설정의 유효성 검증 기능과 고급 기능을 추가하여 안정적이고 사용자 친화적인 매핑 시스템을 완성합니다.

## 세부 작업 내용

### 1. 매핑 설정의 유효성 검증 기능 추가

- `lib/validation.ts` 유틸리티 파일 생성
- 매핑 설정 유효성 검증 함수 구현

  ```typescript
  interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }

  interface ValidationError {
    type: "missing_target" | "missing_source" | "duplicate_mapping" | "other";
    message: string;
    field?: string;
  }

  interface ValidationWarning {
    type: "type_mismatch" | "potential_data_loss" | "other";
    message: string;
    field?: string;
  }

  function validateMappingConfig(config: MappingConfig): ValidationResult {
    // 구현 내용
  }
  ```

- 유효성 검증 결과 표시 UI 구현 (오류/경고 메시지, 하이라이팅 등)
- 실시간 유효성 검증 기능 구현 (매핑 설정 변경 시 자동 검증)
- 유효성 문제 해결을 위한 가이드 및 자동 수정 옵션 제공

### 2. 필수 필드 표시 및 검증 기능

- 타겟 필드에 필수 여부 속성 추가
  ```typescript
  interface TargetField {
    name: string;
    description?: string;
    dataType?: string;
    required: boolean;
  }
  ```
- 필수 필드 시각적 표시 (별표, 색상 강조 등) 구현
- 필수 필드 매핑 누락 시 경고 메시지 구현
- 필수 필드 자동 매핑 우선순위 적용
- 필수 필드 설정 UI 구현 (타겟 필드 설정 시 필수 여부 지정)

### 3. 매핑 설정 내보내기/가져오기 기능

- 매핑 설정을 JSON 형식으로 내보내는 기능 구현
- 내보낸 JSON 파일을 가져와 매핑 설정을 복원하는 기능 구현
- 매핑 설정 템플릿 기능 구현 (자주 사용하는 설정을 템플릿으로 저장)
- 서로 다른 환경 간의 매핑 설정 공유 기능 (파일 다운로드/업로드)
- 매핑 설정 백업 및 복원 기능

### 4. 최종 UI 정리 및 사용자 경험 개선

- 전체 매핑 UI 일관성 및 가독성 개선
- 사용자 친화적인 오류 메시지 및 안내 개선
- 매핑 과정의 진행률 표시 및 단계별 가이드 구현
- 키보드 단축키 지원 (매핑 추가/삭제/이동 등)
- 다크 모드/라이트 모드 지원
- 접근성 개선 (스크린 리더 지원, 키보드 탐색 등)

## 구현 시 고려사항

- 복잡한 데이터 구조에 대한 명확한 유효성 검증 규칙 정의
- 사용자 피드백을 통한 지속적인 UI/UX 개선
- 매핑 설정 내보내기/가져오기 시 버전 호환성 고려
- 대용량 매핑 설정 처리 시 성능 최적화

## 테스트 항목

- 다양한 오류 상황에 대한 유효성 검증 정확도 테스트
- 필수 필드 처리 및 검증 기능 테스트
- 매핑 설정 내보내기/가져오기 기능 테스트 (다양한 형식 및 버전)
- UI/UX 사용성 테스트 (다양한 사용자 피드백 수집)
- 접근성 테스트 (키보드 탐색, 스크린 리더 호환성 등)

## 4차 매핑 심화 단계 완료 후 다음 단계 준비

- 5차 데이터 통합 구현을 위한 기반 마련
- 매핑된 데이터를 기반으로 실제 통합 데이터 생성 로직 설계
- 통합 데이터 검증 및 미리보기 기능 설계
- 매핑 결과를 다음 단계(데이터 통합)로 전달하는 인터페이스 설계
