import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ColumnMapping } from '@/lib/mapping';

interface ColumnMapperProps {
  sourceHeaders: string[];
  targetHeaders: string[];
  currentMappings: ColumnMapping[];
  onMappingChange: (mappings: ColumnMapping[]) => void;
  sourceSheet: string;  // 소스 시트 이름 추가
}

export function ColumnMapper({
  sourceHeaders,
  targetHeaders,
  currentMappings,
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

      {/* 새 매핑 추가 */}
      {unmappedSourceHeaders.length > 0 && unmappedTargetHeaders.length > 0 && (
        <div className="flex items-center gap-4 border rounded-md p-4">
          <div className="flex-1">
            <Select onValueChange={(value) => {
              const targetSelect = document.querySelector('[data-target-select]') as HTMLSelectElement;
              if (targetSelect && targetSelect.value) {
                handleAddMapping(value, targetSelect.value);
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="소스 컬럼 선택" />
              </SelectTrigger>
              <SelectContent>
                {unmappedSourceHeaders.map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span>→</span>

          <div className="flex-1">
            <Select onValueChange={(value) => {
              const sourceSelect = document.querySelector('[data-source-select]') as HTMLSelectElement;
              if (sourceSelect && sourceSelect.value) {
                handleAddMapping(sourceSelect.value, value);
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="타겟 컬럼 선택" />
              </SelectTrigger>
              <SelectContent>
                {unmappedTargetHeaders.map((header) => (
                  <SelectItem key={header} value={header}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* 매핑 상태 표시 */}
      <div className="flex justify-between text-sm text-gray-500">
        <span>매핑된 컬럼: {currentMappings.length}</span>
        <span>남은 컬럼: {Math.max(unmappedSourceHeaders.length, unmappedTargetHeaders.length)}</span>
      </div>
    </div>
  );
} 