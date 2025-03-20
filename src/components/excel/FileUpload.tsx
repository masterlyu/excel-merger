"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { validateExcelFile, readExcelFile, saveFileInfo, loadFileInfos, deleteFileInfo, MAX_FILE_COUNT, ExcelData } from '@/lib/excel';
import SheetPreview from './SheetPreview';

interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  sheets: string[];
  recordCount: number;
}

interface FileDataMap {
  [fileId: string]: ExcelData;
}

export default function FileUpload() {
  const [files, setFiles] = useState<FileInfo[]>(() => loadFileInfos());
  const [fileDataMap, setFileDataMap] = useState<FileDataMap>({});
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    setIsLoading(true);

    try {
      // 파일 개수 제한 확인
      if (files.length + acceptedFiles.length > MAX_FILE_COUNT) {
        throw new Error(`최대 ${MAX_FILE_COUNT}개의 파일만 업로드할 수 있습니다.`);
      }

      for (const file of acceptedFiles) {
        // 파일 유효성 검사
        const validationError = validateExcelFile(file);
        if (validationError) {
          throw new Error(`${file.name}: ${validationError}`);
        }

        // 엑셀 파일 읽기
        const excelData = await readExcelFile(file);

        // 파일 정보 생성
        const fileInfo: FileInfo = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          sheets: excelData.sheets.map(sheet => sheet.name),
          recordCount: excelData.recordCount,
        };

        // 파일 데이터 저장
        setFileDataMap(prev => ({
          ...prev,
          [fileInfo.id]: excelData
        }));

        // 파일 정보 저장
        saveFileInfo(fileInfo);
        setFiles(prev => [...prev, fileInfo]);
        
        // 첫 번째 파일인 경우 자동 선택
        if (!selectedFileId) {
          setSelectedFileId(fileInfo.id);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [files, selectedFileId]);

  const handleDelete = (fileId: string) => {
    deleteFileInfo(fileId);
    setFiles(prev => prev.filter(file => file.id !== fileId));
    setFileDataMap(prev => {
      const newMap = { ...prev };
      delete newMap[fileId];
      return newMap;
    });
    if (selectedFileId === fileId) {
      setSelectedFileId(null);
    }
  };

  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
  });

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
          >
            <input {...getInputProps()} />
            {isLoading ? (
              <p className="text-gray-600">파일 처리 중...</p>
            ) : isDragActive ? (
              <p className="text-blue-500">파일을 여기에 놓으세요...</p>
            ) : (
              <div>
                <p className="text-gray-600">
                  파일을 이곳에 드래그하거나 클릭하여 업로드하세요
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  (지원 형식: XLSX, XLS, CSV / 최대 10MB)
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">업로드된 파일 ({files.length}/{MAX_FILE_COUNT})</h3>
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm cursor-pointer transition-colors
                      ${selectedFileId === file.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'}`}
                    onClick={() => handleFileSelect(file.id)}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{file.name}</h4>
                      <div className="mt-1 text-sm text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span className="mx-2">•</span>
                        <span>{file.sheets.length}개 시트</span>
                        <span className="mx-2">•</span>
                        <span>{file.recordCount}개 레코드</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.id);
                      }}
                      className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          {selectedFileId && fileDataMap[selectedFileId] && (
            <SheetPreview
              fileData={fileDataMap[selectedFileId]}
              fileName={files.find(f => f.id === selectedFileId)?.name || ''}
            />
          )}
        </div>
      </div>
    </div>
  );
} 