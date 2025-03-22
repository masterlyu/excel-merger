// 매핑 관련 타입 정의
export interface MappingConfig {
  id: string;
  name: string;
  description?: string;
  created: number;
  updated: number;
  fieldMaps: FieldMap[];
}

/**
 * 필드 매핑 관련 타입
 */
export interface FieldMap {
  id: string;
  targetField: {
    name: string;
    description: string;
    type: string;
  };
  sourceFields: SourceField[];
}

export interface SourceField {
  id?: string;  // 고유 ID (옵션)
  fileId: string;
  sheetName: string;
  fieldName: string;
}

// 로컬 스토리지 키
const MAPPING_CONFIGS_KEY = 'excel_merger_mapping_configs';
const ACTIVE_MAPPING_CONFIG_KEY = 'excel_merger_active_mapping_config';

/**
 * 새 매핑 설정 생성
 */
export function createMappingConfig(
  name: string, 
  description?: string,
  targetFields?: string[]
): MappingConfig {
  const now = Date.now();
  const fieldMaps: FieldMap[] = [];
  
  // 타겟 필드가 제공된 경우 필드맵 생성
  if (targetFields && targetFields.length > 0) {
    targetFields.forEach(fieldName => {
      // ID는 'fieldmap_' 접두사 사용 (타겟 필드 이름이 ID로 생성되는 것 방지)
      fieldMaps.push({
        id: `fieldmap_${now}_${Math.random().toString(36).substring(2, 9)}`,
        targetField: {
          name: fieldName, // 타겟 필드 이름은 사용자가 제공한 이름 그대로 사용
          description: '',
          type: 'string'
        },
        sourceFields: []
      });
    });
  }
  
  const newConfig = {
    id: `mapping_${now}`,
    name,
    description: description || '',
    created: now,
    updated: now,
    fieldMaps
  };
  
  // 로컬 스토리지에 저장
  const configs = loadMappingConfigs();
  configs.push(newConfig);
  localStorage.setItem(MAPPING_CONFIGS_KEY, JSON.stringify(configs));
  
  // 활성 매핑 설정으로 설정
  setActiveMappingConfigId(newConfig.id);
  
  return newConfig;
}

/**
 * 고유 ID 생성
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * 매핑 설정 저장
 */
export function saveMappingConfig(config: MappingConfig): void {
  const configs = loadMappingConfigs();
  const existingIndex = configs.findIndex(c => c.id === config.id);
  
  config.updated = Date.now();
  
  if (existingIndex >= 0) {
    configs[existingIndex] = config;
  } else {
    configs.push(config);
  }
  
  localStorage.setItem(MAPPING_CONFIGS_KEY, JSON.stringify(configs));
}

/**
 * 모든 매핑 설정 로드
 */
export function loadMappingConfigs(): MappingConfig[] {
  const configsJson = localStorage.getItem(MAPPING_CONFIGS_KEY);
  if (!configsJson) return [];
  
  try {
    return JSON.parse(configsJson);
  } catch (error) {
    console.error('매핑 설정을 불러오는 중 오류가 발생했습니다:', error);
    return [];
  }
}

/**
 * ID로 특정 매핑 설정 로드
 */
export function loadMappingConfigById(id: string): MappingConfig | null {
  const configs = loadMappingConfigs();
  return configs.find(config => config.id === id) || null;
}

/**
 * 매핑 설정 삭제
 */
export function deleteMappingConfig(id: string): void {
  const configs = loadMappingConfigs();
  const filteredConfigs = configs.filter(config => config.id !== id);
  localStorage.setItem(MAPPING_CONFIGS_KEY, JSON.stringify(filteredConfigs));
  
  // 활성 설정이 삭제된 경우 활성 설정 초기화
  const activeId = getActiveMappingConfigId();
  if (activeId === id) {
    setActiveMappingConfigId(null);
  }
}

/**
 * 활성 매핑 설정 ID 설정
 */
export function setActiveMappingConfigId(id: string | null): void {
  if (id) {
    localStorage.setItem(ACTIVE_MAPPING_CONFIG_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_MAPPING_CONFIG_KEY);
  }
}

/**
 * 활성 매핑 설정 ID 조회
 */
export function getActiveMappingConfigId(): string | null {
  return localStorage.getItem(ACTIVE_MAPPING_CONFIG_KEY);
}

/**
 * 활성 매핑 설정 조회
 * 항상 유효한 필드맵만 포함된 설정을 반환
 */
export function getActiveMappingConfig(): MappingConfig | null {
  const activeId = getActiveMappingConfigId();
  if (!activeId) return null;
  
  const config = loadMappingConfigById(activeId);
  if (!config) return null;
  
  // 항상 잘못된 필드맵 필터링 적용
  const validFieldMaps = config.fieldMaps.filter(fieldMap => 
    fieldMap.targetField && 
    fieldMap.targetField.name && 
    !fieldMap.targetField.name.startsWith('field_') &&
    !fieldMap.targetField.name.startsWith('fieldmap_')
  );
  
  // 중복 ID 제거
  const uniqueFieldMaps: FieldMap[] = [];
  const fieldMapIds = new Set<string>();
  
  validFieldMaps.forEach(fieldMap => {
    if (!fieldMapIds.has(fieldMap.id)) {
      fieldMapIds.add(fieldMap.id);
      uniqueFieldMaps.push(fieldMap);
    }
  });
  
  // 변경사항이 있는 경우 저장
  if (config.fieldMaps.length !== uniqueFieldMaps.length) {
    const updatedConfig = {
      ...config,
      fieldMaps: uniqueFieldMaps,
      updated: Date.now()
    };
    saveMappingConfig(updatedConfig);
    return updatedConfig;
  }
  
  return config;
}

/**
 * 매핑 구성에 필드 맵 추가
 */
export function addFieldMap(
  configId: string,
  targetField: string | FieldMap,
  sourceField: SourceField
): MappingConfig | null {
  // 기존 매핑 설정 조회
  const config = loadMappingConfigById(configId);
  if (!config) return null;

  // 타겟 필드가 ID 문자열이라면, 해당 ID를 가진 필드맵을 찾음
  if (typeof targetField === 'string') {
    // ID 체크: 타겟 필드 이름이 'field_' 또는 'fieldmap_'으로 시작하는 경우 잘못된 ID 형식
    if (targetField.startsWith('field_') || targetField.startsWith('fieldmap_')) {
      console.log('필드 ID로 추정되는 타겟 필드:', targetField);
      
      // ID로 필드맵 찾기 시도
      const existingMapIndex = config.fieldMaps.findIndex(
        map => map.id === targetField
      );

      if (existingMapIndex !== -1) {
        // 기존 필드맵에 소스 필드 매핑
        const fieldMap = config.fieldMaps[existingMapIndex];
        
        // 이미 매핑된 소스 필드인지 확인
        const sourceExists = fieldMap.sourceFields.some(
          sf => sf.fileId === sourceField.fileId && 
                sf.sheetName === sourceField.sheetName && 
                sf.fieldName === sourceField.fieldName
        );

        if (sourceExists) {
          console.log('이 필드는 이미 매핑되어 있습니다.');
          return config;
        }

        // 기존 소스 필드를 유지하면서 새 소스 필드 추가
        config.fieldMaps[existingMapIndex].sourceFields.push(sourceField);
        saveMappingConfig(config);
        return config;
      } else {
        // ID로 찾을 수 없는 경우 - 유효하지 않은 필드는 생성하지 않음
        console.log('유효하지 않은 필드 ID입니다:', targetField);
        return config;
      }
    }
    
    // 필드 이름으로 찾기 (ID가 아닌 경우)
    const existingMapIndex = config.fieldMaps.findIndex(
      map => map.targetField.name === targetField
    );

    if (existingMapIndex !== -1) {
      // 이미 존재하는 경우, 중복된 소스 필드가 있는지 확인
      const sourceExists = config.fieldMaps[existingMapIndex].sourceFields.some(
        sf => sf.fileId === sourceField.fileId && 
              sf.sheetName === sourceField.sheetName && 
              sf.fieldName === sourceField.fieldName
      );

      if (sourceExists) {
        console.log('이 필드는 이미 매핑되어 있습니다.');
        return config;
      }

      // 기존 소스 필드를 유지하면서 새 소스 필드 추가
      config.fieldMaps[existingMapIndex].sourceFields.push(sourceField);
    } else {
      // 새 매핑 생성 - 이름이 ID 형식이 아닌지 이중 확인
      if (!targetField.startsWith('field_') && !targetField.startsWith('fieldmap_')) {
        const newFieldMap: FieldMap = {
          id: `fieldmap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sourceFields: [sourceField],
          targetField: {
            name: targetField,
            description: "",
            type: "string"
          }
        };
        
        // 동일한 ID를 가진 필드맵이 있는지 확인 (중복 방지)
        const duplicateIndex = config.fieldMaps.findIndex(map => map.id === newFieldMap.id);
        if (duplicateIndex === -1) {
          config.fieldMaps.push(newFieldMap);
        } else {
          console.log('중복된 필드맵 ID가 발견되었습니다:', newFieldMap.id);
        }
      } else {
        console.log('타겟 필드 이름이 ID 형식입니다:', targetField);
        return config;
      }
    }
  } else if (typeof targetField === 'object') {
    // 객체로 전달된 경우 (이미 필드맵이 있는 경우)
    const existingMapIndex = config.fieldMaps.findIndex(
      map => map.id === targetField.id
    );

    if (existingMapIndex !== -1) {
      // 기존 필드맵에 소스 필드 추가 전에 중복 확인
      const sourceExists = config.fieldMaps[existingMapIndex].sourceFields.some(
        sf => sf.fileId === sourceField.fileId && 
              sf.sheetName === sourceField.sheetName && 
              sf.fieldName === sourceField.fieldName
      );

      if (sourceExists) {
        console.log('이 필드는 이미 매핑되어 있습니다.');
        return config;
      }
      
      // 기존 소스 필드를 유지하면서 새 소스 필드 추가
      config.fieldMaps[existingMapIndex].sourceFields.push(sourceField);
    } else {
      // 객체가 제공되었지만 ID가 일치하는 필드맵이 없는 경우
      // targetField의 이름이 유효한지 확인
      if (targetField.targetField && 
          targetField.targetField.name && 
          !targetField.targetField.name.startsWith('field_') &&
          !targetField.targetField.name.startsWith('fieldmap_')) {
        
        // 새 ID 생성
        const newFieldMap: FieldMap = {
          ...targetField,
          id: `fieldmap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sourceFields: [sourceField]
        };
        
        config.fieldMaps.push(newFieldMap);
      } else {
        console.log('유효하지 않은 필드맵 객체:', targetField);
      }
    }
  }

  // 최종 검사: 유효하지 않은 필드맵 제거
  config.fieldMaps = config.fieldMaps.filter(fieldMap => 
    fieldMap.targetField && 
    fieldMap.targetField.name && 
    !fieldMap.targetField.name.startsWith('field_') &&
    !fieldMap.targetField.name.startsWith('fieldmap_')
  );

  // 설정 저장
  saveMappingConfig(config);
  return config;
}

/**
 * 필드 맵에서 소스 필드 제거
 */
export function removeSourceField(
  configId: string,
  targetField: string,
  sourceFieldId: string,
  sourceFieldName: string
): MappingConfig | null {
  const config = loadMappingConfigById(configId);
  if (!config) return null;

  // 타겟 필드를 찾음
  const mapIndex = config.fieldMaps.findIndex(
    map => map.targetField.name === targetField
  );

  if (mapIndex !== -1) {
    // 소스 필드 제거
    config.fieldMaps[mapIndex].sourceFields = config.fieldMaps[mapIndex].sourceFields.filter(
      sf => !(sf.fileId === sourceFieldId && sf.fieldName === sourceFieldName)
    );

    // 소스 필드가 없는 경우 필드맵 자체를 제거할 수 있음
    if (config.fieldMaps[mapIndex].sourceFields.length === 0) {
      config.fieldMaps.splice(mapIndex, 1);
    }

    saveMappingConfig(config);
  }

  return config;
}

/**
 * 필드 맵 전체 제거
 */
export function removeFieldMap(configId: string, targetField: string): MappingConfig | null {
  const config = loadMappingConfigById(configId);
  if (!config) return null;

  // 타겟 필드와 일치하는 필드맵 제거
  config.fieldMaps = config.fieldMaps.filter(map => map.targetField.name !== targetField);
  saveMappingConfig(config);

  return config;
}

/**
 * 모든 매핑 설정에서 잘못된 필드맵을 정리하는 함수
 * field_ 또는 fieldmap_으로 시작하는 이름을 가진 타겟 필드 제거 및 중복 ID 제거
 */
export function cleanupMappingConfigs(): void {
  const configs = loadMappingConfigs();
  
  if (configs.length === 0) return;
  
  // 각 설정을 순회하며 정리
  const cleanedConfigs = configs.map(config => {
    // 유효한 필드맵만 필터링
    let validFieldMaps = config.fieldMaps.filter(fieldMap => {
      return fieldMap.targetField && 
             fieldMap.targetField.name && 
             !fieldMap.targetField.name.startsWith('field_') &&
             !fieldMap.targetField.name.startsWith('fieldmap_');
    });
    
    // 중복 ID 제거
    const uniqueFieldMaps: FieldMap[] = [];
    const fieldMapIds = new Set<string>();
    
    validFieldMaps.forEach(fieldMap => {
      if (!fieldMapIds.has(fieldMap.id)) {
        fieldMapIds.add(fieldMap.id);
        uniqueFieldMaps.push(fieldMap);
      }
    });
    
    return {
      ...config,
      fieldMaps: uniqueFieldMaps,
      updated: Date.now()
    };
  });
  
  // 로컬 스토리지에 저장
  localStorage.setItem(MAPPING_CONFIGS_KEY, JSON.stringify(cleanedConfigs));
  
  console.log(`매핑 설정 정리 완료: ${configs.length}개 설정 처리됨`);
} 