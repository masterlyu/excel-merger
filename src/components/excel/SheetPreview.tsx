"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExcelFileInfo, readExcelFile } from '@/lib/excel';

export interface SheetPreviewProps {
  file: ExcelFileInfo;
  isSelected: boolean;
  onSelect: () => void;
}

export default function SheetPreview({ file, isSelected, onSelect }: SheetPreviewProps) {
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [sheetData, setSheetData] = useState<{
    headers: string[];
    data: Record<string, string | number | null>[];
    title?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 시트 데이터 로드
  const loadSheetData = async (sheetIndex: number) => {
    try {
      setIsLoading(true);
      
      // Base64 데이터를 File 객체로 변환
      const binaryData = atob(file.data.split(',')[1]);
      const array = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        array[i] = binaryData.charCodeAt(i);
      }
      
      const fileObj = new File([array], file.name, {
        type: file.type,
        lastModified: file.lastModified
      });

      const excelData = await readExcelFile(fileObj);
      const selectedSheet = excelData.sheets[sheetIndex];
      
      if (selectedSheet) {
        setSheetData({
          headers: selectedSheet.headers,
          data: selectedSheet.data,
          title: selectedSheet.title
        });
      }
    } catch (error) {
      console.error('Error loading sheet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 첫 번째 시트 데이터 로드
  useEffect(() => {
    loadSheetData(0);
  }, [file.id]); // file.id가 변경될 때마다 데이터 다시 로드

  // 시트 변경 시 데이터 로드
  const handleSheetChange = (index: string) => {
    const sheetIndex = parseInt(index);
    setSelectedSheetIndex(sheetIndex);
    loadSheetData(sheetIndex);
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
              {file.recordCount.toLocaleString()} 행
            </Badge>
          </div>
        </div>

        {/* 시트 선택 드롭다운 */}
        <Select
          value={selectedSheetIndex.toString()}
          onValueChange={handleSheetChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="시트 선택" />
          </SelectTrigger>
          <SelectContent>
            {file.sheets.map((sheet, index) => (
              <SelectItem key={index} value={index.toString()}>
                {sheet}
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
                {sheetData.data.slice(0, 10).map((row, rowIndex) => (
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
          
          {sheetData.data.length > 10 && (
            <div className="text-sm text-gray-500 text-right">
              전체 {sheetData.data.length.toLocaleString()}행 중 처음 10행만 표시됩니다.
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          데이터를 불러올 수 없습니다.
        </div>
      )}
    </div>
  );
} 