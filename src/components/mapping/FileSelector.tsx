import React from 'react';
import { Button } from '@/components/ui/button';
import { useFileStore, UploadedFile } from '@/store/file';
import { Upload } from 'lucide-react';

interface FileSelectorProps {
  onFileSelect?: (fileId: string) => void;
}

export function FileSelector({ onFileSelect }: FileSelectorProps) {
  const { files, activeFileId, setActiveFile } = useFileStore();

  const handleFileSelect = (fileId: string) => {
    setActiveFile(fileId);
    onFileSelect?.(fileId);
  };

  // 파일이 없는 경우는 파일 업로드 페이지에서만 표시되어야 함
  if (!files || files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">매핑할 파일</h2>
          <p className="text-sm text-muted-foreground">
            업로드된 파일의 필드를 표준 필드와 매핑해주세요.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        {files.map((file: UploadedFile) => (
          <Button
            key={file.id}
            variant={activeFileId === file.id ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={() => handleFileSelect(file.id)}
          >
            <div className="flex items-center space-x-2">
              <span className="truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                ({file.records?.length || 0}개 레코드)
              </span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
} 