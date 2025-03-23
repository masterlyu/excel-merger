// 표준 필드 정의
export interface StandardField {
  id: string;
  name: string;
  description?: string;
  required: boolean;
  type: 'text' | 'number' | 'date' | 'combined';
}

// 컬럼 매핑 인터페이스
export interface ColumnMapping {
  sourceSheet: string;
  sourceColumn: string;
  targetColumn: string;
  transformRule: string;
}

// 레코드 매핑 정의
export interface RecordMapping {
  sourceField: string;
  confidence: number;  // AI 매칭 신뢰도 (0-100)
  rules?: MappingRule[];
}

// 매핑 규칙 정의
export interface MappingRule {
  type: 'concatenation' | 'split' | 'transform';
  params: {
    delimiter?: string;
    format?: string;
    fields?: string[];
  };
}

// 매핑 설정 생성 시 필요한 데이터
export interface CreateMappingConfigData {
  name: string;
  description?: string;
}

// 매핑 설정
export interface MappingConfig {
  id: string;
  name: string;
  description?: string;
  fields: Field[];
  records: Record[];
  createdAt: string;
  updatedAt: string;
}

// 필드
export interface Field {
  id: string;
  name: string;
  description?: string;
  type: string;
  required: boolean;
  records: Record[];
  mappings: Mapping[];
  createdAt: string;
  updatedAt: string;
}

// 레코드
export interface Record {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// 매핑 정보
export interface Mapping {
  recordId: string;
  sourceField: string;
}

// 매핑 상태
export interface MappingState {
  configs: MappingConfig[];
  activeConfigId: string | null;
  selectedFieldId: string | null;
}

// 필드 생성/수정 시 필요한 데이터
export interface FieldData {
  name: string;
  description?: string;
}

// 레코드 생성/수정 시 필요한 데이터
export interface RecordData {
  name: string;
  description?: string;
}

export interface CreateFieldData {
  name: string;
  description?: string;
  type: string;
  required: boolean;
}

export interface CreateRecordData {
  name: string;
  description?: string;
}

export interface CreateMappingData {
  recordId: string;
  sourceField: string;
} 