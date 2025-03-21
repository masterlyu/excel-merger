import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { persist } from 'zustand/middleware';

export interface FileRecord {
  id: string;
  name: string;
  sheetName: string;
  columnName: string;
  data: string; // 실제 데이터는 문자열 형태로 저장
}

export interface FileHeader {
  id: string;
  name: string;
  description?: string;
  dataType?: string;
}

export interface FileData {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  headers: FileHeader[];
  records: FileRecord[];
  sheets?: {
    name: string;
    headers: FileHeader[];
  }[];
}

interface FileStore {
  files: FileData[];
  activeFileId: string | null;
  uploadStatus: {
    isUploading: boolean;
    progress: number;
    error: string | null;
  };
  
  addFile: (file: FileData) => void;
  updateFile: (id: string, data: Partial<FileData>) => void;
  removeFile: (id: string) => void;
  setActiveFile: (id: string | null) => void;
  setUploadStatus: (status: Partial<FileStore['uploadStatus']>) => void;
  
  getFile: (id: string) => FileData | undefined;
  getFileHeaders: (id: string) => FileHeader[];
  getFileRecords: (id: string, options?: { limit?: number }) => FileRecord[];
  
  reset: () => void;
}

// 스토어 초기 상태
const initialState = {
  files: [],
  activeFileId: null,
  uploadStatus: {
    isUploading: false,
    progress: 0,
    error: null
  }
};

export const useFileStore = create<FileStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 파일 추가
      addFile: (file: FileData) => set(state => {
        console.log('파일 추가:', file);
        // 파일 ID가 없는 경우 생성
        if (!file.id) {
          file.id = uuidv4();
        }
        return { 
          files: [...state.files, file],
          // 첫 번째 파일이 추가되는 경우 활성 파일로 설정
          activeFileId: state.activeFileId || file.id
        };
      }),

      // 파일 업데이트
      updateFile: (id: string, data: Partial<FileData>) => set(state => {
        console.log('파일 업데이트:', { id, data });
        const fileIndex = state.files.findIndex(f => f.id === id);
        if (fileIndex === -1) return state;

        const newFiles = [...state.files];
        newFiles[fileIndex] = { ...newFiles[fileIndex], ...data };
        
        return { files: newFiles };
      }),

      // 파일 삭제
      removeFile: (id: string) => set(state => {
        console.log('파일 삭제:', { id });
        const files = state.files.filter(f => f.id !== id);
        
        // 활성 파일이 삭제된 경우 다른 파일을 활성화
        let activeFileId = state.activeFileId;
        if (activeFileId === id) {
          activeFileId = files.length > 0 ? files[0].id : null;
        }
        
        return { files, activeFileId };
      }),

      // 활성 파일 설정
      setActiveFile: (id: string | null) => set(() => ({ activeFileId: id })),

      // 업로드 상태 설정
      setUploadStatus: (status: Partial<FileStore['uploadStatus']>) => set(state => ({
        uploadStatus: { ...state.uploadStatus, ...status }
      })),

      // 파일 가져오기
      getFile: (id: string) => {
        const state = get();
        return state.files.find(f => f.id === id);
      },

      // 파일 헤더 가져오기
      getFileHeaders: (id: string) => {
        const file = get().getFile(id);
        return file?.headers || [];
      },

      // 파일 레코드 가져오기
      getFileRecords: (id: string, options = {}) => {
        const file = get().getFile(id);
        if (!file) return [];
        
        const { limit } = options;
        const records = file.records || [];
        
        return limit ? records.slice(0, limit) : records;
      },

      // 스토어 초기화
      reset: () => set(initialState)
    }),
    {
      name: 'excel-merger-files',
      // 스토리지 객체를 sessionStorage로 변경
      storage: {
        getItem: (name) => {
          try {
            const item = sessionStorage.getItem(name);
            return item ? JSON.parse(item) : null;
          } catch (e) {
            console.error('파일 스토어 데이터 로드 오류:', e);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            sessionStorage.setItem(name, JSON.stringify(value));
          } catch (e) {
            console.error('파일 스토어 데이터 저장 오류:', e);
          }
        },
        removeItem: (name) => {
          try {
            sessionStorage.removeItem(name);
          } catch (e) {
            console.error('파일 스토어 데이터 삭제 오류:', e);
          }
        },
      },
    }
  )
); 