'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, FileUp, FileDown, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  MappingConfig, 
  loadMappingConfigs, 
  saveMappingConfig, 
  getActiveMappingConfigId, 
  loadMappingConfigById 
} from '@/lib/mapping';

/**
 * 매핑 설정 가져오기/내보내기 컴포넌트
 * 매핑 설정을 JSON 형식으로 가져오기/내보내기하는 기능을 제공합니다.
 */
export default function MappingImportExport() {
  const [importText, setImportText] = useState<string>('');
  const [exportText, setExportText] = useState<string>('');
  const [tab, setTab] = useState<string>('export');

  // 현재 활성화된 매핑 설정 내보내기
  const handleExportActive = () => {
    try {
      const activeId = getActiveMappingConfigId();
      if (!activeId) {
        toast.error('활성화된 매핑 설정이 없습니다.');
        return;
      }

      const config = loadMappingConfigById(activeId);
      if (!config) {
        toast.error('매핑 설정을 찾을 수 없습니다.');
        return;
      }

      const exportData = JSON.stringify(config, null, 2);
      setExportText(exportData);
      toast.success('매핑 설정이 내보내기 되었습니다.');
    } catch (error) {
      console.error('매핑 설정 내보내기 오류:', error);
      toast.error('매핑 설정 내보내기 중 오류가 발생했습니다.');
    }
  };

  // 모든 매핑 설정 내보내기
  const handleExportAll = () => {
    try {
      const configs = loadMappingConfigs();
      if (!configs || configs.length === 0) {
        toast.error('내보낼 매핑 설정이 없습니다.');
        return;
      }

      const exportData = JSON.stringify(configs, null, 2);
      setExportText(exportData);
      toast.success(`${configs.length}개 매핑 설정이 내보내기 되었습니다.`);
    } catch (error) {
      console.error('매핑 설정 내보내기 오류:', error);
      toast.error('매핑 설정 내보내기 중 오류가 발생했습니다.');
    }
  };

  // 매핑 설정 가져오기
  const handleImport = () => {
    if (!importText.trim()) {
      toast.error('가져올 매핑 설정을 입력하세요.');
      return;
    }

    try {
      // JSON 파싱
      const importData = JSON.parse(importText);
      
      // 단일 매핑 설정 또는 배열 확인
      if (Array.isArray(importData)) {
        // 배열인 경우 - 여러 매핑 설정
        let importCount = 0;
        
        for (const config of importData) {
          if (isValidMappingConfig(config)) {
            // ID 충돌 방지를 위해 새 ID 생성
            const newConfig: MappingConfig = {
              ...config,
              id: `mapping_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              updated: Date.now()
            };
            
            saveMappingConfig(newConfig);
            importCount++;
          }
        }
        
        if (importCount > 0) {
          toast.success(`${importCount}개 매핑 설정이 가져오기 되었습니다.`);
          setImportText('');
        } else {
          toast.error('유효한 매핑 설정을 찾을 수 없습니다.');
        }
      } else if (isValidMappingConfig(importData)) {
        // 객체인 경우 - 단일 매핑 설정
        // ID 충돌 방지를 위해 새 ID 생성
        const newConfig: MappingConfig = {
          ...importData,
          id: `mapping_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          updated: Date.now()
        };
        
        saveMappingConfig(newConfig);
        toast.success('매핑 설정이 가져오기 되었습니다.');
        setImportText('');
      } else {
        toast.error('유효하지 않은 매핑 설정 형식입니다.');
      }
    } catch (error) {
      console.error('매핑 설정 가져오기 오류:', error);
      toast.error('매핑 설정 가져오기 중 오류가 발생했습니다. JSON 형식을 확인하세요.');
    }
  };

  // 내보내기 텍스트 복사
  const handleCopyExport = () => {
    if (!exportText.trim()) {
      toast.error('복사할 내용이 없습니다.');
      return;
    }

    navigator.clipboard.writeText(exportText)
      .then(() => toast.success('클립보드에 복사되었습니다.'))
      .catch(() => toast.error('복사 중 오류가 발생했습니다.'));
  };

  // 파일로 내보내기
  const handleExportToFile = () => {
    if (!exportText.trim()) {
      toast.error('내보낼 내용이 없습니다.');
      return;
    }

    try {
      const blob = new Blob([exportText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `mapping_config_${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('파일 내보내기 오류:', error);
      toast.error('파일 내보내기 중 오류가 발생했습니다.');
    }
  };

  // 파일에서 가져오기
  const handleImportFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      toast.error('JSON 파일만 가져올 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (event.target?.result) {
          setImportText(event.target.result as string);
          toast.success('파일을 불러왔습니다. 가져오기 버튼을 클릭하세요.');
        }
      } catch (error) {
        console.error('파일 읽기 오류:', error);
        toast.error('파일 읽기 중 오류가 발생했습니다.');
      }
    };
    
    reader.onerror = () => {
      toast.error('파일 읽기 중 오류가 발생했습니다.');
    };
    
    reader.readAsText(file);
  };

  // 매핑 설정 유효성 검사
  const isValidMappingConfig = (config: any): boolean => {
    return (
      config &&
      typeof config === 'object' &&
      typeof config.name === 'string' &&
      Array.isArray(config.fieldMaps)
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>매핑 가져오기/내보내기</CardTitle>
        <CardDescription>
          매핑 설정을 JSON 형식으로 가져오거나 내보낼 수 있습니다
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">내보내기</TabsTrigger>
            <TabsTrigger value="import">가져오기</TabsTrigger>
          </TabsList>
          
          {/* 내보내기 탭 */}
          <TabsContent value="export" className="space-y-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleExportActive} 
                className="flex-1 gap-1"
              >
                <FileDown className="h-4 w-4" />
                현재 설정
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportAll} 
                className="flex-1 gap-1"
              >
                <FileDown className="h-4 w-4" />
                전체 설정
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="export-text">내보내기 결과</Label>
              <textarea
                id="export-text"
                className="flex min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={exportText}
                readOnly
                placeholder="내보내기 버튼을 클릭하면 이곳에 결과가 표시됩니다."
              />
            </div>
            
            {exportText && (
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  onClick={handleCopyExport} 
                  className="flex-1 gap-1"
                >
                  <Copy className="h-4 w-4" />
                  복사하기
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={handleExportToFile} 
                  className="flex-1 gap-1"
                >
                  <Download className="h-4 w-4" />
                  파일로 저장
                </Button>
              </div>
            )}
          </TabsContent>
          
          {/* 가져오기 탭 */}
          <TabsContent value="import" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">파일에서 가져오기</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json,application/json"
                onChange={handleImportFromFile}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="import-text">가져오기 텍스트</Label>
              <textarea
                id="import-text"
                className="flex min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="JSON 형식의 매핑 설정을 붙여넣거나 파일에서 가져오세요."
              />
            </div>
            
            <Button 
              variant="default" 
              onClick={handleImport} 
              disabled={!importText.trim()}
              className="w-full gap-1"
            >
              <Upload className="h-4 w-4" />
              가져오기
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 