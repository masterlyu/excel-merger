"use client";

import React, { useState } from 'react';
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
import { SourceField } from '@/lib/mapping';

interface SourceFieldListProps {
  sourceFields: string[];
  fileId: string;
  sheetName: string;
  onDragStart?: () => void;
}

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
        <Droppable droppableId="source-fields" isDropDisabled={true}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="p-3 min-h-[200px]"
            >
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filteredFields.map((field, index) => {
                    // 드래그 가능한 소스 필드 객체 생성
                    const sourceField: SourceField = {
                      id: `${fileId}_${sheetName}_${field}`,
                      fileId,
                      sheetName,
                      fieldName: field
                    };
                    
                    return (
                      <Draggable
                        key={`${sourceField.fileId}_${sourceField.sheetName}_${sourceField.fieldName}`}
                        draggableId={`${sourceField.fileId}_${sourceField.sheetName}_${sourceField.fieldName}`}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-2 rounded-md border text-sm ${
                              snapshot.isDragging
                                ? 'bg-accent shadow-lg'
                                : 'bg-background hover:bg-muted/50 transition-colors'
                            }`}
                            onDragStart={() => {
                              if (onDragStart) onDragStart();
                            }}
                            title={field}
                          >
                            <div className="font-medium truncate max-w-[200px]">{field}</div>
                            <div className="text-xs text-muted-foreground truncate">{sheetName}</div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                </div>
                {provided.placeholder}
              </ScrollArea>
            </div>
          )}
        </Droppable>
      </CardContent>
    </Card>
  );
} 