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

export interface SheetData {
  name: string;
  headers: string[];
  data: Record<string, string | number | null>[];
  totalRows: number;
  headerRow: number;
  dataStartRow: number;
  title?: string;
}

export interface ExcelData {
  sheets: SheetData[];
  fileName: string;
  fileSize: number;
  lastModified: number;
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
  data: string;  // Base64 문자열로 변경
}

interface SheetAnalysis {
  headerRow: number;
  dataStartRow: number;
  title?: string;
}

// 시트 구조 분석
function analyzeSheetStructure(worksheet: XLSX.WorkSheet): SheetAnalysis {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  let headerRow = 0;
  let dataStartRow = 1;
  let title: string | undefined;

  // 전체 시트 스캔
  for (let row = 0; row <= range.e.r; row++) {
    const rowCells: { value: string | number | boolean | Date; col: number; }[] = [];
    let nonEmptyCols = 0;
    
    // 현재 행의 모든 셀 읽기
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      if (cell && cell.v !== undefined && cell.v !== '') {
        rowCells.push({ value: cell.v, col });
        nonEmptyCols++;
      }
    }

    // 빈 행 처리
    if (nonEmptyCols === 0) {
      continue;
    }

    // 첫 번째 행이 제목인지 확인
    if (row === 0 && rowCells.length === 1) {
      const value = String(rowCells[0].value).toLowerCase();
      if (value.includes('confidential') || 
          value.includes('제목') || 
          value.includes('title')) {
        title = String(rowCells[0].value);
        continue;
      }
    }

    // 헤더 행 감지를 위한 조건 검사
    const isHeaderCandidate = rowCells.length >= 4 && rowCells.every(cell => {
      const value = String(cell.value);
      return (
        // 헤더는 보통 문자열이며 길이가 적당함
        (typeof cell.value === 'string' && value.length < 50) ||
        // 또는 숫자로만 이루어진 문자열이 아님
        (typeof cell.value === 'string' && !value.match(/^\d+$/)) ||
        // 특수문자로만 이루어진 문자열이 아님
        (typeof cell.value === 'string' && !value.match(/^[\d\s\W]+$/))
      );
    });

    if (isHeaderCandidate) {
      // 다음 행이 실제 데이터인지 확인
      const nextRow = row + 1;
      if (nextRow <= range.e.r) {
        let nextRowDataCount = 0;
        for (let col = 0; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: nextRow, c: col });
          const cell = worksheet[cellAddress];
          if (cell && cell.v !== undefined && cell.v !== '') {
            nextRowDataCount++;
          }
        }

        // 다음 행의 데이터가 현재 행과 비슷한 패턴이면 헤더로 판단
        if (nextRowDataCount >= rowCells.length * 0.7) {
          headerRow = row;
          dataStartRow = nextRow;
          break;
        }
      }
    }
  }

  // 헤더를 찾지 못한 경우 첫 번째 행을 헤더로 설정
  if (headerRow === 0 && !title) {
    return { headerRow: 0, dataStartRow: 1, title: undefined };
  }

  return { 
    headerRow, 
    dataStartRow, 
    title
  };
}

// 헤더 추출
function extractHeaders(worksheet: XLSX.WorkSheet, headerRow: number): string[] {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const headers: string[] = [];

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
    const cell = worksheet[cellAddress];
    
    // 빈 헤더 처리
    if (!cell || !cell.v) {
      headers.push(`Column${col + 1}`);
      continue;
    }

    // 중복 헤더 처리
    const headerValue = cell.v.toString().trim();
    if (headers.includes(headerValue)) {
      headers.push(`${headerValue}_${col + 1}`);
    } else {
      headers.push(headerValue);
    }
  }

  return headers;
}

// 데이터 추출
function extractData(
  worksheet: XLSX.WorkSheet,
  dataStartRow: number,
  headers: string[]
): Record<string, string | number | null>[] {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const data: Record<string, string | number | null>[] = [];
  let consecutiveEmptyRows = 0;
  const MAX_EMPTY_ROWS = 2; // 연속된 빈 행이 2개 이상이면 데이터 영역 종료로 간주

  for (let row = dataStartRow; row <= range.e.r; row++) {
    const rowData: Record<string, string | number | null> = {};
    let hasData = false;
    let emptyColumns = 0;

    // 현재 행의 데이터 읽기
    for (let col = 0; col < headers.length; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v !== undefined && cell.v !== '') {
        // 날짜 형식 처리
        if (cell.t === 'd') {
          rowData[headers[col]] = cell.w || cell.v;
        } else {
          rowData[headers[col]] = cell.v;
        }
        hasData = true;
      } else {
        rowData[headers[col]] = null;
        emptyColumns++;
      }
    }

    // 대부분의 열이 비어있는 경우 빈 행으로 간주
    if (emptyColumns >= headers.length * 0.8) {
      consecutiveEmptyRows++;
      if (consecutiveEmptyRows >= MAX_EMPTY_ROWS) {
        // 연속된 빈 행을 만나면 데이터 영역이 끝난 것으로 간주하고 종료
        break;
      }
      continue;
    }

    // 데이터가 있는 행을 만나면 연속된 빈 행 카운터 초기화
    if (hasData) {
      consecutiveEmptyRows = 0;
      data.push(rowData);
    }
  }

  return data;
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

// 엑셀 파일 읽기
export async function readExcelFile(file: File): Promise<ExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheets: SheetData[] = workbook.SheetNames.map(name => {
          const worksheet = workbook.Sheets[name];
          const analysis = analyzeSheetStructure(worksheet);
          const headers = extractHeaders(worksheet, analysis.headerRow);
          const sheetData = extractData(worksheet, analysis.dataStartRow, headers);

          return {
            name,
            headers,
            data: sheetData,
            totalRows: sheetData.length,
            headerRow: analysis.headerRow,
            dataStartRow: analysis.dataStartRow,
            title: analysis.title
          };
        });

        resolve({
          sheets,
          fileName: file.name,
          fileSize: file.size,
          lastModified: file.lastModified
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

// 로컬 스토리지에 파일 정보 저장
export async function saveFileInfo(file: File): Promise<ExcelFileInfo> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const base64Data = e.target?.result as string;
        const binaryData = atob(base64Data.split(',')[1]);
        const array = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          array[i] = binaryData.charCodeAt(i);
        }
        
        const workbook = XLSX.read(array, { type: 'array' });
        
        const fileInfo: ExcelFileInfo = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          sheets: workbook.SheetNames,
          recordCount: workbook.SheetNames.reduce((total, name) => {
            const worksheet = workbook.Sheets[name];
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
            return total + (range.e.r - range.s.r);
          }, 0),
          data: base64Data
        };

        const fileInfos = loadFileInfos();
        const existingIndex = fileInfos.findIndex(info => info.id === fileInfo.id);
        
        if (existingIndex >= 0) {
          fileInfos[existingIndex] = fileInfo;
        } else {
          fileInfos.push(fileInfo);
        }
        
        localStorage.setItem('excel_merger_files', JSON.stringify(fileInfos));
        resolve(fileInfo);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    };

    reader.readAsDataURL(file);
  });
}

// 로컬 스토리지에서 파일 정보 불러오기
export function loadFileInfos(): ExcelFileInfo[] {
  const fileInfosJson = localStorage.getItem('excel_merger_files');
  return fileInfosJson ? JSON.parse(fileInfosJson) : [];
}

// 로컬 스토리지에서 파일 정보 삭제
export function deleteFileInfo(id: string): void {
  const fileInfos = loadFileInfos();
  const filteredInfos = fileInfos.filter(info => info.id !== id);
  localStorage.setItem('excel_merger_files', JSON.stringify(filteredInfos));
} 