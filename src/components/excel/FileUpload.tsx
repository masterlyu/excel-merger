"use client";

import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { validateExcelFile, saveFileInfo, loadFileInfos, deleteFileInfo, ExcelFileInfo, readExcelFile, ExcelData } from '@/lib/excel';
import SheetPreview from './SheetPreview';

interface FileUploadProps {
  onUploadComplete?: () => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [files, setFiles] = useState<ExcelFileInfo[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileDataMap, setFileDataMap] = useState<Record<string, ExcelData>>({});

  // 저장된 파일 정보 로드
  useEffect(() => {
    const savedFiles = loadFileInfos();
    setFiles(savedFiles);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      setIsLoading(true);
      console.log('파일 드롭됨:', acceptedFiles.map(f => f.name).join(', '));

      for (const file of acceptedFiles) {
        console.log(`파일 처리 중: ${file.name} (${file.size} bytes, 타입: ${file.type})`);
        
        // 파일 유효성 검사
        const error = validateExcelFile(file);
        if (error) {
          toast.error(error);
          console.error(`파일 유효성 검사 실패: ${file.name}`, error);
          continue;
        }

        try {
          console.log(`파일 저장 시작: ${file.name}`);
          const fileInfo = await saveFileInfo(file);
          console.log(`파일 정보 저장 완료:`, fileInfo.id, fileInfo.name);
          
          setFiles(prev => {
            const newFiles = [...prev, fileInfo];
            console.log('업데이트된 파일 목록:', newFiles.map(f => f.name));
            return newFiles;
          });
          
          // 첫 번째 파일인 경우 선택
          if (!selectedFileId) {
            console.log(`첫 번째 파일 선택: ${fileInfo.id}`);
            setSelectedFileId(fileInfo.id);
          }
          
          toast.success(`${file.name} 파일이 업로드되었습니다.`);
        } catch (error) {
          console.error('파일 처리 오류:', file.name, error);
          toast.error(`${file.name} 파일 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
      }

      onUploadComplete?.();
    } catch (error) {
      console.error('업로드 오류:', error);
      toast.error(`파일 업로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  }, [onUploadComplete, selectedFileId]);

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

  return (
    <div className="space-y-4">
      {/* 드래그 앤 드롭 영역 */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} disabled={isLoading} />
        {isLoading ? (
          <p>파일 처리 중...</p>
        ) : isDragActive ? (
          <p>파일을 여기에 놓으세요...</p>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-600">
              파일을 드래그하여 업로드하거나 클릭하여 선택하세요.
            </p>
            <p className="text-sm text-gray-500">
              지원 형식: XLSX, XLS, CSV (최대 10MB)
            </p>
          </div>
        )}
      </div>

      {/* 파일 목록과 미리보기 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측: 파일 목록 */}
        <div>
          <h3 className="text-lg font-semibold mb-4">업로드된 파일</h3>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2 pr-4">
              {files.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  업로드된 파일이 없습니다.
                </p>
              ) : (
                files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-4 bg-white border rounded-lg cursor-pointer transition-colors
                      ${selectedFileId === file.id ? 'border-primary ring-1 ring-primary' : 'hover:border-primary'}`}
                    onClick={() => setSelectedFileId(file.id)}
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
                          {file.recordCount?.toLocaleString() || '0'} 행
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

        {/* 우측: 시트 미리보기 */}
        <div>
          {selectedFileId && files.find(f => f.id === selectedFileId) ? (
            <SheetPreview
              file={files.find(f => f.id === selectedFileId)!}
              isSelected={true}
              onSelect={() => {}}
            />
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center h-[500px] flex items-center justify-center">
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