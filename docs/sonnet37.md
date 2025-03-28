# Excel Merger 개발 로그

## 현재 상황 및 진단

### 파일 업로드 및 필드 매핑 관련

- 파일 업로드 화면은 잘 구현되어 있으며 정상 작동 중
- "트리거 재배포" 커밋(52a68b2)으로 롤백하여 파일 업로드 → 필드 매핑 전환 문제 해결
- 현재 직접 로컬 스토리지 기반의 데이터 관리가 정상 작동 중

### 상태 관리 관련

- 현재 버전에서는 Zustand 스토어를 사용하지 않고 직접 로컬 스토리지에서 데이터를 로드하는 방식 사용
- 이 방식이 페이지 간 이동 시 안정적으로 작동하므로 유지하는 것이 좋음
- 추후 상태 관리를 개선할 경우에는 현재 방식의 안정성을 유지하면서 점진적으로 변경

### UI/UX 관련

- 내비게이션 구조 개선 및 사용자 경험 향상 필요
- 드래그 앤 드롭 기능의 사용성 개선 필요
- 현재 상태와 다음 단계에 대한 안내 강화 필요

## 개선 방향

1. **현재 상태 관리 방식 유지 및 개선**

   - 현재의 로컬 스토리지 기반 데이터 관리 방식 유지
   - 코드 가독성과 재사용성을 높이기 위한 리팩토링
   - 데이터 일관성 유지를 위한 유틸리티 함수 강화

2. **프로세스 흐름 개선**

   - 파일 업로드 → 필드 관리/매핑 → 결과 미리보기/내보내기로 이어지는 명확한 흐름 구현
   - 각 단계별 상태를 명확히 표시하고 이동 버튼 제공
   - 필드 관리 시스템과 매핑 기능의 자연스러운 연동

3. **UI/UX 향상**
   - 현재 단계를 명확히 표시하는 개선된 내비게이션 시스템
   - 드래그 앤 드롭 인터페이스의 직관성 강화
   - 사용자 친화적인 안내 메시지 및 에러 처리

## 단계별 개선 계획

### 1. 코드 안정화 및 기본 기능 강화 (현재 ~ 1주차)

- 현재 롤백된 코드를 기반으로 필요한 기능 정리 및 문서화
- 기존 코드의 불필요한 부분 제거 및 정리
- 핵심 데이터 관리 함수(loadFileInfos, loadMappingConfigs 등) 개선 및 에러 처리 강화

### 2. 내비게이션 및 사용자 경험 개선 (1-2주차)

- 파일 업로드 완료 후 필드 매핑 페이지로 자연스럽게 이동하는 흐름 강화
- 내비게이션 바 개선하여 현재 단계 명확히 표시
- 각 단계별 접근 가능 여부(파일 업로드 완료 여부 등)에 따른 내비게이션 활성화/비활성화

### 3. 필드 관리 시스템 강화 (2-3주차)

- 표준 필드 정의 인터페이스 개선
- 업로드된 모든 파일의 레코드명을 표시하여 쉽게 매핑할 수 있도록 구현
- 필드 매핑 설정 저장 및 불러오기 기능 안정화

### 4. 매핑 인터페이스 최적화 (3-4주차)

- 드래그 앤 드롭 기능 개선으로 직관적인 필드 매핑 경험 제공
- 매핑된 필드와 미매핑 필드의 시각적 구분 강화
- 자동 매핑 제안 기능 추가 (유사한 필드명 감지)

### 5. 데이터 처리 및 출력 기능 구현 (4-5주차)

- 매핑된 데이터 미리보기 기능 구현
- 엑셀 파일 병합 및 내보내기 기능 완성
- 다양한 포맷(Excel, CSV 등)으로 내보내기 옵션 제공

### 6. 테스트 및 배포 준비 (5-6주차)

- 종합적인 테스트 및 버그 수정
- 성능 최적화 및 대용량 파일 처리 능력 개선
- 배포 준비 및 최종 점검

## 실행 계획 (첫 단계 상세 명세)

### 1주차: 코드 안정화 및 기본 기능 강화

#### 1일차: 코드 분석 및 정리

- 현재 롤백된 코드의 구조 파악 및 문서화
- 불필요한 코드 및 주석 제거
- 코드 스타일 통일 및 가독성 개선

#### 2-3일차: 데이터 관리 함수 개선

- `loadFileInfos`, `loadMappingConfigs` 등 핵심 함수 리팩토링
- 에러 처리 및 예외 상황 대응 로직 강화
- 데이터 일관성 검증 기능 추가

#### 4-5일차: 파일 업로드 → 필드 매핑 전환 강화

- 파일 업로드 완료 후 필드 매핑 페이지로 자연스럽게 이동하는 UI 개선
- 파일 목록 표시 및 관리 기능 개선
- 페이지 간 데이터 전달 메커니즘 안정화

## 결론

Excel Merger 프로젝트는 사용자가 쉽고 간편하게 엑셀 파일을 통합할 수 있는 인터페이스를 제공하는 것이 목표입니다. 현재 롤백된 코드를 기반으로 안정적인 개발을 진행하면서, 점진적으로 기능을 개선하고 사용자 경험을 향상시킬 계획입니다. Zustand와 같은 상태 관리 라이브러리를 도입하는 것보다 현재 잘 작동하는 방식을 유지하면서 개선하는 것이 더 효율적일 것으로 판단됩니다.
