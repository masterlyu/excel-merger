"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownUp, AlertCircle } from "lucide-react";
import { getSheetData } from '@/lib/excel';
import { MappingConfig, SourceField } from '@/lib/mapping';
import { checkFieldTypeCompatibility } from '@/lib/similarity';
import { toast } from 'react-hot-toast';

interface MappingPreviewProps {
  mappingConfig: MappingConfig | null;
  limit?: number;
}

/**
 * 매핑 미리보기 컴포넌트
 * 현재 매핑 설정에 따른 데이터 변환 결과를 미리 보여줍니다.
 */
export default function MappingPreview({ mappingConfig, limit = 10 }: MappingPreviewProps) {
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeWarnings, setTypeWarnings] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 매핑 설정이 변경되면 미리보기 데이터 로드
  useEffect(() => {
    if (!mappingConfig) {
      setPreviewData([]);
      setTotalPages(1);
      return;
    }

    loadPreviewData();
  }, [mappingConfig, currentPage, sortField, sortDirection]);

  // 미리보기 데이터 로드 함수
  const loadPreviewData = async () => {
    if (!mappingConfig) return;
    
    setIsLoading(true);
    
    try {
      // 매핑 설정에서 필요한 소스 필드 정보 수집
      const sourceFieldsMap = new Map<string, SourceField[]>();
      
      mappingConfig.fieldMaps.forEach(fieldMap => {
        if (fieldMap.sourceFields.length > 0) {
          sourceFieldsMap.set(fieldMap.targetField.name, fieldMap.sourceFields);
        }
      });
      
      // 매핑되는 소스 필드가 없으면 빈 데이터 반환
      if (sourceFieldsMap.size === 0) {
        setPreviewData([]);
        setTotalPages(1);
        setIsLoading(false);
        return;
      }
      
      // 소스 데이터 로드 및 병합
      const mergedData: Record<string, any>[] = [];
      const processedSourceIds = new Set<string>();
      
      // 각 타겟 필드별로 데이터 수집
      for (const [targetField, sourceFields] of sourceFieldsMap.entries()) {
        for (const sourceField of sourceFields) {
          const sourceKey = `${sourceField.fileId}_${sourceField.sheetName}`;
          
          // 이미 처리한 소스는 건너뛰기
          if (processedSourceIds.has(sourceKey)) continue;
          processedSourceIds.add(sourceKey);
          
          try {
            // 소스 시트 데이터 로드
            const sheetData = await getSheetData(sourceField.fileId, sourceField.sheetName);
            
            if (!sheetData || !sheetData.data || sheetData.data.length === 0) {
              console.warn(`시트 데이터가 없습니다: ${sourceField.sheetName} (${sourceField.fileId})`);
              continue;
            }
            
            // 소스 데이터를 타겟 필드에 매핑하여 병합
            sheetData.data.forEach((row, rowIndex) => {
              // 새 레코드 생성 또는 기존 레코드 가져오기
              if (!mergedData[rowIndex]) {
                mergedData[rowIndex] = {};
              }
              
              // 이 소스에서 매핑되는 모든 필드 처리
              for (const [targetFieldName, sourceFields] of sourceFieldsMap.entries()) {
                const matchingSourceField = sourceFields.find(sf => 
                  sf.fileId === sourceField.fileId && 
                  sf.sheetName === sourceField.sheetName
                );
                
                if (matchingSourceField) {
                  // 소스 필드의 값을 타겟 필드에 매핑
                  mergedData[rowIndex][targetFieldName] = row[matchingSourceField.fieldName];
                }
              }
            });
            
          } catch (error) {
            console.error(`소스 데이터 로드 오류: ${sourceField.sheetName}`, error);
          }
        }
      }
      
      // 데이터 정렬
      if (sortField) {
        mergedData.sort((a, b) => {
          const aValue = a[sortField];
          const bValue = b[sortField];
          
          if (aValue === undefined || aValue === null) return sortDirection === 'asc' ? -1 : 1;
          if (bValue === undefined || bValue === null) return sortDirection === 'asc' ? 1 : -1;
          
          if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      // 페이지네이션 계산
      const totalItems = mergedData.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));
      
      setTotalPages(totalPages);
      
      // 현재 페이지에 해당하는 데이터만 선택
      const start = (currentPage - 1) * limit;
      const end = start + limit;
      const pageData = mergedData.slice(start, end);
      
      // 타입 호환성 검사
      const targetFields = mappingConfig.fieldMaps.reduce((fields, map) => {
        fields[map.targetField.name] = map.targetField.type || 'string';
        return fields;
      }, {} as Record<string, string>);
      
      const compatibilityResult = checkFieldTypeCompatibility(mergedData, targetFields);
      setTypeWarnings(compatibilityResult);
      
      // 결과 설정
      setPreviewData(pageData);
    } catch (error) {
      console.error("미리보기 데이터 로드 오류:", error);
      toast.error("미리보기 데이터를 로드하는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      // 이미 정렬 중인 필드면 정렬 방향 토글
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 새 필드 정렬
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (!mappingConfig) {
    return (
      <div className="bg-gray-50 border border-dashed rounded-lg p-8 text-center">
        <p className="text-gray-500">매핑 설정을 선택하면 미리보기가 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">매핑 미리보기</h3>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => loadPreviewData()}
          disabled={isLoading}
        >
          {isLoading ? "로딩 중..." : "새로고침"}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p>데이터 로드 중...</p>
        </div>
      ) : previewData.length > 0 ? (
        <>
          <div className="border rounded-md">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {mappingConfig.fieldMaps.map(fieldMap => (
                      <TableHead 
                        key={fieldMap.targetField.name} 
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort(fieldMap.targetField.name)}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{fieldMap.targetField.name}</span>
                          {sortField === fieldMap.targetField.name && (
                            <ArrowDownUp className="h-3 w-3" />
                          )}
                          {typeWarnings[fieldMap.targetField.name] === false && (
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                          )}
                        </div>
                        {fieldMap.targetField.type && (
                          <Badge variant="outline" className="ml-1 text-xs">
                            {fieldMap.targetField.type}
                          </Badge>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index}>
                      {mappingConfig.fieldMaps.map(fieldMap => (
                        <TableCell key={`${index}-${fieldMap.targetField.name}`}>
                          {row[fieldMap.targetField.name]?.toString() || ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handleChangePage(currentPage - 1)}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // 표시할 페이지 번호 계산
                  let pageNumber: number;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage > totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => handleChangePage(pageNumber)}
                        isActive={currentPage === pageNumber}
                        className="cursor-pointer"
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handleChangePage(currentPage + 1)}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      ) : (
        <div className="text-center py-8 border rounded-md">
          <p className="text-gray-500">
            미리보기 데이터가 없습니다. 매핑 설정을 확인해주세요.
          </p>
        </div>
      )}
    </div>
  );
} 