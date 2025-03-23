"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Droppable } from '@hello-pangea/dnd';
import { Trash2, Plus, ArrowUpDown, PlusCircle, XCircle, X, AlertCircle } from 'lucide-react';
import { MappingConfig, FieldMap } from '@/lib/mapping';
import { toast } from 'react-hot-toast';
import { triggerMappingUpdated } from './DragAndDropProvider';
import { validateFieldMap } from '@/lib/validation';
import { ValidationIndicator } from './ValidationIndicator';
import { DraggableFieldTarget } from './DraggableFieldTarget';

// 매핑 이벤트 이름 (DragAndDropProvider.tsx와 일치해야 함)
const MAPPING_UPDATED_EVENT = 'mappingUpdated';

// 로컬 스토리지 키
const REQUIRED_FIELDS_KEY = 'excel_merger_required_fields';

/**
 * 필수 필드 타입
 */
interface RequiredField {
  name: string;
  description?: string;
}

interface TargetFieldListProps {
  mappingConfig: MappingConfig | null;
  activeFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
  onAddTarget: () => void;
  onDeleteSourceMapping: (
    targetFieldId: string, 
    sourceFileId: string, 
    sourceFieldName: string,
    sourceSheetName: string
  ) => void;
  selectedFileId?: string;  // 선택된 파일 ID
  selectedSheet?: string;   // 선택된 시트 이름
}

/**
 * 타겟 필드 목록 컴포넌트
 * 매핑 설정의 타겟 필드 목록을 표시하고, 드롭 영역을 제공합니다.
 */
export function TargetFieldList({
  mappingConfig,
  activeFieldId,
  onFieldSelect,
  onAddTarget,
  onDeleteSourceMapping,
  selectedFileId,
  selectedSheet
}: TargetFieldListProps) {
  // 디버깅을 위한 로깅
  useEffect(() => {
    if (mappingConfig) {
      console.log('타겟 필드 리스트 - 매핑 설정:', mappingConfig);
      mappingConfig.fieldMaps.forEach(field => {
        if (field.sourceFields && field.sourceFields.length > 0) {
          console.log(`타겟 필드 ${field.targetField.name}(${field.id})의 소스 필드:`, field.sourceFields);
        }
      });
    }
  }, [mappingConfig]);

  // 필드맵 필터링 - ID가 이름으로 표시되는 문제 해결
  const validFieldMaps = useMemo(() => {
    if (!mappingConfig) return [];
    
    return mappingConfig.fieldMaps.filter(field => 
      field.targetField && 
      field.targetField.name && 
      !field.targetField.name.startsWith('field_') &&
      !field.targetField.name.startsWith('fieldmap_')
    );
  }, [mappingConfig]);

  // 타겟 필드 매핑 데이터를 로컬 상태로 관리
  const [localTargetFields, setLocalTargetFields] = useState<FieldMap[]>(validFieldMaps);

  // props로 전달된 targetFields가 변경될 때 로컬 상태 업데이트
  useEffect(() => {
    setLocalTargetFields(validFieldMaps);
  }, [validFieldMaps]);

  // 매핑 업데이트 이벤트 리스너 등록
  useEffect(() => {
    // 매핑 업데이트 이벤트 핸들러
    const handleMappingUpdated = () => {
      console.log('TargetFieldList: 매핑 업데이트 이벤트 감지됨');
      // 매핑 데이터가 업데이트되면 localTargetFields는 props로부터 업데이트됨
    };
    
    // 이벤트 리스너 등록
    window.addEventListener(MAPPING_UPDATED_EVENT, handleMappingUpdated);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener(MAPPING_UPDATED_EVENT, handleMappingUpdated);
    };
  }, []);

  // 소스 필드 삭제 핸들러 (트리거 이벤트 추가)
  const deleteSourceMapping = useCallback((
    targetFieldId: string,
    sourceFileId: string,
    sourceFieldName: string,
    sourceSheetName: string
  ) => {
    console.log('소스 필드 매핑 삭제:', {
      targetFieldId,
      sourceFileId,
      sourceFieldName,
      sourceSheetName
    });
    
    onDeleteSourceMapping(targetFieldId, sourceFileId, sourceFieldName, sourceSheetName);
    
    // 매핑 업데이트 이벤트 트리거 - 변경 사항이 화면에 즉시 반영되도록 함
    triggerMappingUpdated();
  }, [onDeleteSourceMapping]);

  // 필수 필드 목록
  const [requiredFields, setRequiredFields] = useState<string[]>([]);

  // 필수 필드 설정 로드
  useEffect(() => {
    try {
      const configJson = localStorage.getItem(REQUIRED_FIELDS_KEY);
      if (configJson) {
        const config = JSON.parse(configJson);
        if (config && config.fields && Array.isArray(config.fields)) {
          const fieldNames = config.fields.map((field: RequiredField) => field.name);
          setRequiredFields(fieldNames);
        }
      }
    } catch (error) {
      console.error('필수 필드 설정을 로드하는 중 오류 발생:', error);
    }
  }, []);

  // 필드가 필수인지 확인하는 함수
  const isRequiredField = (fieldName: string): boolean => {
    return requiredFields.some(name => name.toLowerCase() === fieldName.toLowerCase());
  };

  // 현재 선택된 파일과 시트에 매핑된 소스 필드 카운트
  const getCurrentFileMappingCount = (fieldMap: FieldMap) => {
    if (!selectedFileId || !selectedSheet) return 0;
    
    return fieldMap.sourceFields.filter(
      sf => sf.fileId === selectedFileId && sf.sheetName === selectedSheet
    ).length;
  };

  // 필드맵을 현재 선택된 파일/시트에 매핑된 소스 필드 우선 순위로 정렬
  const sortedFieldMaps = [...localTargetFields].sort((a, b) => {
    const aCount = getCurrentFileMappingCount(a);
    const bCount = getCurrentFileMappingCount(b);
    
    // 현재 파일에 매핑된 필드 우선
    if (aCount > 0 && bCount === 0) return -1;
    if (aCount === 0 && bCount > 0) return 1;
    
    // 둘 다 매핑되었으면 이름순
    return a.targetField.name.localeCompare(b.targetField.name);
  });

  if (!mappingConfig) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">매핑 설정을 선택하세요</p>
      </div>
    );
  }

  if (localTargetFields.length === 0) {
    return (
      <div className="text-center p-4 space-y-2">
        <p className="text-muted-foreground">타겟 필드가 없습니다.</p>
        <p className="text-xs text-muted-foreground">타겟 필드를 추가하여 매핑을 시작하세요.</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={onAddTarget}>
          <Plus className="h-4 w-4 mr-2" />
          타겟 필드 추가
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedFieldMaps.map((fieldMap) => {
        const isActive = activeFieldId === fieldMap.id;
        
        // 필드맵에 할당된 현재 선택된 파일/시트의 소스 필드
        const currentSourceFields = selectedFileId && selectedSheet 
          ? fieldMap.sourceFields.filter(
              sf => sf.fileId === selectedFileId && sf.sheetName === selectedSheet
            )
          : [];
          
        // 모든 소스 필드 (다른 파일에서 매핑된 항목 포함)
        const allSourceFields = fieldMap.sourceFields;
        
        // 다른 파일에서 매핑된 소스 필드 (현재 선택된 파일/시트 제외)
        const otherSourceFields = selectedFileId && selectedSheet
          ? fieldMap.sourceFields.filter(
              sf => sf.fileId !== selectedFileId || sf.sheetName !== selectedSheet
            )
          : fieldMap.sourceFields;

        // 해당 필드의 필수 여부 확인
        const required = isRequiredField(fieldMap.targetField.name);
        
        // 필드맵 유효성 검증
        const validationResult = validateFieldMap(fieldMap, required);
        
        return (
          <div
            key={fieldMap.id}
            className={`p-3 border rounded-md cursor-pointer transition-all ${
              isActive ? 'bg-muted/50 border-primary' : 'hover:bg-muted/20'
            }`}
            onClick={() => onFieldSelect(fieldMap.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">
                {fieldMap.targetField.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  {fieldMap.targetField.type}
                </span>
              </h3>
            </div>
            
            <DraggableFieldTarget 
              targetFieldId={fieldMap.id} 
              targetFieldName={fieldMap.targetField.name}
              isActive={isActive}
            >
              {currentSourceFields.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentSourceFields.map((sourceField, index) => (
                    <Badge 
                      key={`${sourceField.fileId}_${sourceField.fieldName}_${index}`}
                      variant="outline"
                      className="flex items-center gap-1 bg-primary/5 border-primary/20"
                    >
                      <span className="max-w-[200px] truncate">{sourceField.fieldName}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-destructive/10 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSourceMapping(fieldMap.id, sourceField.fileId, sourceField.fieldName, sourceField.sheetName);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">
                  소스 필드를 여기에 끌어다 놓으세요.
                </p>
              )}
              
              {/* 다른 파일에서 매핑된 소스 필드 표시 (현재 선택된 파일/시트 외의 매핑) */}
              {otherSourceFields.length > 0 && (
                <div className="mt-3 pt-2 border-t border-dashed">
                  <p className="text-xs text-muted-foreground mb-2">
                    다른 파일에서 매핑됨:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {otherSourceFields.map((sourceField, index) => (
                      <Badge 
                        key={`other_${sourceField.fileId}_${sourceField.fieldName}_${index}`}
                        variant="outline"
                        className="flex items-center gap-1 bg-secondary/10 border-secondary/20"
                      >
                        <span className="max-w-[160px] truncate text-xs">{sourceField.fieldName}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({sourceField.sheetName})
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </DraggableFieldTarget>
            
            {/* 필수 필드 표시 */}
            {required && (
              <div className="mt-2 text-xs text-red-500">
                <Badge variant="destructive" className="text-xs px-1 py-0">
                  필수
                </Badge>
              </div>
            )}
            
            {/* 유효성 검증 표시 */}
            <div className="mt-2 text-xs text-gray-500">
              <ValidationIndicator validationResult={validationResult} size="sm" showDetails={false} />
            </div>
          </div>
        );
      })}
      
      <Button 
        variant="ghost" 
        className="border border-dashed w-full mt-4 text-muted-foreground hover:text-foreground"
        onClick={onAddTarget}
      >
        <Plus className="h-4 w-4 mr-2" />
        대상 필드 추가
      </Button>
    </div>
  );
} 