import { create } from 'zustand';

// 매핑 규칙 타입 정의
export interface FieldMapping {
  recordId: string;
  sourceField: string;
}

// 필드 타입 정의
export interface Field {
  id: string;
  name: string;
  description?: string;
  required?: boolean; // isRequired 대신 required 사용
  mappings: FieldMapping[];
  records?: any[]; // 필드에 연결된 레코드 데이터
}

// 매핑 설정 타입 정의
export interface MappingConfig {
  id: string;
  name: string;
  description?: string;
  fields: Field[];
  createdAt: string;
}

// 매핑 스토어 상태 인터페이스
interface MappingState {
  configs: MappingConfig[];
  activeConfigId: string | null;
  selectedFieldId: string | null;
}

// 매핑 스토어 인터페이스
interface MappingStore extends MappingState {
  // 매핑 설정 관련 액션
  createConfig: (data: { name: string; description?: string }) => string;
  updateConfig: (configId: string, data: { name: string; description?: string }) => void;
  deleteConfig: (configId: string) => void;
  setActiveConfig: (configId: string | null) => void;
  
  // 필드 관련 액션
  addField: (configId: string, field: Omit<Field, 'id' | 'mappings'>) => string;
  updateField: (configId: string, fieldId: string, data: Partial<Omit<Field, 'id' | 'mappings'>>) => void;
  deleteField: (configId: string, fieldId: string) => void;
  setSelectedField: (fieldId: string | null) => void;
  
  // 매핑 관련 액션
  addMapping: (configId: string, fieldId: string, mapping: FieldMapping) => void;
  deleteMapping: (configId: string, fieldId: string, recordId: string) => void;
  
  // 필드 레코드 관련 액션
  addRecord: (configId: string, fieldId: string, record: any) => string;
  updateRecord: (configId: string, fieldId: string, recordId: string, data: any) => void;
  deleteRecord: (configId: string, fieldId: string, recordId: string) => void;
}

// 기본 상태
const initialState: MappingState = {
  configs: [],
  activeConfigId: null,
  selectedFieldId: null,
};

// 매핑 스토어 생성
export const useMappingStore = create<MappingStore>()((set, get) => ({
  ...initialState,

  // 매핑 설정 관련 액션
  createConfig: (data) => {
    const id = crypto.randomUUID();
    const newConfig: MappingConfig = {
      id,
      name: data.name,
      description: data.description,
      fields: [],
      createdAt: new Date().toISOString(),
    };
    
    set((state) => ({
      configs: [...state.configs, newConfig],
      activeConfigId: id,
    }));
    console.log('매핑 설정 생성:', { id, ...data });
    return id;
  },

  updateConfig: (configId, data) => {
    set((state) => ({
      configs: state.configs.map((config) =>
        config.id === configId
          ? { ...config, ...data }
          : config
      ),
    }));
    console.log('매핑 설정 업데이트:', { configId, ...data });
  },

  deleteConfig: (configId) => {
    set((state) => ({
      configs: state.configs.filter((config) => config.id !== configId),
      activeConfigId: state.activeConfigId === configId ? null : state.activeConfigId,
    }));
    console.log('매핑 설정 삭제:', { configId });
  },

  setActiveConfig: (configId) => {
    set({ activeConfigId: configId, selectedFieldId: null });
    console.log('활성 매핑 설정 변경:', { configId });
  },

  // 필드 관련 액션
  addField: (configId, field) => {
    const fieldId = crypto.randomUUID();
    const newField: Field = {
      id: fieldId,
      name: field.name,
      description: field.description,
      required: field.required,
      mappings: [],
    };
    
    set((state) => ({
      configs: state.configs.map((config) =>
        config.id === configId
          ? {
              ...config,
              fields: [...config.fields, newField],
            }
          : config
      ),
      selectedFieldId: fieldId,
    }));
    console.log('필드 추가:', { configId, fieldId, ...field });
    return fieldId;
  },

  updateField: (configId, fieldId, data) => {
    set((state) => ({
      configs: state.configs.map((config) =>
        config.id === configId
          ? {
              ...config,
              fields: config.fields.map((field) =>
                field.id === fieldId
                  ? { ...field, ...data }
                  : field
              ),
            }
          : config
      ),
    }));
    console.log('필드 업데이트:', { configId, fieldId, ...data });
  },

  deleteField: (configId, fieldId) => {
    set((state) => ({
      configs: state.configs.map((config) =>
        config.id === configId
          ? {
              ...config,
              fields: config.fields.filter((field) => field.id !== fieldId),
            }
          : config
      ),
      selectedFieldId: state.selectedFieldId === fieldId ? null : state.selectedFieldId,
    }));
    console.log('필드 삭제:', { configId, fieldId });
  },

  setSelectedField: (fieldId) => {
    set({ selectedFieldId: fieldId });
    console.log('선택된 필드 변경:', { fieldId });
  },

  // 매핑 관련 액션
  addMapping: (configId, fieldId, mapping) => {
    set((state) => ({
      configs: state.configs.map((config) =>
        config.id === configId
          ? {
              ...config,
              fields: config.fields.map((field) =>
                field.id === fieldId
                  ? {
                      ...field,
                      mappings: [...field.mappings, mapping],
                    }
                  : field
              ),
            }
          : config
      ),
    }));
    console.log('매핑 추가:', { configId, fieldId, mapping });
  },

  deleteMapping: (configId, fieldId, recordId) => {
    set((state) => ({
      configs: state.configs.map((config) =>
        config.id === configId
          ? {
              ...config,
              fields: config.fields.map((field) =>
                field.id === fieldId
                  ? {
                      ...field,
                      mappings: field.mappings.filter((m) => m.recordId !== recordId),
                    }
                  : field
              ),
            }
          : config
      ),
    }));
    console.log('매핑 삭제:', { configId, fieldId, recordId });
  },

  // 필드 레코드 관련 액션
  addRecord: (configId, fieldId, record) => {
    const recordId = crypto.randomUUID();
    const recordWithId = { id: recordId, ...record };
    
    set((state) => ({
      configs: state.configs.map((config) =>
        config.id === configId
          ? {
              ...config,
              fields: config.fields.map((field) =>
                field.id === fieldId
                  ? {
                      ...field,
                      records: field.records ? [...field.records, recordWithId] : [recordWithId],
                    }
                  : field
              ),
            }
          : config
      ),
    }));
    console.log('레코드 추가:', { configId, fieldId, record: recordWithId });
    return recordId;
  },

  updateRecord: (configId, fieldId, recordId, data) => {
    set((state) => ({
      configs: state.configs.map((config) =>
        config.id === configId
          ? {
              ...config,
              fields: config.fields.map((field) =>
                field.id === fieldId
                  ? {
                      ...field,
                      records: field.records?.map((record) =>
                        record.id === recordId
                          ? { ...record, ...data }
                          : record
                      ),
                    }
                  : field
              ),
            }
          : config
      ),
    }));
    console.log('레코드 업데이트:', { configId, fieldId, recordId, data });
  },

  deleteRecord: (configId, fieldId, recordId) => {
    set((state) => ({
      configs: state.configs.map((config) =>
        config.id === configId
          ? {
              ...config,
              fields: config.fields.map((field) =>
                field.id === fieldId
                  ? {
                      ...field,
                      records: field.records?.filter((record) => record.id !== recordId),
                      // 연결된 매핑도 삭제
                      mappings: field.mappings.filter((m) => m.recordId !== recordId),
                    }
                  : field
              ),
            }
          : config
      ),
    }));
    console.log('레코드 삭제:', { configId, fieldId, recordId });
  },
})); 