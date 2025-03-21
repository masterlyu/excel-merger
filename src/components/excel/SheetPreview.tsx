"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExcelFileInfo, getSheetData, SheetData } from '@/lib/excel';

export interface SheetPreviewProps {
  file: ExcelFileInfo;
  isSelected: boolean;
  onSelect: () => void;
}

export default function SheetPreview({ file, isSelected, onSelect }: SheetPreviewProps) {
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 컴포넌트 마운트 시 첫 번째 시트 선택
  useEffect(() => {
    if (file && file.sheets && file.sheets.length > 0) {
      const firstSheet = file.sheets[0];
      setSelectedSheetName(firstSheet.name);
    }
  }, [file]);

  // 선택된 시트가 변경될 때마다 데이터 로드
  useEffect(() => {
    if (file && selectedSheetName) {
      loadSheetData(selectedSheetName);
    }
  }, [file, selectedSheetName]);

  // 시트 데이터 로드
  const loadSheetData = async (sheetName: string) => {
    try {
      setIsLoading(true);
      console.log(`[SheetPreview] 시트 데이터 로드 시작 - 파일: ${file.name}, 시트: ${sheetName}`);
      
      const data = await getSheetData(file.id, sheetName);
      
      if (data) {
        console.log(`[SheetPreview] 시트 데이터 로드 성공 - 헤더: ${data.headers.length}, 데이터 행: ${data.data?.length || 0}`);
        setSheetData(data);
      } else {
        console.error(`[SheetPreview] 시트 데이터 로드 실패`);
        setSheetData(null);
      }
    } catch (error) {
      console.error('[SheetPreview] 시트 데이터 로드 중 오류 발생:', error);
      setSheetData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 시트 변경 핸들러
  const handleSheetChange = (sheetName: string) => {
    console.log(`[SheetPreview] 시트 변경: ${sheetName}`);
    setSelectedSheetName(sheetName);
  };

  return (
    <div
      className={`p-4 bg-white border rounded-lg transition-colors
        ${isSelected ? 'border-primary ring-1 ring-primary' : 'hover:border-primary'}`}
      onClick={onSelect}
    >
      {/* 파일 정보 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">
            {file.name}
          </h4>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="secondary">
              {(file.size / 1024 / 1024).toFixed(1)}MB
            </Badge>
            <Badge variant="secondary">
              {file.sheets.length} 시트
            </Badge>
            <Badge variant="secondary">
              {file.recordCount?.toLocaleString() || '0'} 행
            </Badge>
          </div>
        </div>

        {/* 시트 선택 드롭다운 */}
        <Select
          value={selectedSheetName}
          onValueChange={handleSheetChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="시트 선택" />
          </SelectTrigger>
          <SelectContent>
            {file.sheets.map((sheet, index) => (
              <SelectItem key={index} value={sheet.name}>
                {sheet.name} {sheet.rowCount ? `(${sheet.rowCount}행)` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 시트 데이터 미리보기 */}
      {isLoading ? (
        <div className="text-center py-4">데이터 로딩 중...</div>
      ) : sheetData ? (
        <div className="space-y-4">
          {sheetData.title && (
            <div className="font-medium text-gray-900">{sheetData.title}</div>
          )}
          
          <ScrollArea className="h-[400px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {sheetData.headers.map((header, index) => (
                    <TableHead key={index} className="bg-gray-100">{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sheetData.data || []).slice(0, 10).map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {sheetData.headers.map((header, colIndex) => (
                      <TableCell key={colIndex}>
                        {row[header]?.toString() || ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          
          {sheetData.data && sheetData.data.length > 10 && (
            <div className="text-sm text-gray-500 text-right">
              전체 {sheetData.data.length.toLocaleString()}행 중 처음 10행만 표시됩니다.
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          {selectedSheetName ? '데이터를 불러올 수 없습니다.' : '시트를 선택해주세요.'}
        </div>
      )}
    </div>
  );
} 