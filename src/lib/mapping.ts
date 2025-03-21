// 매핑 관련 타입 정의
export interface MappingConfig {
  id: string;
  name: string;
  description?: string;
  created: number;
  updated: number;
  fieldMaps: FieldMap[];
}

export interface FieldMap {
  id: string;
  sourceFields: SourceField[];
  targetField: {
    name: string;
    description: string;
    type: string;
  };
}

export interface SourceField {
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
export function createMappingConfig(name: string, description?: string): MappingConfig {
  const now = Date.now();
  return {
    id: `mapping_${now}`,
    name,
    description: description || '',
    created: now,
    updated: now,
    fieldMaps: [],
  };
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
 */
export function getActiveMappingConfig(): MappingConfig | null {
  const activeId = getActiveMappingConfigId();
  if (!activeId) return null;
  return loadMappingConfigById(activeId);
}

/**
 * 매핑 구성에 필드 맵 추가
 */
export function addFieldMap(
  configId: string,
  targetField: string,
  sourceField: SourceField
): MappingConfig | null {
  // 기존 매핑 설정 조회
  const config = loadMappingConfigById(configId);
  if (!config) return null;

  // 이미 타겟 필드가 존재하는지 확인
  const existingMapIndex = config.fieldMaps.findIndex(
    map => map.targetField.name === targetField
  );

  if (existingMapIndex !== -1) {
    // 이미 존재하는 경우, 중복된 소스 필드가 있는지 확인
    const sourceExists = config.fieldMaps[existingMapIndex].sourceFields.some(
      sf => sf.fileId === sourceField.fileId && sf.sheetName === sourceField.sheetName && sf.fieldName === sourceField.fieldName
    );

    if (sourceExists) {
      console.log('이 필드는 이미 매핑되어 있습니다.');
      return config;
    }

    // 소스 필드 추가
    config.fieldMaps[existingMapIndex].sourceFields.push(sourceField);
  } else {
    // 새 매핑 생성
    config.fieldMaps.push({
      id: `fieldmap_${Date.now()}`,
      sourceFields: [sourceField],
      targetField: {
        name: targetField,
        description: "",
        type: "string"
      }
    });
  }

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