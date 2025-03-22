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
  onDeleteSourceMapping
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
      {localTargetFields.map((field) => {
        const isActive = activeFieldId === field.id;
        
        // 유효한 소스 필드만 필터링
        const validSourceFields = field.sourceFields?.filter(sf => 
          sf && sf.fileId && sf.sheetName && sf.fieldName
        ) || [];
        
        // 소스 필드 개수에 따른 안내 메시지
        const sourceFieldsMessage = validSourceFields.length === 0
          ? "여기에 소스 필드를 드롭하세요"
          : `${validSourceFields.length}개 필드 매핑됨`;
        
        // 해당 필드의 필수 여부 확인
        const required = isRequiredField(field.targetField.name);
        
        // 필드맵 유효성 검증
        const validationResult = validateFieldMap(field, required);
        
        return (
          <div
            key={field.id}
            id={`target-${field.id}`}
            data-field-id={field.id}
            className={`border rounded-md ${isActive ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}`}
            onClick={() => onFieldSelect(field.id)}
          >
            {/* 타겟 필드 헤더 */}
            <div className={`px-3 py-2 flex justify-between items-center ${isActive ? 'bg-blue-50' : 'bg-muted/30'}`}>
              <div>
                <div className="font-medium text-sm">{field.targetField.name}</div>
                <div className="text-xs text-muted-foreground">{field.targetField.type || '유형 없음'}</div>
              </div>
              <Badge variant={isActive ? "default" : "outline"} className="text-xs">
                {validSourceFields.length}개
              </Badge>
            </div>
            
            {/* 드롭 영역 */}
            <div className="p-2 border-t border-dashed">
              <Droppable droppableId={`droppable-${field.id}`}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-2 min-h-16 rounded-md border ${
                      snapshot.isDraggingOver 
                        ? 'border-blue-400 bg-blue-50' 
                        : validSourceFields.length > 0 
                          ? 'border-gray-200 bg-white' 
                          : 'border-dashed border-gray-300 bg-gray-50'
                    }`}
                  >
                    {/* 소스 필드 목록 표시 */}
                    {validSourceFields.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {validSourceFields.map((sourceField, index) => {
                          // 소스 필드 ID 생성
                          const sourceFieldId = `${sourceField.fileId}_${sourceField.sheetName}_${sourceField.fieldName}`;
                          
                          return (
                            <div 
                              key={`${sourceFieldId}-${index}`} 
                              className="bg-blue-50 border border-blue-100 rounded px-2 py-1 text-xs flex items-center"
                              id={`mapped-${sourceFieldId}`}
                              data-source-field={sourceFieldId}
                            >
                              <div className="flex items-center">
                                <span className="font-medium truncate max-w-[120px]" title={sourceField.fieldName}>
                                  {sourceField.fieldName}
                                </span>
                                {sourceField.sheetName && (
                                  <Badge variant="outline" className="ml-1 text-[10px] py-0 h-4">
                                    {sourceField.sheetName}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 ml-1 hover:bg-blue-100 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSourceMapping(field.id, sourceField.fileId, sourceField.fieldName, sourceField.sheetName);
                                }}
                                title="소스 필드 매핑 삭제"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground text-xs p-2">
                        {sourceFieldsMessage}
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
            
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
    </div>
  );
} 