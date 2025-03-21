'use client';

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  MappingConfig, 
  loadMappingConfigs, 
  saveMappingConfig,
  addFieldMap,
  removeSourceField,
  getActiveMappingConfig,
  setActiveMappingConfigId,
  loadMappingConfigById,
  SourceField
} from '@/lib/mapping';
import { 
  loadFileInfos, 
  ExcelFileInfo 
} from '@/lib/excel';
import { getSheetData } from '@/lib/excel';
import { Wand2, ArrowRight, RefreshCw } from "lucide-react";

// 필드 매퍼 컴포넌트 속성
interface FieldMapperProps {
  onMappingComplete?: () => void;
}

// 문자열 유사도 측정 함수 (레벤슈타인 거리 기반)
function stringSimilarity(str1: string, str2: string): number {
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
  
  // 정규화된 유사도 (0~1 사이 값, 1이 가장 유사)
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1; // 두 문자열이 모두 빈 문자열인 경우
  return 1 - track[str2.length][str1.length] / maxLen;
}

// 정규화된 필드명 반환 (소문자 변환, 공백 제거 등)
function normalizeFieldName(fieldName: string): string {
  return fieldName.toLowerCase()
    .replace(/[_\s-]+/g, '') // 언더스코어, 공백, 하이픈 제거
    .replace(/[^\w\s가-힣]/g, ''); // 한글, 영문, 숫자만 유지
}

// 유사한 필드 매칭 (최소 유사도 임계값 기준)
function findSimilarFields(sourceFields: string[], targetFields: string[], threshold: number = 0.7): Map<string, string> {
  const mappings = new Map<string, string>();
  const usedTargets = new Set<string>();
  
  // 1. 정확히 일치하는 필드 먼저 매핑
  sourceFields.forEach(source => {
    const normalized = normalizeFieldName(source);
    
    for (const target of targetFields) {
      if (usedTargets.has(target)) continue;
      
      if (normalizeFieldName(target) === normalized) {
        mappings.set(source, target);
        usedTargets.add(target);
        break;
      }
    }
  });
  
  // 2. 유사도 기반 매핑 (임계값 이상만)
  sourceFields.forEach(source => {
    if (mappings.has(source)) return; // 이미 매핑된 경우 스킵
    
    let bestMatch = '';
    let highestSimilarity = 0;
    
    for (const target of targetFields) {
      if (usedTargets.has(target)) continue;
      
      const similarity = stringSimilarity(
        normalizeFieldName(source), 
        normalizeFieldName(target)
      );
      
      if (similarity > highestSimilarity && similarity >= threshold) {
        highestSimilarity = similarity;
        bestMatch = target;
      }
    }
    
    if (bestMatch) {
      mappings.set(source, bestMatch);
      usedTargets.add(bestMatch);
    }
  });
  
  return mappings;
}

// 시트 인터페이스 정의
interface Sheet {
  name: string;
  [key: string]: any;
}

export default function FieldMapper({ onMappingComplete }: FieldMapperProps) {
  // 상태 관리
  const [files, setFiles] = useState<ExcelFileInfo[]>([]);
  const [mappingConfigs, setMappingConfigs] = useState<MappingConfig[]>([]);
  const [activeMappingConfig, setActiveMappingConfig] = useState<MappingConfig | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sheetRecords, setSheetRecords] = useState<any[]>([]);
  
  // 매핑 설정 & 파일 로드
  useEffect(() => {
    // 매핑 설정 로드
    const configs = loadMappingConfigs();
    setMappingConfigs(configs);
    console.log('로드된 매핑 설정:', configs.length, '개');
    
    // 활성 매핑 설정 찾기
    const activeConfig = getActiveMappingConfig();
    if (activeConfig) {
      setActiveMappingConfig(activeConfig);
      console.log('활성 매핑 설정:', activeConfig.name);
    } else if (configs.length > 0) {
      // 없으면 첫 번째 설정을 활성으로 설정
      setActiveMappingConfig(configs[0]);
      setActiveMappingConfigId(configs[0].id);
      console.log('첫 번째 매핑 설정으로 설정:', configs[0].name);
    }
    
    // 파일 정보 로드
    const fileInfos = loadFileInfos();
    console.log('로드된 파일 정보:', fileInfos);
    setFiles(fileInfos);
    
    // 파일이 있으면 첫 번째 파일 선택
    if (fileInfos.length > 0) {
      setSelectedFileId(fileInfos[0].id);
      console.log('선택된 파일 ID:', fileInfos[0].id);
      
      // 선택한 파일의 첫 번째 시트 선택
      if (fileInfos[0].sheets && fileInfos[0].sheets.length > 0) {
        console.log('파일의 시트 정보:', fileInfos[0].sheets);
        
        // sheets가 문자열 배열인 경우
        if (typeof fileInfos[0].sheets[0] === 'string') {
          setSelectedSheet(fileInfos[0].sheets[0] as string);
          console.log('선택된 시트(문자열):', fileInfos[0].sheets[0]);
        } 
        // sheets가 객체 배열인 경우
        else if (typeof fileInfos[0].sheets[0] === 'object' && (fileInfos[0].sheets[0] as any).name) {
          setSelectedSheet((fileInfos[0].sheets[0] as any).name);
          console.log('선택된 시트(객체):', (fileInfos[0].sheets[0] as any).name);
        }
      } else {
        console.log('파일에 시트 정보가 없거나 비어 있음');
      }
    } else {
      console.log('로드된 파일이 없음');
    }

    // 초기 데이터 로드 완료 상태 설정
    setIsLoading(false);
  }, []);
  
  // 선택된 파일이 변경되면 시트 목록 업데이트
  useEffect(() => {
    if (selectedFileId && files.length > 0) {
      const file = files.find(f => f.id === selectedFileId);
      if (file && file.sheets && Array.isArray(file.sheets) && file.sheets.length > 0) {
        // sheets가 문자열 배열인 경우
        if (typeof file.sheets[0] === 'string') {
          setSelectedSheet(file.sheets[0] as string);
        } 
        // sheets가 객체 배열인 경우
        else if (typeof file.sheets[0] === 'object' && (file.sheets[0] as any).name) {
          setSelectedSheet((file.sheets[0] as any).name);
        }
      } else {
        setSelectedSheet("");
      }
    } else {
      setSelectedSheet("");
    }
  }, [selectedFileId, files]);
  
  // 파일/시트 선택이 변경되면 필드 목록과 레코드 데이터 업데이트
  useEffect(() => {
    const loadSheetData = async () => {
      if (!selectedFileId || !selectedSheet) {
        setSourceFields([]);
        setSheetRecords([]);
        return;
      }
      
      console.log('시트 데이터 로드 시작 - 파일ID:', selectedFileId, '시트명:', selectedSheet);
      
      try {
        setIsLoading(true);
        
        // 선택한 파일 정보 확인
        const selectedFile = files.find(f => f.id === selectedFileId);
        console.log('선택한 파일 정보:', selectedFile ? {
          id: selectedFile.id,
          name: selectedFile.name,
          sheets: selectedFile.sheets,
          dataSize: selectedFile.data ? selectedFile.data.length : 0
        } : '없음');
        
        const sheetData = await getSheetData(selectedFileId, selectedSheet);
        console.log('로드된 시트 데이터:', sheetData ? {
          name: sheetData.name,
          headers: sheetData.headers,
          dataCount: sheetData.data?.length || sheetData.rows?.length || 0
        } : '없음');
        
        if (sheetData && sheetData.headers) {
          setSourceFields(sheetData.headers);
          console.log('소스 필드 설정:', sheetData.headers);
          
          // 레코드 데이터 설정
          if (sheetData.data) {
            // data 속성이 있는 경우
            setSheetRecords(sheetData.data);
            console.log('레코드 데이터 설정(data):', sheetData.data.length, '개');
          } else if (sheetData.rows) {
            // rows 속성이 있는 경우
            setSheetRecords(sheetData.rows);
            console.log('레코드 데이터 설정(rows):', sheetData.rows.length, '개');
          } else {
            console.log('레코드 데이터가 없음');
            setSheetRecords([]);
          }
        } else {
          console.error('시트 데이터 또는 헤더 없음:', sheetData);
          setSourceFields([]);
          setSheetRecords([]);
        }
      } catch (error) {
        console.error("시트 데이터 로드 오류:", error);
        setSourceFields([]);
        setSheetRecords([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSheetData();
  }, [selectedFileId, selectedSheet, files]);
  
  // 자동 매핑 실행
  const handleAutoMapping = async () => {
    if (!activeMappingConfig || !selectedFileId || !selectedSheet) {
      alert('매핑 설정, 파일, 시트를 먼저 선택해주세요.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 타겟 필드 목록 (매핑 설정의 타겟 필드명)
      const targetFields = activeMappingConfig.fieldMaps?.map(map => map.targetField.name) || [];
      if (!targetFields.length) {
        alert('매핑 설정에 타겟 필드가 없습니다.');
        setIsLoading(false);
        return;
      }
      
      // 소스 필드가 없으면 다시 한번 로드 시도
      if (sourceFields.length === 0) {
        console.log('소스 필드 다시 로드 시도');
        try {
          const sheetData = await getSheetData(selectedFileId, selectedSheet);
          console.log('자동 매핑 중 로드된 시트 데이터:', sheetData);
          
          if (sheetData && sheetData.headers && sheetData.headers.length > 0) {
            setSourceFields(sheetData.headers);
          } else {
            alert('소스 파일의 필드를 찾을 수 없습니다. 파일을 다시 확인해주세요.');
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("시트 데이터 로드 오류:", error);
          alert('소스 파일 데이터를 로드하는 중 오류가 발생했습니다.');
          setIsLoading(false);
          return;
        }
      }
      
      // 유사도 기반 자동 매핑
      const mappings = findSimilarFields(sourceFields, targetFields);
      console.log('생성된 매핑:', mappings);
      
      if (mappings.size === 0) {
        alert('유사한 필드를 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }
      
      // 매핑 적용
      let updatedConfig = {...activeMappingConfig};
      
      // 기존 매핑 정보는 보존
      for (const [sourceField, targetField] of mappings.entries()) {
        // 중복 매핑 방지를 위해 이미 매핑된 필드인지 확인
        const existingMapping = updatedConfig.fieldMaps?.find(map => 
          map.targetField.name === targetField && 
          map.sourceFields.some(sf => 
            sf.fileId === selectedFileId && 
            sf.sheetName === selectedSheet && 
            sf.fieldName === sourceField
          )
        );
        
        if (!existingMapping) {
          console.log('매핑 추가:', sourceField, '->', targetField);
          updatedConfig = addFieldMap(
            updatedConfig.id,
            targetField,
            {
              fileId: selectedFileId,
              sheetName: selectedSheet,
              fieldName: sourceField
            }
          ) || updatedConfig;
        }
      }
      
      setActiveMappingConfig(updatedConfig);
      alert(`자동 매핑 완료: ${mappings.size}개 필드가 매핑되었습니다.`);
    } catch (error) {
      console.error("자동 매핑 오류:", error);
      alert('자동 매핑 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 매핑 삭제 처리
  const handleRemoveSourceField = (targetField: string, fileId: string, sheetName: string, fieldName: string) => {
    if (!activeMappingConfig) return;
    
    const updatedConfig = removeSourceField(
      activeMappingConfig.id,
      targetField,
      fileId,
      fieldName
    );
    
    if (updatedConfig) {
      setActiveMappingConfig(updatedConfig);
    }
  };

  // 매핑 설정 선택 처리
  const handleConfigChange = (configId: string) => {
    const config = loadMappingConfigById(configId);
    if (config) {
      setActiveMappingConfig(config);
      setActiveMappingConfigId(configId);
    }
  };
  
  // 타겟 필드 목록 (현재 매핑 설정의 필드맵에서 타겟 필드 추출)
  const targetFields = activeMappingConfig 
    ? (activeMappingConfig.fieldMaps || []).map(map => map.targetField.name) 
    : [];
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>필드 매핑</CardTitle>
            <CardDescription>
              소스 파일의 필드를 타겟 필드에 매핑합니다
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 매핑 설정 선택 / 파일 선택 영역 */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 매핑 설정 선택 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">매핑 설정</label>
              <Select
                value={activeMappingConfig?.id || ""}
                onValueChange={handleConfigChange}
                disabled={mappingConfigs.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="매핑 설정 선택" />
                </SelectTrigger>
                <SelectContent>
                  {mappingConfigs.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 파일 선택 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">소스 파일</label>
              <Select
                value={selectedFileId}
                onValueChange={setSelectedFileId}
                disabled={files.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="파일 선택" />
                </SelectTrigger>
                <SelectContent>
                  {files.map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 시트 선택 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">시트</label>
              <Select
                value={selectedSheet}
                onValueChange={setSelectedSheet}
                disabled={!selectedFileId || !(files.find(f => f.id === selectedFileId)?.sheets?.length)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="시트 선택" />
                </SelectTrigger>
                <SelectContent>
                  {selectedFileId && files.find(f => f.id === selectedFileId)?.sheets?.map((sheet: any, index) => {
                    // sheet가 문자열인 경우
                    if (typeof sheet === 'string') {
                      return (
                        <SelectItem key={`${sheet}-${index}`} value={sheet}>
                          {sheet}
                        </SelectItem>
                      );
                    }
                    // sheet가 객체인 경우
                    else if (typeof sheet === 'object' && sheet.name) {
                      return (
                        <SelectItem key={`${sheet.name}-${index}`} value={sheet.name}>
                          {sheet.name}
                        </SelectItem>
                      );
                    }
                    return null;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* 자동 매핑 버튼 */}
          <div className="flex justify-end">
            <Button
              onClick={handleAutoMapping}
              disabled={!activeMappingConfig || !selectedFileId || !selectedSheet || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              자동 매핑
            </Button>
          </div>
        </div>
        
        {/* 매핑 결과 테이블 */}
        {activeMappingConfig && activeMappingConfig.fieldMaps?.length > 0 && (
          <div className="border rounded-md p-4 space-y-2">
            <h3 className="text-lg font-semibold">현재 매핑</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">타겟 필드</TableHead>
                  <TableHead className="w-[50%]">소스 필드</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activeMappingConfig.fieldMaps || []).map(fieldMap => {
                  // 현재 파일/시트에 해당하는 소스 필드만 표시
                  const relevantSourceFields = fieldMap.sourceFields.filter(
                    sf => sf.fileId === selectedFileId && sf.sheetName === selectedSheet
                  );
                  
                  // 소스 필드가 없으면 "미매핑" 상태로 표시
                  if (relevantSourceFields.length === 0) {
                    return (
                      <TableRow key={fieldMap.targetField.name}>
                        <TableCell className="font-medium">{fieldMap.targetField.name}</TableCell>
                        <TableCell className="text-muted-foreground italic">
                          미매핑
                        </TableCell>
                      </TableRow>
                    );
                  }
                  
                  // 소스 필드가 있으면 각각 표시
                  return relevantSourceFields.map((sourceField, index) => (
                    <TableRow key={`${fieldMap.targetField.name}-${sourceField.fieldName}`}>
                      {index === 0 && (
                        <TableCell className="font-medium" rowSpan={relevantSourceFields.length}>
                          {fieldMap.targetField.name}
                        </TableCell>
                      )}
                      <TableCell className="flex justify-between items-center">
                        <span>{sourceField.fieldName}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => handleRemoveSourceField(
                            fieldMap.targetField.name,
                            sourceField.fileId,
                            sourceField.sheetName,
                            sourceField.fieldName
                          )}
                        >
                          ×
                        </Button>
                      </TableCell>
                    </TableRow>
                  ));
                })}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* 매핑 설정이 없는 경우 */}
        {!activeMappingConfig && (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            <p>매핑 설정이 없습니다. 매핑 설정 관리 탭에서 먼저 매핑 설정을 생성해주세요.</p>
          </div>
        )}
        
        {/* 소스 필드가 없는 경우 */}
        {activeMappingConfig && sourceFields.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border rounded-md">
            <p>파일과 시트를 선택하면 소스 필드가 표시됩니다.</p>
          </div>
        )}
        
        {/* 원본 데이터 표시 영역 */}
        {selectedFileId && selectedSheet && (
          <div className="mt-6 border rounded-md p-4">
            <h3 className="text-lg font-semibold mb-4">원본 데이터</h3>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">파일: {files.find(f => f.id === selectedFileId)?.name} / 시트: {selectedSheet}</h4>
              <p className="text-sm text-muted-foreground mb-2">필드 수: {sourceFields.length}</p>
              <p className="text-sm text-muted-foreground">레코드 수: {sheetRecords.length}</p>
            </div>
            
            {/* 파일 정보 디버깅 */}
            <div className="mb-4 p-3 bg-gray-100 rounded">
              <h4 className="font-medium mb-2">파일 정보 디버깅</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="font-semibold">ID:</div>
                <div>{selectedFileId}</div>
                
                <div className="font-semibold">이름:</div>
                <div>{files.find(f => f.id === selectedFileId)?.name}</div>
                
                <div className="font-semibold">시트 정보:</div>
                <div>
                  {files.find(f => f.id === selectedFileId)?.sheets ? 
                    JSON.stringify(files.find(f => f.id === selectedFileId)?.sheets) : '시트 정보 없음'}
                </div>
                
                <div className="font-semibold">데이터 존재 여부:</div>
                <div>
                  {files.find(f => f.id === selectedFileId)?.data ? 
                    `데이터 길이: ${files.find(f => f.id === selectedFileId)?.data?.length} 바이트` : '데이터 없음'}
                </div>
              </div>
              
              <div className="mt-3">
                <button
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => {
                    const fileInfo = files.find(f => f.id === selectedFileId);
                    if (fileInfo && fileInfo.data) {
                      try {
                        // 데이터 샘플 출력
                        const dataSample = fileInfo.data.length > 200 
                          ? fileInfo.data.substring(0, 200) + '...' 
                          : fileInfo.data;
                        console.log('파일 데이터 샘플:', dataSample);
                        
                        // Base64 디코딩 시도
                        try {
                          const decoded = atob(fileInfo.data);
                          console.log('Base64 디코딩 성공, 길이:', decoded.length);
                          
                          // JSON 파싱 시도
                          const jsonData = JSON.parse(decoded);
                          console.log('파일 데이터 구조:', Object.keys(jsonData));
                          console.log('시트 목록:', jsonData.sheets?.map((s: any) => 
                            typeof s === 'object' ? s.name : s
                          ));
                          
                          // 시트 데이터 접근
                          const sheet = jsonData.sheets?.find((s: any) => 
                            (typeof s === 'object' && s.name === selectedSheet) || 
                            (typeof s === 'string' && s === selectedSheet)
                          );
                          console.log('시트 데이터:', sheet ? Object.keys(sheet) : '없음');
                          
                          if (sheet && sheet.headers) {
                            console.log('헤더:', sheet.headers);
                            setSourceFields(sheet.headers);
                            
                            if (sheet.data) {
                              console.log('레코드 샘플:', sheet.data.slice(0, 3));
                              setSheetRecords(sheet.data);
                            } else if (sheet.rows) {
                              console.log('행 샘플:', sheet.rows.slice(0, 3));
                              setSheetRecords(sheet.rows);
                            }
                          }
                        } catch (e) {
                          console.error('Base64 디코딩/파싱 실패:', e);
                          alert('파일 데이터 형식이 올바르지 않습니다.');
                        }
                      } catch (e) {
                        console.error('파일 데이터 처리 오류:', e);
                      }
                    } else {
                      alert('파일 데이터가 없습니다.');
                    }
                  }}
                >
                  데이터 직접 읽기
                </button>
                
                <button
                  className="ml-2 px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  onClick={() => {
                    localStorage.removeItem('excel_merger_files');
                    alert('로컬 스토리지 초기화 완료. 페이지를 새로고침하세요.');
                  }}
                >
                  로컬 스토리지 초기화
                </button>
              </div>
            </div>
            
            {sheetRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-3 py-2">#</th>
                      {sourceFields.map((field, index) => (
                        <th key={index} className="text-left px-3 py-2">{field}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheetRecords.slice(0, 10).map((record, rowIndex) => (
                      <tr key={rowIndex} className="border-b">
                        <td className="px-3 py-2">{rowIndex + 1}</td>
                        {sourceFields.map((field, colIndex) => {
                          // record가 배열인 경우
                          if (Array.isArray(record)) {
                            return (
                              <td key={colIndex} className="px-3 py-2">
                                {record[colIndex] !== undefined ? String(record[colIndex]) : ''}
                              </td>
                            );
                          }
                          // record가 객체인 경우
                          else if (typeof record === 'object' && record !== null) {
                            return (
                              <td key={colIndex} className="px-3 py-2">
                                {record[field] !== undefined ? String(record[field]) : ''}
                              </td>
                            );
                          }
                          return <td key={colIndex} className="px-3 py-2"></td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sheetRecords.length > 10 && (
                  <p className="text-sm text-muted-foreground mt-3 text-center">
                    전체 {sheetRecords.length}개 레코드 중 처음 10개만 표시됩니다.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">
                레코드 데이터를 로드할 수 없습니다.
              </p>
            )}
            
            {/* 원본 JSON 데이터 (디버깅용) */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground">원본 데이터 JSON 보기</summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-x-auto max-h-[400px]">
                {JSON.stringify(sheetRecords, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 