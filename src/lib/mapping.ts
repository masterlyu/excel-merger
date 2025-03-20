// 매핑 설정을 위한 타입 정의
export interface ColumnMapping {
  sourceSheet: string;
  sourceColumn: string;
  targetColumn: string;
  transformRule?: string;
}

export interface MappingConfig {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  mappings: ColumnMapping[];
}

// 로컬 스토리지 키
const MAPPING_CONFIGS_KEY = 'excel_merger_mapping_configs';

// 매핑 설정 저장
export function saveMappingConfig(config: MappingConfig): void {
  const configs = loadMappingConfigs();
  const existingIndex = configs.findIndex(c => c.id === config.id);
  
  if (existingIndex >= 0) {
    configs[existingIndex] = config;
  } else {
    configs.push(config);
  }
  
  localStorage.setItem(MAPPING_CONFIGS_KEY, JSON.stringify(configs));
}

// 매핑 설정 불러오기
export function loadMappingConfigs(): MappingConfig[] {
  const configsJson = localStorage.getItem(MAPPING_CONFIGS_KEY);
  return configsJson ? JSON.parse(configsJson) : [];
}

// 매핑 설정 삭제
export function deleteMappingConfig(id: string): void {
  const configs = loadMappingConfigs();
  const filteredConfigs = configs.filter(config => config.id !== id);
  localStorage.setItem(MAPPING_CONFIGS_KEY, JSON.stringify(filteredConfigs));
}

// 새 매핑 설정 생성
export function createMappingConfig(name: string, description?: string): MappingConfig {
  return {
    id: crypto.randomUUID(),
    name,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mappings: []
  };
}

// 매핑 설정 업데이트
export function updateMappingConfig(config: MappingConfig): MappingConfig {
  return {
    ...config,
    updatedAt: new Date().toISOString()
  };
} 