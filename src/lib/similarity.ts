/**
 * similarity.ts
 * 문자열 유사도 계산 및 필드 자동 매핑을 위한 유틸리티 함수
 */

/**
 * 레벤슈타인 거리 계산
 * 두 문자열 간의 편집 거리를 계산 (삽입, 삭제, 대체 연산의 최소 횟수)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1).fill(null).map(() => 
    Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // 삭제
        track[j - 1][i] + 1, // 삽입
        track[j - 1][i - 1] + indicator, // 대체
      );
    }
  }
  
  return track[str2.length][str1.length];
}

/**
 * 레벤슈타인 거리 기반 유사도 계산
 * 0~1 사이 값으로 정규화 (1이 가장 유사)
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1; // 두 문자열이 모두 빈 문자열인 경우
  return 1 - levenshteinDistance(str1, str2) / maxLen;
}

/**
 * 자카드 유사도 계산
 * 두 집합의 교집합과 합집합의 비율로 유사도 계산
 */
export function jaccardSimilarity(str1: string, str2: string): number {
  // 문자열을 2글자 n-gram 집합으로 변환
  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const set1 = getBigrams(str1);
  const set2 = getBigrams(str2);
  
  if (set1.size === 0 && set2.size === 0) return 1;
  
  // 교집합 계산
  const intersection = new Set<string>();
  for (const item of set1) {
    if (set2.has(item)) {
      intersection.add(item);
    }
  }
  
  // 합집합 크기 = 집합1 크기 + 집합2 크기 - 교집합 크기
  const unionSize = set1.size + set2.size - intersection.size;
  
  return unionSize === 0 ? 0 : intersection.size / unionSize;
}

/**
 * 필드명 정규화 
 * 소문자 변환, 공백/특수문자 제거 등을 통해 비교 가능한 형태로 정규화
 */
export function normalizeFieldName(fieldName: string): string {
  if (!fieldName) return '';
  
  return fieldName.toLowerCase()
    .trim()
    .replace(/[\s_\-–—]+/g, '') // 공백, 언더스코어, 하이픈, 대시 등 제거
    .replace(/[^\w\s가-힣]/g, '') // 한글, 영문, 숫자만 유지
    .replace(/\s+/g, ''); // 남아있는 공백 제거
}

/**
 * 여러 알고리즘을 조합한 통합 유사도 계산
 * 다양한 알고리즘의 결과를 가중치를 적용하여 조합
 */
export function combinedSimilarity(str1: string, str2: string): number {
  // 정규화된 문자열로 비교
  const normalized1 = normalizeFieldName(str1);
  const normalized2 = normalizeFieldName(str2);
  
  // 정확히 일치하면 최대 유사도
  if (normalized1 === normalized2) return 1;
  
  // 각 알고리즘별 가중치
  const levenWeight = 0.6;
  const jaccardWeight = 0.4;
  
  // 가중치를 적용한 유사도 계산
  const levenScore = levenshteinSimilarity(normalized1, normalized2) * levenWeight;
  const jaccardScore = jaccardSimilarity(normalized1, normalized2) * jaccardWeight;
  
  return levenScore + jaccardScore;
}

/**
 * 두 필드 그룹 간 최적의 매핑 쌍 찾기
 * 유사도 기준으로 소스 필드와 타겟 필드 매핑
 */
export function findOptimalFieldMappings(
  sourceFields: string[], 
  targetFields: string[],
  similarityThreshold = 0.7  // 기본 유사도 임계값
): Map<string, string> {
  // 결과 매핑 (소스 필드 -> 타겟 필드)
  const mappings = new Map<string, string>();
  // 이미 매핑된 타겟 필드 추적
  const mappedTargets = new Set<string>();
  
  // 각 소스 필드별로 가장 유사한 타겟 필드 찾기
  for (const sourceField of sourceFields) {
    let bestMatch = '';
    let bestSimilarity = 0;
    
    for (const targetField of targetFields) {
      // 이미 매핑된 타겟 필드는 건너뛰기
      if (mappedTargets.has(targetField)) continue;
      
      const similarity = combinedSimilarity(sourceField, targetField);
      if (similarity > bestSimilarity && similarity >= similarityThreshold) {
        bestSimilarity = similarity;
        bestMatch = targetField;
      }
    }
    
    // 일정 임계값 이상의 유사도를 가진 매핑만 추가
    if (bestMatch) {
      mappings.set(sourceField, bestMatch);
      mappedTargets.add(bestMatch);
    }
  }
  
  return mappings;
}

/**
 * 두 데이터 배열 간의 유형 호환성 확인
 * 소스와 타겟 필드 간 데이터 유형이 호환되는지 검사
 */
export function checkFieldTypeCompatibility(
  sourceData: any[], 
  targetSchema: Record<string, string>
): Record<string, boolean> {
  const compatibility: Record<string, boolean> = {};
  
  // 각 필드별 유형 감지
  for (const field in targetSchema) {
    const expectedType = targetSchema[field];
    
    // 소스 데이터에서 해당 필드의 실제 유형 확인
    const actualType = detectFieldType(sourceData.map(item => item[field]));
    
    // 유형 호환성 검사
    compatibility[field] = isTypeCompatible(actualType, expectedType);
  }
  
  return compatibility;
}

/**
 * 데이터 배열에서 필드 유형 감지
 */
function detectFieldType(values: any[]): string {
  // 유효한 값만 필터링
  const validValues = values.filter(v => v !== null && v !== undefined && v !== '');
  if (validValues.length === 0) return 'unknown';
  
  // 모든 값이 숫자인지 확인
  const allNumbers = validValues.every(v => !isNaN(Number(v)));
  if (allNumbers) return 'number';
  
  // 날짜 형식 확인
  const possibleDateFormat = validValues.every(v => !isNaN(Date.parse(String(v))));
  if (possibleDateFormat) return 'date';
  
  // 기본값은 문자열
  return 'string';
}

/**
 * 두 데이터 유형이 호환되는지 확인
 */
function isTypeCompatible(sourceType: string, targetType: string): boolean {
  // 동일한 유형이면 호환 가능
  if (sourceType === targetType) return true;
  
  // 특정 유형 변환 가능 여부
  const compatibilityMap: Record<string, string[]> = {
    'number': ['string'],  // 숫자 -> 문자열 변환 가능
    'date': ['string'],    // 날짜 -> 문자열 변환 가능
    'string': ['number', 'date']  // 특정 형식의 문자열은 숫자나 날짜로 변환 가능할 수 있음
  };
  
  return compatibilityMap[sourceType]?.includes(targetType) || false;
} 