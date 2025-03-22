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
import { Wand2, ArrowRight, RefreshCw, PlusCircle, Plus } from "lucide-react";
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
  FieldMap,
  SourceField,
  cleanupMappingConfigs
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

  // 자동 매핑 후 매핑 설정 업데이트
  const updateMappingAfterAutoMapping = (updatedConfig: MappingConfig, mappingCount: number) => {
    try {
      // 로컬 스토리지에 매핑 설정 업데이트
      const updatedConfigs = loadMappingConfigs().map(config =>
        config.id === updatedConfig.id ? updatedConfig : config
      );
      localStorage.setItem('excel_merger_mapping_configs', JSON.stringify(updatedConfigs));

      // 상태 업데이트
      setActiveMappingConfig(updatedConfig);
      
      // 매핑 이벤트 트리거 - 자동 매핑 후 소스 필드에 색상 표시
      triggerMappingUpdated();

      toast.success(`자동 매핑 완료: ${mappingCount}개 필드가 매핑되었습니다.`);
    } catch (error) {
      console.error('자동 매핑 설정 업데이트 오류:', error);
      toast.error('매핑 설정 업데이트 중 오류가 발생했습니다.');
    }
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
      // 타겟 필드 목록 (매핑 설정의 타겟 필드명 중 아직 매핑되지 않은 것만)
      const unmappedTargetFields: string[] = [];
      const mappedTargetFields: string[] = [];
      
      // 먼저 활성 매핑 설정에서 유효하지 않은 필드 제거
      const validFieldMaps = activeMappingConfig.fieldMaps.filter(fieldMap => {
        return fieldMap.targetField && 
               fieldMap.targetField.name && 
               !fieldMap.targetField.name.startsWith('field_') &&
               !fieldMap.targetField.name.startsWith('fieldmap_');
      });
      
      // 매핑된 필드와 매핑되지 않은 필드 분류
      validFieldMaps.forEach(map => {
        if (map.sourceFields.length === 0) {
          unmappedTargetFields.push(map.targetField.name);
        } else {
          mappedTargetFields.push(map.targetField.name);
        }
      });
      
      if (unmappedTargetFields.length === 0) {
        toast.success('모든 타겟 필드가 이미 매핑되어 있습니다.');
        setIsLoading(false);
        return;
      }
      
      console.log('매핑되지 않은 타겟 필드:', unmappedTargetFields);
      console.log('이미 매핑된 타겟 필드:', mappedTargetFields);

      // 소스 필드가 없으면 다시 한번 로드 시도
      let currentSourceFields = [...sourceFields];
      if (currentSourceFields.length === 0) {
        console.log('소스 필드 다시 로드 시도');
        try {
          const sheetData = await getSheetData(selectedFileId, selectedSheet);
          console.log('자동 매핑 중 로드된 시트 데이터:', sheetData);

          if (sheetData && sheetData.headers && sheetData.headers.length > 0) {
            currentSourceFields = sheetData.headers;
            setSourceFields(currentSourceFields);
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
      
      // 이미 사용된 소스 필드 목록 (1:1 매핑을 위해 이미 사용중인 소스 필드 추적)
      const usedSourceFields = new Set<string>();
      
      // 이미 매핑된 소스 필드 목록 생성
      validFieldMaps.forEach(map => {
        map.sourceFields.forEach(sf => {
          if (sf.fileId === selectedFileId && sf.sheetName === selectedSheet) {
            usedSourceFields.add(sf.fieldName);
          }
        });
      });
      
      console.log('이미 사용된 소스 필드:', Array.from(usedSourceFields));
      
      // 자동 매핑 시작 - 사용자에게 확인
      const confirmMessage = '비어있는 타겟 필드에 대해 자동 매핑을 실행하시겠습니까? 이미 매핑된 필드는 변경되지 않습니다.';
        
      if (window.confirm(confirmMessage)) {
        // 현재 매핑 설정 깊은 복사
        const updatedConfig = JSON.parse(JSON.stringify(activeMappingConfig)) as MappingConfig;
        
        // 잘못된 필드맵 제거 (ID가 이름으로 사용된 경우)
        updatedConfig.fieldMaps = updatedConfig.fieldMaps.filter((fieldMap: FieldMap) => {
          return fieldMap.targetField && 
                 fieldMap.targetField.name && 
                 !fieldMap.targetField.name.startsWith('field_') &&
                 !fieldMap.targetField.name.startsWith('fieldmap_');
        });
        
        // 중복 필드맵 제거 (ID 기준)
        const uniqueFieldMaps: FieldMap[] = [];
        const fieldMapIds = new Set<string>();
        
        updatedConfig.fieldMaps.forEach((fieldMap: FieldMap) => {
          if (!fieldMapIds.has(fieldMap.id)) {
            fieldMapIds.add(fieldMap.id);
            uniqueFieldMaps.push(fieldMap);
          }
        });
        
        updatedConfig.fieldMaps = uniqueFieldMaps;
        
        // 유사도 기반 자동 매핑 (임계값 0.6으로 설정)
        const mappings = findOptimalFieldMappings(
          currentSourceFields.filter(sf => !usedSourceFields.has(sf)), // 이미 사용되지 않은 소스 필드만
          unmappedTargetFields, // 매핑되지 않은 타겟 필드만
          0.6
        );
        
        console.log('생성된 매핑:', mappings);

        if (mappings.size === 0) {
          toast.error('유사한 필드를 찾을 수 없습니다.');
          setIsLoading(false);
          return;
        }

        let mappingCount = 0;

        // 매핑된 소스 필드와 타겟 필드를 추적
        const newlyMappedTargetFields = new Set<string>();
        const newlyMappedSourceFields = new Set<string>();

        // Map 객체를 배열로 변환하여 정렬
        const sortedMappings = Array.from(mappings.entries());
        
        // 매핑 점수 별로 정렬 (내림차순 - 가장 유사한 항목부터)
        sortedMappings.sort((a, b) => {
          const scoreA = combinedSimilarity(a[0], a[1]);
          const scoreB = combinedSimilarity(b[0], b[1]);
          return scoreB - scoreA;
        });
        
        console.log('정렬된 매핑:', sortedMappings);

        // 정렬된 매핑 적용 (각 소스 필드는 하나의 타겟 필드에만 매핑)
        for (const [sourceField, targetField] of sortedMappings) {
          // 이미 사용된 소스 필드거나 타겟 필드면 건너뜀 (1:1 매핑 보장)
          if (newlyMappedSourceFields.has(sourceField) || 
              newlyMappedTargetFields.has(targetField) || 
              usedSourceFields.has(sourceField)) {
            continue;
          }

          // 해당 타겟 필드에 대한 필드맵 찾기
          const fieldMapIndex = updatedConfig.fieldMaps.findIndex(
            (fieldMap: FieldMap) => fieldMap.targetField.name === targetField
          );

          if (fieldMapIndex !== -1) {
            // 해당 타겟 필드에 이 소스 필드가 이미 매핑되어 있는지 확인
            const existingFieldIndex = updatedConfig.fieldMaps[fieldMapIndex].sourceFields.findIndex(
              (sf: SourceField) => sf.fileId === selectedFileId && sf.sheetName === selectedSheet && sf.fieldName === sourceField
            );
            
            // 이미 존재하면 건너뜀
            if (existingFieldIndex !== -1) {
              continue;
            }
            
            // 소스 필드 추가
            const sourceFieldObj: SourceField = {
              fileId: selectedFileId,
              sheetName: selectedSheet,
              fieldName: sourceField
            };

            // 기존 소스 필드 유지하면서 새 소스 필드 추가
            updatedConfig.fieldMaps[fieldMapIndex].sourceFields.push(sourceFieldObj);
            newlyMappedSourceFields.add(sourceField);
            newlyMappedTargetFields.add(targetField);
            mappingCount++;
          }
        }

        // 매핑 설정 업데이트
        if (mappingCount > 0) {
          updatedConfig.updated = Date.now();
          
          // 최종 검사: 잘못된 필드맵 제거
          updatedConfig.fieldMaps = updatedConfig.fieldMaps.filter((fieldMap: FieldMap) => {
            return fieldMap.targetField && 
                  fieldMap.targetField.name && 
                  !fieldMap.targetField.name.startsWith('field_') &&
                  !fieldMap.targetField.name.startsWith('fieldmap_');
          });
          
          // 중복 필드맵 제거 (ID 기준) - 최종 확인
          const finalUniqueFieldMaps: FieldMap[] = [];
          const finalFieldMapIds = new Set<string>();
          
          updatedConfig.fieldMaps.forEach((fieldMap: FieldMap) => {
            if (!finalFieldMapIds.has(fieldMap.id)) {
              finalFieldMapIds.add(fieldMap.id);
              finalUniqueFieldMaps.push(fieldMap);
            }
          });
          
          updatedConfig.fieldMaps = finalUniqueFieldMaps;

          // 매핑 설정 업데이트 함수 호출
          updateMappingAfterAutoMapping(updatedConfig, mappingCount);
        } else {
          toast.error('추가로 매핑할 수 있는 필드를 찾을 수 없습니다.');
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

  // 매핑 정리 및 재설정
  const handleCleanupMapping = () => {
    if (!activeMappingConfig) {
      toast.error('매핑 설정이 없습니다.');
      return;
    }

    try {
      // 현재 매핑 설정에서 잘못된 형식의 필드맵 정리
      const updatedConfig = { ...activeMappingConfig };
      
      // 유효한 필드맵만 필터링
      const validFieldMaps = updatedConfig.fieldMaps.filter(fieldMap => {
        return fieldMap.targetField && 
               fieldMap.targetField.name && 
               !fieldMap.targetField.name.startsWith('field_') &&
               !fieldMap.targetField.name.startsWith('fieldmap_');
      });
      
      // 중복 ID 제거
      const uniqueFieldMaps: FieldMap[] = [];
      const fieldMapIds = new Set<string>();
      
      validFieldMaps.forEach(fieldMap => {
        if (!fieldMapIds.has(fieldMap.id)) {
          fieldMapIds.add(fieldMap.id);
          uniqueFieldMaps.push(fieldMap);
        }
      });
      
      updatedConfig.fieldMaps = uniqueFieldMaps;
      updatedConfig.updated = Date.now();
      
      // 로컬 스토리지에 저장
      const allConfigs = loadMappingConfigs();
      const configIndex = allConfigs.findIndex(config => config.id === updatedConfig.id);
      
      if (configIndex !== -1) {
        allConfigs[configIndex] = updatedConfig;
        localStorage.setItem('excel_merger_mapping_configs', JSON.stringify(allConfigs));
        
        // 상태 업데이트
        setActiveMappingConfig(updatedConfig);
        
        // 매핑 업데이트 이벤트 트리거
        triggerMappingUpdated();
        
        // 첫 번째 필드맵이 있으면 활성화
        if (updatedConfig.fieldMaps.length > 0) {
          setActiveFieldId(updatedConfig.fieldMaps[0].id);
        } else {
          setActiveFieldId(null);
        }
        
        toast.success('매핑 설정이 정리되었습니다.');
      } else {
        toast.error('매핑 설정을 업데이트할 수 없습니다.');
      }
    } catch (error) {
      console.error('매핑 정리 중 오류 발생:', error);
      toast.error('매핑 정리 중 오류가 발생했습니다.');
    }
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
                onValueChange={setSelectedFileId}
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
                onClick={handleAutoMapping}
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
                  />
                </div>
              </div>

              {/* 매핑 연결선 */}
              <MappingConnection
                activeField={activeField}
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