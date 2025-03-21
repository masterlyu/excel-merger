"use client";

import React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { MappingConfig, FieldMap } from '@/lib/mapping';
import MappedRecordList from './MappedRecordList';
import { ArrowRight, PlusCircle } from 'lucide-react';

interface TargetFieldListProps {
  mappingConfig: MappingConfig | null;
  activeFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
  onAddTarget: () => void;
  onDeleteSourceMapping: (targetFieldId: string, sourceFieldIndex: number) => void;
}

/**
 * 타겟 필드 목록 컴포넌트
 * 매핑 설정에 포함된 타겟 필드 목록을 표시합니다.
 */
export function TargetFieldList({ 
  mappingConfig, 
  activeFieldId,
  onFieldSelect,
  onAddTarget,
  onDeleteSourceMapping
}: TargetFieldListProps) {
  // 활성화된 필드맵 찾기
  const activeField = React.useMemo(() => {
    if (!mappingConfig || !activeFieldId) return null;
    return mappingConfig.fieldMaps.find(field => field.id === activeFieldId) || null;
  }, [mappingConfig, activeFieldId]);
  
  if (!mappingConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>타겟 필드</CardTitle>
          <CardDescription>
            매핑 설정을 선택하면 타겟 필드가 표시됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-12">
          매핑 설정을 선택해주세요.
        </CardContent>
      </Card>
    );
  }
  
  if (mappingConfig.fieldMaps.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>타겟 필드</CardTitle>
            <CardDescription>
              매핑할 타겟 필드를 설정합니다.
            </CardDescription>
          </div>
          <Button onClick={onAddTarget} size="sm" className="gap-1">
            <PlusCircle className="h-4 w-4" />
            필드 추가
          </Button>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-12">
          아직 타겟 필드가 없습니다. 타겟 필드를 추가해주세요.
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>타겟 필드</CardTitle>
          <CardDescription>
            매핑할 타겟 필드를 설정합니다.
          </CardDescription>
        </div>
        <Button onClick={onAddTarget} size="sm" className="gap-1">
          <PlusCircle className="h-4 w-4" />
          필드 추가
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {mappingConfig.fieldMaps.map((fieldMap: FieldMap) => (
                <div key={fieldMap.id} className="space-y-2">
                  <Button
                    variant={activeFieldId === fieldMap.id ? "default" : "outline"}
                    className="w-full justify-start gap-2 font-medium"
                    onClick={() => onFieldSelect(fieldMap.id)}
                  >
                    <span>{fieldMap.targetField.name}</span>
                    {fieldMap.targetField.type && (
                      <span className="bg-muted text-xs px-2 py-0.5 rounded-full">
                        {fieldMap.targetField.type}
                      </span>
                    )}
                    {fieldMap.sourceFields.length > 0 && (
                      <span className="bg-primary/20 text-primary-foreground text-xs px-2 py-0.5 rounded-full ml-auto">
                        {fieldMap.sourceFields.length} 매핑
                      </span>
                    )}
                  </Button>
                  
                  {activeFieldId === fieldMap.id && (
                    <MappedRecordList 
                      target={{ 
                        fieldId: fieldMap.id,
                        name: fieldMap.targetField.name
                      }} 
                      activeField={fieldMap}
                      onDeleteMapping={(sourceIndex: number) => 
                        onDeleteSourceMapping(fieldMap.id, sourceIndex)
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
} 