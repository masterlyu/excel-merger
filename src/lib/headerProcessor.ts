/**
 * headerProcessor.ts
 * Excel 파일의 헤더를 처리하는 유틸리티 함수
 */

/**
 * 헤더를 처리하고 표준화하는 함수
 * - 빈 헤더 제거
 * - 트리밍 및 표준화
 * - 중복 헤더 처리
 */
export function processHeaders(headers: any[]): string[] {
  if (!headers || headers.length === 0) return [];

  // 1. 각 헤더 표준화(트리밍, 문자열 변환)
  const cleanedHeaders = headers.map(header => {
    // null, undefined, 빈 문자열 처리
    if (header === null || header === undefined || header === '') {
      return '';
    }
    
    // 문자열로 변환하고 공백 제거
    return String(header).trim();
  });

  // 2. 빈 헤더 필터링
  const filteredHeaders = cleanedHeaders.filter(header => header !== '');

  // 3. 중복 헤더 처리
  return makeHeadersUnique(filteredHeaders);
}

/**
 * 중복 헤더를 고유한 값으로 만드는 함수
 */
function makeHeadersUnique(headers: string[]): string[] {
  const uniqueHeaders: string[] = [];
  const headerCounts: Record<string, number> = {};

  // 각 헤더에 대해 반복
  headers.forEach(header => {
    // 빈 헤더 처리
    if (!header) {
      header = 'Column';
    }

    // 헤더 카운트 증가
    headerCounts[header] = (headerCounts[header] || 0) + 1;

    // 첫 번째 발견된 헤더는 그대로 사용
    if (headerCounts[header] === 1) {
      uniqueHeaders.push(header);
    } else {
      // 중복된 헤더는 번호 추가 (예: 'Name', 'Name_2', 'Name_3')
      uniqueHeaders.push(`${header}_${headerCounts[header]}`);
    }
  });

  return uniqueHeaders;
}

/**
 * 헤더 데이터 품질 검사
 * - 헤더의 총 개수
 * - 유효한 헤더 비율
 * - 평균 헤더 길이
 */
export function analyzeHeaderQuality(headers: string[]): {
  totalHeaders: number;
  validHeadersRatio: number;
  averageHeaderLength: number;
} {
  if (!headers || headers.length === 0) {
    return {
      totalHeaders: 0,
      validHeadersRatio: 0,
      averageHeaderLength: 0
    };
  }

  const validHeaders = headers.filter(h => h && h.trim() !== '');
  const totalLength = validHeaders.reduce((sum, h) => sum + h.length, 0);

  return {
    totalHeaders: headers.length,
    validHeadersRatio: validHeaders.length / headers.length,
    averageHeaderLength: validHeaders.length > 0 ? totalLength / validHeaders.length : 0
  };
} 