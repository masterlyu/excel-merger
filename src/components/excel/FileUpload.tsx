"use client";

import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { ExcelData, ExcelFileInfo, MAX_FILE_COUNT, readExcelFile, saveFileInfo, loadFileInfos, deleteFileInfo } from '@/lib/excel';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import SheetPreview from './SheetPreview';

export default function FileUpload() {
  const [files, setFiles] = useState<ExcelFileInfo[]>([]);
  const [fileDataMap, setFileDataMap] = useState<Record<string, ExcelData>>({});
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 저장된 파일 정보 로드
  useEffect(() => {
    const savedFiles = loadFileInfos();
    setFiles(savedFiles);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);

    // 파일 개수 제한 확인
    if (files.length + acceptedFiles.length > MAX_FILE_COUNT) {
      setError(`최대 ${MAX_FILE_COUNT}개의 파일만 업로드할 수 있습니다.`);
      return;
    }

    // 각 파일 처리
    for (const file of acceptedFiles) {
      try {
        // 파일 형식 검증
        if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
          setError('엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드할 수 있습니다.');
          continue;
        }

        // 파일 크기 검증 (10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError('파일 크기는 10MB를 초과할 수 없습니다.');
          continue;
        }

        // 엑셀 파일 읽기
        const excelData = await readExcelFile(file);
        const fileInfo: ExcelFileInfo = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          sheets: excelData.sheets.map(sheet => sheet.name),
          recordCount: excelData.sheets.reduce((sum, sheet) => sum + sheet.totalRows, 0)
        };

        // 상태 업데이트
        setFiles(prev => [...prev, fileInfo]);
        setFileDataMap(prev => ({
          ...prev,
          [fileInfo.id]: excelData
        }));
        saveFileInfo(fileInfo);

        // 첫 번째 파일인 경우 선택
        if (!selectedFileId) {
          setSelectedFileId(fileInfo.id);
        }
      } catch (error) {
        console.error('파일 처리 중 오류:', error);
        setError('파일을 처리하는 중 오류가 발생했습니다.');
      }
    }
  }, [files, selectedFileId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    }
  });

  // 파일 삭제
  const handleDelete = (id: string) => {
    if (!confirm('이 파일을 삭제하시겠습니까?')) return;

    setFiles(prev => prev.filter(file => file.id !== id));
    setFileDataMap(prev => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
    deleteFileInfo(id);

    if (selectedFileId === id) {
      setSelectedFileId(null);
    }
  };

  // 파일 선택
  const handleFileSelect = (id: string) => {
    setSelectedFileId(id);
  };

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <p className="text-gray-600">
            파일을 드래그하여 업로드하거나 클릭하여 선택하세요.
          </p>
          <p className="text-sm text-gray-500">
            지원 형식: XLSX, XLS, CSV (최대 10MB)
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">업로드된 파일</h3>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-4">
              {files.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  업로드된 파일이 없습니다.
                </p>
              ) : (
                files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-4 bg-white border rounded-lg transition-colors
                      ${selectedFileId === file.id ? 'border-blue-500 ring-1 ring-blue-500' : 'hover:border-blue-500'}`}
                    onClick={() => handleFileSelect(file.id)}
                  >
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.id);
                      }}
                      className="ml-4 text-red-500 hover:text-red-700"
                    >
                      삭제
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div>
          {selectedFileId && fileDataMap[selectedFileId] ? (
            <SheetPreview excelData={fileDataMap[selectedFileId]} />
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center h-[400px] flex items-center justify-center">
              <p className="text-gray-500">
                파일을 선택하면 시트 정보가 여기에 표시됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 