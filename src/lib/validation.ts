/**
 * 매핑 설정 유효성 검증 라이브러리
 * 매핑 설정의 유효성을 검사하고 오류/경고를 반환합니다.
 */

import { MappingConfig, FieldMap, SourceField } from './mapping';

/**
 * 유효성 검증 결과 인터페이스
 */
export interface ValidationResult {
  isValid: boolean;       // 유효성 검증 통과 여부
  errors: ValidationError[];   // 오류 목록
  warnings: ValidationWarning[]; // 경고 목록
}

/**
 * 유효성 검증 오류 인터페이스
 */
export interface ValidationError {
  type: 
    | "missing_target"     // 필수 타겟 필드 누락
    | "missing_source"     // 타겟 필드에 소스 필드 누락
    | "duplicate_mapping"  // 중복 매핑
    | "invalid_field_name" // 유효하지 않은 필드명
    | "other";             // 기타 오류
  message: string;         // 오류 메시지
  field?: string;          // 관련 필드 (있는 경우)
  targetId?: string;       // 관련 타겟 필드 ID
  sourceId?: string;       // 관련 소스 필드 ID
}

/**
 * 유효성 검증 경고 인터페이스
 */
export interface ValidationWarning {
  type: 
    | "type_mismatch"        // 데이터 타입 불일치
    | "potential_data_loss"  // 잠재적 데이터 손실 가능성
    | "unused_source_field"  // 사용되지 않은 소스 필드
    | "duplicate_mapping"    // 중복 매핑 (경고로 처리할 경우)
    | "other";               // 기타 경고
  message: string;           // 경고 메시지
  field?: string;            // 관련 필드 (있는 경우)
  targetId?: string;         // 관련 타겟 필드 ID
  sourceId?: string;         // 관련 소스 필드 ID
}

/**
 * 매핑 설정 유효성 검증 함수
 * @param config 검증할 매핑 설정
 * @param requiredTargetFields 필수 타겟 필드 목록 (선택 사항)
 * @returns ValidationResult 유효성 검증 결과
 */
export function validateMappingConfig(
  config: MappingConfig,
  requiredTargetFields: string[] = []
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!config) {
    return {
      isValid: false,
      errors: [{ type: 'other', message: '매핑 설정이 없습니다.' }],
      warnings
    };
  }

  // 매핑 설정 기본 속성 검사
  if (!config.name || config.name.trim() === '') {
    errors.push({
      type: 'other',
      message: '매핑 설정 이름이 없습니다.',
    });
  }

  // 필드맵 배열 검사
  if (!config.fieldMaps || !Array.isArray(config.fieldMaps)) {
    errors.push({
      type: 'other',
      message: '유효한 필드 매핑이 없습니다.',
    });
    return { isValid: errors.length === 0, errors, warnings };
  }

  // 중복 타겟 필드 검사를 위한 맵
  const targetFieldNames = new Map<string, string>();
  
  // 각 필드맵 검사
  config.fieldMaps.forEach((fieldMap: FieldMap) => {
    if (!fieldMap.targetField || !fieldMap.targetField.name) {
      errors.push({
        type: 'missing_target',
        message: '타겟 필드 이름이 없습니다.',
        targetId: fieldMap.id
      });
      return;
    }

    // 타겟 필드가 중복되는지 검사
    const targetName = fieldMap.targetField.name.toLowerCase();
    if (targetFieldNames.has(targetName)) {
      errors.push({
        type: 'duplicate_mapping',
        message: `중복된 타겟 필드: ${fieldMap.targetField.name}`,
        field: fieldMap.targetField.name,
        targetId: fieldMap.id
      });
    } else {
      targetFieldNames.set(targetName, fieldMap.id);
    }

    // 소스 필드 검사
    if (!fieldMap.sourceFields || !Array.isArray(fieldMap.sourceFields) || fieldMap.sourceFields.length === 0) {
      // 필수 타겟 필드인 경우에만 오류 발생
      if (requiredTargetFields.includes(fieldMap.targetField.name)) {
        errors.push({
          type: 'missing_source',
          message: `필수 타겟 필드 '${fieldMap.targetField.name}'에 매핑된 소스 필드가 없습니다.`,
          field: fieldMap.targetField.name,
          targetId: fieldMap.id
        });
      } else {
        warnings.push({
          type: 'other',
          message: `타겟 필드 '${fieldMap.targetField.name}'에 매핑된 소스 필드가 없습니다.`,
          field: fieldMap.targetField.name,
          targetId: fieldMap.id
        });
      }
      return;
    }

    // 소스 필드 중복 검사
    const sourceFieldKeys = new Set<string>();
    
    fieldMap.sourceFields.forEach((sourceField: SourceField) => {
      if (!sourceField.fileId || !sourceField.sheetName || !sourceField.fieldName) {
        errors.push({
          type: 'invalid_field_name',
          message: `타겟 필드 '${fieldMap.targetField.name}'에 연결된 소스 필드 정보가 불완전합니다.`,
          field: fieldMap.targetField.name,
          targetId: fieldMap.id
        });
        return;
      }

      // 소스 필드 중복 검사
      const sourceKey = `${sourceField.fileId}:${sourceField.sheetName}:${sourceField.fieldName}`;
      if (sourceFieldKeys.has(sourceKey)) {
        warnings.push({
          type: 'duplicate_mapping',
          message: `타겟 필드 '${fieldMap.targetField.name}'에 중복된 소스 필드: ${sourceField.fieldName}`,
          field: sourceField.fieldName,
          targetId: fieldMap.id
        });
      } else {
        sourceFieldKeys.add(sourceKey);
      }
    });
  });

  // 필수 타겟 필드 검사
  if (requiredTargetFields.length > 0) {
    const mappedTargetFields = new Set(
      config.fieldMaps
        .filter(fm => fm.targetField && fm.targetField.name)
        .map(fm => fm.targetField.name)
    );

    requiredTargetFields.forEach(requiredField => {
      if (!mappedTargetFields.has(requiredField)) {
        errors.push({
          type: 'missing_target',
          message: `필수 타겟 필드 '${requiredField}'가 매핑 설정에 없습니다.`,
          field: requiredField
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 특정 타겟 필드에 대한 필드맵 유효성 검증
 * @param fieldMap 검증할 필드맵
 * @param isRequired 필수 필드 여부
 * @returns ValidationResult 유효성 검증 결과
 */
export function validateFieldMap(fieldMap: FieldMap, isRequired: boolean = false): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!fieldMap) {
    return {
      isValid: false,
      errors: [{ type: 'other', message: '필드맵이 없습니다.' }],
      warnings
    };
  }

  // 타겟 필드 검사
  if (!fieldMap.targetField || !fieldMap.targetField.name) {
    errors.push({
      type: 'missing_target',
      message: '타겟 필드 이름이 없습니다.',
      targetId: fieldMap.id
    });
  }

  // 소스 필드 검사
  if (!fieldMap.sourceFields || !Array.isArray(fieldMap.sourceFields) || fieldMap.sourceFields.length === 0) {
    if (isRequired) {
      errors.push({
        type: 'missing_source',
        message: `타겟 필드 '${fieldMap.targetField?.name || "알 수 없음"}'에 매핑된 소스 필드가 없습니다.`,
        targetId: fieldMap.id
      });
    } else {
      warnings.push({
        type: 'other',
        message: `타겟 필드 '${fieldMap.targetField?.name || "알 수 없음"}'에 매핑된 소스 필드가 없습니다.`,
        targetId: fieldMap.id
      });
    }
  } else {
    // 소스 필드 중복 검사
    const sourceFieldKeys = new Set<string>();
    
    fieldMap.sourceFields.forEach((sourceField: SourceField) => {
      if (!sourceField.fileId || !sourceField.sheetName || !sourceField.fieldName) {
        errors.push({
          type: 'invalid_field_name',
          message: '소스 필드 정보가 불완전합니다.',
          targetId: fieldMap.id
        });
        return;
      }

      // 소스 필드 중복 검사
      const sourceKey = `${sourceField.fileId}:${sourceField.sheetName}:${sourceField.fieldName}`;
      if (sourceFieldKeys.has(sourceKey)) {
        warnings.push({
          type: 'duplicate_mapping',
          message: `중복된 소스 필드: ${sourceField.fieldName}`,
          field: sourceField.fieldName,
          targetId: fieldMap.id
        });
      } else {
        sourceFieldKeys.add(sourceKey);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 필드 데이터 타입 호환성 검사
 * @param sourceType 소스 필드 데이터 타입
 * @param targetType 타겟 필드 데이터 타입
 * @returns 호환 여부 boolean, 경고 문자열
 */
export function checkTypeCompatibility(
  sourceType: string, 
  targetType: string
): { compatible: boolean; warning?: string } {
  // 타입이 지정되지 않은 경우 호환 가능으로 간주
  if (!sourceType || !targetType || sourceType === 'string' || targetType === 'string') {
    return { compatible: true };
  }

  // 기본 타입 호환성 규칙
  // 숫자 -> 문자열: 호환 가능
  // 문자열 -> 숫자: 경고 (데이터 손실 가능성)
  // 날짜 -> 문자열: 호환 가능
  // 문자열 -> 날짜: 경고 (데이터 손실 가능성)
  // 숫자 -> 날짜: 불가능
  // 날짜 -> 숫자: 불가능

  if (sourceType === targetType) {
    return { compatible: true };
  }

  if (sourceType === 'number' && targetType === 'string') {
    return { compatible: true };
  }

  if (sourceType === 'string' && targetType === 'number') {
    return { 
      compatible: true, 
      warning: '문자열에서 숫자로 변환 시 데이터 손실이 발생할 수 있습니다.' 
    };
  }

  if (sourceType === 'date' && targetType === 'string') {
    return { compatible: true };
  }

  if (sourceType === 'string' && targetType === 'date') {
    return { 
      compatible: true, 
      warning: '문자열에서 날짜로 변환 시 데이터 손실이 발생할 수 있습니다.' 
    };
  }

  if (
    (sourceType === 'number' && targetType === 'date') || 
    (sourceType === 'date' && targetType === 'number')
  ) {
    return { 
      compatible: false, 
      warning: '숫자와 날짜 형식은 직접 변환할 수 없습니다.' 
    };
  }

  // 기타 경우는 호환 가능으로 간주하되 경고
  return { 
    compatible: true, 
    warning: `${sourceType}에서 ${targetType}으로 변환 시 데이터 손실이 발생할 수 있습니다.` 
  };
} 