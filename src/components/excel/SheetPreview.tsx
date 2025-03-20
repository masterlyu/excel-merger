"use client";

import React, { useState } from 'react';
import { ExcelData } from '@/lib/excel';

interface SheetPreviewProps {
  fileData: ExcelData;
  fileName: string;
}

export default function SheetPreview({ fileData, fileName }: SheetPreviewProps) {
  const [selectedSheet, setSelectedSheet] = useState<string>(fileData.sheets[0]?.name || '');

  // 현재 선택된 시트의 데이터 가져오기
  const currentSheetData = fileData.sheets.find(sheet => sheet.name === selectedSheet)?.data || [];
  const currentHeaders = fileData.headers[selectedSheet] || [];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">{fileName}</h3>
        <div className="mt-2">
          <label htmlFor="sheetSelect" className="block text-sm font-medium text-gray-700">
            시트 선택
          </label>
          <select
            id="sheetSelect"
            value={selectedSheet}
            onChange={(e) => setSelectedSheet(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {fileData.sheets.map(sheet => (
              <option key={sheet.name} value={sheet.name}>
                {sheet.name} ({sheet.data.length} 행)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700">헤더 정보</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {currentHeaders.map((header, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {header}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {currentHeaders.map((header, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentSheetData.slice(0, 10).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    >
                      {cell?.toString() || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {currentSheetData.length > 10 && (
            <div className="p-4 text-center text-sm text-gray-500">
              전체 {currentSheetData.length}행 중 처음 10행만 표시됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 