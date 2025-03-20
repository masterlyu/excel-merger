import * as XLSX from 'xlsx';

// 허용된 파일 타입
export const ALLOWED_FILE_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'text/csv', // csv
];

// 파일 확장자 검증
export const ALLOWED_FILE_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

// 최대 파일 크기 (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 최대 파일 개수
export const MAX_FILE_COUNT = 10;

// 엑셀 데이터 타입 정의
export interface ExcelData {
  sheets: { name: string; data: (string | number | null)[][] }[];
  headers: Record<string, string[]>;
  recordCount: number;
}

// 파일 정보 타입 정의
export interface ExcelFileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  sheets: string[];
  recordCount: number;
}

// 파일 유효성 검사 함수
export const validateExcelFile = (file: File): string | null => {
  // 파일 크기 검사
  if (file.size > MAX_FILE_SIZE) {
    return '파일 크기는 10MB를 초과할 수 없습니다.';
  }

  // 파일 타입 검사
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
    return '지원하지 않는 파일 형식입니다. (지원 형식: xlsx, xls, csv)';
  }

  return null;
};

// 엑셀 파일 읽기 함수
export const readExcelFile = async (file: File): Promise<ExcelData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const result: ExcelData = {
          sheets: [] as { name: string; data: (string | number | null)[][] }[],
          headers: {} as Record<string, string[]>,
          recordCount: 0,
        };

        // 각 시트 처리
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length > 0) {
            // 헤더 추출 (첫 번째 행)
            const headers = jsonData[0] as string[];
            result.headers[sheetName] = headers;

            // 데이터 추출 (헤더 제외)
            const sheetData = jsonData.slice(1) as (string | number | null)[][];
            result.sheets.push({
              name: sheetName,
              data: sheetData,
            });

            // 레코드 수 계산
            result.recordCount += sheetData.length;
          }
        });

        resolve(result);
      } catch (error) {
        reject(new Error('엑셀 파일 읽기 실패: ' + (error as Error).message));
      }
    };

    reader.onerror = () => {
      reject(new Error('파일 읽기 실패'));
    };

    reader.readAsArrayBuffer(file);
  });
};

// 로컬 스토리지에 파일 정보 저장
export const saveFileInfo = (fileInfo: ExcelFileInfo) => {
  try {
    const existingFiles = JSON.parse(localStorage.getItem('excelFiles') || '[]');
    const updatedFiles = [...existingFiles, fileInfo];
    localStorage.setItem('excelFiles', JSON.stringify(updatedFiles));
  } catch (error) {
    console.error('파일 정보 저장 실패:', error);
    throw new Error('파일 정보를 저장하는데 실패했습니다.');
  }
};

// 로컬 스토리지에서 파일 정보 불러오기
export const loadFileInfos = (): ExcelFileInfo[] => {
  try {
    return JSON.parse(localStorage.getItem('excelFiles') || '[]');
  } catch (error) {
    console.error('파일 정보 불러오기 실패:', error);
    return [];
  }
};

// 로컬 스토리지에서 파일 정보 삭제
export const deleteFileInfo = (fileId: string) => {
  try {
    const existingFiles = JSON.parse(localStorage.getItem('excelFiles') || '[]') as ExcelFileInfo[];
    const updatedFiles = existingFiles.filter(file => file.id !== fileId);
    localStorage.setItem('excelFiles', JSON.stringify(updatedFiles));
  } catch (error) {
    console.error('파일 정보 삭제 실패:', error);
    throw new Error('파일 정보를 삭제하는데 실패했습니다.');
  }
}; 