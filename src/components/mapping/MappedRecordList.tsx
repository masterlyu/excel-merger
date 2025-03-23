"use client";

import React, { useEffect, useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'react-hot-toast';
import { FieldMap } from '@/lib/mapping';

// 매핑 타겟 속성
interface MappingTarget {
  fieldId: string;  // FieldMap의 id에 해당
  name: string;
}

// MappedRecordList 컴포넌트 속성
interface MappedRecordListProps {
  target: MappingTarget;
  activeField: FieldMap | null;
  onDeleteMapping: (sourceFieldIndex: number) => void;
}

/**
 * 매핑된 레코드 목록 컴포넌트
 * 타겟 필드에 매핑된 소스 필드 목록을 표시합니다.
 */
export default function MappedRecordList({ 
  target, 
  activeField, 
  onDeleteMapping 
}: MappedRecordListProps) {
  const [isClient, setIsClient] = useState(false);
  
  // 클라이언트 사이드에서만 렌더링 되도록 설정
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // 삭제 버튼 클릭 핸들러
  const handleDeleteClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (typeof onDeleteMapping === 'function') {
      console.log(`매핑 삭제: 인덱스 ${index}`);
      onDeleteMapping(index);
    } else {
      console.error('onDeleteMapping is not a function');
    }
  };
  
  // 소스 필드 목록이 없는 경우
  if (!activeField?.sourceFields || activeField.sourceFields.length === 0) {
    return (
      <div className="bg-muted/50 p-4 rounded-md">
        <p className="text-sm text-center text-muted-foreground">
          "{target.name}" 필드에 연결된 소스 필드가 없습니다.
          <br />
          소스 필드를 이 영역으로 드래그하여 매핑하세요.
        </p>
      </div>
    );
  }
  
  if (!isClient) {
    return <div>로딩 중...</div>;
  }
  
  const dropId = `droppable-${target.fieldId}`;
  
  return (
    <Card className="mt-2 shadow-none border">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <span>소스 필드 매핑</span>
          <Badge className="ml-2" variant="outline">
            {activeField.sourceFields.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <Droppable droppableId={dropId}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`rounded-md transition-colors min-h-[120px] ${
                snapshot.isDraggingOver ? 'bg-primary/10' : 'bg-muted/30'
              }`}
            >
              <ScrollArea className="h-[120px] w-full">
                {activeField.sourceFields.map((sourceField, index) => (
                  <Draggable 
                    key={sourceField.id || `${sourceField.fileId}_${sourceField.sheetName}_${sourceField.fieldName}`} 
                    draggableId={sourceField.id || `${sourceField.fileId}_${sourceField.sheetName}_${sourceField.fieldName}`} 
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`flex items-center justify-between p-3 m-2 rounded-md text-sm ${
                          snapshot.isDragging 
                            ? 'bg-muted shadow-md' 
                            : 'bg-background border'
                        }`}
                      >
                        <div className="flex-1 overflow-hidden">
                          <div className="font-medium truncate" title={sourceField.fieldName}>
                            {sourceField.fieldName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate" title={`${sourceField.sheetName} (${sourceField.fileId})`}>
                            {sourceField.sheetName}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 ml-2 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                          title="매핑 삭제"
                          onClick={(e) => handleDeleteClick(index, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ScrollArea>
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );
} 