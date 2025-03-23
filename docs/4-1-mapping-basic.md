# 4-1단계: 기본 매핑 UI 및 구조 구현

## 목표

현재 파일 업로드 및 파일 분석 기능이 구현된 상태에서, 필드 매핑을 위한 기본 UI와 구조를 구현합니다.

## 세부 작업 내용

### 1. FieldMapper 컴포넌트 기본 구조 설계

- `src/components/mapping/FieldMapper.tsx` 컴포넌트 생성
- 필드 매핑을 위한 기본 인터페이스 설계
- 소스 필드(업로드된 파일들의 필드)와 타겟 필드(통합 결과의 필드) 간의 관계 정의
- 필요한 타입 정의 (`MappingConfig`, `FieldMap` 등)

### 2. 필드 매핑 UI 기본 레이아웃 구현

- 파일/시트 선택 드롭다운 메뉴
- 소스 필드 목록 표시 영역 구현
- 타겟 필드 설정 영역 구현
- 매핑 결과 표시 영역 구현
- 기본적인 드롭다운 방식의 필드 매핑 UI 구성

### 3. 필드 간 매핑 정보 저장 로직 기본 구현

- `lib/mapping.ts` 유틸리티 파일 생성
- 매핑 정보를 저장하는 데이터 구조 설계

  ```typescript
  interface MappingConfig {
    id: string;
    name: string;
    description?: string;
    created: number;
    updated: number;
    fieldMaps: FieldMap[];
  }

  interface FieldMap {
    targetField: string;
    sourceFields: SourceField[];
  }

  interface SourceField {
    fileId: string;
    sheetName: string;
    fieldName: string;
  }
  ```

- 매핑 정보를 localStorage에 저장하는 함수 구현
- 매핑 정보를 불러오는 함수 구현

### 4. 매핑 설정 저장 및 불러오기 기능 초기 구현

- 매핑 설정 저장 버튼 및 기능 구현
- 저장된 매핑 설정 목록 표시 UI 구현
- 저장된 매핑 설정 불러오기 기능 구현
- 매핑 설정 이름 및 설명 편집 기능 구현

## 구현 시 고려사항

- 현재 직접 localStorage에서 데이터를 로드하는 방식을 유지
- 필드 매핑 UI는 직관적이고 사용하기 쉽게 설계
- 기본 구조를 먼저 구현하고, 다음 단계에서 드래그 앤 드롭 기능 추가
- 매핑 설정의 재사용성을 고려한 데이터 구조 설계

## 테스트 항목

- 파일/시트 선택 드롭다운 작동 확인
- 소스 필드 목록 정상 표시 확인
- 필드 매핑 설정 및 표시 기능 확인
- 매핑 설정 저장 및 불러오기 기능 확인

## 다음 단계 준비

- 이 단계에서 구현한 기본 구조를 바탕으로 4-2단계에서는 드래그 앤 드롭 기능과 자동 매핑 기능을 구현할 예정
- 필드 간 유사도 계산을 위한 알고리즘 조사 및 설계
