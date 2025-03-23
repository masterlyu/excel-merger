import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
const { utils } = XLSX;

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

/**
 * 시트 데이터 인터페이스 정의
 */
export interface SheetData {
  name?: string;
  headers: string[];
  data?: Record<string, string | number | null>[];
  totalRows?: number;
  headerRow?: number;
  dataStartRow?: number;
  title?: string;
}

export interface ExcelData {
  sheets: Record<string, SheetData>;
  fileName: string;
  fileSize: number;
  lastModified: number;
}

// 파일 정보 타입 정의
export interface ExcelFileInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  uploadDate: string;
  sheets: { name: string; rowCount?: number }[];
  recordCount?: number;
  data: string; // JSON 문자열 데이터
}

/**
 * 엑셀 파일을 읽어서 데이터를 추출합니다.
 * @param file 업로드된 엑셀 파일
 * @returns 파싱된 엑셀 데이터
 */
export async function readExcelFile(file: File): Promise<{
  sheets: Record<string, SheetData>;
}> {
  console.log(`[readExcelFile] 시작: 파일명 ${file.name}, 크기 ${file.size} 바이트`);
  
  try {
    // 파일 데이터 읽기
    const arrayBuffer = await file.arrayBuffer();
    console.log(`[readExcelFile] 파일 읽기 완료: ${arrayBuffer.byteLength} 바이트`);
    
    // 워크북 파싱 (한글 인코딩 지원 옵션 추가)
    const workbook = XLSX.read(arrayBuffer, { 
      type: 'array',
      codepage: 949, // 한글 Windows (EUC-KR) 코드 페이지
      cellText: true,
      cellDates: true,
      cellNF: true,
      raw: false  // raw 모드 비활성화하여 문자열로 처리
    });
    
    console.log(`[readExcelFile] 워크북 파싱 완료, 시트 수: ${workbook.SheetNames.length}`);
    console.log(`[readExcelFile] 시트 목록:`, workbook.SheetNames);
    
    const result: {
      sheets: Record<string, SheetData>;
    } = {
      sheets: {}
    };
    
    // 각 시트 처리
    for (const sheetName of workbook.SheetNames) {
      console.log(`[readExcelFile] 시트 처리 시작: ${sheetName}`);
      
      try {
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet || !worksheet['!ref']) {
          console.warn(`[readExcelFile] 빈 시트 또는 ref 없음: ${sheetName}`);
          continue;
        }
        
        // 워크시트를 JSON으로 변환 (헤더 포함)
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, {
          header: 1,
          defval: null,
          blankrows: false
        });
        
        if (!jsonData || jsonData.length === 0) {
          console.warn(`[readExcelFile] 시트에 데이터 없음: ${sheetName}`);
          continue;
        }
        
        console.log(`[readExcelFile] 시트 데이터 변환 완료, 행 수: ${jsonData.length}`);
        
        // 첫 번째 행을 헤더로 사용
        const headers = (jsonData[0] as any[])
          .map(cell => (cell !== null ? String(cell).trim() : ''))
          .filter(header => header !== '');
        
        console.log(`[readExcelFile] 헤더 추출 완료, 개수: ${headers.length}`);
        console.log(`[readExcelFile] 헤더 샘플:`, headers.slice(0, 5));
        
        // 중복 헤더 처리
        const uniqueHeaders = makeHeadersUnique(headers);
        
        // 헤더 이후의 행을 데이터로 변환
        const rows = jsonData.slice(1) as any[][];
        
        // 객체 배열로 변환
        const data = rows.map((row: any[]) => {
          const obj: Record<string, string | number | null> = {};
          
          uniqueHeaders.forEach((header, index) => {
            if (index < row.length) {
              // null 값 처리
              if (row[index] === null || row[index] === undefined) {
                obj[header] = null;
              } 
              // 날짜 값 처리 (Excel 날짜)
              else if (row[index] instanceof Date) {
                obj[header] = formatDate(row[index] as Date);
              } 
              // 숫자 값 처리
              else if (typeof row[index] === 'number') {
                obj[header] = row[index];
              } 
              // 문자열 값 처리
              else {
                obj[header] = String(row[index]).trim();
              }
            } else {
              obj[header] = null;
            }
          });
          
          return obj;
        }).filter(row => Object.values(row).some(value => value !== null));
        
        console.log(`[readExcelFile] 데이터 행 변환 완료, 개수: ${data.length}`);
        
        if (data.length > 0) {
          console.log(`[readExcelFile] 첫 번째 데이터 행 샘플:`, data[0]);
        }
        
        // 결과 저장
        result.sheets[sheetName] = {
          name: sheetName,
          headers: uniqueHeaders,
          data: data,
          totalRows: data.length,
          headerRow: 1,
          dataStartRow: 2
        };
      } catch (error) {
        console.error(`[readExcelFile] 시트 처리 오류: ${sheetName}`, error);
      }
    }
    
    // 시트가 없으면 에러
    if (Object.keys(result.sheets).length === 0) {
      throw new Error('읽을 수 있는 시트가 없습니다.');
    }
    
    console.log(`[readExcelFile] 모든 시트 처리 완료, 시트 수: ${Object.keys(result.sheets).length}`);
    return result;
  } catch (error) {
    console.error('[readExcelFile] 파일 처리 오류:', error);
    throw error;
  }
}

/**
 * 중복된 헤더를 고유한 이름으로 변환합니다.
 */
function makeHeadersUnique(headers: string[]): string[] {
  const uniqueHeaders: string[] = [];
  const headerCount: Record<string, number> = {};
  
  headers.forEach(header => {
    if (!header) {
      header = 'Column';
    }
    
    if (headerCount[header]) {
      headerCount[header]++;
      uniqueHeaders.push(`${header}_${headerCount[header]}`);
    } else {
      headerCount[header] = 1;
      uniqueHeaders.push(header);
    }
  });
  
  return uniqueHeaders;
}

/**
 * 날짜를 yyyy-MM-dd 형식으로 포맷팅합니다.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 파일 유효성 검사 함수
 */
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

/**
 * 고유 ID를 생성합니다.
 */
function generateUniqueId(): string {
  return uuidv4();
}

/**
 * 파일 정보를 저장합니다.
 * @param file 업로드된 파일
 * @returns 저장된 파일 정보
 */
export async function saveFileInfo(file: File): Promise<ExcelFileInfo> {
  console.log('[saveFileInfo] 파일 정보 저장 시작:', file.name);
  
  try {
    // 파일 정보 생성
    const id = generateUniqueId();
    console.log('[saveFileInfo] 생성된 파일 ID:', id);
    
    // 파일 데이터 읽기
    const excelData = await readExcelFile(file);
    console.log('[saveFileInfo] 엑셀 데이터 추출 완료. 시트 수:', Object.keys(excelData.sheets).length);
    
    // JSON 데이터로 직렬화
    const dataStr = JSON.stringify(excelData);
    console.log('[saveFileInfo] 데이터 직렬화 완료. 크기:', dataStr.length, '바이트');
    
    // 시트 정보 추출
    const sheets = Object.keys(excelData.sheets).map(sheetName => ({
      name: sheetName,
      rowCount: excelData.sheets[sheetName].data?.length || 0
    }));
    console.log('[saveFileInfo] 추출된 시트 정보:', sheets);
    
    // 총 레코드 수 계산
    const recordCount = Object.values(excelData.sheets).reduce(
      (total, sheet) => total + (sheet.data?.length || 0), 
      0
    );
    
    // 파일 정보 생성
    const fileInfo: ExcelFileInfo = {
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      uploadDate: new Date().toISOString(),
      sheets,
      recordCount,
      data: dataStr
    };
    
    // 기존 파일 정보 로드
    const fileInfos = loadFileInfos();
    console.log('[saveFileInfo] 기존 파일 수:', fileInfos.length);
    
    // 최대 파일 수 제한 확인
    if (fileInfos.length >= MAX_FILE_COUNT) {
      // 가장 오래된 파일 삭제
      console.log('[saveFileInfo] 최대 파일 수 초과. 가장 오래된 파일 삭제');
      const oldestFile = fileInfos.reduce((oldest, current) => 
        new Date(oldest.uploadDate) < new Date(current.uploadDate) ? oldest : current
      );
      const updatedFiles = fileInfos.filter(f => f.id !== oldestFile.id);
      fileInfos.splice(0, fileInfos.length, ...updatedFiles);
    }
    
    // 새 파일 정보 추가
    fileInfos.push(fileInfo);
    console.log('[saveFileInfo] 새 파일 정보 추가됨. 총 파일 수:', fileInfos.length);
    
    // 파일 정보 저장
    localStorage.setItem('excel_merger_files', JSON.stringify(fileInfos));
    console.log('[saveFileInfo] 로컬 스토리지에 파일 정보 저장 완료');
    
    return fileInfo;
  } catch (error) {
    console.error('[saveFileInfo] 파일 정보 저장 오류:', error);
    throw error;
  }
}

/**
 * 로컬 스토리지에서 파일 정보 불러오기
 */
export function loadFileInfos(): ExcelFileInfo[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const fileInfosJson = localStorage.getItem('excel_merger_files');
  if (!fileInfosJson) return [];
  
  try {
    return JSON.parse(fileInfosJson);
  } catch (error) {
    console.error('[loadFileInfos] 파일 정보 파싱 오류:', error);
    return [];
  }
}

/**
 * 로컬 스토리지에서 파일 정보 삭제
 */
export function deleteFileInfo(id: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const fileInfos = loadFileInfos();
  const filteredInfos = fileInfos.filter(info => info.id !== id);
  localStorage.setItem('excel_merger_files', JSON.stringify(filteredInfos));
}

/**
 * 파일 ID와 시트명을 기반으로 시트 데이터를 가져옵니다.
 */
export async function getSheetData(fileId: string, sheetName: string): Promise<SheetData | null> {
  console.log('[getSheetData] 호출됨:', fileId, sheetName);
  
  try {
    // 파일 정보 로드
    const fileInfos = loadFileInfos();
    console.log('[getSheetData] 로드된 파일 정보 수:', fileInfos?.length || 0);
    
    // 파일 정보 찾기
    const fileInfo = fileInfos.find(f => f.id === fileId);
    if (!fileInfo) {
      console.error(`[getSheetData] 파일을 찾을 수 없음: ${fileId}`);
      return null;
    }
    console.log('[getSheetData] 파일 정보 찾음:', fileInfo.name);
    
    // 데이터 확인
    if (!fileInfo.data) {
      console.error(`[getSheetData] 파일 데이터가 없음: ${fileInfo.name}`);
      return null;
    }
    
    console.log('[getSheetData] 데이터 길이:', fileInfo.data.length);
    
    try {
      // JSON 파싱
      const fileData = JSON.parse(fileInfo.data);
      console.log('[getSheetData] JSON 파싱 성공');
      
      // 시트 데이터 확인
      if (!fileData.sheets) {
        console.error('[getSheetData] 유효한 시트 데이터가 없음');
        return null;
      }
      
      // 사용 가능한 시트 목록 확인
      const availableSheets = Object.keys(fileData.sheets);
      console.log('[getSheetData] 사용 가능한 시트 목록:', availableSheets.join(', '));
      
      // 요청된 시트 가져오기
      const sheetData = fileData.sheets[sheetName];
      
      // 시트를 찾지 못한 경우 첫 번째 시트 사용
      if (!sheetData) {
        console.warn(`[getSheetData] 요청된 시트 '${sheetName}'를 찾을 수 없음`);
        
        if (availableSheets.length > 0) {
          const firstSheet = availableSheets[0];
          console.log(`[getSheetData] 첫 번째 시트 사용: ${firstSheet}`);
          const firstSheetData = fileData.sheets[firstSheet];
          
          return {
            name: firstSheet,
            headers: firstSheetData.headers || [],
            data: firstSheetData.data || [],
            totalRows: firstSheetData.data?.length || 0,
            headerRow: firstSheetData.headerRow,
            dataStartRow: firstSheetData.dataStartRow,
            title: firstSheetData.title
          };
        }
        
        return null;
      }
      
      console.log(`[getSheetData] 시트 '${sheetName}' 찾음, 헤더 수: ${sheetData.headers?.length}, 데이터 행 수: ${sheetData.data?.length}`);
      
      // 시트 데이터 반환
      return {
        name: sheetName,
        headers: sheetData.headers || [],
        data: sheetData.data || [],
        totalRows: sheetData.data?.length || 0,
        headerRow: sheetData.headerRow,
        dataStartRow: sheetData.dataStartRow,
        title: sheetData.title
      };
    } catch (error) {
      console.error('[getSheetData] 데이터 파싱 오류:', error);
      return null;
    }
  } catch (error) {
    console.error('[getSheetData] 데이터 로드 오류:', error);
    return null;
  }
} 