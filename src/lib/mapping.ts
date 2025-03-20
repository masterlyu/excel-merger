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
  records: string[];  // 표준 레코드명 목록
  mappings: ColumnMapping[];
}

// 로컬 스토리지 키
const MAPPING_CONFIGS_KEY = 'excel_merger_mapping_configs';

// 매핑 설정 저장
export function saveMappingConfig(config: MappingConfig): void {
  if (typeof window === 'undefined') {
    return;
  }
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
  if (typeof window === 'undefined') {
    return [];
  }
  const configsJson = localStorage.getItem(MAPPING_CONFIGS_KEY);
  const configs = configsJson ? JSON.parse(configsJson) : [];

  // 기존 설정들을 마이그레이션
  const migratedConfigs = configs.map((config: Partial<MappingConfig & { standardFields?: string[] }>) => {
    if (!config.records) {
      // standardFields가 있으면 그것을 사용하고, 없으면 빈 배열
      const records = config.standardFields || [];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { standardFields, ...rest } = config;
      return { ...rest, records } as MappingConfig;
    }
    return config as MappingConfig;
  });

  // 마이그레이션된 설정들을 저장
  if (JSON.stringify(configs) !== JSON.stringify(migratedConfigs)) {
    localStorage.setItem(MAPPING_CONFIGS_KEY, JSON.stringify(migratedConfigs));
  }

  return migratedConfigs;
}

// 매핑 설정 삭제
export function deleteMappingConfig(id: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const configs = loadMappingConfigs();
  const filteredConfigs = configs.filter(config => config.id !== id);
  localStorage.setItem(MAPPING_CONFIGS_KEY, JSON.stringify(filteredConfigs));
}

// 새 매핑 설정 생성
export function createMappingConfig(name: string, description?: string, records: string[] = []): MappingConfig {
  return {
    id: crypto.randomUUID(),
    name,
    description,
    records,
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