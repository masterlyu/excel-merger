"use client";

import React from 'react';
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
import { Trash2, Plus, ArrowUpDown } from 'lucide-react';
import { MappingConfig, FieldMap } from '@/lib/mapping';

interface TargetFieldListProps {
  mappingConfig: MappingConfig | null;
  activeFieldId: string | null;
  onFieldSelect: (fieldId: string) => void;
  onAddTarget: () => void;
  onDeleteSourceMapping: (targetFieldId: string, sourceFieldIndex: number) => void;
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
  // 매핑 설정이 없는 경우
  if (!mappingConfig) {
    return (
      <Card className="min-h-[300px]">
        <CardHeader>
          <CardTitle>타겟 필드</CardTitle>
          <CardDescription>
            매핑 설정을 선택하면 타겟 필드가 표시됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-12">
          매핑 설정을 먼저 선택해주세요.
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="min-h-[300px]">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>타겟 필드</CardTitle>
            <CardDescription>
              소스 필드를 여기에 드롭하여 매핑하세요.
            </CardDescription>
          </div>
          <Badge variant="outline">
            {mappingConfig.fieldMaps.length}개
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-3 space-y-3">
            {mappingConfig.fieldMaps.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground">
                <p>타겟 필드가 없습니다.</p>
                <p className="text-sm mt-2">새 타겟 필드를 추가해주세요.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mappingConfig.fieldMaps.map((fieldMap) => (
                  <div
                    key={fieldMap.id}
                    id={`target-${fieldMap.id}`}
                    className={`border rounded-md p-3 transition-colors cursor-pointer ${
                      activeFieldId === fieldMap.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => onFieldSelect(fieldMap.id)}
                  >
                    <div className="font-medium mb-2 flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="truncate">{fieldMap.targetField.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {fieldMap.targetField.type || 'string'}
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="font-normal">
                        {fieldMap.sourceFields.length}개 매핑됨
                      </Badge>
                    </div>
                    
                    {/* 소스 필드 드롭 영역 */}
                    <Droppable droppableId={`target-${fieldMap.id}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`mt-2 p-2 rounded-md min-h-[40px] transition-colors ${
                            snapshot.isDraggingOver 
                              ? 'bg-primary/10 border border-dashed border-primary' 
                              : 'bg-background border border-dashed border-muted'
                          }`}
                        >
                          {fieldMap.sourceFields.length === 0 ? (
                            <div className="text-xs text-center text-muted-foreground p-2">
                              <ArrowUpDown className="h-3 w-3 inline mr-1" />
                              소스 필드를 여기에 드래그하세요
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {fieldMap.sourceFields.map((sourceField, index) => {
                                // 소스 필드 ID 생성
                                const sourceFieldId = sourceField.id || 
                                  `${sourceField.fileId}_${sourceField.sheetName}_${sourceField.fieldName}`;
                                
                                return (
                                  <div
                                    key={`sf-${index}-${sourceFieldId}`}
                                    id={`source-${sourceFieldId}`}
                                    className="flex items-center justify-between px-2 py-1.5 rounded bg-secondary text-secondary-foreground text-xs"
                                  >
                                    <div className="truncate">
                                      <span className="font-medium">{sourceField.fieldName}</span>
                                      <span className="text-muted-foreground ml-1">({sourceField.sheetName})</span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteSourceMapping(fieldMap.id, index);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="px-3 py-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={onAddTarget}
        >
          <Plus className="h-4 w-4 mr-2" />
          타겟 필드 추가
        </Button>
      </CardFooter>
    </Card>
  );
} 