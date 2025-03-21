import { create } from 'zustand';
import * as XLSX from 'xlsx';

export interface FileRecord {
  id: string;
  values: { [key: string]: string };
}

export interface UploadedFile {
  id: string;
  name: string;
  headers: string[];
  records: FileRecord[];
}

interface FileState {
  files: UploadedFile[];
  activeFileId: string | null;
}

interface FileStore extends FileState {
  uploadFiles: (files: File[]) => Promise<void>;
  removeFile: (fileId: string) => void;
  setActiveFile: (fileId: string | null) => void;
}

const initialState: FileState = {
  files: [],
  activeFileId: null,
};

// 단순화된 파일 스토어 - 브라우저 스토리지 사용하지 않음
const useFileStore = create<FileStore>()((set, get) => ({
  ...initialState,

  uploadFiles: async (files) => {
    const newFiles: UploadedFile[] = [];

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

        if (jsonData.length > 0) {
          const headers = Object.keys(jsonData[0]);
          const records: FileRecord[] = jsonData.map((row) => ({
            id: crypto.randomUUID(),
            values: headers.reduce((acc, header) => {
              acc[header] = row[header]?.toString() || '';
              return acc;
            }, {} as { [key: string]: string }),
          }));

          newFiles.push({
            id: crypto.randomUUID(),
            name: file.name,
            headers,
            records,
          });
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    if (newFiles.length > 0) {
      set((state) => ({
        files: [...state.files, ...newFiles],
        activeFileId: state.activeFileId || newFiles[0].id,
      }));
      
      // 디버깅: 파일 저장 후 현재 상태 출력
      console.log('Files uploaded, new state:', get());
    }
  },

  removeFile: (fileId) => {
    set((state) => ({
      files: state.files.filter((file) => file.id !== fileId),
      activeFileId: state.activeFileId === fileId ? null : state.activeFileId,
    }));
  },

  setActiveFile: (fileId) => {
    set({ activeFileId: fileId });
  },
}));

export { useFileStore }; 