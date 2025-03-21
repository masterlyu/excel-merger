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
  ExcelFileInfo,
  getSheetData,
  SheetData
} from '@/lib/excel';
import { Wand2, ArrowRight, RefreshCw } from "lucide-react";
import { useFileStore } from '@/store/files';
import { combinedSimilarity, normalizeFieldName, findOptimalFieldMappings } from '@/lib/similarity';
import { toast } from 'react-hot-toast';
import MappingPreview from './MappingPreview';

// 필드 매퍼 컴포넌트 속성
interface FieldMapperProps {
  onMappingComplete?: () => void;
}

// 유사 필드명 찾기 함수 (현재 수정)
function findSimilarFields(sourceFields: string[], targetFields: string[], threshold = 0.7): Map<string, string> {
  console.log('유사 필드 찾기 시작:', { sourceFields, targetFields, threshold });
  return findOptimalFieldMappings(sourceFields, targetFields, threshold);
}

// 시트 인터페이스 정의
interface Sheet {
  name: string;
  [key: string]: any;
}

// FieldMapper 컴포넌트 정의
export default function FieldMapper({ onMappingComplete }: FieldMapperProps) {
  // 상태 관리
  const [files, setFiles] = useState<ExcelFileInfo[]>([]);
  const [mappingConfigs, setMappingConfigs] = useState<MappingConfig[]>([]);
  const [activeMappingConfig, setActiveMappingConfig] = useState<MappingConfig | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sheetRecords, setSheetRecords] = useState<Record<string, any>[]>([]);
  
  // 매핑 설정 관련 상태
  const [configs, setConfigs] = useState<MappingConfig[]>([]);

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
      
      try {
        setIsLoading(true);
        console.log('시트 데이터 로드 시작:', selectedFileId, selectedSheet);
        
        const sheetData = await getSheetData(selectedFileId, selectedSheet);
        
        if (sheetData) {
          console.log('시트 데이터 로드 성공:', sheetData);
          
          if (sheetData.headers && sheetData.headers.length > 0) {
            setSourceFields(sheetData.headers);
          } else {
            console.warn('시트에 헤더가 없습니다.');
            setSourceFields([]);
          }
          
          if (sheetData.data && sheetData.data.length > 0) {
            setSheetRecords(sheetData.data);
          } else {
            console.warn('시트에 데이터가 없습니다.');
            setSheetRecords([]);
          }
        } else {
          console.error('시트 데이터를 찾을 수 없습니다.');
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
      toast.error('매핑 설정, 파일, 시트를 먼저 선택해주세요.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 타겟 필드 목록 (매핑 설정의 타겟 필드명)
      const targetFields = activeMappingConfig.fieldMaps?.map(map => map.targetField.name) || [];
      if (!targetFields.length) {
        toast.error('매핑 설정에 타겟 필드가 없습니다.');
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
            toast.error('소스 파일의 필드를 찾을 수 없습니다. 파일을 다시 확인해주세요.');
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("시트 데이터 로드 오류:", error);
          toast.error('소스 파일 데이터를 로드하는 중 오류가 발생했습니다.');
          setIsLoading(false);
          return;
        }
      }
      
      // 유사도 기반 자동 매핑 (임계값 0.6으로 설정)
      const mappings = findSimilarFields(sourceFields, targetFields, 0.6);
      console.log('생성된 매핑:', mappings);
      
      if (mappings.size === 0) {
        toast.error('유사한 필드를 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }
      
      // 현재 매핑 설정 복제
      const updatedConfig = { ...activeMappingConfig };
      let mappingCount = 0;
      
      // 매핑 적용
      for (const [sourceField, targetField] of mappings.entries()) {
        // 해당 타겟 필드에 대한 필드맵 찾기
        const fieldMapIndex = updatedConfig.fieldMaps.findIndex(
          fieldMap => fieldMap.targetField.name === targetField
        );
        
        if (fieldMapIndex !== -1) {
          // 이미 매핑이 있는 경우, 소스 필드 추가
          const sourceFieldObj = {
            id: `${selectedFileId}_${selectedSheet}_${sourceField}`,
            fileId: selectedFileId,
            sheetName: selectedSheet,
            fieldName: sourceField
          };
          
          // 이미 동일한 소스 필드가 있는지 확인
          const hasSourceField = updatedConfig.fieldMaps[fieldMapIndex].sourceFields.some(
            sf => sf.fileId === selectedFileId && sf.sheetName === selectedSheet && sf.fieldName === sourceField
          );
          
          if (!hasSourceField) {
            updatedConfig.fieldMaps[fieldMapIndex].sourceFields.push(sourceFieldObj);
            mappingCount++;
          }
        }
      }
      
      // 매핑 설정 업데이트
      if (mappingCount > 0) {
        updatedConfig.updated = Date.now();
        
        // 전역 상태에 매핑 설정 업데이트
        setConfigs((prevConfigs: MappingConfig[]) => 
          prevConfigs.map((config: MappingConfig) => 
            config.id === updatedConfig.id ? updatedConfig : config
          )
        );
        
        // 매핑 설정 저장
        const updatedConfigs = loadMappingConfigs().map(config => 
          config.id === updatedConfig.id ? updatedConfig : config
        );
        localStorage.setItem('excel_merger_mappings', JSON.stringify(updatedConfigs));
        
        toast.success(`자동 매핑 완료: ${mappingCount}개 필드가 매핑되었습니다.`);
      } else {
        toast.error('이미 모든 가능한 필드가 매핑되어 있습니다.');
      }
    } catch (error) {
      console.error("자동 매핑 오류:", error);
      toast.error('자동 매핑 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 필드 매핑 추가/삭제 이벤트 핸들러 개선
  const handleAddSourceField = (targetFieldId: string, sourceField: SourceField) => {
    if (!activeMappingConfig) return;

    try {
      console.log(`소스 필드 추가: ${JSON.stringify(sourceField)}`);
      
      // 이미 연결된 소스 필드인지 확인
      const fieldMap = activeMappingConfig.fieldMaps.find(
        map => map.targetField.name === targetFieldId
      );
      
      if (!fieldMap) {
        console.error(`타겟 필드를 찾을 수 없음: ${targetFieldId}`);
        return;
      }
      
      // 이미 존재하는 매핑인지 확인
      const alreadyMapped = fieldMap.sourceFields.some(
        sf => sf.fileId === sourceField.fileId && 
             sf.sheetName === sourceField.sheetName && 
             sf.fieldName === sourceField.fieldName
      );
      
      if (alreadyMapped) {
        toast.error('이미 매핑된 필드입니다.');
        return;
      }
      
      // 소스 필드 추가
      const updatedConfig = { ...activeMappingConfig };
      const mapIndex = updatedConfig.fieldMaps.findIndex(
        map => map.targetField.name === targetFieldId
      );
      
      if (mapIndex !== -1) {
        // 고유 ID 생성
        const sourceFieldWithId = {
          ...sourceField,
          id: `${sourceField.fileId}_${sourceField.sheetName}_${sourceField.fieldName}`
        };
        
        updatedConfig.fieldMaps[mapIndex].sourceFields.push(sourceFieldWithId);
        updatedConfig.updated = Date.now();
        
        // 상태 업데이트
        setActiveMappingConfig(updatedConfig);
        
        // 로컬 스토리지 업데이트
        const configs = loadMappingConfigs().map(config => 
          config.id === updatedConfig.id ? updatedConfig : config
        );
        localStorage.setItem('excel_merger_mappings', JSON.stringify(configs));
        
        toast.success('필드가 성공적으로 매핑되었습니다.');
      }
    } catch (error) {
      console.error('필드 매핑 추가 오류:', error);
      toast.error('필드 매핑 추가 중 오류가 발생했습니다.');
    }
  };

  const handleRemoveSourceField = (targetFieldId: string, sourceFieldIndex: number) => {
    if (!activeMappingConfig) return;
    
    try {
      // 해당 타겟 필드 찾기
      const updatedConfig = { ...activeMappingConfig };
      const mapIndex = updatedConfig.fieldMaps.findIndex(
        map => map.targetField.name === targetFieldId
      );
      
      if (mapIndex === -1) {
        console.error(`타겟 필드를 찾을 수 없음: ${targetFieldId}`);
        return;
      }
      
      // 소스 필드가 범위를 벗어나는지 확인
      if (sourceFieldIndex < 0 || sourceFieldIndex >= updatedConfig.fieldMaps[mapIndex].sourceFields.length) {
        console.error(`유효하지 않은 소스 필드 인덱스: ${sourceFieldIndex}`);
        return;
      }
      
      // 매핑 제거
      updatedConfig.fieldMaps[mapIndex].sourceFields.splice(sourceFieldIndex, 1);
      updatedConfig.updated = Date.now();
      
      // 상태 업데이트
      setActiveMappingConfig(updatedConfig);
      
      // 로컬 스토리지 업데이트
      const configs = loadMappingConfigs().map(config => 
        config.id === updatedConfig.id ? updatedConfig : config
      );
      localStorage.setItem('excel_merger_mappings', JSON.stringify(configs));
      
      toast.success('필드 매핑이 제거되었습니다.');
    } catch (error) {
      console.error('필드 매핑 제거 오류:', error);
      toast.error('필드 매핑 제거 중 오류가 발생했습니다.');
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
                            index
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