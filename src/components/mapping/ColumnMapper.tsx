"use client";

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ColumnMapping } from '@/lib/mapping';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { toast } from 'react-hot-toast';

interface ColumnMapperProps {
  sourceHeaders: string[];
  targetHeaders: string[];
  currentMappings: ColumnMapping[];
  onMappingChange: (mappings: ColumnMapping[]) => void;
  sourceSheet: string;  // 소스 시트 이름 추가
}

export default function ColumnMapper({
  sourceHeaders = [],
  targetHeaders = [],
  currentMappings = [],
  onMappingChange,
  sourceSheet
}: ColumnMapperProps) {
  // 매핑되지 않은 소스 헤더 필터링
  const unmappedSourceHeaders = sourceHeaders.filter(
    header => !currentMappings.some(mapping => mapping.sourceColumn === header)
  );

  // 매핑되지 않은 타겟 헤더 필터링
  const unmappedTargetHeaders = targetHeaders.filter(
    header => !currentMappings.some(mapping => mapping.targetColumn === header)
  );

  // 매핑 추가
  const handleAddMapping = (sourceColumn: string, targetColumn: string) => {
    const newMapping: ColumnMapping = {
      sourceSheet,
      sourceColumn,
      targetColumn,
      transformRule: 'none' // 기본값
    };
    onMappingChange([...currentMappings, newMapping]);
  };

  // 매핑 제거
  const handleRemoveMapping = (sourceColumn: string) => {
    const updatedMappings = currentMappings.filter(
      mapping => mapping.sourceColumn !== sourceColumn
    );
    onMappingChange(updatedMappings);
  };

  // 자동 매핑 수행
  const handleAutoMap = () => {
    const autoMappings: ColumnMapping[] = [];
    
    sourceHeaders.forEach(sourceHeader => {
      // 이미 매핑된 헤더는 건너뛰기
      if (currentMappings.some(mapping => mapping.sourceColumn === sourceHeader)) {
        return;
      }

      // 정확히 일치하는 타겟 헤더 찾기
      const exactMatch = targetHeaders.find(
        targetHeader => 
          targetHeader.toLowerCase() === sourceHeader.toLowerCase() &&
          !currentMappings.some(mapping => mapping.targetColumn === targetHeader)
      );

      if (exactMatch) {
        autoMappings.push({
          sourceSheet,
          sourceColumn: sourceHeader,
          targetColumn: exactMatch,
          transformRule: 'none'
        });
      }
    });

    onMappingChange([...currentMappings, ...autoMappings]);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceId = result.draggableId;
    const targetId = unmappedTargetHeaders[result.destination.index];

    handleAddMapping(sourceId, targetId);
    toast.success(`${sourceId} → ${targetId} 매핑이 완료되었습니다.`);
  };

  return (
    <div className="space-y-4">
      {/* 자동 매핑 버튼 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">컬럼 매핑</h3>
        <Button 
          variant="outline" 
          onClick={handleAutoMap}
          disabled={unmappedSourceHeaders.length === 0 || unmappedTargetHeaders.length === 0}
        >
          자동 매핑
        </Button>
      </div>

      {/* 드래그 앤 드롭 영역 */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 gap-4">
          {/* 소스 헤더 목록 */}
          <div className="border rounded-md p-4">
            <h4 className="font-medium mb-2">소스 컬럼</h4>
            <Droppable droppableId="sourceHeaders" type="column" isDropDisabled={true}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2"
                >
                  {unmappedSourceHeaders.map((header, index) => (
                    <Draggable key={header} draggableId={header} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`p-2 rounded-md border ${
                            snapshot.isDragging ? 'bg-blue-50 border-blue-200' : 'bg-white'
                          }`}
                        >
                          {header}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* 타겟 헤더 목록 */}
          <div className="border rounded-md p-4">
            <h4 className="font-medium mb-2">타겟 컬럼</h4>
            <Droppable droppableId="targetHeaders" type="column" isDropDisabled={false}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2"
                >
                  {unmappedTargetHeaders.map((header, index) => (
                    <div
                      key={header}
                      className="p-2 rounded-md border bg-gray-50"
                    >
                      {header}
                    </div>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>

      {/* 현재 매핑 목록 */}
      <ScrollArea className="h-[200px] border rounded-md p-4">
        <div className="space-y-2">
          {currentMappings.map((mapping) => (
            <div key={mapping.sourceColumn} className="flex items-center gap-2">
              <Badge variant="secondary">{mapping.sourceColumn}</Badge>
              <span>→</span>
              <Badge>{mapping.targetColumn}</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveMapping(mapping.sourceColumn)}
                className="ml-auto"
              >
                제거
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* 매핑 상태 표시 */}
      <div className="flex justify-between text-sm text-gray-500">
        <span>매핑된 컬럼: {currentMappings.length}</span>
        <span>남은 컬럼: {Math.max(unmappedSourceHeaders.length, unmappedTargetHeaders.length)}</span>
      </div>
    </div>
  );
} 