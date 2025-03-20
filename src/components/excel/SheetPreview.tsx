"use client";

import React, { useState } from 'react';
import { ExcelData } from '@/lib/excel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SheetPreviewProps {
  excelData: ExcelData;
}

export default function SheetPreview({ excelData }: SheetPreviewProps) {
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const selectedSheet = excelData.sheets[selectedSheetIndex];

  if (!selectedSheet) {
    return (
      <div className="text-center text-gray-500 p-4">
        시트 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">시트 미리보기</h3>
        <Select
          value={selectedSheetIndex.toString()}
          onValueChange={(value) => setSelectedSheetIndex(parseInt(value))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="시트 선택" />
          </SelectTrigger>
          <SelectContent>
            {excelData.sheets.map((sheet, index) => (
              <SelectItem key={index} value={index.toString()}>
                {sheet.name} ({sheet.totalRows.toLocaleString()}행)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <div className="mb-4">
          {selectedSheet.title && (
            <h4 className="text-lg font-medium mb-2">{selectedSheet.title}</h4>
          )}
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              {selectedSheet.totalRows.toLocaleString()}행
            </Badge>
            <Badge variant="secondary">
              {selectedSheet.headers.length}열
            </Badge>
            {selectedSheet.title && (
              <Badge variant="secondary">
                제목 포함
              </Badge>
            )}
          </div>
        </div>

        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">헤더 정보</h5>
          <div className="flex flex-wrap gap-2">
            {selectedSheet.headers.map((header, index) => (
              <Badge key={index} variant="outline">
                {header}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-2">데이터 미리보기 (처음 10행)</h5>
          <ScrollArea className="h-[300px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectedSheet.headers.map((header, index) => (
                    <TableHead key={index}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedSheet.data.slice(0, 10).map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {selectedSheet.headers.map((header, colIndex) => (
                      <TableCell key={colIndex}>
                        {row[header]?.toString() || ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          {selectedSheet.data.length > 10 && (
            <p className="text-sm text-gray-500 mt-2">
              전체 {selectedSheet.data.length.toLocaleString()}행 중 처음 10행만 표시됩니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 