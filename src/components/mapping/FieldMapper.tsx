'use client';

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
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
import { Wand2, ArrowRight, RefreshCw, PlusCircle, Plus } from "lucide-react";
import { toast } from 'react-hot-toast';
import { combinedSimilarity, normalizeFieldName, findOptimalFieldMappings } from '@/lib/similarity';
import { validateMappingConfig } from '@/lib/validation';

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
  FieldMap,
  SourceField,
  cleanupMappingConfigs,
  saveMappingConfigToServer,
  suggestMappingsFromHistory
} from '@/lib/mapping';

// 엑셀 파일 관련 타입 및 함수
import {
  loadFileInfos,
  ExcelFileInfo,
  getSheetData,
  SheetData
} from '@/lib/excel';

// 드래그 앤 드롭 관련 컴포넌트
import { DragAndDropProvider, triggerMappingUpdated } from './DragAndDropProvider';
import { SourceFieldList } from './SourceFieldList';
import { TargetFieldList } from './TargetFieldList';
import { MappingConnection } from './MappingConnection';
import { DialogTrigger, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 필드 매퍼 컴포넌트 속성
interface FieldMapperProps {
  onMappingComplete?: (fileId: string, sheetName: string) => void;
}

// 로컬 스토리지 키
const REQUIRED_FIELDS_KEY = 'excel_merger_required_fields';

/**
 * 필수 필드 타입
 */
interface RequiredField {
  name: string;
  description?: string;
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
  const [filesMappingStatus, setFilesMappingStatus] = useState<Record<string, boolean>>({});

  // 매핑 설정 & 파일 로드
  useEffect(() => {
    // 처음 로드 시 매핑 설정 정리 실행
    cleanupMappingConfigs();
    
    // 매핑 설정 로드
    const configs = loadMappingConfigs();
    
    // 매핑 설정 필터링 - 유효하지 않은 형식의 필드맵 제거
    const validConfigs = configs.map(config => {
      // 유효한 필드맵만 필터링 (필드 ID가 이름으로 표시되는 문제 해결)
      const validFieldMaps = config.fieldMaps.filter(fieldMap => {
        // 타겟 필드 이름이 유효한지 확인 (id 형식이 아닌지)
        return fieldMap.targetField && 
               fieldMap.targetField.name &&
               !fieldMap.targetField.name.startsWith('field_') &&
               !fieldMap.targetField.name.startsWith('fieldmap_');
      });
      
      // 중복 필드맵 제거 (ID 기준)
      const uniqueFieldMaps: FieldMap[] = [];
      const fieldMapIds = new Set<string>();
      
      validFieldMaps.forEach(fieldMap => {
        if (!fieldMapIds.has(fieldMap.id)) {
          fieldMapIds.add(fieldMap.id);
          uniqueFieldMaps.push(fieldMap);
        }
      });
      
      return {
        ...config,
        fieldMaps: uniqueFieldMaps
      };
    });
    
    // 필터링된 설정을 저장
    if (JSON.stringify(configs) !== JSON.stringify(validConfigs)) {
      console.log('잘못된 필드맵 제거 후 매핑 설정 업데이트:', validConfigs);
      localStorage.setItem('excel_merger_mapping_configs', JSON.stringify(validConfigs));
    }
    
    setMappingConfigs(validConfigs);
    console.log('로드된 매핑 설정:', validConfigs.length, '개');

    // 활성 매핑 설정 찾기
    const activeConfig = getActiveMappingConfig();
    if (activeConfig) {
      // 유효한 필드맵만 필터링
      const validFieldMaps = activeConfig.fieldMaps.filter(fieldMap => {
        return fieldMap.targetField && 
               fieldMap.targetField.name &&
               !fieldMap.targetField.name.startsWith('field_') &&
               !fieldMap.targetField.name.startsWith('fieldmap_');
      });
      
      // 중복 필드맵 제거
      const uniqueFieldMaps: FieldMap[] = [];
      const fieldMapIds = new Set<string>();
      
      validFieldMaps.forEach(fieldMap => {
        if (!fieldMapIds.has(fieldMap.id)) {
          fieldMapIds.add(fieldMap.id);
          uniqueFieldMaps.push(fieldMap);
        }
      });
      
      const validActiveConfig = {
        ...activeConfig,
        fieldMaps: uniqueFieldMaps
      };
      
      setActiveMappingConfig(validActiveConfig);
      console.log('활성 매핑 설정:', validActiveConfig.name);

      // 첫 번째 필드맵이 있으면 활성화
      if (validActiveConfig.fieldMaps && validActiveConfig.fieldMaps.length > 0) {
        setActiveFieldId(validActiveConfig.fieldMaps[0].id);
      }
    } else if (validConfigs.length > 0) {
      // 없으면 첫 번째 설정을 활성으로 설정
      setActiveMappingConfig(validConfigs[0]);
      setActiveMappingConfigId(validConfigs[0].id);
      console.log('첫 번째 매핑 설정으로 설정:', validConfigs[0].name);

      // 첫 번째 필드맵이 있으면 활성화
      if (validConfigs[0].fieldMaps && validConfigs[0].fieldMaps.length > 0) {
        setActiveFieldId(validConfigs[0].fieldMaps[0].id);
      }
    }

    // 파일 정보 로드
    const fileInfos = loadFileInfos();
    console.log('로드된 파일 정보:', fileInfos);
    setFiles(fileInfos);
    
    // 파일별 매핑 상태 초기화
    const mappingStatus: Record<string, boolean> = {};
    fileInfos.forEach(file => {
      mappingStatus[file.id] = file.mappingCompleted || false;
    });
    setFilesMappingStatus(mappingStatus);

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

  // 파일의 매핑 완료 상태 업데이트 함수
  const updateFileMappingStatus = (fileId: string, completed: boolean) => {
    // 로컬 상태 업데이트
    setFilesMappingStatus(prev => ({
      ...prev,
      [fileId]: completed
    }));
    
    // 파일 정보 업데이트
    const fileInfos = loadFileInfos();
    const updatedFileInfos = fileInfos.map(file => {
      if (file.id === fileId) {
        return { ...file, mappingCompleted: completed };
      }
      return file;
    });
    
    // 로컬 스토리지에 저장
    localStorage.setItem('excel_file_infos', JSON.stringify(updatedFileInfos));
  };

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

  // 파일 선택 변경 처리 핸들러
  const handleFileChange = (fileId: string) => {
    // 파일이 동일하면 아무것도 하지 않음
    if (fileId === selectedFileId) return;
    
    // 파일 ID 변경
    setSelectedFileId(fileId);
    
    // 매핑 완료 상태 확인
    const isMappingCompleted = filesMappingStatus[fileId] || false;
    
    // 매핑 완료된 파일인 경우 알림 표시
    if (isMappingCompleted) {
      toast.success('이미 매핑이 완료된 파일입니다. 기존 매핑 정보가 로드됩니다.');
    }
    
    // 활성화된 매핑 설정의 필드맵 중에서 현재 선택된 파일에 관련된 것만 보여주는 로직은
    // 이미 TargetFieldList 컴포넌트에서 처리되므로 여기서는 따로 설정을 초기화하지 않음
  };

  // 매핑 설정 변경 처리
  const handleConfigChange = (configId: string) => {
    try {
      setIsLoading(true);
      
      // 로컬 스토리지에서 직접 로드
      const configs = JSON.parse(localStorage.getItem('excel_merger_mapping_configs') || '[]');
      const config = configs.find((cfg: MappingConfig) => cfg.id === configId);
      
      if (!config) {
        toast.error('선택한 매핑 설정을 찾을 수 없습니다.');
        return;
      }
      
      // 유효한 필드맵만 필터링
      const validFieldMaps = config.fieldMaps.filter((fieldMap: FieldMap) => 
        fieldMap.targetField && 
        fieldMap.targetField.name && 
        !fieldMap.targetField.name.startsWith('field_') &&
        !fieldMap.targetField.name.startsWith('fieldmap_')
      );
      
      // 중복 ID 제거
      const uniqueFieldMaps: FieldMap[] = [];
      const fieldMapIds = new Set<string>();
      
      validFieldMaps.forEach((fieldMap: FieldMap) => {
        if (!fieldMapIds.has(fieldMap.id)) {
          fieldMapIds.add(fieldMap.id);
          uniqueFieldMaps.push(fieldMap);
        }
      });
      
      const updatedConfig = {
        ...config,
        fieldMaps: uniqueFieldMaps
      };
      
      // 상태 업데이트
      setActiveMappingConfig(updatedConfig);
      setActiveMappingConfigId(configId);
      
      // 저장된 설정 업데이트
      if (JSON.stringify(config) !== JSON.stringify(updatedConfig)) {
        const updatedConfigs = configs.map((cfg: MappingConfig) => 
          cfg.id === configId ? updatedConfig : cfg
        );
        localStorage.setItem('excel_merger_mapping_configs', JSON.stringify(updatedConfigs));
      }

      // 첫 번째 필드맵이 있으면 활성화
      if (updatedConfig.fieldMaps && updatedConfig.fieldMaps.length > 0) {
        setActiveFieldId(updatedConfig.fieldMaps[0].id);
      } else {
        setActiveFieldId(null);
      }
      
      // 설정 변경 알림
      toast.success(`'${updatedConfig.name}' 매핑 설정이 로드되었습니다.`);
    } catch (error) {
      console.error('매핑 설정 변경 중 오류 발생:', error);
      toast.error('매핑 설정을 변경하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
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

    // 입력된 필드 이름이 유효한지 검사 (ID 형식이 아닌지)
    if (newTargetField.trim().startsWith('field_') || newTargetField.trim().startsWith('fieldmap_')) {
      toast.error('필드명은 "field_" 또는 "fieldmap_"으로 시작할 수 없습니다.');
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
      id: `fieldmap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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
    localStorage.setItem('excel_merger_mapping_configs', JSON.stringify(configs));

    // 상태 업데이트
    setActiveMappingConfig(updatedConfig);
    setActiveFieldId(newFieldMap.id);
    setAddTargetDialogOpen(false);
    setNewTargetField('');
    setNewTargetType('string');

    toast.success('타겟 필드가 추가되었습니다.');
  };

  // 매핑 업데이트 핸들러
  const handleMappingUpdated = () => {
    try {
      setIsLoading(true);
      
      // 현재 계속 작업 중인 드래그가 있는지 확인
      if (isDragging) {
        // 잠시 후 다시 시도
        setTimeout(() => handleMappingUpdated(), 100);
        return;
      }
      
      // 활성 매핑 설정 ID로 직접 로드
      const activeId = localStorage.getItem('excel_merger_active_mapping_config');
      if (!activeId) {
        setIsLoading(false);
        return;
      }
      
      console.log('매핑 업데이트 시작:', activeId);

      // 모든 설정을 로컬 스토리지에서 새로 로드
      const allConfigs = JSON.parse(localStorage.getItem('excel_merger_mapping_configs') || '[]');
      if (!allConfigs || !Array.isArray(allConfigs)) {
        setIsLoading(false);
        return;
      }
      
      // 활성 설정 찾기
      const config = allConfigs.find(cfg => cfg.id === activeId);
      if (!config) {
        setIsLoading(false);
        return;
      }
      
      console.log('찾은 설정:', config);
      console.log('필드맵 수:', config.fieldMaps.length);
      config.fieldMaps.forEach((fm: FieldMap, idx: number) => {
        console.log(`필드맵 ${idx+1}:`, fm.targetField.name, '소스필드:', fm.sourceFields.length);
      });
      
      // 유효한 필드맵만 필터링
      const validFieldMaps = config.fieldMaps.filter((fieldMap: FieldMap) => 
        fieldMap.targetField && 
        fieldMap.targetField.name && 
        !fieldMap.targetField.name.startsWith('field_') &&
        !fieldMap.targetField.name.startsWith('fieldmap_')
      );
      
      console.log('유효한 필드맵 수:', validFieldMaps.length);
      
      // 중복 ID 제거
      const uniqueFieldMaps: FieldMap[] = [];
      const fieldMapIds = new Set<string>();
      
      validFieldMaps.forEach((fieldMap: FieldMap) => {
        if (!fieldMapIds.has(fieldMap.id)) {
          fieldMapIds.add(fieldMap.id);
          uniqueFieldMaps.push(fieldMap);
        }
      });
      
      const updatedConfig = {
        ...config,
        fieldMaps: uniqueFieldMaps
      };
      
      console.log('최종 업데이트된 설정:', updatedConfig);
      console.log('최종 필드맵 수:', updatedConfig.fieldMaps.length);
      
      // 완전히 새 객체로 상태 업데이트 (참조 변경을 확실히 하기 위함)
      setActiveMappingConfig(JSON.parse(JSON.stringify(updatedConfig)));
      
      // 설정 목록도 업데이트
      const updatedConfigs = allConfigs.map(cfg => 
        cfg.id === updatedConfig.id ? updatedConfig : cfg
      );
      setMappingConfigs(updatedConfigs);
      
      // 상태 업데이트 후 1초 후에 UI 갱신 확인
      setTimeout(() => {
        console.log('상태 업데이트 후 필드맵 체크:', 
          activeMappingConfig?.fieldMaps.length, 
          '활성 필드:', activeFieldId
        );
      }, 1000);
      
      setIsLoading(false);
    } catch (error) {
      console.error('매핑 업데이트 중 오류 발생:', error);
      setIsLoading(false);
    }
  };

  // 필드 선택 핸들러
  const handleFieldSelect = (fieldId: string) => {
    setActiveFieldId(fieldId);
  };

  // 자동 매핑 실행
  const handleAutoMapping = async () => {
    if (!activeMappingConfig || !selectedFileId || !selectedSheet || sourceFields.length === 0) {
      toast.error('자동 매핑을 위한 정보가 부족합니다.');
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('자동 매핑 중...');

    try {
      // 디버깅 로그 추가
      console.log('자동 매핑 시작');
      console.log('타겟 필드:', activeMappingConfig.fieldMaps.map(fm => fm.targetField.name));
      console.log('소스 필드:', sourceFields);
      
      // 현재 설정 복제
      const updatedConfig = JSON.parse(JSON.stringify(activeMappingConfig)) as MappingConfig;

      // 매핑 카운터 초기화
      let mappingCount = 0;
      
      // 0단계: 다른 파일에서 매핑된 소스 필드 기반 자동 매핑
      console.log('0단계: 다른 파일 매핑 정보 활용 시작');
      for (const fieldMap of updatedConfig.fieldMaps) {
        // 이미 현재 파일/시트에 매핑된 경우 건너뛰기
        if (fieldMap.sourceFields.some(sf => sf.fileId === selectedFileId && sf.sheetName === selectedSheet)) {
          console.log(`필드 ${fieldMap.targetField.name}은(는) 이미 현재 파일에 매핑됨, 건너뜀`);
          continue;
        }
        
        // 다른 파일에서 매핑된 소스 필드명 추출
        const otherFileSourceFieldNames = fieldMap.sourceFields
          .filter(sf => sf.fileId !== selectedFileId || sf.sheetName !== selectedSheet)
          .map(sf => sf.fieldName);
        
        if (otherFileSourceFieldNames.length > 0) {
          console.log(`다른 파일 매핑 정보 발견: ${fieldMap.targetField.name} -> ${otherFileSourceFieldNames.join(', ')}`);
          
          // 현재 소스 필드에 동일한 이름이 있는지 확인
          for (const otherSourceField of otherFileSourceFieldNames) {
            // 대소문자 무시하고 비교하여 현재 소스 필드에서 일치하는 필드 찾기
            const matchingSourceField = sourceFields.find(
              sf => sf.toLowerCase() === otherSourceField.toLowerCase()
            );
            
            if (matchingSourceField) {
              // 동일한 이름의 소스 필드가 있으면 자동 매핑
              fieldMap.sourceFields.push({
                fileId: selectedFileId,
                sheetName: selectedSheet,
                fieldName: matchingSourceField
              });
              mappingCount++;
              console.log(`다른 파일 매핑 기반 자동 매핑 성공: ${fieldMap.targetField.name} -> ${matchingSourceField}`);
              break; // 첫 번째 일치하는 필드만 사용
            }
          }
        }
      }

      // 1단계: 이전 매핑 패턴 기반 자동 매핑 시도
      console.log('1단계: 이전 매핑 패턴 기반 자동 매핑 시작');
      const previousConfigs = loadMappingConfigs();
      
      let historySuggestions = new Map<string, string[]>();
      if (previousConfigs.length > 0) {
        historySuggestions = suggestMappingsFromHistory(sourceFields, previousConfigs);
        console.log('이전 패턴 기반 제안:', historySuggestions);
      }
      
      // 2단계: 필드 이름 유사도 기반 매핑
      console.log('2단계: 필드 이름 유사도 기반 매핑 시작');
      // 각 타겟 필드에 대해 가장 적합한 소스 필드 찾기
      const normalizedSourceFields = sourceFields.map(field => normalizeFieldName(field));
      console.log('정규화된 소스 필드:', normalizedSourceFields);
      
      let unmappedTargetFieldsCount = 0;

      for (const fieldMap of updatedConfig.fieldMaps) {
        // 이미 소스 필드가 있는 경우 건너뛰기
        if (fieldMap.sourceFields.some(sf => sf.fileId === selectedFileId && sf.sheetName === selectedSheet)) {
          console.log(`필드 ${fieldMap.targetField.name}은(는) 이미 매핑됨, 건너뜀`);
          continue;
        }
        
        unmappedTargetFieldsCount++;
        const normalizedTargetField = normalizeFieldName(fieldMap.targetField.name);
        console.log(`처리 중인 타겟 필드: ${fieldMap.targetField.name}, 정규화: ${normalizedTargetField}`);
        
        // 1. 이전 매핑 패턴에서 제안된 필드 확인
        const historyMatches = historySuggestions.get(fieldMap.targetField.name.toLowerCase());
        if (historyMatches && historyMatches.length > 0) {
          console.log(`이전 패턴 매칭 시도: ${fieldMap.targetField.name} -> ${historyMatches.join(', ')}`);
          // 이전 패턴에서 일치하는 필드 추가
          for (const matchedField of historyMatches) {
            if (sourceFields.includes(matchedField)) {
              const sourceField: SourceField = {
                fileId: selectedFileId,
                sheetName: selectedSheet,
                fieldName: matchedField
              };
              
              fieldMap.sourceFields.push(sourceField);
              mappingCount++;
              
              console.log(`이전 매핑 패턴 일치: ${fieldMap.targetField.name} -> ${matchedField} (성공)`);
              break; // 첫 번째 일치 항목만 사용
            }
          }
          
          // 이미 매핑된 경우 다음 필드맵으로
          if (fieldMap.sourceFields.some(sf => sf.fileId === selectedFileId && sf.sheetName === selectedSheet)) {
            continue;
          }
        }
        
        // 2. 유사도 기반 매핑
        // 정확한 일치 확인 (대소문자 무시)
        console.log(`정확한 일치 확인 중: "${normalizedTargetField}"`);
        
        // 방법 1: 정규화된 문자열로 정확한 일치 검사
        const exactMatchIndex = normalizedSourceFields.findIndex(
          normalizedSourceField => normalizedSourceField === normalizedTargetField
        );
        
        // 방법 2: 원본 문자열의 대소문자 무시 비교
        const caseInsensitiveMatchIndex = sourceFields.findIndex(
          sourceField => sourceField.toLowerCase() === fieldMap.targetField.name.toLowerCase()
        );
        
        // 둘 중 하나라도 일치하면 매핑
        if (exactMatchIndex !== -1 || caseInsensitiveMatchIndex !== -1) {
          // 우선순위: 대소문자 무시 일치 > 정규화된 일치
          const matchIndex = caseInsensitiveMatchIndex !== -1 ? caseInsensitiveMatchIndex : exactMatchIndex;
          const exactMatch = sourceFields[matchIndex];
          
          console.log(`일치 발견: ${fieldMap.targetField.name} -> ${exactMatch} (인덱스: ${matchIndex})`);
          console.log(`매치 방법: ${caseInsensitiveMatchIndex !== -1 ? '대소문자 무시 일치' : '정규화된 일치'}`);
          
          const sourceField: SourceField = {
            fileId: selectedFileId,
            sheetName: selectedSheet,
            fieldName: exactMatch
          };
          
          fieldMap.sourceFields.push(sourceField);
          mappingCount++;
          continue; // 정확한 일치가 있으면 다음 필드로
        } else {
          console.log(`정확한 일치 없음: ${fieldMap.targetField.name}`);
          
          // 모든 소스 필드와 타겟 필드 비교 디버깅
          sourceFields.forEach((sourceField, index) => {
            console.log(`비교: 소스 "${normalizeFieldName(sourceField)}" vs 타겟 "${normalizedTargetField}" - 일치 ${normalizeFieldName(sourceField) === normalizedTargetField ? '예' : '아니오'}`);
          });
        }

        // 유사도 기반 매핑 (정확한 일치가 없는 경우)
        const similarities = normalizedSourceFields.map((normalizedSourceField, index) => ({
          sourceField: sourceFields[index],
          similarity: combinedSimilarity(normalizedSourceField, normalizedTargetField)
        }));

        // 유사도 점수로 정렬
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        if (similarities.length > 0) {
          console.log(`유사도 결과 (상위 3개): ${similarities.slice(0, 3).map(s => `${s.sourceField}(${s.similarity.toFixed(2)})`).join(', ')}`);
        }

        // 가장 높은 유사도 필드 사용 (임계값 이상인 경우)
        if (similarities.length > 0 && similarities[0].similarity > 0.6) {
          const sourceField: SourceField = {
            fileId: selectedFileId,
            sheetName: selectedSheet,
            fieldName: similarities[0].sourceField
          };
          
          fieldMap.sourceFields.push(sourceField);
          mappingCount++;
          console.log(`유사도 기반 매핑: ${fieldMap.targetField.name} -> ${similarities[0].sourceField} (유사도: ${similarities[0].similarity.toFixed(2)})`);
        } else {
          console.log(`유사도 임계값(0.6) 이상의 매칭 없음: ${fieldMap.targetField.name}`);
        }
      }

      // 3단계: 최적 매핑 알고리즘 적용
      console.log('3단계: 최적 매핑 알고리즘 적용 시작');
      // 아직 매핑되지 않은 필드에 대해 최적의 매핑 찾기
      const unmappedTargetFields = updatedConfig.fieldMaps
        .filter(fieldMap => !fieldMap.sourceFields.some(sf => sf.fileId === selectedFileId && sf.sheetName === selectedSheet))
        .map(fieldMap => fieldMap.targetField.name);

      if (unmappedTargetFields.length > 0) {
        console.log(`매핑되지 않은 타겟 필드 ${unmappedTargetFields.length}개:`, unmappedTargetFields);
        
        // 이미 매핑된 소스 필드 제외
        const availableSourceFields = sourceFields.filter(sourceField => {
          // 이미 매핑된 소스 필드 제외
          const isAlreadyMapped = updatedConfig.fieldMaps.some(fieldMap => 
            fieldMap.sourceFields.some(sf => 
              sf.fileId === selectedFileId && 
              sf.sheetName === selectedSheet && 
              sf.fieldName === sourceField
            )
          );
          return !isAlreadyMapped;
        });
        
        console.log(`사용 가능한 소스 필드 ${availableSourceFields.length}개:`, availableSourceFields);
        
        const optimalMappings = findOptimalFieldMappings(
          unmappedTargetFields, 
          availableSourceFields
        );

        // 최적 매핑 적용
        for (const [targetField, sourceField] of Object.entries(optimalMappings)) {
          if (sourceField) {
            const fieldMap = updatedConfig.fieldMaps.find(
              fm => fm.targetField.name === targetField && 
                   !fm.sourceFields.some(sf => sf.fileId === selectedFileId && sf.sheetName === selectedSheet)
            );
            
            if (fieldMap) {
              fieldMap.sourceFields.push({
                fileId: selectedFileId,
                sheetName: selectedSheet,
                fieldName: sourceField
              });
              mappingCount++;
              console.log(`최적 매핑 알고리즘 적용: ${targetField} -> ${sourceField}`);
            }
          }
        }
      }

      // 매핑 결과 요약
      console.log(`자동 매핑 완료: ${mappingCount}개의 필드가 매핑됨 (총 ${updatedConfig.fieldMaps.length}개 중)`);
      
      // 실시간 UI 업데이트를 위한 상태 갱신 및 매핑 업데이트 이벤트 트리거
      updatedConfig.updated = Date.now(); // 타임스탬프 업데이트
      
      // 즉시 로컬 스토리지 업데이트
      saveMappingConfig(updatedConfig);
      
      // 상태 업데이트 전에 잠시 대기하여 로컬 스토리지 쓰기 완료 보장
      setTimeout(() => {
        // UI 상태 업데이트 (깊은 복사를 통해 참조 문제 방지)
        setActiveMappingConfig(JSON.parse(JSON.stringify(updatedConfig)));
        
        // 매핑 업데이트 이벤트 트리거 - UI 갱신을 위해 이 부분이 중요
        setTimeout(() => {
          triggerMappingUpdated(); // 첫 번째 트리거
          
          // 추가 안전장치: 브라우저 렌더링 보장을 위해 두 번째 트리거
          setTimeout(() => {
            triggerMappingUpdated(); // 두 번째 트리거 - 소스 필드 색상이 확실히 표시되도록
          }, 50);
        }, 10);
        
        // 토스트 메시지 표시
        toast.dismiss(toastId);
        if (mappingCount > 0) {
          toast.success(`${mappingCount}개의 필드가 자동 매핑되었습니다.`);
        } else {
          toast.success('매핑할 수 있는 필드를 찾지 못했습니다.');
        }
        
        // 매핑 완료 여부 자동 확인
        checkMappingCompletion(updatedConfig);
        
        // 로딩 상태 해제
        setIsLoading(false);
      }, 50);
    } catch (error) {
      console.error('자동 매핑 중 오류:', error);
      toast.error('자동 매핑 중 오류가 발생했습니다.');
      toast.dismiss(toastId);
      setIsLoading(false);
    }
  };
  
  // 매핑 완료 여부 자동 확인 함수
  const checkMappingCompletion = useCallback((config: MappingConfig) => {
    if (!selectedFileId || !selectedSheet) return;
    
    // 필수 필드 목록 가져오기
    const requiredFieldNames = getRequiredFieldNames();
    
    // 모든 필드 매핑 여부 확인
    const allFieldsMapped = checkAllFieldsMapped(config, selectedFileId, selectedSheet);
    
    // 필수 필드 매핑 여부 확인
    let requiredFieldsMapped = true;
    if (requiredFieldNames.length > 0) {
      const missingRequiredFields = requiredFieldNames.filter(requiredName => {
        // 해당 이름을 가진 타겟 필드 찾기
        const targetField = config.fieldMaps.find(
          fm => fm.targetField.name.toLowerCase() === requiredName.toLowerCase()
        );
        
        // 필수 필드가 현재 선택된 파일/시트에 매핑되었는지 확인
        return !targetField || !targetField.sourceFields.some(
          sf => sf.fileId === selectedFileId && sf.sheetName === selectedSheet
        );
      });
      
      requiredFieldsMapped = missingRequiredFields.length === 0;
      
      if (!requiredFieldsMapped) {
        console.log('미매핑된 필수 필드:', missingRequiredFields);
      }
    }
    
    // 매핑 완료 상태 업데이트
    updateFileMappingStatus(selectedFileId, allFieldsMapped);
    
    // 매핑 완료되면 알림 표시
    if (allFieldsMapped) {
      if (requiredFieldsMapped) {
        toast.success('모든 필드 매핑이 완료되었습니다!');
      } else {
        toast.error('모든 필드가 매핑되었지만, 일부 필수 필드가 누락되었습니다.');
      }
    }
    
    return { allFieldsMapped, requiredFieldsMapped };
  }, [selectedFileId, selectedSheet]);
  
  // 소스 필드가 추가되거나 제거될 때마다 매핑 완료 여부 확인
  useEffect(() => {
    if (activeMappingConfig && selectedFileId && selectedSheet) {
      checkMappingCompletion(activeMappingConfig);
    }
  }, [activeMappingConfig, selectedFileId, selectedSheet, checkMappingCompletion]);
  
  // 매핑 완료 처리 (버튼 클릭 시)
  const handleCleanupMapping = async () => {
    if (!activeMappingConfig || !selectedFileId || !selectedSheet) return;
    
    try {
      // 필수 필드 검증
      const requiredFieldNames = getRequiredFieldNames();
      const { allFieldsMapped, requiredFieldsMapped } = checkMappingCompletion(activeMappingConfig) || 
        { allFieldsMapped: false, requiredFieldsMapped: false };
      
      // 필수 필드가 누락된 경우 경고 표시
      if (!requiredFieldsMapped && requiredFieldNames.length > 0) {
        // 사용자 확인 요청
        const confirmed = window.confirm(
          `일부 필수 필드가 매핑되지 않았습니다. 그래도 계속 진행하시겠습니까?\n\n` +
          `매핑이 필요한 필수 필드: ${requiredFieldNames.join(', ')}`
        );
        
        if (!confirmed) {
          return; // 사용자가 취소함
        }
      }
      
      // 매핑 설정 업데이트
      const updatedConfig = { ...activeMappingConfig };
      updatedConfig.updated = Date.now();
      
      // 로컬 스토리지 업데이트
      saveMappingConfig(updatedConfig);
      
      // 서버에 저장 (API가 구현된 경우)
      await saveMappingConfigToServer(updatedConfig);
      
      // 메시지 표시
      toast.success(`매핑 설정 "${updatedConfig.name}"이(가) 저장되었습니다.`);
      
      // 매핑 완료 상태 설정 (이미 checkMappingCompletion에서 처리됨)
      
      // 매핑 완료 콜백 호출
      if (onMappingComplete) {
        onMappingComplete(selectedFileId, selectedSheet);
      }
    } catch (error) {
      console.error('매핑 완료 처리 중 오류:', error);
      toast.error('매핑 완료 처리 중 오류가 발생했습니다.');
    }
  };

  // 필수 필드 설정 가져오기
  const getRequiredFieldNames = (): string[] => {
    try {
      const configJson = localStorage.getItem(REQUIRED_FIELDS_KEY);
      if (configJson) {
        const config = JSON.parse(configJson);
        if (config && config.fields && Array.isArray(config.fields)) {
          return config.fields.map((field: RequiredField) => field.name);
        }
      }
    } catch (error) {
      console.error('필수 필드 설정을 로드하는 중 오류 발생:', error);
    }
    return [];
  };

  // 소스 필드 매핑 삭제 핸들러
  const handleDeleteSourceMapping = (
    targetFieldId: string,
    sourceFileId: string,
    sourceFieldName: string,
    sourceSheetName: string
  ) => {
    if (!activeMappingConfig) return;

    try {
      // 매핑 설정 사본 생성 (깊은 복사)
      const updatedConfig = JSON.parse(JSON.stringify(activeMappingConfig)) as MappingConfig;
      
      // 해당 타겟 필드맵 찾기
      const fieldMapIndex = updatedConfig.fieldMaps.findIndex(
        field => field.id === targetFieldId
      );

      if (fieldMapIndex === -1) {
        console.error(`타겟 필드를 찾을 수 없음: ${targetFieldId}`);
        return;
      }

      // 소스 필드 인덱스 찾기
      const sourceFieldIndex = updatedConfig.fieldMaps[fieldMapIndex].sourceFields.findIndex(
        sf => sf.fileId === sourceFileId && sf.fieldName === sourceFieldName && sf.sheetName === sourceSheetName
      );

      if (sourceFieldIndex === -1) {
        console.error(`소스 필드를 찾을 수 없음: ${sourceFieldName}`);
        return;
      }
      
      // 삭제할 소스 필드의 정보 저장
      const sourceField = updatedConfig.fieldMaps[fieldMapIndex].sourceFields[sourceFieldIndex];
      const sourceName = sourceField ? sourceField.fieldName : '알 수 없는 필드';
      
      // 소스 필드 제거
      updatedConfig.fieldMaps[fieldMapIndex].sourceFields.splice(sourceFieldIndex, 1);
      updatedConfig.updated = Date.now();

      // 로컬 스토리지 직접 업데이트
      const allConfigs = loadMappingConfigs();
      const configIndex = allConfigs.findIndex(config => config.id === updatedConfig.id);
      
      if (configIndex !== -1) {
        allConfigs[configIndex] = updatedConfig;
        localStorage.setItem('excel_merger_mapping_configs', JSON.stringify(allConfigs));
        
        // 상태 업데이트 (깊은 복사로 참조 문제 해결)
        setActiveMappingConfig(updatedConfig);
        
        // 해당 파일의 매핑 완료 상태 업데이트
        if (sourceField.fileId === selectedFileId && sourceField.sheetName === selectedSheet) {
          // 모든 타겟 필드에 현재 선택된 파일/시트의 소스 필드가 매핑되었는지 확인
          const allFieldsMapped = checkAllFieldsMapped(updatedConfig, sourceField.fileId, sourceField.sheetName);
          // 완료 상태 업데이트
          updateFileMappingStatus(sourceField.fileId, allFieldsMapped);
        }
        
        // 매핑 업데이트 이벤트 트리거
        triggerMappingUpdated();
        
        toast.success(`${sourceName} 필드 매핑이 제거되었습니다.`);
      } else {
        toast.error('매핑 설정을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('소스 필드 매핑 삭제 중 오류:', error);
      toast.error('소스 필드 매핑 삭제 중 오류가 발생했습니다.');
    }
  };

  // 선택된 파일/시트에 대해 모든 타겟 필드가 매핑되었는지 확인
  const checkAllFieldsMapped = (mappingConfig: MappingConfig, fileId: string, sheetName: string): boolean => {
    if (!mappingConfig || !fileId || !sheetName) return false;

    // 매핑 설정의 모든 타겟 필드가 현재 파일/시트에 매핑되었는지 확인
    return mappingConfig.fieldMaps.every(fieldMap => 
      fieldMap.sourceFields.some(sf => sf.fileId === fileId && sf.sheetName === sheetName)
    );
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>필드 매핑</CardTitle>
            <CardDescription>
              Excel 파일의 필드를 원하는 형식으로 매핑하세요
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {activeMappingConfig && (
              <div className="text-sm bg-secondary text-secondary-foreground px-3 py-1 rounded-md">
                {activeMappingConfig.name}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanupMapping}
              disabled={!activeMappingConfig}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              매핑 완료
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 필터 영역 */}
        <div className="p-4 border rounded-lg bg-muted/10">
          <div className="text-sm font-medium mb-2 flex items-center">
            <span>소스 파일 선택</span>
            {isLoading && <RefreshCw className="h-3 w-3 ml-2 animate-spin text-muted-foreground" />}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 파일 선택 */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">파일</label>
              <Select
                value={selectedFileId}
                onValueChange={handleFileChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="파일 선택" />
                </SelectTrigger>
                <SelectContent>
                  {files.map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{file.name}</span>
                        {filesMappingStatus[file.id] && (
                          <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                            매핑완료
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 시트 선택 */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">시트</label>
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

            {/* 자동 매핑 버튼 */}
            <div className="flex items-end">
              <Button
                onClick={() => handleAutoMapping()}
                disabled={!activeMappingConfig || !selectedFileId || !selectedSheet || isLoading}
                className="gap-2 w-full"
                variant="secondary"
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
        </div>

        {/* 매핑 영역 */}
        <div className="relative">
          <DragAndDropProvider
            selectedFileId={selectedFileId}
            selectedSheet={selectedSheet}
            onMappingUpdated={handleMappingUpdated}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-300px)] min-h-[500px]">
              {/* 소스 필드 목록 */}
              <div className="h-full overflow-hidden flex flex-col border rounded-lg">
                <div className="p-3 bg-muted/30 border-b">
                  <h3 className="text-sm font-medium">소스 필드</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedFileId && selectedSheet ? 
                      `${files.find(f => f.id === selectedFileId)?.name || selectedFileId} / ${selectedSheet}` : 
                      '파일과 시트를 선택하세요'}
                  </p>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  <SourceFieldList
                    sourceFields={sourceFields}
                    fileId={selectedFileId}
                    sheetName={selectedSheet}
                    onDragStart={() => setIsDragging(true)}
                  />
                </div>
              </div>

              {/* 타겟 필드 목록 */}
              <div className="h-full overflow-hidden flex flex-col border rounded-lg">
                <div className="p-3 bg-muted/30 border-b flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-medium">타겟 필드</h3>
                    <p className="text-xs text-muted-foreground">
                      {activeMappingConfig?.name || '매핑 설정을 선택하세요'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setAddTargetDialogOpen(true)}>
                    <Plus className="h-3 w-3 mr-1" />
                    필드 추가
                  </Button>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  <TargetFieldList
                    mappingConfig={activeMappingConfig}
                    activeFieldId={activeFieldId}
                    onFieldSelect={handleFieldSelect}
                    onAddTarget={() => setAddTargetDialogOpen(true)}
                    onDeleteSourceMapping={handleDeleteSourceMapping}
                    selectedFileId={selectedFileId}
                    selectedSheet={selectedSheet}
                  />
                </div>
              </div>

              {/* 매핑 연결선 */}
              <MappingConnection
                activeField={activeMappingConfig?.fieldMaps.find(fm => fm.id === activeFieldId) || null}
                isDragging={isDragging}
              />
            </div>
          </DragAndDropProvider>
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
      </CardContent>
    </Card>
  );
} 