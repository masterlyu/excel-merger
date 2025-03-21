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
import { Wand2, ArrowRight, RefreshCw, PlusCircle } from "lucide-react";
import { toast } from 'react-hot-toast';
import { combinedSimilarity, normalizeFieldName, findOptimalFieldMappings } from '@/lib/similarity';

// 매핑 관련 타입 및 함수
import { 
  MappingConfig, 
  loadMappingConfigs, 
  saveMappingConfig,
  addFieldMap,
  removeSourceField,
  getActiveMappingConfig,
  setActiveMappingConfigId,
  loadMappingConfigById,
  FieldMap
} from '@/lib/mapping';

// 엑셀 파일 관련 타입 및 함수
import { 
  loadFileInfos, 
  ExcelFileInfo,
  getSheetData,
  SheetData
} from '@/lib/excel';

// 드래그 앤 드롭 관련 컴포넌트
import { DragAndDropProvider } from './DragAndDropProvider';
import { SourceFieldList } from './SourceFieldList';
import { TargetFieldList } from './TargetFieldList';
import { MappingConnection } from './MappingConnection';
import { DialogTrigger, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 필드 매퍼 컴포넌트 속성
interface FieldMapperProps {
  onMappingComplete?: () => void;
}

/**
 * 필드 매퍼 컴포넌트
 * 소스 필드와 타겟 필드 간의 매핑을 관리합니다.
 */
export default function FieldMapper({ onMappingComplete }: FieldMapperProps) {
  // 상태 관리
  const [files, setFiles] = useState<ExcelFileInfo[]>([]);
  const [mappingConfigs, setMappingConfigs] = useState<MappingConfig[]>([]);
  const [activeMappingConfig, setActiveMappingConfig] = useState<MappingConfig | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [addTargetDialogOpen, setAddTargetDialogOpen] = useState<boolean>(false);
  const [newTargetField, setNewTargetField] = useState<string>("");
  const [newTargetType, setNewTargetType] = useState<string>("string");
  
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
      
      // 첫 번째 필드맵이 있으면 활성화
      if (activeConfig.fieldMaps && activeConfig.fieldMaps.length > 0) {
        setActiveFieldId(activeConfig.fieldMaps[0].id);
      }
    } else if (configs.length > 0) {
      // 없으면 첫 번째 설정을 활성으로 설정
      setActiveMappingConfig(configs[0]);
      setActiveMappingConfigId(configs[0].id);
      console.log('첫 번째 매핑 설정으로 설정:', configs[0].name);
      
      // 첫 번째 필드맵이 있으면 활성화
      if (configs[0].fieldMaps && configs[0].fieldMaps.length > 0) {
        setActiveFieldId(configs[0].fieldMaps[0].id);
      }
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
  
  // 파일/시트 선택이 변경되면 필드 목록 업데이트
  useEffect(() => {
    const loadSheetData = async () => {
      if (!selectedFileId || !selectedSheet) {
        setSourceFields([]);
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
        } else {
          console.error('시트 데이터를 찾을 수 없습니다.');
          setSourceFields([]);
        }
      } catch (error) {
        console.error("시트 데이터 로드 오류:", error);
        setSourceFields([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSheetData();
  }, [selectedFileId, selectedSheet, files]);
  
  // 매핑 설정 변경 처리
  const handleConfigChange = (configId: string) => {
    const config = loadMappingConfigById(configId);
    if (config) {
      setActiveMappingConfig(config);
      setActiveMappingConfigId(configId);
      
      // 첫 번째 필드맵이 있으면 활성화
      if (config.fieldMaps && config.fieldMaps.length > 0) {
        setActiveFieldId(config.fieldMaps[0].id);
      } else {
        setActiveFieldId(null);
      }
    }
  };
  
  // 타겟 필드 추가 다이얼로그 핸들러
  const handleAddTargetField = () => {
    if (!activeMappingConfig) {
      toast.error('먼저 매핑 설정을 선택해주세요.');
      return;
    }
    
    if (!newTargetField.trim()) {
      toast.error('필드명을 입력해주세요.');
      return;
    }
    
    // 이미 존재하는 필드인지 확인
    const fieldExists = activeMappingConfig.fieldMaps.some(
      field => field.targetField.name.toLowerCase() === newTargetField.trim().toLowerCase()
    );
    
    if (fieldExists) {
      toast.error('이미 존재하는 필드명입니다.');
      return;
    }
    
    // 새 필드맵 생성
    const updatedConfig = { ...activeMappingConfig };
    const newFieldMap: FieldMap = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      targetField: {
        name: newTargetField.trim(),
        description: '',
        type: newTargetType
      },
      sourceFields: []
    };
    
    updatedConfig.fieldMaps.push(newFieldMap);
    updatedConfig.updated = Date.now();
    
    // 로컬 스토리지에 저장
    const configs = loadMappingConfigs().map(config => 
      config.id === updatedConfig.id ? updatedConfig : config
    );
    localStorage.setItem('excel_merger_mappings', JSON.stringify(configs));
    
    // 상태 업데이트
    setActiveMappingConfig(updatedConfig);
    setActiveFieldId(newFieldMap.id);
    setAddTargetDialogOpen(false);
    setNewTargetField('');
    setNewTargetType('string');
    
    toast.success('타겟 필드가 추가되었습니다.');
  };
  
  // 필드 매핑 업데이트 핸들러
  const handleMappingUpdated = () => {
    // 활성 매핑 설정 다시 로드
    const config = getActiveMappingConfig();
    if (config) {
      setActiveMappingConfig(config);
    }
  };
  
  // 필드 선택 핸들러
  const handleFieldSelect = (fieldId: string) => {
    setActiveFieldId(fieldId);
  };
  
  // 소스 필드 매핑 삭제 핸들러
  const handleDeleteSourceMapping = (targetFieldId: string, sourceFieldIndex: number) => {
    if (!activeMappingConfig) return;
    
    try {
      // 해당 타겟 필드맵 찾기
      const updatedConfig = { ...activeMappingConfig };
      const fieldMapIndex = updatedConfig.fieldMaps.findIndex(
        field => field.id === targetFieldId
      );
      
      if (fieldMapIndex === -1) {
        console.error(`타겟 필드를 찾을 수 없음: ${targetFieldId}`);
        return;
      }
      
      // 소스 필드 제거
      updatedConfig.fieldMaps[fieldMapIndex].sourceFields.splice(sourceFieldIndex, 1);
      updatedConfig.updated = Date.now();
      
      // 로컬 스토리지 업데이트
      const configs = loadMappingConfigs().map(config => 
        config.id === updatedConfig.id ? updatedConfig : config
      );
      localStorage.setItem('excel_merger_mappings', JSON.stringify(configs));
      
      // 상태 업데이트
      setActiveMappingConfig(updatedConfig);
      
      toast.success('필드 매핑이 제거되었습니다.');
    } catch (error) {
      console.error('필드 매핑 제거 오류:', error);
      toast.error('필드 매핑 제거 중 오류가 발생했습니다.');
    }
  };
  
  // 활성화된 필드맵 찾기
  const activeField = activeMappingConfig?.fieldMaps.find(
    field => field.id === activeFieldId
  ) || null;
  
  // 자동 매핑 실행
  const handleAutoMapping = async () => {
    if (!activeMappingConfig || !selectedFileId || !selectedSheet) {
      toast.error('매핑 설정, 파일, 시트를 먼저 선택해주세요.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 타겟 필드 목록 (매핑 설정의 타겟 필드명)
      const targetFields = activeMappingConfig.fieldMaps.map(map => map.targetField.name);
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
      
      // 자동 매핑 시작 - 기존 매핑을 초기화하고 새로 매핑
      if (window.confirm('자동 매핑을 실행하면 기존 매핑이 초기화됩니다. 계속하시겠습니까?')) {
        // 현재 매핑 설정 복제 및 초기화
        const updatedConfig = { ...activeMappingConfig };
        
        // 모든 필드맵의 소스 필드 초기화
        updatedConfig.fieldMaps.forEach(fieldMap => {
          fieldMap.sourceFields = [];
        });
        
        // 유사도 기반 자동 매핑 (임계값 0.6으로 설정)
        const mappings = findOptimalFieldMappings(sourceFields, targetFields, 0.6);
        console.log('생성된 매핑:', mappings);
        
        if (mappings.size === 0) {
          toast.error('유사한 필드를 찾을 수 없습니다.');
          setIsLoading(false);
          return;
        }
        
        let mappingCount = 0;
        
        // 매핑 적용 (각 소스 필드는 하나의 타겟 필드에만 매핑)
        const usedSourceFields = new Set<string>();
        
        for (const [sourceField, targetField] of mappings.entries()) {
          // 이미 사용된 소스 필드면 건너뜀 (1:1 매핑 보장)
          if (usedSourceFields.has(sourceField)) {
            continue;
          }
          
          // 해당 타겟 필드에 대한 필드맵 찾기
          const fieldMapIndex = updatedConfig.fieldMaps.findIndex(
            fieldMap => fieldMap.targetField.name === targetField
          );
          
          if (fieldMapIndex !== -1) {
            // 이미 매핑이 있는 경우, 소스 필드 추가
            const sourceFieldObj = {
              fileId: selectedFileId,
              sheetName: selectedSheet,
              fieldName: sourceField
            };
            
            // 소스 필드 추가 및 사용 표시
            updatedConfig.fieldMaps[fieldMapIndex].sourceFields.push(sourceFieldObj);
            usedSourceFields.add(sourceField);
            mappingCount++;
          }
        }
        
        // 매핑 설정 업데이트
        if (mappingCount > 0) {
          updatedConfig.updated = Date.now();
          
          // 로컬 스토리지에 매핑 설정 업데이트
          const updatedConfigs = loadMappingConfigs().map(config => 
            config.id === updatedConfig.id ? updatedConfig : config
          );
          localStorage.setItem('excel_merger_mappings', JSON.stringify(updatedConfigs));
          
          // 상태 업데이트
          setActiveMappingConfig(updatedConfig);
          
          toast.success(`자동 매핑 완료: ${mappingCount}개 필드가 매핑되었습니다.`);
        } else {
          toast.error('매핑할 수 있는 필드를 찾을 수 없습니다.');
        }
      } else {
        toast('자동 매핑이 취소되었습니다.');
      }
    } catch (error) {
      console.error("자동 매핑 오류:", error);
      toast.error('자동 매핑 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
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
        
        {/* 타겟 필드 추가 다이얼로그 */}
        <Dialog open={addTargetDialogOpen} onOpenChange={setAddTargetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>타겟 필드 추가</DialogTitle>
              <DialogDescription>
                새로운 타겟 필드를 추가합니다. 소스 필드를 매핑할 대상 필드입니다.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  필드명
                </Label>
                <Input
                  id="name"
                  value={newTargetField}
                  onChange={(e) => setNewTargetField(e.target.value)}
                  placeholder="예: 이름, 주소, 전화번호"
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  데이터 타입
                </Label>
                <Select
                  value={newTargetType}
                  onValueChange={setNewTargetType}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="데이터 타입 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">문자열</SelectItem>
                    <SelectItem value="number">숫자</SelectItem>
                    <SelectItem value="date">날짜</SelectItem>
                    <SelectItem value="boolean">불리언</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="submit" onClick={handleAddTargetField}>
                추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* 매핑 영역 */}
        <div className="relative">
          <DragAndDropProvider
            selectedFileId={selectedFileId}
            selectedSheet={selectedSheet}
            onMappingUpdated={handleMappingUpdated}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 소스 필드 목록 */}
              <SourceFieldList
                sourceFields={sourceFields}
                fileId={selectedFileId}
                sheetName={selectedSheet}
                onDragStart={() => setIsDragging(true)}
              />
              
              {/* 타겟 필드 목록 */}
              <TargetFieldList
                mappingConfig={activeMappingConfig}
                activeFieldId={activeFieldId}
                onFieldSelect={handleFieldSelect}
                onAddTarget={() => setAddTargetDialogOpen(true)}
                onDeleteSourceMapping={handleDeleteSourceMapping}
              />
              
              {/* 매핑 연결선 */}
              <MappingConnection
                activeField={activeField}
                isDragging={isDragging}
              />
            </div>
          </DragAndDropProvider>
        </div>
      </CardContent>
    </Card>
  );
} 