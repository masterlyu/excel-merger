"use client";

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Search, X } from 'lucide-react';
import { SourceField, MappingConfig, loadMappingConfigs, getActiveMappingConfig, getActiveMappingConfigId } from '@/lib/mapping';

interface SourceFieldListProps {
  sourceFields: string[];
  fileId: string;
  sheetName: string;
  onDragStart?: () => void;
}

// 매핑 업데이트 이벤트 이름 (DragAndDropProvider.tsx와 일치해야 함)
const MAPPING_UPDATED_EVENT = 'mappingUpdated';

/**
 * 소스 필드 목록 컴포넌트
 * 선택한 파일/시트의 소스 필드 목록을 표시하고, 드래그 앤 드롭이 가능하도록 합니다.
 */
export function SourceFieldList({
  sourceFields,
  fileId,
  sheetName,
  onDragStart
}: SourceFieldListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mappedFields, setMappedFields] = useState<Set<string>>(new Set());

  // 매핑된 필드 확인 함수
  const checkMappedFields = () => {
    try {
      // 로컬 스토리지에서 직접 활성 매핑 설정 ID 가져오기
      const activeConfigId = localStorage.getItem('excel_merger_active_mapping_config');
      if (!activeConfigId) return;
      
      // 로컬 스토리지에서 모든 매핑 설정 가져오기
      const allConfigs = JSON.parse(localStorage.getItem('excel_merger_mapping_configs') || '[]');
      if (!Array.isArray(allConfigs) || allConfigs.length === 0) return;
      
      // 활성 매핑 설정 찾기
      const activeConfig = allConfigs.find((config: MappingConfig) => config.id === activeConfigId);
      if (!activeConfig) return;
      
      console.log('SourceFieldList: 활성 매핑 설정 로드됨', activeConfig.name);
      
      const mappedFieldsSet = new Set<string>();
      
      // 각 필드맵을 순회하며 현재 파일/시트에 매핑된 소스 필드 확인
      activeConfig.fieldMaps.forEach((fieldMap: {
        id: string;
        targetField: {
          name: string;
          description: string;
          type: string;
        };
        sourceFields: {
          fileId: string;
          sheetName: string;
          fieldName: string;
        }[];
      }) => {
        if (fieldMap.sourceFields) {
          fieldMap.sourceFields.forEach((sourceField: {
            fileId: string;
            sheetName: string;
            fieldName: string;
          }) => {
            // 현재 선택된 파일/시트에 해당하는 소스 필드만 확인
            if (sourceField.fileId === fileId && sourceField.sheetName === sheetName) {
              mappedFieldsSet.add(sourceField.fieldName);
            }
          });
        }
      });
      
      console.log(`SourceFieldList: 매핑된 필드 ${mappedFieldsSet.size}개 발견`, 
        Array.from(mappedFieldsSet));
      
      setMappedFields(mappedFieldsSet);
    } catch (error) {
      console.error('매핑된 필드 확인 중 오류 발생:', error);
    }
  };

  // 매핑된 필드 초기 로드 및 파일/시트 변경 시 업데이트
  useEffect(() => {
    checkMappedFields();
  }, [fileId, sheetName, sourceFields]);

  // 매핑 업데이트 이벤트 리스너 등록
  useEffect(() => {
    // 매핑 업데이트 이벤트 핸들러
    const handleMappingUpdated = () => {
      console.log('SourceFieldList: 매핑 업데이트 이벤트 감지됨');
      checkMappedFields();
    };
    
    // 이벤트 리스너 등록
    window.addEventListener(MAPPING_UPDATED_EVENT, handleMappingUpdated);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener(MAPPING_UPDATED_EVENT, handleMappingUpdated);
    };
  }, [fileId, sheetName]); // 파일이나 시트가 변경될 때마다 이벤트 리스너 재설정

  // 필드 검색 기능
  const filteredFields = searchQuery
    ? sourceFields.filter(field =>
      field.toLowerCase().includes(searchQuery.toLowerCase()))
    : sourceFields;

  if (sourceFields.length === 0) {
    return (
      <Card className="min-h-[300px]">
        <CardHeader>
          <CardTitle>소스 필드</CardTitle>
          <CardDescription>
            파일과 시트를 선택하면 소스 필드가 표시됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-12">
          파일과 시트를 먼저 선택해주세요.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-h-[300px]">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>소스 필드</CardTitle>
            <CardDescription>
              필드를 타겟으로 드래그하여 매핑하세요.
            </CardDescription>
          </div>
          <Badge variant="outline">
            {sourceFields.length}개
          </Badge>
        </div>

        {/* 검색 필드 */}
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="필드 검색..."
            className="pl-8 pr-8 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-9 w-9"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* 소스 필드 목록 */}
        <div className="mt-2">
          <Droppable droppableId="source-fields" isDropDisabled={true}>
            {(provided) => (
              <div 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                className="grid grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto pr-1"
              >
                {filteredFields.map((field, index) => {
                  // 필드 ID 생성
                  const fieldId = `${fileId}_${sheetName}_${field}`;
                  // 필드가 매핑되었는지 확인
                  const isMapped = mappedFields.has(field);
                  
                  return (
                    <Draggable key={fieldId} draggableId={fieldId} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`
                            p-2 border rounded-md 
                            ${snapshot.isDragging ? 'bg-primary-100 border-primary' : 
                              isMapped ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-card'}
                            text-xs font-medium flex items-center
                            hover:bg-accent hover:text-accent-foreground
                            transition-colors cursor-grab
                            ${isMapped ? 'relative' : ''}
                          `}
                          style={{
                            ...provided.draggableProps.style,
                          }}
                          onDragStart={() => {
                            if (onDragStart) onDragStart();
                            console.log('드래그 시작:', fieldId);
                          }}
                        >
                          <span className="truncate w-full" title={field}>
                            {field}
                          </span>
                          {isMapped && (
                            <Badge className="absolute right-0 top-0 transform translate-x-1/4 -translate-y-1/4 bg-blue-500 text-[9px] py-0 px-1.5 h-4">
                              매핑됨
                            </Badge>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </CardContent>
    </Card>
  );
} 