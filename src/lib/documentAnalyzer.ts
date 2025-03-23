/**
 * documentAnalyzer.ts
 * 엑셀 문서의 구조를 분석하여 헤더와 데이터 행 범위를 식별하는 유틸리티
 */

// 문서 패턴 인터페이스
export interface DocumentPattern {
  name: string;
  detect: (data: any[][]) => boolean;
  extractData: (data: any[][]) => {
    headerRowIndex: number;
    dataStartRowIndex: number;
    dataEndRowIndex: number;
  };
}

/**
 * 상단 행들이 메타데이터 구조를 가지는지 확인
 * (짧은 행, key-value 쌍 구조 등)
 */
function hasMetadataStructure(rows: any[][]): boolean {
  if (!rows || rows.length < 3) return false;
  
  // 메타데이터 행의 특징: 셀 수가 적고, 내용이 있는 셀이 주로 처음 2-3개
  let metadataRowCount = 0;
  
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    // 행의 비어있지 않은 셀 수 계산
    const nonEmptyCells = row.filter(cell => cell !== null && cell !== '').length;
    
    // 비어있지 않은 셀이 적고 (1-3개), 전체 길이의 절반 미만인 경우 메타데이터 행으로 간주
    if (nonEmptyCells > 0 && nonEmptyCells <= 3 && nonEmptyCells < row.length / 2) {
      metadataRowCount++;
    }
  }
  
  // 메타데이터 행이 3개 이상이면 메타데이터 구조로 판단
  return metadataRowCount >= 3;
}

/**
 * 주어진 범위 내에서 헤더로 보이는 행 찾기
 */
function findPotentialHeaderRow(data: any[][], minRow: number = 0, maxRow: number = 20): {
  headerRowIndex: number;
  cellCount: number;
  hasHeaderRow: boolean;
} {
  let maxCellCount = 0;
  let headerRowIndex = -1;
  
  // 검색 범위 조정
  const searchEndRow = Math.min(maxRow, data.length - 1);
  const searchStartRow = Math.min(minRow, searchEndRow);
  
  // 주어진 범위 내에서 가장 많은 셀을 가진 행 탐색
  for (let i = searchStartRow; i <= searchEndRow; i++) {
    const row = data[i] || [];
    
    // 비어있지 않은 셀 수 계산
    const nonEmptyCells = row.filter(cell => cell !== null && cell !== '').length;
    
    // 비어있지 않은 셀이 많은 행을 헤더 후보로 간주
    if (nonEmptyCells > maxCellCount) {
      maxCellCount = nonEmptyCells;
      headerRowIndex = i;
    }
  }
  
  // 헤더 행으로 간주할 최소 셀 수 (4개 이상)
  const hasHeaderRow = maxCellCount >= 4;
  
  return {
    headerRowIndex: headerRowIndex !== -1 ? headerRowIndex : 0,
    cellCount: maxCellCount,
    hasHeaderRow
  };
}

/**
 * 행이 비어있는지 확인
 */
function isEmptyRow(row: any[]): boolean {
  if (!row || row.length === 0) return true;
  
  // 모든 셀이 비어있거나 null인지 확인
  return row.every(cell => cell === null || cell === '');
}

/**
 * 행에 합계/통계 관련 키워드가 포함되어 있는지 확인
 */
function hasSummaryKeywords(row: any[]): boolean {
  if (!row || row.length === 0) return false;
  
  // 합계 관련 키워드 목록
  const summaryKeywords = ['합계', '총계', '소계', '통계', '계', 'total', 'sum', 'subtotal'];
  
  // 어떤 셀이라도 합계 키워드를 포함하는지 확인
  return row.some(cell => {
    if (cell === null || cell === '' || typeof cell !== 'string') return false;
    
    const cellText = String(cell).toLowerCase();
    return summaryKeywords.some(keyword => cellText.includes(keyword));
  });
}

/**
 * Confidential 문서 패턴
 */
export const confidentialDocumentPattern: DocumentPattern = {
  name: 'Confidential',
  
  // 문서가 Confidential 패턴인지 감지
  detect: (data) => {
    if (!data || data.length < 10) return false;
    
    // 1. "Confidential" 키워드 확인 (첫 5행 내)
    const hasConfidentialKeyword = data.slice(0, 5).some(row => 
      row && row.some(cell => 
        cell !== null && 
        typeof cell === 'string' && 
        cell.includes('Confidential')
      )
    );
    
    // 2. 상단에 메타데이터 형태의 행이 있는지 확인
    const hasMetadataSection = hasMetadataStructure(data.slice(0, 10));
    
    // 3. 중간에 데이터가 많은 헤더 행이 있는지 확인
    const { hasHeaderRow } = findPotentialHeaderRow(data, 5, 15);
    
    // "Confidential" 키워드가 있거나 메타데이터 구조가 있고 헤더 행이 있으면 Confidential 문서로 판단
    return (hasConfidentialKeyword || hasMetadataSection) && hasHeaderRow;
  },
  
  // 데이터 행 정보 추출
  extractData: (data) => {
    // 헤더 행 찾기
    const { headerRowIndex } = findPotentialHeaderRow(data, 5, 20);
    
    // 데이터 시작 행은 헤더 행 다음 행
    const dataStartRowIndex = headerRowIndex + 1;
    
    // 데이터 종료 행 찾기 (빈 행이나 합계 행 이전까지)
    let dataEndRowIndex = data.length - 1;
    for (let i = dataStartRowIndex; i < data.length; i++) {
      // 빈 행인지 확인
      const isEmpty = isEmptyRow(data[i]);
      
      // 합계 행인지 확인
      const isSummaryRow = hasSummaryKeywords(data[i]);
      
      if (isEmpty || isSummaryRow) {
        dataEndRowIndex = i - 1;
        break;
      }
    }
    
    return {
      headerRowIndex,
      dataStartRowIndex,
      dataEndRowIndex
    };
  }
};

/**
 * 일반 Excel 문서 패턴
 */
export const standardExcelPattern: DocumentPattern = {
  name: 'Standard Excel',
  
  // 기본 패턴 감지 (항상 true 반환하여 기본 패턴으로 사용)
  detect: (data) => {
    // 데이터가 충분히 있는지 확인
    return data && data.length > 0;
  },
  
  // 데이터 행 정보 추출
  extractData: (data) => {
    if (!data || data.length === 0) {
      return {
        headerRowIndex: 0,
        dataStartRowIndex: 0,
        dataEndRowIndex: 0
      };
    }
    
    // 첫 행을 헤더로 간주
    const headerRowIndex = 0;
    
    // 두 번째 행부터 데이터 시작
    const dataStartRowIndex = 1;
    
    // 마지막 행까지 데이터로 간주 (빈 행은 제외)
    let dataEndRowIndex = data.length - 1;
    
    // 마지막 빈 행들 제거
    for (let i = data.length - 1; i >= dataStartRowIndex; i--) {
      if (isEmptyRow(data[i])) {
        dataEndRowIndex = i - 1;
      } else {
        break;
      }
    }
    
    return {
      headerRowIndex,
      dataStartRowIndex,
      dataEndRowIndex
    };
  }
};

// 모든 문서 패턴 목록
export const documentPatterns: DocumentPattern[] = [
  confidentialDocumentPattern,
  // 새 패턴을 여기에 추가할 수 있음
  standardExcelPattern, // 항상 마지막에 기본 패턴으로
];

/**
 * 문서 분석 함수 - excel.ts에서 호출할 함수
 */
export function analyzeDocument(data: any[][]) {
  if (!data || data.length === 0) {
    return {
      patternName: 'Empty',
      headerRowIndex: 0,
      dataStartRowIndex: 0,
      dataEndRowIndex: 0
    };
  }
  
  // 모든 패턴을 확인하여 일치하는 첫 번째 패턴을 적용
  for (const pattern of documentPatterns) {
    if (pattern.detect(data)) {
      console.log(`[DocumentAnalyzer] 감지된 문서 패턴: ${pattern.name}`);
      return {
        patternName: pattern.name,
        ...pattern.extractData(data)
      };
    }
  }
  
  // 일치하는 패턴이 없으면 기본 값 반환
  return {
    patternName: 'Unknown',
    headerRowIndex: 0,
    dataStartRowIndex: 1,
    dataEndRowIndex: data.length - 1
  };
} 